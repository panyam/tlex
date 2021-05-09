import * as TSU from "@panyam/tsutils";
import { Regex, Union, Rule } from "./core";
import { RegexParser } from "./parser";
import { Prog, Match, VM } from "./vm";
import { Compiler } from "./compiler";
import { Tape } from "./tape";
import { ParseError, UnexpectedTokenError } from "./errors";

export type TokenType = number | string;

export class Token {
  value: any = null;
  groups: TSU.NumMap<number[]> = {};
  positions: TSU.NumMap<[number, number]> = {};
  constructor(
    public readonly tag: TokenType,
    public readonly matchIndex: number,
    public start: number,
    public end: number,
  ) {}

  isOneOf(...expected: any[]): boolean {
    for (const tok of expected) {
      if (this.tag == tok) {
        return true;
      }
    }
    return false;
  }
}

export function toToken(tokenType: TokenType, m: Match, tape: Tape | null): Token {
  const out = new Token(tokenType, m.matchIndex, m.start, m.end);
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
  externs = new Set<string>();
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

  addExtern(name: string): this {
    this.externs.add(name);
    return this;
  }

  addVar(name: string, regex: string | Regex): this {
    if (typeof regex === "string") {
      regex = new RegexParser(regex).parse();
    }
    let currValue = this.variables.get(name) || null;
    if (currValue == null) {
      currValue = regex;
    } else {
      currValue = new Union(currValue, regex);
    }
    this.variables.set(name, regex);
    return this;
  }

  findRulesByRegex(pattern: string): Rule[] {
    return this.allRules.filter((r) => r.pattern == pattern);
  }

  findRuleByValue(value: any): Rule | null {
    return this.allRules.find((r) => r.tokenType == value) || null;
  }

  addRule(rule: Rule): this {
    const old = this.allRules.findIndex((r) => r.tokenType == rule.tokenType);
    if (old >= 0) {
      const oldRule = this.allRules[old];
      if (oldRule.pattern != rule.pattern) {
        rule = new Rule(oldRule.pattern + "|" + rule.pattern, oldRule.tokenType, oldRule.priority, oldRule.isGreedy);
        this.allRules[old] = rule;
      }
    } else {
      this.allRules.push(rule);
    }
    rule.expr = new RegexParser(rule.pattern).parse();
    this._vm = null;
    return this;
  }

  compile(): Prog {
    const sortedRules = this.sortRules().map(([r, i]) => r);
    const prog = this.compiler.compile(sortedRules);
    this._vm = new VM(prog);
    return prog;
  }

  sortRules(): [Rule, number][] {
    // Sort rules so high priority ones appear first
    const sortedRules: [Rule, number][] = this.allRules.map((rule, index) => [rule, index]);
    sortedRules.sort((x, y) => {
      const [r1, i1] = x;
      const [r2, i2] = y;
      if (r1.priority != r2.priority) return r2.priority - r1.priority;
      return i1 - i2;
    });
    return sortedRules;
  }

  get vm(): VM {
    if (this._vm == null) {
      this.compile();
    }
    return this._vm!;
  }

  next(tape: Tape): Token | null {
    const m = this.vm.match(tape);
    return m == null ? null : toToken(this.allRules[m.matchIndex].tokenType, m, tape);
  }
}

export type NextTokenFunc = (tape: Tape) => TSU.Nullable<Token>;
/**
 * A wrapper on a tokenizer for providing features like k-lookahead, token
 * insertion, rewinding, expectation enforcement etc.
 */
export class TokenBuffer {
  nextToken: NextTokenFunc;
  buffer: Token[] = [];

  constructor(nextToken: NextTokenFunc) {
    this.nextToken = nextToken;
  }

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
      const tok = this.nextToken(tape);
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
      throw new ParseError(-1, "Unexpected end of input.");
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
