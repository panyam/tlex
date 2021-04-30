import * as TSU from "@panyam/tsutils";
import {
  Quant,
  RegexType,
  StartOfInput,
  Neg,
  EndOfInput,
  Regex,
  Cat,
  Any,
  Char,
  CharRange,
  Ref,
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

export class RegexParser {
  counter: GroupCounter;
  constructor(public readonly pattern: string) {
    this.counter = new GroupCounter();
  }

  /**
   * Creates a regex tree given a string
   */
  parse(curr = 0, end = -1): Regex {
    const pattern = this.pattern;
    let stack: Regex[] = [];
    function reduceLeft(): Regex {
      const r = stack.length == 1 ? stack[0] : new Cat(...stack);
      stack = [];
      return r;
    }
    if (end < 0) end = pattern.length - 1;
    while (curr <= end) {
      const currCh = pattern[curr];
      // see if we have groups so they get highest preference
      if (currCh == ".") {
        stack.push(new Any());
        curr++;
      } else if (currCh == "\\" && pattern[curr + 1] == "k" && pattern[curr + 2] == "<") {
        curr += 3;
        let gtPos = curr;
        while (gtPos <= end && pattern[gtPos] != ">") gtPos++;
        if (gtPos > end) throw new SyntaxError("Expected '>' found EOI");
        const name = pattern.substring(curr, gtPos);
        if (name.trim() == "") {
          throw new SyntaxError("Expected name");
        }
        stack.push(new Ref(name));
        curr = gtPos + 1;
      } else if (currCh == "[") {
        // character ranges
        let clPos = curr + 1;
        while (clPos <= end && pattern[clPos] != "]") {
          if (pattern[clPos] == "\\") clPos++;
          clPos++;
        }
        if (clPos > end) throw new SyntaxError("Expected ']' found EOI");
        stack.push(this.parseCharRange(curr + 1, clPos - 1));
        curr = clPos + 1;
      } else if (currCh == "^") {
        stack.push(new StartOfInput());
        curr++;
      } else if (currCh == "$") {
        stack.push(new EndOfInput());
        curr++;
      } else if (currCh == "|") {
        if (curr + 1 <= end) {
          // reduce everything "until now" and THEN apply
          const prev = reduceLeft();
          // this.parse everything to the right
          const rest = this.parse(curr + 1, end);
          return new Union(prev, rest);
        }
        curr = end + 1;
      } else if (currCh == "(") {
        curr = this.parseGroup(stack, curr, end);
      } else if (pattern[curr] == "*" || pattern[curr] == "?" || pattern[curr] == "+" || pattern[curr] == "{") {
        curr = this.parseQuant(stack, curr, end);
      } else {
        // plain old alphabets
        const [result, nchars] = this.parseChar(curr, end);
        stack.push(result);
        curr += nchars;
      }
    }
    TSU.assert(stack.length > 0);
    if (stack.length == 1) return stack[0];
    return new Cat(...stack);
  }

  parseQuant(stack: Regex[], curr: number, end: number): number {
    const pattern = this.pattern;
    // Quantifiers
    if (stack.length <= 0) {
      throw new SyntaxError("Quantifier cannot appear before an expression");
    }
    // no optimizations - convert the last one into a Quantifier
    // and we will start to fill in the quantities and greediness
    const last = stack[stack.length - 1];
    if (
      last.tag == RegexType.QUANT &&
      (pattern[curr - 1] == "*" || pattern[curr - 1] == "?" || pattern[curr - 1] == "+" || pattern[curr - 1] == "}")
    ) {
      throw new SyntaxError("Nothing to repeat");
    }
    const quant = (stack[stack.length - 1] = new Quant(last));
    if (pattern[curr] == "*") {
      quant.minCount = 0;
      quant.maxCount = TSU.Constants.MAX_INT;
    } else if (pattern[curr] == "+") {
      quant.minCount = Math.min(quant.minCount, 1);
      quant.maxCount = TSU.Constants.MAX_INT;
    } else if (pattern[curr] == "?") {
      quant.minCount = 0;
      quant.maxCount = Math.max(quant.maxCount, 1);
    } else if (pattern[curr] == "{") {
      // find the next "}"
      const clPos = pattern.indexOf("}", curr + 1);
      TSU.assert(clPos > curr && clPos <= end, "Unexpected end of input while looking for '}'");
      const sub = pattern.substring(curr + 1, clPos);
      const parts = sub.split(",").map((x) => parseInt(x.trim()));
      if (parts.length == 1) {
        if (isNaN(parts[0])) {
          throw new SyntaxError(`Invalid quantifier: /${sub}/`);
        }
        quant.minCount = quant.maxCount = parts[0];
      } else if (parts.length == 2) {
        quant.minCount = isNaN(parts[0]) ? 0 : parts[0];
        quant.maxCount = isNaN(parts[1]) ? TSU.Constants.MAX_INT : parts[1];
        if (quant.minCount > quant.maxCount) {
          throw new SyntaxError(`Invalid Quant /${sub}/: Min must be <= Max`);
        }
      } else if (parts.length > 2) {
        throw new SyntaxError(`Invalid quantifier spec: "{${sub}}"`);
      }
      curr = clPos;
    }
    curr++;
    // check if there is an extra lazy quantifier
    if (curr <= end && pattern[curr] == "?" && quant.greedy) {
      curr++;
      quant.greedy = false;
    }
    return curr;
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
      // assertions
      curr++; // skip the "?"
      if (pattern[curr] == ":") {
        // A non capturing
        stack.push(this.parse(curr + 1, clPos - 1));
      } else if (pattern[curr] == "<" && pattern[curr + 1] != "!" && pattern[curr + 1] != "=") {
        // Named capture group
        const groupIndex = this.counter.next();
        let groupName = "";
        // get name of this group
        let gtPos = curr + 1;
        while (gtPos <= end && pattern[gtPos] != ">") {
          groupName += pattern[gtPos];
          gtPos++;
        }
        const subExpr = this.parse(gtPos + 1, clPos - 1);
        subExpr.groupIndex = groupIndex;
        if (groupName.length > 0) subExpr.groupName = groupName;
      } else {
        // We have lookback/ahead assertions
        let after = true;
        if (pattern[curr] == "<") {
          curr++;
          after = false;
        }
        const neg = pattern[curr++] == "!";
        const cond = this.parse(curr, clPos - 1);
        if (after) {
          // reduce everything "until now" and THEN apply
          stack.push(new LookAhead(cond, neg));
        } else {
          stack.push(new LookBack(cond, neg));
        }
      }
    } else {
      // plain old grouping of the form (xyz)
      const groupIndex = this.counter.next();
      let neg = false;
      if (pattern[curr] == "^") {
        neg = true;
        curr++;
      }
      let subExpr = this.parse(curr, clPos - 1);
      if (neg) subExpr = new Neg(subExpr);
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

  parseCharRange(curr: number, end: number): CharRange {
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
          if (currch.isCharClass || endch.isCharClass) {
            throw new SyntaxError("Char range cannot start or end in a char class");
          }
          if (endch.start < currch.start) {
            throw new SyntaxError("End cannot be less than start");
          }
          currch.end = endch.start;
          i += nchars;
        }
      }
      out.push(currch);
    }
    const chrange = new CharRange(...out);
    chrange.neg = neg;
    return chrange;
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
    return [new Char(ch, ch), 1];
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
        return [Char.CharClass(CharClassType.WORD_CHAR), 2];
      case "W":
        return [Char.CharClass(CharClassType.NOT_WORD_CHAR), 2];
      case "d":
        return [Char.CharClass(CharClassType.DIGITS), 2];
      case "D":
        return [Char.CharClass(CharClassType.NOT_DIGITS), 2];
      case "s":
        return [Char.CharClass(CharClassType.SPACES), 2];
      case "S":
        return [Char.CharClass(CharClassType.NOT_SPACES), 2];
      case "r":
        return [Char.of("\r"), 2];
      case "n":
        return [Char.of("\n"), 2];
      case "f":
        return [Char.of("\f"), 2];
      case "b":
        return [Char.of("\b"), 2];
      case "v":
        return [Char.of("\v"), 2];
      case "t":
        return [Char.of("\t"), 2];
      case "\\":
        return [Char.of("\\"), 2];
      case "'":
        return [Char.of("'"), 2];
      case '"':
        return [Char.of('"'), 2];
      case "c":
        // ControlEscape:
        // https://262.ecma-international.org/5.1/#sec-15.10.2.10
        const next = pattern.charCodeAt(index + 1) % 32;
        return [Char.of(next), 3];
      case "x":
        // 2 digit hex digits
        index++;
        TSU.assert(index <= end - 1, `Invalid hex sequence at ${index}, ${end}`);
        const hexSeq = pattern.substring(index, index + 2);
        const hexVal = parseInt(hexSeq, 16);
        TSU.assert(!isNaN(hexVal), `Invalid hex sequence: '${hexSeq}'`);
        return [new Char(hexVal, hexVal), 4];
      case "u": // this could \uABCD or \u{ABCDEF}
        index++;
        // 4 digit hex digits for unicode
        TSU.assert(index <= end - 3, `Invalid unicode sequence at ${index}`);
        const ucodeSeq = pattern.substring(index, index + 4);
        const ucodeVal = parseInt(ucodeSeq, 16);
        TSU.assert(!isNaN(ucodeVal), `Invalid unicode sequence: '${ucodeSeq}'`);
        return [new Char(ucodeVal, ucodeVal), 6];
      default:
        return [Char.of(ch), 2];
    }
  }
}
