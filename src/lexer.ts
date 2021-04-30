import * as TSU from "@panyam/tsutils";
import { Regex, Union, Rule } from "./core";
import { RegexParser } from "./parser";
import { Prog, Match as VMMatch, VM } from "./vm";
import { Compiler } from "./compiler";
import { Tape } from "./tape";

export class Match {
  value = null as TSU.Nullable<string>;
  groups: TSU.NumMap<number[]> = {};
  positions: TSU.NumMap<[number, number]> = {};
  constructor(public readonly matchIndex: number, public readonly start: number, public readonly end: number) {}
}

export function toMatch(m: VMMatch, tape: Tape | null): Match {
  const out = new Match(m.matchIndex, m.start, m.end);
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

export class Lexer {
  // Stores named rules
  // Rules are a "regex", whether literal or not
  allRules: Rule[] = [];
  externs = new Set<string>();
  variables = new Map<string, Regex>();
  vm: VM;
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
    return this;
  }

  compile(): Prog {
    const sortedRules = this.sortRules().map(([r, i]) => r);
    const prog = this.compiler.compile(sortedRules);
    this.vm = new VM(prog);
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

  next(tape: Tape): Match | null {
    const m = this.vm.match(tape);
    return m == null ? null : toMatch(m, tape);
  }
}
