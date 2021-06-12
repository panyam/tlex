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

export class GroupCounter {
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
}
