import * as TSU from "@panyam/tsutils";
import {
  Quant,
  RegexType,
  StartOfInput,
  EndOfInput,
  Regex,
  Cat,
  Char,
  LeafChar,
  CharGroup,
  CharType,
  Var,
  BackNamedRef,
  BackNumRef,
  LookAhead,
  LookBack,
  Union,
} from "./core";
import { CharClassType } from "./charclasses";
import { GroupCounter } from "./utils";

/**
 * A RegexParser for parsing regex strings in JS RegExp format.
 * This class will seldom have to be used directly.  Instead use one of the methods in {@link Builder}
 */
export class RegexParser {
  protected unicode: boolean;
  protected counter: GroupCounter;
  /**
   * @param pattern The pattern string being parsed.
   * @param config  Configs for the regex to include whether parsing is unicode or plain ASCII.
   */
  constructor(public readonly pattern: string, config?: { unicode?: boolean }) {
    this.counter = new GroupCounter();
    this.unicode = config?.unicode || false;
  }

  protected reduceLeft(stack: Regex[]): Regex {
    const r = stack.length == 1 ? stack[0] : new Cat(...stack);
    // remove all elements on stack
    stack.splice(0);
    return r;
  }

  protected throwError(msg: string): void {
    throw new SyntaxError(`Error in JS RE '${this.pattern}': ${msg}`);
  }

  /**
   * Creates a regex tree given a string
   */
  parse(curr = 0, end = -1): Regex {
    const pattern = this.pattern;
    const stack: Regex[] = [];
    if (end < 0) end = pattern.length - 1;
    while (curr <= end) {
      const currCh = pattern[curr];
      // see if we have groups so they get highest preference
      if (currCh == ".") {
        stack.push(LeafChar.Any());
        curr++;
      } else if (currCh == "\\" && pattern[curr + 1] >= "1" && pattern[curr + 1] <= "9") {
        // Numeric references
        curr++;
        let num = "";
        while (curr <= end && pattern[curr] >= "0" && pattern[curr] <= "9") {
          num = num + pattern[curr++];
        }
        const refNum = parseInt(num);
        if (refNum > this.counter.current + 1) {
          this.throwError("Invalid reference: " + refNum);
        }
        stack.push(new BackNumRef(refNum));
      } else if (currCh == "\\" && pattern[curr + 1] == "k" && pattern[curr + 2] == "<") {
        // Named references
        curr += 3;
        let gtPos = curr;
        while (gtPos <= end && pattern[gtPos] != ">") gtPos++;
        if (gtPos > end) this.throwError("Expected '>' found EOI");
        const name = pattern.substring(curr, gtPos);
        if (name.trim() == "") {
          this.throwError("Expected name");
        }
        stack.push(new BackNamedRef(name));
        curr = gtPos + 1;
      } else if (currCh == "[") {
        // character ranges
        let clPos = curr + 1;
        while (clPos <= end && pattern[clPos] != "]") {
          if (pattern[clPos] == "\\") clPos++;
          clPos++;
        }
        if (clPos > end) this.throwError("Expected ']' found EOI");
        stack.push(this.parseCharGroup(curr + 1, clPos - 1));
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
          const prev = this.reduceLeft(stack);
          // this.parse everything to the right
          const rest = this.parse(curr + 1, end);
          return new Union(prev, rest);
        }
        curr = end + 1;
      } else if (currCh == "(") {
        curr = this.parseGroup(stack, curr, end);
      } else if (currCh == ")" || currCh == "]" || currCh == "}") {
        this.throwError(`Unmatched ${currCh}.  Try using \\${currCh}`);
      } else if (pattern[curr] == "*" || pattern[curr] == "?" || pattern[curr] == "+" || pattern[curr] == "{") {
        curr = this.parseQuant(stack, curr, end);
      } else {
        // plain old alphabets
        const [result, nchars] = this.parseChar(curr, end);
        stack.push(result);
        curr += nchars;
      }
    }
    if (stack.length <= 0) {
      // this.throwError(`Invalid Regex (${curr} - ${end}): ${pattern}`);
    }
    if (stack.length == 1) return stack[0];
    return new Cat(...stack);
  }

  protected parseGroup(stack: Regex[], curr: number, end: number): number {
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
    if (clPos > end) this.throwError("Expected ')' found EOI");

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
          if (stack.length == 0) {
            // this.throwError("LookAhead condition cannot be before empty rule");
          }
          // const endIndex = stack.length - 1;
          // stack[endIndex] = new LookAhead(stack[endIndex], cond, neg);
          const expr = new LookAhead(this.reduceLeft(stack), cond, neg);
          stack.push(expr);
        } else {
          // Lookbacks are interesting, we have something like:
          // (?<!...)abcde
          // clPos points to ")" We need abcde also parsed
          // and then lookback applied to it
          const rest = this.parse(clPos + 1, end);
          if (rest.groupIndex < 0) {
            rest.groupIndex = this.counter.next();
            rest.groupIsSilent = true;
          }
          stack.push(new LookBack(rest, cond, neg));
          return end + 1;
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

  protected parseCharGroup(curr: number, end: number): Char {
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
        // TODO - Should this be for all such "operator" charactors?
        if (pattern[i] == "]" || pattern[i] == "[") {
          // Special case for something like:
          // [....x-] or [.....x-[:alpha:]]
          out.push(currch);
          out.push(LeafChar.Single("-"));
        } else if (i <= end) {
          const [endch, nchars] = this.parseChar(i, end);
          if (currch.op != CharType.SingleChar || endch.op != CharType.SingleChar) {
            this.throwError("Char range cannot start or end in a char class");
          }
          if (endch.args[0] < currch.args[0]) {
            this.throwError("End cannot be less than start");
          }
          out.push(CharGroup.Range(currch, endch));
          i += nchars;
        } else {
          this.throwError("Unterminated char class");
        }
      } else {
        out.push(currch);
      }
    }
    return CharGroup.Union(neg, out);
  }

  protected parseChar(index = 0, end = 0): [LeafChar, number] {
    if (this.pattern[index] == "\\") {
      return this.parseEscapeChar(index, end);
    } else {
      return this.parseSingleChar(index, end);
    }
  }

  protected parseSingleChar(index = 0, end = 0): [LeafChar, number] {
    // single char
    const ch = this.pattern.charCodeAt(index);
    return [LeafChar.Single(ch), 1];
  }

  protected parsePropertyEscape(index = 0, end = 0): [LeafChar, number] {
    const pattern = this.pattern;
    if (pattern[index] + 1 != "{") {
      this.throwError("Invalid property escape");
    }
    index += 2;
    let clEnd = index;
    let eqPos = -1;
    while (clEnd <= end && pattern[clEnd] != "}") {
      if (pattern[clEnd] == "=") eqPos = clEnd;
      clEnd++;
    }
    if (clEnd > end) {
      this.throwError("Invalid property escape");
    }
    // see if this is a lone property escape
    const propStr = pattern.substring(index, clEnd);
    let propName = "General_Category";
    let propValue = propStr;
    if (eqPos >= 0) {
      const parts = propStr.split("=");
      if (parts.length != 2) this.throwError("Invalid property escape");
      propName = parts[0].trim();
      propValue = parts[1].trim();
    }
    return [LeafChar.PropertyEscape(propName, propValue), 2 + clEnd + 1 - index];
  }

  protected parseEscapeChar(index = 0, end = 0): [LeafChar, number] {
    const pattern = this.pattern;
    TSU.assert(pattern[index] == "\\", "Expected '\\'");
    // escape char
    index++;
    if (index > end) {
      this.throwError("Encounted unexpected end of input after \\");
    }
    const ch = pattern[index];
    if ((this.unicode && ch == "p") || ch == "P") {
      // property escapes
      return this.parsePropertyEscape(index, end);
    }
    switch (ch) {
      // char classes
      case "w":
        return [LeafChar.Class(CharClassType.WORD_CHAR), 2];
      case "W":
        return [LeafChar.Class(CharClassType.WORD_CHAR, true), 2];
      case "d":
        return [LeafChar.Class(CharClassType.DIGITS), 2];
      case "D":
        return [LeafChar.Class(CharClassType.DIGITS, true), 2];
      case "s":
        return [LeafChar.Class(CharClassType.SPACES), 2];
      case "S":
        return [LeafChar.Class(CharClassType.SPACES, true), 2];
      case "0":
        if (pattern[index + 1] >= "0" && pattern[index + 1] <= "9" && this.unicode) {
          this.throwError("Invalid decimal escape");
        }
        return [LeafChar.Single("\0"), 2];
      case "r":
        return [LeafChar.Single("\r"), 2];
      case "n":
        return [LeafChar.Single("\n"), 2];
      case "f":
        return [LeafChar.Single("\f"), 2];
      case "b":
        return [LeafChar.Single("\b"), 2];
      case "v":
        return [LeafChar.Single("\v"), 2];
      case "t":
        return [LeafChar.Single("\t"), 2];
      case "c":
        // ControlEscape:
        // https://262.ecma-international.org/5.1/#sec-15.10.2.10
        if (this.unicode || index >= end) {
          this.throwError(`Invalid char sequence at ${index}, ${end}`);
        }
        const next = pattern.charCodeAt(index + 1) % 32;
        return [LeafChar.Single(next), 3];
      case "x":
        // 2 digit hex digits
        index++;
        if (index >= end) {
          this.throwError(`Invalid hex sequence at ${index}, ${end}`);
        }
        const hexSeq = pattern.substring(index, index + 2);
        const hexVal = parseInt(hexSeq, 16);
        TSU.assert(!isNaN(hexVal), `Invalid hex sequence: '${hexSeq}'`);
        return [LeafChar.Single(hexVal), 4];
      case "u": // this could \uABCD or \u{ABCDEF}
        index++;
        // 4 digit hex digits for unicode
        if (index > end - 3) {
          this.throwError(`Invalid unicode sequence at ${index}`);
        }
        const ucodeSeq = pattern.substring(index, index + 4);
        const ucodeVal = parseInt(ucodeSeq, 16);
        if (isNaN(ucodeVal)) {
          this.throwError(`Invalid unicode sequence: '${ucodeSeq}'`);
        }
        return [LeafChar.Single(ucodeVal), 6];
      case "^": // List of special operators that need to be escaped
      case "$":
      case ".":
      case "*":
      case "+":
      case "?":
      case "\\":
      case "'":
      case '"':
      case "(":
      case ")":
      case "[":
      case "]":
      case "{":
      case "}":
      case "|":
      case "/":
        return [LeafChar.Single(ch), 2];
      default:
        if (this.unicode) this.throwError("Invalid escape character: " + ch);
        return [LeafChar.Single(ch), 2];
    }
  }

  protected parseQuant(stack: Regex[], curr: number, end: number): number {
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
        this.throwError("Unexpected end of input while looking for '}'");
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
            this.throwError(`Invalid quantifier: /${sub}/`);
          }
        }
        minCount = maxCount = parts[0];
      } else if (parts.length == 2) {
        minCount = isNaN(parts[0]) ? 0 : parts[0];
        maxCount = isNaN(parts[1]) ? TSU.Constants.MAX_INT : parts[1];
        if (minCount > maxCount) {
          this.throwError(`Invalid Quant /${sub}/: Min must be <= Max`);
        }
      } else if (parts.length > 2) {
        this.throwError(`Invalid quantifier spec: "{${sub}}"`);
      }
    } else {
      throw new Error("Here?");
    }
    // Quantifiers
    if (stack.length <= 0) {
      this.throwError("Quantifier cannot appear before an expression");
    }
    // no optimizations - convert the last one into a Quantifier
    // and we will start to fill in the quantities and greediness
    const last = stack[stack.length - 1];
    if (last.tag == RegexType.QUANT && (lastCh == "*" || lastCh == "?" || lastCh == "+" || lastCh == "}")) {
      this.throwError("Nothing to repeat");
    }
    if (this.unicode && (last.tag == RegexType.LOOK_AHEAD || last.tag == RegexType.LOOK_BACK)) {
      this.throwError("Cannot have quantifier on assertion in unicode mode");
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
