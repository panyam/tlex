import * as TSU from "@panyam/tsutils";
import { Tape } from "./tape";
import { TokenizerError, UnexpectedTokenError } from "./errors";

export type TokenType = number | string;

export class Token {
  private static idCounter = 0;
  // ID for uniquely identifying tokens if needed for shallow equality
  id = Token.idCounter++;
  value: any = null;
  groups: TSU.NumMap<number[]> = {};
  positions: TSU.NumMap<[number, number]> = {};
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
