import * as TSU from "@panyam/tsutils";
import { Tape, TapeHelper } from "./tape";
import { Token, TokenType } from "./tokenizer";
import { TokenizerError } from "./errors";

/**
 * A simple tokenize that matches the input to a set of matchers one by one.
 */
export type TokenMatcher = (_: Tape, pos: number) => TSU.Nullable<Token>;
export class SimpleTokenizer {
  private peekedToken: TSU.Nullable<Token> = null;
  tape: Tape;
  // TODO  - convert literals into a trie
  literals: [string, TokenType][] = [];
  matchers: [TokenMatcher, boolean][] = [];

  constructor(tape: string | Tape) {
    if (typeof tape === "string") {
      tape = new Tape(tape);
    }
    this.tape = tape;
  }

  addMatcher(matcher: TokenMatcher, skip = false): this {
    this.matchers.push([matcher, skip]);
    return this;
  }

  addLiteral(lit: string, tokType: TokenType): number {
    const index = this.literals.findIndex((k) => k[0] == lit);
    if (index < 0) {
      this.literals.push([lit, tokType]);
      return this.literals.length - 1;
    } else {
      if (this.literals[index][1] != tokType) {
        throw new Error(`Literal '${lit}' already registered as ${tokType}`);
      }
      return index;
    }
  }

  /**
   * Performs the real work of extracting the next token from
   * the tape based on the current state of the tokenizer.
   * This can be overridden to do any other matchings to be prioritized first.
   * Returns NULL if end of input reached.
   */
  nextToken(): TSU.Nullable<Token> {
    // go through all literals first
    if (!this.tape.hasMore) return null;
    const pos = this.tape.index;
    // const line = this.tape.currLine;
    // const col = this.tape.currCol;
    for (let i = 0; i < this.literals.length; i++) {
      const [kwd, toktype] = this.literals[i];
      if (TapeHelper.matches(this.tape, kwd)) {
        const out = new Token(toktype, i, pos, this.tape.index);
        out.value = kwd;
        return out;
      }
    }
    for (let i = 0; i < this.matchers.length; i++) {
      const [matcher, skip] = this.matchers[i];
      const token = matcher(this.tape, pos);
      if (token != null) {
        if (skip) {
          return this.nextToken();
        } else {
          token.start = pos;
          token.end = this.tape.index;
          return token;
        }
      }
    }
    // Fall through - error char found
    // throw new Error(`Line ${this.tape.currLine}, Col ${this.tape.currCol} - Invalid character: ${this.tape.currCh}`);
    throw new TokenizerError(this.tape.index, `Invalid character: [${this.tape.currCh}]`);
  }
}
