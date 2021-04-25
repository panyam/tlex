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

/**
 * Creates a regex tree given a string
 */
export function parse(regex: string, curr = 0, end = -1): Regex {
  if (end < 0) end = regex.length - 1;
  let out: Regex[] = [];
  function reduceLeft(): Regex {
    const r = out.length == 1 ? out[0] : new Cat(...out);
    out = [];
    return r;
  }
  while (curr <= end) {
    const currCh = regex[curr];
    // see if we have groups so they get highest preference
    if (currCh == "<") {
      curr++;
      let gtPos = curr;
      while (gtPos <= end && regex[gtPos] != ">") gtPos++;
      if (gtPos > end) throw new SyntaxError("Expected '>' found EOI");
      const name = regex.substring(curr, gtPos);
      if (name.trim() == "") {
        throw new SyntaxError("Expected name");
      }
      out.push(new Ref(name));
      curr = gtPos + 1;
    } else if (currCh == ".") {
      out.push(new Any());
      curr++;
    } else if (currCh == "[") {
      // character ranges
      let clPos = curr + 1;
      while (clPos <= end && regex[clPos] != "]") {
        if (regex[clPos] == "\\") clPos++;
        clPos++;
      }
      if (clPos > end) throw new SyntaxError("Expected ']' found EOI");
      out.push(parseCharRange(regex.substring(curr + 1, clPos)));
      curr = clPos + 1;
    } else if (currCh == "^") {
      out.push(new StartOfInput());
      curr++;
    } else if (currCh == "$") {
      out.push(new EndOfInput());
      curr++;
    } else if (currCh == "|") {
      if (curr + 1 <= end) {
        // reduce everything "until now" and THEN apply
        const prev = reduceLeft();
        // parse everything to the right
        const rest = parse(regex, curr + 1, end);
        return new Union(prev, rest);
      }
      curr = end + 1;
    } else if (currCh == "(") {
      // we have a grouping or an assertion
      let clPos = curr + 1;
      let depth = 0;
      while (clPos <= end && (regex[clPos] != ")" || depth > 0)) {
        if (regex[clPos] == "(") depth++;
        else if (regex[clPos] == ")") depth--;
        if (regex[clPos] == "\\") clPos++;
        clPos++;
      }
      if (clPos > end) throw new SyntaxError("Expected ')' found EOI");

      curr++;
      if (regex[curr] != "?") {
        if (regex[curr] == "^") {
          // negation
          out.push(new Neg(parse(regex, curr + 1, clPos - 1)));
        } else {
          // plain old grouping
          out.push(parse(regex, curr, clPos - 1));
        }
        curr = clPos + 1;
      } else {
        // assertions
        curr++; // skip the "?"
        let after = true;
        if (regex[curr] == "<") {
          curr++;
          after = false;
        }
        const neg = regex[curr++] == "!";
        const cond = parse(regex, curr, clPos - 1);
        if (after) {
          // reduce everything "until now" and THEN apply
          out.push(new LookAhead(cond, neg));
        } else {
          out.push(new LookBack(cond, neg));
        }
        curr = clPos + 1;
      }
    } else if (regex[curr] == "*" || regex[curr] == "?" || regex[curr] == "+" || regex[curr] == "{") {
      // Quantifiers
      let last: Quant;
      if (out.length <= 0) {
        throw new SyntaxError("Quantifier cannot appear before an expression");
      }
      if (out[out.length - 1].tag != RegexType.QUANT) {
        last = new Quant(out[out.length - 1], 1, 1, true);
        out[out.length - 1] = last;
      } else {
        // in JS a** is invalid but (a*)* is not
        if (regex[curr - 1] == "*" || regex[curr - 1] == "?" || regex[curr - 1] == "+" || regex[curr - 1] == "}") {
          throw new SyntaxError("Nothing to repeat");
        }
        last = out[out.length - 1] as Quant;
      }
      if (regex[curr] == "*") {
        last.minCount = 0;
        last.maxCount = TSU.Constants.MAX_INT;
      } else if (regex[curr] == "+") {
        last.minCount = Math.min(last.minCount, 1);
        last.maxCount = TSU.Constants.MAX_INT;
      } else if (regex[curr] == "?") {
        last.minCount = 0;
        last.maxCount = Math.max(last.maxCount, 1);
      } else if (regex[curr] == "{") {
        // find the next "}"
        const clPos = regex.indexOf("}", curr + 1);
        TSU.assert(clPos > curr && clPos <= end, "Unexpected end of input while looking for '}'");
        const sub = regex.substring(curr + 1, clPos);
        const parts = sub.split(",").map((x) => parseInt(x.trim()));
        if (parts.length == 1) {
          if (isNaN(parts[0])) {
            throw new SyntaxError(`Invalid quantifier: /${sub}/`);
          }
          last.minCount = last.maxCount = parts[0];
        } else if (parts.length == 2) {
          last.minCount = isNaN(parts[0]) ? 0 : parts[0];
          last.maxCount = isNaN(parts[1]) ? TSU.Constants.MAX_INT : parts[1];
          if (last.minCount > last.maxCount) {
            throw new SyntaxError(`Invalid Quant /${sub}/: Min must be <= Max`);
          }
        } else if (parts.length > 2) {
          throw new SyntaxError(`Invalid quantifier spec: "{${sub}}"`);
        }
        curr = clPos;
      }
      curr++;
      // check if there is an extra lazy quantifier
      if (curr <= end && regex[curr] == "?" && last.greedy) {
        curr++;
        last.greedy = false;
      }
    } else {
      // plain old alphabets
      const [result, nchars] = parseChar(regex, curr, end);
      out.push(result);
      curr += nchars;
    }
  }
  TSU.assert(out.length > 0);
  if (out.length == 1) return out[0];
  return new Cat(...out);
}

export function parseCharRange(value: string, invert = false): CharRange {
  const out: Char[] = [];
  // first see which characters are in this (until the end)
  let i = 0;
  let neg = false;
  if (value[i] == "^") {
    neg = true;
    i++;
  }
  for (; i < value.length; ) {
    const [currch, nchars] = parseChar(value, i, value.length - 1);
    i += nchars;
    if (i < value.length && value[i] == "-") {
      i++;
      if (i < value.length) {
        const [endch, nchars] = parseChar(value, i, value.length - 1);
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

export function parseChar(value: string, index = 0, end = 0): [Char, number] {
  if (value[index] == "\\") {
    return parseEscapeChar(value, index, end);
  } else {
    return parseSingleChar(value, index, end);
  }
}

export function parseSingleChar(value: string, index = 0, end = 0): [Char, number] {
  // single char
  const ch = value.charCodeAt(index);
  return [new Char(ch, ch), 1];
}

export function parseEscapeChar(value: string, index = 0, end = 0): [Char, number] {
  TSU.assert(value[index] == "\\", "Expected '\\'");
  // escape char
  index++;
  if (index > end) {
    throw new SyntaxError("Encounted unexpected end of input after \\");
  }
  const ch = value[index];
  switch (ch) {
    // char classes
    case "w":
      return [Char.CharClass(CharClassType.JS_WORD_CHAR), 2];
    case "W":
      return [Char.CharClass(CharClassType.JS_WORD_CHAR, true), 2];
    case "d":
      return [Char.CharClass(CharClassType.DIGITS), 2];
    case "D":
      return [Char.CharClass(CharClassType.DIGITS, true), 2];
    case "s":
      return [Char.CharClass(CharClassType.SPACES), 2];
    case "S":
      return [Char.CharClass(CharClassType.SPACES, true), 2];
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
      const next = value.charCodeAt(index + 1) % 32;
      return [Char.of(next), 3];
    case "x":
      // 2 digit hex digits
      index++;
      TSU.assert(index <= end - 1, `Invalid hex sequence at ${index}, ${end}`);
      const hexSeq = value.substring(index, index + 2);
      const hexVal = parseInt(hexSeq, 16);
      TSU.assert(!isNaN(hexVal), `Invalid hex sequence: '${hexSeq}'`);
      return [new Char(hexVal, hexVal), 4];
    case "u": // this could \uABCD or \u{ABCDEF}
      index++;
      // 4 digit hex digits for unicode
      TSU.assert(index <= end - 3, `Invalid unicode sequence at ${index}`);
      const ucodeSeq = value.substring(index, index + 4);
      const ucodeVal = parseInt(ucodeSeq, 16);
      TSU.assert(!isNaN(ucodeVal), `Invalid unicode sequence: '${ucodeSeq}'`);
      return [new Char(ucodeVal, ucodeVal), 6];
    default:
      return [Char.of(ch), 2];
  }
}
