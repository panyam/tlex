import * as TSU from "@panyam/tsutils";
import {
  Quant,
  RegexType,
  StartOfInput,
  EndOfInput,
  Regex,
  Cat,
  Char,
  CharType,
  Var,
  BackNamedRef,
  BackNumRef,
  LookAhead,
  LookBack,
  Union,
} from "./core";
import { CharClassType } from "./charclasses";

class GroupCounter {
  value = -1;
  next(): number {
    return ++this.value;
  }
  get current(): number {
    return this.value;
  }
}

export abstract class RegexParser {
  counter: GroupCounter;
  constructor(public readonly pattern: string, config?: any) {
    this.counter = new GroupCounter();
  }

  reduceLeft(stack: Regex[]): Regex {
    const r = stack.length == 1 ? stack[0] : new Cat(...stack);
    // remove all elements on stack
    stack.splice(0);
    return r;
  }

  /**
   * Creates a regex tree given a string
   */
  abstract parse(curr: number, end: number): Regex;

  parseQuant(stack: Regex[], curr: number, end: number): number {
    const pattern = this.pattern;
    const lastCh = pattern[curr - 1];
    let minCount = 1,
      maxCount = 1;
    if (pattern[curr] == "*") {
      minCount = 0;
      maxCount = TSU.Constants.MAX_INT;
    } else if (pattern[curr] == "+") {
      minCount = Math.min(minCount, 1);
      maxCount = TSU.Constants.MAX_INT;
    } else if (pattern[curr] == "?") {
      minCount = 0;
      maxCount = Math.max(maxCount, 1);
    } else if (pattern[curr] == "{") {
      // find the next "}"
      const clPos = pattern.indexOf("}", curr + 1);
      if (clPos <= curr || clPos > end) {
        throw new SyntaxError("Unexpected end of input while looking for '}'");
      }
      const sub = pattern.substring(curr + 1, clPos).trim();
      const parts = sub.split(",").map((x) => parseInt(x.trim()));
      curr = clPos;
      if (parts.length == 1) {
        if (isNaN(parts[0])) {
          if (sub.trim().length > 0) {
            stack.push(new Var(sub.trim()));
            return curr + 1;
          } else {
            throw new SyntaxError(`Invalid quantifier: /${sub}/`);
          }
        }
        minCount = maxCount = parts[0];
      } else if (parts.length == 2) {
        minCount = isNaN(parts[0]) ? 0 : parts[0];
        maxCount = isNaN(parts[1]) ? TSU.Constants.MAX_INT : parts[1];
        if (minCount > maxCount) {
          throw new SyntaxError(`Invalid Quant /${sub}/: Min must be <= Max`);
        }
      } else if (parts.length > 2) {
        throw new SyntaxError(`Invalid quantifier spec: "{${sub}}"`);
      }
    } else {
      throw new Error("Here?");
    }
    // Quantifiers
    if (stack.length <= 0) {
      throw new SyntaxError("Quantifier cannot appear before an expression");
    }
    // no optimizations - convert the last one into a Quantifier
    // and we will start to fill in the quantities and greediness
    const last = stack[stack.length - 1];
    if (last.tag == RegexType.QUANT && (lastCh == "*" || lastCh == "?" || lastCh == "+" || lastCh == "}")) {
      throw new SyntaxError("Nothing to repeat");
    }
    if (this.unicode && (last.tag == RegexType.LOOK_AHEAD || last.tag == RegexType.LOOK_BACK)) {
      throw new SyntaxError("Cannot have quantifier on assertion in unicode mode");
    }
    const quant = (stack[stack.length - 1] = new Quant(last));
    quant.minCount = minCount;
    quant.maxCount = maxCount;
    // check if there is an extra lazy quantifier
    curr++;
    if (curr <= end && pattern[curr] == "?" && quant.greedy) {
      curr++;
      quant.greedy = false;
    }
    return curr;
  }
}
