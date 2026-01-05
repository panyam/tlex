/**
 * Incremental Lexing for TLEX
 *
 * Based on Tim Wagner & Susan Graham's "General Incremental Lexical Analysis" (1999).
 *
 * Key concepts:
 * - Token-based state tracking: each token stores lexer state at construction
 * - Lookahead: characters read beyond token's lexeme (usually 0-1)
 * - Lookback: number of preceding tokens whose lookahead reaches this token
 * - Convergence: stop re-lexing when tag + adjusted position + state match
 */

import { Tokenizer } from "./tokenizer";
import { Token } from "./token";
import { Tape } from "./tape";

/**
 * Describes a single edit operation on the input text.
 */
export interface EditRange {
  /** Start offset in the old input */
  start: number;
  /** End offset in the old input (exclusive) */
  end: number;
  /** Replacement text (empty string for deletion) */
  newText: string;
}

/**
 * Configuration for character-by-character edit accumulation.
 */
export interface EditAccumulatorConfig {
  /** Maximum number of edits to accumulate before triggering update */
  maxEdits?: number;
  /** Maximum time in ms to accumulate edits before triggering update */
  maxDelayMs?: number;
}

/**
 * Internal cache structure for incremental tokenization.
 */
interface TokenCache {
  tokens: Token[];
  input: string;
  /**
   * Position delta applied to suffix tokens.
   * When non-zero, suffix token positions are lazily adjusted.
   */
  suffixDelta: number;
  /**
   * Index of first token affected by pending delta.
   * Tokens at this index and beyond have unadjusted positions.
   */
  suffixStartIdx: number;
}

/**
 * Incremental tokenizer that efficiently re-tokenizes only affected
 * portions of input after edits.
 *
 * Usage:
 * ```typescript
 * const incTokenizer = new IncrementalTokenizer(tokenizer);
 * const tokens = incTokenizer.tokenize(input);
 *
 * // After an edit:
 * const newTokens = incTokenizer.update(newInput, { start: 10, end: 15, newText: 'foo' });
 * ```
 */
export class IncrementalTokenizer {
  private tokenizer: Tokenizer;
  private cache: TokenCache | null = null;

  // Edit accumulator state
  private pendingEdits: EditRange[] = [];
  private accumulatorConfig: EditAccumulatorConfig = {};
  private accumulatorTimer: ReturnType<typeof setTimeout> | null = null;
  private onAccumulatedUpdate: ((tokens: Token[]) => void) | null = null;

  constructor(tokenizer: Tokenizer) {
    this.tokenizer = tokenizer;
  }

  // ============================================
  // Core API
  // ============================================

  /**
   * Perform full tokenization with state tracking.
   * This establishes the initial token cache.
   */
  tokenize(input: string): Token[] {
    const tape = new Tape(input);
    this.tokenizer.reset();
    this.tokenizer.setState(0);

    const tokens: Token[] = [];
    let token: Token | null;

    while ((token = this.tokenizer.next(tape, null)) !== null) {
      token.state = this.tokenizer.getState();
      tokens.push(token);
    }

    this.computeLookbacks(tokens);
    this.cache = {
      tokens,
      input,
      suffixDelta: 0,
      suffixStartIdx: tokens.length,
    };
    return tokens;
  }

  /**
   * Apply a single edit and return updated tokens.
   * This is the primary incremental update method.
   */
  update(newInput: string, edit: EditRange): Token[] {
    if (!this.cache) {
      return this.tokenize(newInput);
    }

    // Materialize any pending lazy position updates first
    this.materializePositions();

    const delta = edit.newText.length - (edit.end - edit.start);

    // Phase 1: Find affected region using binary search
    const affectedStart = this.findAffectedStart(edit);

    // Phase 2: Re-lex from affected point until convergence
    const result = this.relexFrom(newInput, affectedStart, edit, delta);

    // Phase 3: Update lookbacks for affected region
    this.updateLookbacks(result.tokens, affectedStart);

    this.cache = {
      tokens: result.tokens,
      input: newInput,
      suffixDelta: result.suffixDelta,
      suffixStartIdx: result.suffixStartIdx,
    };

    return this.getTokens();
  }

  /**
   * Apply multiple edits in a single update.
   * Edits are processed in order and positions are adjusted accordingly.
   *
   * Note: Edits should be provided in document order (ascending by start position).
   * Earlier edits affect the positions of later edits.
   */
  updateBatch(newInput: string, edits: EditRange[]): Token[] {
    if (!this.cache || edits.length === 0) {
      return this.tokenize(newInput);
    }

    // For multiple edits, we need to track cumulative delta
    // and adjust each edit's positions accordingly
    let cumulativeDelta = 0;
    let currentInput = this.cache.input;
    let result: Token[] = this.cache.tokens;

    for (const edit of edits) {
      // Adjust edit positions by cumulative delta from previous edits
      const adjustedEdit: EditRange = {
        start: edit.start + cumulativeDelta,
        end: edit.end + cumulativeDelta,
        newText: edit.newText,
      };

      // Apply this edit
      const editDelta = edit.newText.length - (edit.end - edit.start);

      // Apply the edit to current input
      currentInput =
        currentInput.slice(0, adjustedEdit.start) +
        adjustedEdit.newText +
        currentInput.slice(adjustedEdit.end);

      result = this.update(currentInput, adjustedEdit);
      cumulativeDelta += editDelta;
    }

    return result;
  }

  // ============================================
  // Character-by-Character Edit Accumulation
  // ============================================

  /**
   * Configure edit accumulation for character-by-character updates.
   * When configured, individual edits are batched and applied together.
   *
   * @param config Configuration options
   * @param onUpdate Callback invoked when accumulated edits are applied
   */
  configureAccumulator(
    config: EditAccumulatorConfig,
    onUpdate: (tokens: Token[]) => void,
  ): void {
    this.accumulatorConfig = config;
    this.onAccumulatedUpdate = onUpdate;
  }

  /**
   * Add a single character edit to the accumulator.
   * The edit will be applied when maxEdits or maxDelayMs is reached.
   *
   * @param edit The character edit
   * @returns true if edits were flushed, false if still accumulating
   */
  accumulateEdit(edit: EditRange): boolean {
    this.pendingEdits.push(edit);

    const { maxEdits = 10, maxDelayMs = 16 } = this.accumulatorConfig;

    // Start timer if not already running
    if (this.accumulatorTimer === null && maxDelayMs > 0) {
      this.accumulatorTimer = setTimeout(() => {
        this.flushAccumulatedEdits();
      }, maxDelayMs);
    }

    // Flush if we've hit maxEdits
    if (this.pendingEdits.length >= maxEdits) {
      this.flushAccumulatedEdits();
      return true;
    }

    return false;
  }

  /**
   * Flush accumulated edits immediately.
   * Returns the updated tokens.
   *
   * The pendingEdits are in "current document" coordinates (i.e., positions
   * reflect the document state after all previous edits in the batch).
   * We need to transform them to "original document" coordinates for updateBatch.
   */
  flushAccumulatedEdits(): Token[] {
    if (this.accumulatorTimer !== null) {
      clearTimeout(this.accumulatorTimer);
      this.accumulatorTimer = null;
    }

    if (this.pendingEdits.length === 0) {
      return this.getTokens();
    }

    // Transform edits from current-coordinates to original-coordinates
    // cumulativeDelta tracks how positions have shifted due to previous edits
    let cumulativeDelta = 0;
    const originalEdits: EditRange[] = [];

    for (const edit of this.pendingEdits) {
      // Transform to original coordinates by subtracting cumulative delta
      // Example: after deleting 1 char, cumulativeDelta = -1
      // If user then edits at current position 3, original position = 3 - (-1) = 4
      const originalStart = edit.start - cumulativeDelta;
      const originalEnd = edit.end - cumulativeDelta;
      originalEdits.push({
        start: originalStart,
        end: originalEnd,
        newText: edit.newText,
      });

      cumulativeDelta += edit.newText.length - (edit.end - edit.start);
    }

    // Compute final input by applying original-coordinate edits
    // (updateBatch will also compute this, but we need it for the call)
    let input = this.cache?.input ?? "";
    let adjustmentDelta = 0;
    for (const edit of originalEdits) {
      const adjustedStart = edit.start + adjustmentDelta;
      const adjustedEnd = edit.end + adjustmentDelta;
      input =
        input.slice(0, adjustedStart) + edit.newText + input.slice(adjustedEnd);
      adjustmentDelta += edit.newText.length - (edit.end - edit.start);
    }

    this.pendingEdits = [];

    const tokens = this.updateBatch(input, originalEdits);

    if (this.onAccumulatedUpdate) {
      this.onAccumulatedUpdate(tokens);
    }

    return tokens;
  }

  /**
   * Insert a single character at the given position.
   * Convenience method for character-by-character editing.
   */
  insertChar(position: number, char: string): boolean {
    return this.accumulateEdit({
      start: position,
      end: position,
      newText: char,
    });
  }

  /**
   * Delete a single character at the given position.
   * Convenience method for character-by-character editing.
   */
  deleteChar(position: number): boolean {
    return this.accumulateEdit({
      start: position,
      end: position + 1,
      newText: "",
    });
  }

  /**
   * Replace a single character at the given position.
   * Convenience method for character-by-character editing.
   */
  replaceChar(position: number, char: string): boolean {
    return this.accumulateEdit({
      start: position,
      end: position + 1,
      newText: char,
    });
  }

  // ============================================
  // Token Access
  // ============================================

  /**
   * Get all tokens with positions fully materialized.
   */
  getTokens(): Token[] {
    this.materializePositions();
    return this.cache?.tokens ?? [];
  }

  /**
   * Get token at the given offset using binary search.
   */
  getTokenAt(offset: number): Token | null {
    const tokens = this.cache?.tokens ?? [];
    if (tokens.length === 0) return null;

    // Adjust offset if querying in suffix region with pending delta
    const adjustedOffset = this.adjustOffsetForQuery(offset);

    let lo = 0;
    let hi = tokens.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const tok = tokens[mid];
      const tokStart = this.getAdjustedStart(mid);
      const tokEnd = this.getAdjustedEnd(mid);

      if (adjustedOffset < tokStart) {
        hi = mid - 1;
      } else if (adjustedOffset >= tokEnd) {
        lo = mid + 1;
      } else {
        // Materialize this token's position before returning
        this.materializeTokenPosition(mid);
        return tok;
      }
    }
    return null;
  }

  /**
   * Get all tokens overlapping the given range.
   */
  getTokensInRange(start: number, end: number): Token[] {
    const tokens = this.cache?.tokens ?? [];
    if (tokens.length === 0) return [];

    // Find first token that ends after start
    let lo = 0;
    let hi = tokens.length - 1;
    let firstIdx = tokens.length;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const tokEnd = this.getAdjustedEnd(mid);
      if (tokEnd > start) {
        firstIdx = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    // Collect tokens until we find one starting after end
    const result: Token[] = [];
    for (let i = firstIdx; i < tokens.length; i++) {
      const tokStart = this.getAdjustedStart(i);
      if (tokStart >= end) break;
      this.materializeTokenPosition(i);
      result.push(tokens[i]);
    }

    return result;
  }

  /**
   * Get the current input text.
   */
  getInput(): string {
    return this.cache?.input ?? "";
  }

  // ============================================
  // Private: Core Algorithm
  // ============================================

  /**
   * Find the first affected token index using binary search.
   *
   * We need to find the first token that:
   * 1. Contains or follows the edit start position
   * 2. Account for lookback dependencies
   */
  private findAffectedStart(edit: EditRange): number {
    const tokens = this.cache!.tokens;
    if (tokens.length === 0) return 0;

    // Binary search for first token ending after edit.start
    let lo = 0;
    let hi = tokens.length - 1;
    let firstAffected = tokens.length;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const tok = tokens[mid];
      if (tok.end > edit.start) {
        firstAffected = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    if (firstAffected >= tokens.length) {
      // Edit is after all tokens
      return tokens.length > 0 ? tokens.length - 1 : 0;
    }

    // Go back by lookback count to find actual start
    const lookback = tokens[firstAffected].lookback ?? 1;
    return Math.max(0, firstAffected - lookback);
  }

  /**
   * Re-lex from the affected start index until convergence.
   *
   * Returns the new token array with lazy position updates for suffix.
   */
  private relexFrom(
    newInput: string,
    startIdx: number,
    edit: EditRange,
    delta: number,
  ): { tokens: Token[]; suffixDelta: number; suffixStartIdx: number } {
    const oldTokens = this.cache!.tokens;

    // Keep tokens before affected region (these are unchanged)
    const prefix = oldTokens.slice(0, startIdx);

    // Determine restart state and offset
    const startState = startIdx > 0 ? (oldTokens[startIdx - 1].state ?? 0) : 0;
    const startOffset = startIdx > 0 ? oldTokens[startIdx - 1].end : 0;

    // Create tape starting from the restart position
    const tape = new Tape(newInput.slice(startOffset));
    this.tokenizer.reset();
    this.tokenizer.setState(startState);

    // Re-lex until convergence
    const newTokens: Token[] = [];
    let token: Token | null;
    let convergeIdx = -1;

    // Calculate the end of the edit region in new input coordinates
    const editEndInNew = edit.start + edit.newText.length;

    while ((token = this.tokenizer.next(tape, null)) !== null) {
      // Adjust positions to be absolute (not relative to startOffset)
      token.start += startOffset;
      token.end += startOffset;
      token.state = this.tokenizer.getState();
      newTokens.push(token);

      // Only check for convergence AFTER we've passed the edit region
      // This prevents false convergence on tokens before the edit
      if (token.end > editEndInNew) {
        convergeIdx = this.findConvergencePoint(
          token,
          oldTokens,
          startIdx,
          delta,
        );
        if (convergeIdx >= 0) {
          break;
        }
      }
    }

    if (convergeIdx >= 0) {
      // We converged - suffix tokens can be reused with lazy position update
      // Don't clone suffix tokens, just reference them with a delta
      return {
        tokens: [...prefix, ...newTokens, ...oldTokens.slice(convergeIdx + 1)],
        suffixDelta: delta,
        suffixStartIdx: prefix.length + newTokens.length,
      };
    }

    // No convergence - all new tokens
    return {
      tokens: [...prefix, ...newTokens],
      suffixDelta: 0,
      suffixStartIdx: prefix.length + newTokens.length,
    };
  }

  /**
   * Find convergence point in old tokens using binary search.
   *
   * We're looking for an old token where:
   * - tag matches
   * - state matches
   * - position (adjusted by delta) matches
   *
   * Binary search is valid because tokens are ordered by position,
   * and we're searching for a specific adjusted position.
   */
  private findConvergencePoint(
    newToken: Token,
    oldTokens: Token[],
    searchStartIdx: number,
    delta: number,
  ): number {
    if (oldTokens.length === 0 || searchStartIdx >= oldTokens.length) {
      return -1;
    }

    // The new token's end position corresponds to oldToken.end + delta
    // So we're looking for oldToken where oldToken.end = newToken.end - delta
    const targetOldEnd = newToken.end - delta;

    // Binary search for token with matching end position
    let lo = searchStartIdx;
    let hi = oldTokens.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const oldTok = oldTokens[mid];

      if (oldTok.end < targetOldEnd) {
        lo = mid + 1;
      } else if (oldTok.end > targetOldEnd) {
        hi = mid - 1;
      } else {
        // Found token with matching end position
        // Verify full convergence criteria
        if (
          oldTok.tag === newToken.tag &&
          oldTok.state === newToken.state &&
          oldTok.start + delta === newToken.start
        ) {
          return mid;
        }
        // Position matched but other criteria didn't
        // This shouldn't happen in well-formed input, but handle it
        return -1;
      }
    }

    return -1;
  }

  // ============================================
  // Private: Lookback Computation
  // ============================================

  /**
   * Compute lookback values for all tokens.
   *
   * TODO: Implement precise lookback computation.
   *
   * Current implementation uses a conservative default of lookback=1,
   * which is correct but may cause more re-lexing than necessary.
   *
   * Why lookback=1 is sufficient (though not optimal):
   * - Lookback tracks how many preceding tokens' lookahead reaches into this token
   * - Most tokens have lookahead of 0 or 1 (characters read beyond the lexeme)
   * - With lookahead=1, only the immediately preceding token could be affected
   * - Therefore lookback=1 is a safe conservative bound
   *
   * For optimal performance, we would:
   * 1. Track actual lookahead during tokenization (chars read beyond lexeme end)
   * 2. Compute lookback as: max distance back where any token's lookahead reaches here
   * 3. Store non-default values in a sparse map
   *
   * Example where precise tracking helps:
   * - Token T1 has lookahead=3 (read 3 chars beyond its end)
   * - Token T2 is 1 char, token T3 is 1 char
   * - T3 should have lookback=2 (T1's lookahead reaches T3)
   * - With default lookback=1, editing T3 wouldn't re-check T1
   *
   * In practice, most lexers have lookahead ≤ 1, so this optimization
   * has diminishing returns. Implement when profiling shows it matters.
   */
  private computeLookbacks(tokens: Token[]): void {
    // Conservative default: every token could be affected by the previous one
    for (const token of tokens) {
      token.lookback = 1;
      token.lookahead = 1;
    }
  }

  /**
   * Update lookback values for tokens in the affected region.
   *
   * TODO: Implement precise lookback updates after re-lexing.
   * See computeLookbacks for details on the algorithm.
   */
  private updateLookbacks(tokens: Token[], fromIdx: number): void {
    for (let i = fromIdx; i < tokens.length; i++) {
      tokens[i].lookback = 1;
      tokens[i].lookahead = 1;
    }
  }

  // ============================================
  // Private: Lazy Position Materialization
  // ============================================

  /**
   * Get adjusted start position for a token, accounting for lazy delta.
   */
  private getAdjustedStart(idx: number): number {
    const tokens = this.cache!.tokens;
    const tok = tokens[idx];
    if (idx >= this.cache!.suffixStartIdx) {
      return tok.start + this.cache!.suffixDelta;
    }
    return tok.start;
  }

  /**
   * Get adjusted end position for a token, accounting for lazy delta.
   */
  private getAdjustedEnd(idx: number): number {
    const tokens = this.cache!.tokens;
    const tok = tokens[idx];
    if (idx >= this.cache!.suffixStartIdx) {
      return tok.end + this.cache!.suffixDelta;
    }
    return tok.end;
  }

  /**
   * Adjust a query offset for lazy delta (for binary search).
   */
  private adjustOffsetForQuery(offset: number): number {
    // Query offsets are in "new" coordinate space
    // We need to be careful about the boundary
    return offset;
  }

  /**
   * Materialize position for a single token.
   */
  private materializeTokenPosition(idx: number): void {
    if (!this.cache || idx < this.cache.suffixStartIdx) return;
    if (this.cache.suffixDelta === 0) return;

    const tok = this.cache.tokens[idx];
    tok.start += this.cache.suffixDelta;
    tok.end += this.cache.suffixDelta;
  }

  /**
   * Materialize all lazy position updates.
   * Called before returning tokens to ensure positions are accurate.
   */
  private materializePositions(): void {
    if (!this.cache || this.cache.suffixDelta === 0) return;

    const { tokens, suffixDelta, suffixStartIdx } = this.cache;

    for (let i = suffixStartIdx; i < tokens.length; i++) {
      tokens[i].start += suffixDelta;
      tokens[i].end += suffixDelta;
    }

    this.cache.suffixDelta = 0;
    this.cache.suffixStartIdx = tokens.length;
  }
}
