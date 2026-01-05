import * as TSU from "@panyam/tsutils";
import { TapeInterface as Tape } from "./tape";
import { TokenizerError, UnexpectedTokenError } from "./errors";

export type TokenType = number | string;

export class Token {
  private static idCounter = 0;
  // ID for uniquely identifying tokens if needed for shallow equality
  id = Token.idCounter++;
  value: any = null;
  groups: TSU.NumMap<number[]> = {};
  positions: TSU.NumMap<[number, number]> = {};

  // Incremental lexing support fields
  /**
   * Lexer state when this token was constructed.
   * 0 = INITIAL state. Higher numbers represent other states (e.g., inside string, comment).
   * Used for incremental lexing to restart from a token boundary.
   */
  state = 0;

  /**
   * Number of characters read beyond this token's lexeme to determine it.
   * Most tokens need 1 char lookahead to know they're complete (e.g., identifier ends on non-alnum).
   * Used for incremental lexing dependency tracking.
   */
  lookahead = 1;

  /**
   * Number of preceding tokens whose lookahead reaches this token.
   * Default 1 means the previous token's lookahead extends into this token.
   * Used for incremental lexing to find affected region on edit.
   */
  lookback = 1;

  constructor(public tag: TokenType, public readonly matchIndex: number, public start: number, public end: number) {}

  isOneOf(...expected: any[]): boolean {
    for (const tok of expected) {
      if (this.tag == tok) {
        return true;
      }
    }
    return false;
  }
}

export type NextTokenFunc = (tape: Tape, owner: any) => TSU.Nullable<Token>;

/**
 * A wrapper on a tokenizer for providing features like k-lookahead, token
 * insertion, rewinding, expectation enforcement etc.
 */
export class TokenBuffer {
  buffer: Token[] = [];

  constructor(public readonly nextToken: NextTokenFunc, public tokenizerContext: any) {}

  next(tape: Tape): TSU.Nullable<Token> {
    const out = this.peek(tape);
    if (out != null) {
      this.consume();
    }
    return out;
  }

  /**
   * Peek at the nth token in the token stream.
   */
  peek(tape: Tape, nth = 0): TSU.Nullable<Token> {
    while (this.buffer.length <= nth) {
      const tok = this.nextToken(tape, this.tokenizerContext);
      if (tok == null) return null;
      this.buffer.push(tok);
    }
    return this.buffer[nth];
  }

  match(
    tape: Tape,
    matchFunc: (token: Token) => boolean,
    ensure = false,
    consume = true,
    nextAction?: (token: Token) => boolean | undefined,
  ): TSU.Nullable<Token> {
    const token = this.peek(tape);
    if (token != null) {
      if (matchFunc(token)) {
        if (nextAction && nextAction != null) {
          nextAction(token);
        }
        if (consume) {
          this.consume();
        }
      } else if (ensure) {
        // Should we throw an error?
        throw new UnexpectedTokenError(token);
      } else {
        return null;
      }
    } else if (ensure) {
      throw new TokenizerError("Unexpected end of input", -1, 0, "UnexpectedEndOfInput");
    }
    return token;
  }

  consume(): void {
    this.buffer.splice(0, 1);
  }

  consumeIf(tape: Tape, ...expected: TokenType[]): TSU.Nullable<Token> {
    return this.match(tape, (t) => t.isOneOf(...expected));
  }

  expectToken(tape: Tape, ...expected: TokenType[]): Token {
    return this.match(tape, (t) => t.isOneOf(...expected), true, true) as Token;
  }

  ensureToken(tape: Tape, ...expected: TokenType[]): Token {
    return this.match(tape, (t) => t.isOneOf(...expected), true, false) as Token;
  }

  nextMatches(tape: Tape, ...expected: TokenType[]): TSU.Nullable<Token> {
    const token = this.peek(tape);
    if (token == null) return null;
    for (const tok of expected) {
      if (token.tag == tok) return token;
    }
    return null;
  }
}
