import * as TSU from "@panyam/tsutils";
import { Regex, Union, Rule, RuleConfig } from "./core";
import { Prog, Match, VM } from "./vm";
import { Compiler } from "./compiler";
import { TapeInterface as Tape } from "./tape";
import { TokenizerError } from "./errors";
import * as Builder from "./builder";
import { Token, TokenType } from "./token";

export type RuleMatchHandler = (rule: Rule, tape: Tape, token: any, owner: any) => any;

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

export class BaseTokenizer {
  protected _prog: Prog | null = null;
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
    this._prog = null;
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

  get prog(): Prog {
    if (this._prog == null) {
      const sortedRules = this.sortRules();
      this._prog = this.compiler.compile(sortedRules);
    }
    return this._prog;
  }

  get vm(): VM {
    if (this._vm == null) {
      this._vm = new VM(this.prog);
    }
    return this._vm;
  }

  protected sortRules(): Rule[] {
    // Sort rules so high priority ones appear first
    const sortedRules: Rule[] = this.allRules.map((rule) => rule);
    sortedRules.sort((r1, r2) => {
      if (r1.priority != r2.priority) return r2.priority - r1.priority;
      return r1.matchIndex - r2.matchIndex;
    });
    return sortedRules;
  }
}

export class Tokenizer extends BaseTokenizer {
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

  tokenize(tape: Tape, owner: any = null): Token[] {
    const tokens = [] as Token[];
    let next = this.next(tape, owner);
    while (next) {
      tokens.push(next);
      try {
        next = this.next(tape, owner);
      } catch (err: any) {
        console.log("Error: ", err);
        tokens.push({
          tag: "ERROR",
          start: err.offset,
          end: err.offset + err.length,
          value: err.message,
        } as Token);
        break;
      }
    }
    return tokens;
  }
}
