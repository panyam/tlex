export abstract class TapeInterface {
  index = 0;
  abstract readonly hasMore: boolean;
  abstract charAt(index: number): string;
  abstract hasIndex(index: number): boolean;
  abstract substring(startIndex: number, endIndex: number): string;

  constructor(public forward = true) {}

  advance(delta = 1): boolean {
    const next = this.forward ? this.index + delta : this.index - delta;
    // if !this.hasIndex(next)) return false;
    this.index = next;
    return true;
  }

  canAdvance(delta = 1): boolean {
    const next = this.forward ? this.index + delta : this.index - delta;
    return this.hasIndex(next);
  }

  get currCh(): string {
    return this.charAt(this.index);
  }

  get prevCh(): string {
    return this.charAt(this.index - (this.forward ? 1 : -1));
  }

  get nextCh(): string {
    const next = this.index + (this.forward ? 1 : -1);
    return this.charAt(next);
  }

  get currChCode(): number {
    if (!this.hasMore) return -1;
    return this.currCh.charCodeAt(0);
    // return this.input.charCodeAt(this.index);
  }

  get currChCodeLower(): number {
    if (!this.hasMore) return -1;
    return this.currCh.toLowerCase().charCodeAt(0);
  }

  get currChCodeUpper(): number {
    if (!this.hasMore) return -1;
    return this.currCh.toUpperCase().charCodeAt(0);
  }

  charCodeAt(index: number): number {
    if (!this.hasIndex(index)) return -1;
    return this.charAt(index).charCodeAt(0);
  }

  charCodeAtLower(index: number): number {
    if (!this.hasIndex(index)) return -1;
    return this.charAt(index).toLowerCase().charCodeAt(0);
  }

  charCodeAtUpper(index: number): number {
    if (!this.hasIndex(index)) return -1;
    return this.charAt(index).toUpperCase().charCodeAt(0);
  }
}

/**
 * A Tape of characters we would read with some extra helpers like rewinding
 * forwarding and prefix checking that is fed into the different tokenizers
 * used by the scannerless parsers.
 */
export class Tape extends TapeInterface {
  protected _rawInput: string;
  readonly input: string[];

  constructor(input: string, public forward = true) {
    super(forward);
    this._rawInput = input;
    this.input = [...input];
  }

  push(content: string): void {
    this._rawInput += content;
    this.input.push(...content);
  }

  substring(startIndex: number, endIndex: number): string {
    return this._rawInput.substring(startIndex, endIndex);
    // return this.input.slice(startIndex, endIndex).join("");
  }

  get hasMore(): boolean {
    return this.forward ? this.index < this.input.length : this.index > 0;
  }

  hasIndex(index: number): boolean {
    return index >= 0 && index < this.input.length;
  }

  charAt(index: number): string {
    if (index < 0 || index >= this.input.length) return "";
    return this.input[index];
  }
}

export class TapeHelper {
  /**
   * Advances the tape to the end of the first occurence of
   * the given pattern.
   */
  static advanceAfter(tape: TapeInterface, pattern: string, ensureNoPrefixSlash = true): number {
    let pos = TapeHelper.advanceTo(tape, pattern, ensureNoPrefixSlash);
    if (pos >= 0) {
      pos += pattern.length;
      tape.index = pos;
    }
    return pos;
  }

  /**
   * Advances the tape till the start of a given pattern.
   * This is not the most optimal implementation and just does a brute
   * force search at each index.  Instead using the Regex interface
   * directly will be faster.
   */
  static advanceTo(tape: TapeInterface, pattern: string, ensureNoPrefixSlash = true): number {
    const lastIndex = tape.index;
    while (tape.hasMore) {
      const currStart = tape.index;
      if (TapeHelper.matches(tape, pattern)) {
        const endIndex = tape.index;
        tape.index = currStart;
        let numSlashes = 0;
        if (ensureNoPrefixSlash) {
          for (let i = endIndex - 1; i >= 0; i--) {
            if (tape.charAt(i) == "\\") numSlashes++;
            else break;
          }
        }
        if (numSlashes % 2 == 0) {
          return tape.index;
        }
      }
      tape.advance(1);
    }
    tape.index = lastIndex;
    throw new Error(`Unexpected end of input before (${pattern})`);
    return -1;
  }

  /**
   * Tells if the given prefix is matche at the current position of the tokenizer.
   */
  static matches(tape: TapeInterface, prefix: string, advance = true): boolean {
    const lastIndex = tape.index;
    let i = 0;
    let success = true;
    for (; i < prefix.length; i++) {
      if (prefix[i] != tape.currCh) {
        success = false;
        break;
      }
      tape.advance(1);
    }
    // Reset pointers if we are only peeking or match failed
    if (!advance || !success) {
      tape.index = lastIndex;
    }
    return success;
  }
}
