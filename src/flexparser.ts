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
import { RegexParser as BaseRegexParser } from "./parser";

export class RegexParser extends BaseRegexParser {
  constructor(public readonly pattern: string, config?: any) {
    super(pattern, config);
  }

  /**
   * Creates a regex tree given a string
   */
  parse(curr = 0, end = -1, ignoreCase = false, anyWithNL = false, ignoreComments = false): Regex {
    const pattern = this.pattern;
    const stack: Regex[] = [];
    if (end < 0) end = pattern.length - 1;
    while (curr <= end) {
      const currCh = pattern[curr];
      // see if we have groups so they get highest preference
      if (currCh == ".") {
        stack.push(Char.Any());
        curr++;
      } else if (currCh == "[") {
        // character ranges
        let clPos = curr + 1;
        while (clPos <= end && pattern[clPos] != "]") {
          if (pattern[clPos] == "\\") clPos++;
          clPos++;
        }
        if (clPos > end) throw new SyntaxError("Expected ']' found EOI");
        stack.push(this.parseCharGroup(curr + 1, clPos - 1));
        curr = clPos + 1;
      } else if (currCh == "^") {
        stack.push(new StartOfInput());
        curr++;
      } else if (currCh == "$") {
        stack.push(new EndOfInput());
        curr++;
      } else if (pattern[curr] == "*" || pattern[curr] == "?" || pattern[curr] == "+" || pattern[curr] == "{") {
        curr = this.parseQuant(stack, curr, end);
      } else if (currCh == "|") {
        if (curr + 1 <= end) {
          // reduce everything "until now" and THEN apply
          const prev = this.reduceLeft(stack);
          // this.parse everything to the right
          const rest = this.parse(curr + 1, end);
          return new Union(prev, rest);
        }
        curr = end + 1;
      } else if (currCh == "(") {
        curr = this.parseGroup(stack, curr, end);
      } else if (currCh == ")" || currCh == "]" || currCh == "}") {
        throw new SyntaxError(`Unmatched ${currCh}.  Try using \\${currCh}`);
      } else {
        // plain old alphabets
        const [result, nchars] = this.parseChar(curr, end);
        stack.push(result);
        curr += nchars;
      }
    }
    if (stack.length <= 0) {
      // throw new SyntaxError(`Invalid Regex (${curr} - ${end}): ${pattern}`);
    }
    if (stack.length == 1) return stack[0];
    return new Cat(...stack);
  }

  parseGroup(stack: Regex[], curr: number, end: number): number {
    // we have a grouping or an assertion
    let clPos = curr + 1;
    let depth = 0;
    const pattern = this.pattern;
    while (clPos <= end && (pattern[clPos] != ")" || depth > 0)) {
      if (pattern[clPos] == "(") depth++;
      else if (pattern[clPos] == ")") depth--;
      if (pattern[clPos] == "\\") clPos++;
      clPos++;
    }
    if (clPos > end) throw new SyntaxError("Expected ')' found EOI");

    curr++;
    if (pattern[curr] == "?") {
      // special patterns of the form:
      // (?r-s:pattern)
    } else {
      // plain old grouping of the form (xyz)
      const groupIndex = this.counter.next();
      let neg = false;
      if (pattern[curr] == "^") {
        neg = true;
        curr++;
      }
      let subExpr = this.parse(curr, clPos - 1);
      // if (neg) subExpr = new Neg(subExpr);
      // Do the next before the previous call if we want group
      // index to match outer brackets first
      if (subExpr.groupIndex >= 0) {
        // Already set so create cat
        subExpr = new Cat(subExpr);
      }
      subExpr.groupIndex = groupIndex;
      stack.push(subExpr);
    }
    return clPos + 1;
  }

  parseCharGroup(curr: number, end: number): Char {
    const out: Char[] = [];
    // first see which characters are in this (until the end)
    let i = curr;
    let neg = false;
    const pattern = this.pattern;
    if (pattern[i] == "^") {
      neg = true;
      i++;
    }
    for (; i <= end; ) {
      const [currch, nchars] = this.parseChar(i, end);
      i += nchars;
      if (i < pattern.length && pattern[i] == "-") {
        i++;
        if (i <= end) {
          const [endch, nchars] = this.parseChar(i, end);
          if (currch.op != CharType.SingleChar || endch.op != CharType.SingleChar) {
            throw new SyntaxError("Char range cannot start or end in a char class");
          }
          if (endch.args[0] < currch.args[0]) {
            throw new SyntaxError("End cannot be less than start");
          }
          // currch.end = endch.start;
          out.push(Char.Range(currch.args[0], endch.args[0]));
          i += nchars;
        }
      } else {
        out.push(currch);
      }
    }
    return Char.Group(neg, ...out);
  }

  parseChar(index = 0, end = 0): [Char, number] {
    if (this.pattern[index] == "\\") {
      return this.parseEscapeChar(index, end);
    } else {
      return this.parseSingleChar(index, end);
    }
  }

  parseSingleChar(index = 0, end = 0): [Char, number] {
    // single char
    const ch = this.pattern.charCodeAt(index);
    return [Char.Single(ch), 1];
  }

  parsePropertyEscape(index = 0, end = 0): [Char, number] {
    const pattern = this.pattern;
    if (pattern[index] + 1 != "{") {
      throw new SyntaxError("Invalid property escape");
    }
    index += 2;
    let clEnd = index;
    let eqPos = -1;
    while (clEnd <= end && pattern[clEnd] != "}") {
      if (pattern[clEnd] == "=") eqPos = clEnd;
      clEnd++;
    }
    if (clEnd > end) {
      throw new SyntaxError("Invalid property escape");
    }
    // see if this is a lone property escape
    const propStr = pattern.substring(index, clEnd);
    let propName = "General_Category";
    let propValue = propStr;
    if (eqPos >= 0) {
      const parts = propStr.split("=");
      if (parts.length != 2) throw new SyntaxError("Invalid property escape");
      propName = parts[0].trim();
      propValue = parts[1].trim();
    }
    return [Char.PropertyEscape(propName, propValue), 2 + clEnd + 1 - index];
  }

  parseEscapeChar(index = 0, end = 0): [Char, number] {
    const pattern = this.pattern;
    TSU.assert(pattern[index] == "\\", "Expected '\\'");
    // escape char
    index++;
    if (index > end) {
      throw new SyntaxError("Encounted unexpected end of input after \\");
    }
    const ch = pattern[index];
    switch (ch) {
      // char classes
      case "w":
        return [Char.Class(CharClassType.WORD_CHAR), 2];
      case "W":
        return [Char.Class(CharClassType.WORD_CHAR, true), 2];
      case "d":
        return [Char.Class(CharClassType.DIGITS), 2];
      case "D":
        return [Char.Class(CharClassType.DIGITS, true), 2];
      case "s":
        return [Char.Class(CharClassType.SPACES), 2];
      case "S":
        return [Char.Class(CharClassType.SPACES, true), 2];
      case "0":
        return [Char.Single("\0"), 2];
      case "r":
        return [Char.Single("\r"), 2];
      case "n":
        return [Char.Single("\n"), 2];
      case "f":
        return [Char.Single("\f"), 2];
      case "b":
        return [Char.Single("\b"), 2];
      case "v":
        return [Char.Single("\v"), 2];
      case "t":
        return [Char.Single("\t"), 2];
      case "\\":
        return [Char.Single("\\"), 2];
      case "'":
        return [Char.Single("'"), 2];
      case '"':
        return [Char.Single('"'), 2];
      case "c":
        // ControlEscape:
        const next = pattern.charCodeAt(index + 1) % 32;
        return [Char.Single(next), 3];
      case "x":
        // 2 digit hex digits
        index++;
        if (index >= end) {
          throw new SyntaxError(`Invalid hex sequence at ${index}, ${end}`);
        }
        const hexSeq = pattern.substring(index, index + 2);
        const hexVal = parseInt(hexSeq, 16);
        TSU.assert(!isNaN(hexVal), `Invalid hex sequence: '${hexSeq}'`);
        return [Char.Single(hexVal), 4];
      case "u": // this could \uABCD or \u{ABCDEF}
        index++;
        // 4 digit hex digits for unicode
        if (index > end - 3) {
          throw new SyntaxError(`Invalid unicode sequence at ${index}`);
        }
        const ucodeSeq = pattern.substring(index, index + 4);
        const ucodeVal = parseInt(ucodeSeq, 16);
        if (isNaN(ucodeVal)) {
          throw new SyntaxError(`Invalid unicode sequence: '${ucodeSeq}'`);
        }
        return [Char.Single(ucodeVal), 6];
      default:
        return [Char.Single(ch), 2];
    }
  }
}
