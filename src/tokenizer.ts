import * as TSU from "@panyam/tsutils";
import { Regex, Union, Rule, RuleConfig } from "./core";
import { Prog, Match, VM } from "./vm";
import { Compiler } from "./compiler";
import { Tape } from "./tape";
import { TokenizerError, UnexpectedTokenError } from "./errors";
import * as Builder from "./builder";

export type TokenType = number | string;
export type RuleMatchHandler = (rule: Rule, tape: Tape, token: any, owner: any) => any;

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

export function toToken(tag: TokenType, m: Match, tape: Tape | null): Token {
  const out = new Token(tag, m.matchIndex, m.start, m.end);
  for (let i = 0; i < m.positions.length; i += 2) {
    if (m.positions[i] >= 0) {
      out.positions[Math.floor(i / 2)] = [m.positions[i], m.positions[i + 1]];
    }
  }
  for (const [groupIndex, tapeIndex] of m.groups) {
    const gi = Math.abs(groupIndex);
    if (!(gi in out.groups)) {
      out.groups[gi] = [];
    }
    out.groups[gi].push(tapeIndex);
  }
  if (tape != null) out.value = tape.substring(m.start, m.end);
  return out;
}

export class Tokenizer {
  protected _vm: VM | null = null;
  // Stores named rules
  // Rules are a "regex", whether literal or not
  allRules: Rule[] = [];
  onMatchHandlers: (RuleMatchHandler | null)[] = [];
  matchHandlersByValue: any = {};
  variables = new Map<string, Regex>();
  compiler: Compiler = new Compiler((name) => {
    let out = this.variables.get(name) || null;
    if (out == null) out = this.findRuleByValue(name)?.expr || null;
    if (out == null) throw new Error(`Invalid regex reference: ${name}`);
    return out;
  });

  getVar(name: string): Regex | null {
    return this.variables.get(name) || null;
  }

  addVar(name: string, regex: Regex): this {
    let currValue = this.variables.get(name) || null;
    if (currValue == null) {
      currValue = regex;
    } else {
      currValue = new Union(currValue, regex);
    }
    this.variables.set(name, regex);
    return this;
  }

  findRuleByValue(value: any): Rule | null {
    return this.allRules.find((r) => r.tag == value) || null;
  }

  add(pattern: string | RegExp | Regex, config?: RuleConfig, onMatch: RuleMatchHandler | null = null): this {
    return this.addRule(Builder.build(pattern, config), onMatch);
  }

  addRule(rule: Rule, onMatch: null | RuleMatchHandler = null): this {
    rule.matchIndex = this.allRules.length;
    this.allRules.push(rule);
    this.onMatchHandlers.push(onMatch);
    this._vm = null;
    return this;
  }

  /**
   * Add a token match callback by value.
   */
  on(tag: any, onMatch: RuleMatchHandler): this {
    this.matchHandlersByValue[tag] = onMatch;
    return this;
  }

  compile(): Prog {
    const sortedRules = this.sortRules();
    const prog = this.compiler.compile(sortedRules);
    this._vm = new VM(prog);
    return prog;
  }

  sortRules(): Rule[] {
    // Sort rules so high priority ones appear first
    const sortedRules: Rule[] = this.allRules.map((rule) => rule);
    sortedRules.sort((r1, r2) => {
      if (r1.priority != r2.priority) return r2.priority - r1.priority;
      return r1.matchIndex - r2.matchIndex;
    });
    return sortedRules;
  }

  get vm(): VM {
    if (this._vm == null) {
      this.compile();
    }
    return this._vm!;
  }

  idCounter = 0;
  next(tape: Tape, owner: any): Token | null {
    if (!tape.hasMore) {
      return null;
    }
    const startIndex = tape.index;
    const startChar = tape.currCh;
    const m = this.vm.match(tape);
    if (m == null) {
      if (tape.index == startIndex + 1) {
        throw new TokenizerError(`Unexpected Character: ${startChar}`, startIndex, 1, "UnexpectedCharacter", startChar);
      } else {
        throw new TokenizerError(
          `Unexpected Symbol: ${tape.substring(startIndex, tape.index)}`,
          startIndex,
          tape.index - startIndex,
          "UnexpectedLexeme",
        );
      }
    }
    const rule = this.allRules[m.matchIndex];
    let token = toToken(rule.tag, m, tape);
    token.id = this.idCounter++;
    let onMatch = this.onMatchHandlers[m.matchIndex];
    if (!onMatch) {
      onMatch = this.matchHandlersByValue[rule.tag];
    }
    if (onMatch) {
      token = onMatch(rule, tape, token, owner);
      if (token == null) {
        // null is returned by onMatch to skip tokens
        return this.next(tape, owner);
      }
    }
    return token;
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
