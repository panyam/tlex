import * as TSU from "@panyam/tsutils";
import { Tape } from "./tape";
import {
  LookAhead,
  Quant,
  RegexType,
  StartOfInput,
  EndOfInput,
  Regex,
  Cat,
  CharType,
  Char,
  LeafChar,
  CharGroup,
  Var,
  Union,
} from "./core";
import { CharClassType } from "./charclasses";
import { GroupCounter } from "./parser";

function isSpace(ch: string): boolean {
  return ch == " " || ch == "\t" || ch == "\n" || ch == "\r";
}

function advanceIf(tape: Tape, ch: string): boolean {
  const pos = tape.index;
  for (let i = 0; i < ch.length; i++) {
    if (tape.currCh != ch.charAt(i)) {
      tape.index = pos;
      return false;
    }
    tape.advance();
  }
  return true;
}

export class RegexParser {
  counter: GroupCounter = new GroupCounter();

  reduceLeft(stack: Regex[]): Regex {
    const r = stack.length == 1 ? stack[0] : new Cat(...stack);
    // remove all elements on stack
    stack.splice(0);
    return r;
  }

  parse(pattern: Tape, ignoreSpaces = false, obCount = 0): Regex {
    const stack: Regex[] = [];

    while (pattern.hasMore) {
      const currCh = pattern.currCh;
      // see if we have groups so they get highest preference
      if (advanceIf(pattern, ".")) {
        stack.push(LeafChar.Any());
      } else if (advanceIf(pattern, "^")) {
        stack.push(new StartOfInput());
      } else if (advanceIf(pattern, "$")) {
        stack.push(new EndOfInput());
      } else if (advanceIf(pattern, "|")) {
        // reduce everything "until now" and THEN apply
        const prev = this.reduceLeft(stack);
        // this.parse everything to the right
        const rest = this.parse(pattern, ignoreSpaces, obCount);
        return new Union(prev, rest);
      } else if (currCh == "[") {
        stack.push(this.parseCharGroup(pattern));
      } else if (currCh == "*" || currCh == "?" || currCh == "+" || currCh == "{") {
        this.parseQuant(pattern, stack);
      } else if (ignoreSpaces && isSpace(currCh)) {
        // do nothing
        pattern.advance();
      } else if (ignoreSpaces && advanceIf(pattern, "/*")) {
        // Read everything until a */
        while (pattern.currCh != "*" || pattern.nextCh != "/") {
          if (!pattern.hasMore) {
            throw new SyntaxError("Unterminated comment");
          }
          pattern.advance();
        }
        pattern.advance(2);
        // now do nothing
      } else if (advanceIf(pattern, "{-}")) {
        // char class intersection
        throw new Error("Intersection Not yet supported");
      } else if (advanceIf(pattern, "{+}")) {
        // char class union
        throw new Error("Union Not yet supported");
      } else if (advanceIf(pattern, "(")) {
        if (advanceIf(pattern, "?")) {
          if (advanceIf(pattern, "#")) {
            while (pattern.hasMore && pattern.currCh != ")") pattern.advance();
            TSU.assert(advanceIf(pattern, ")"), "Expected ')'");
          } else {
            // pattern of the form (?r-s:pattern)
            let ignoreCase = false;
            let dotAll = false;
            let ignoreSpaces2 = ignoreSpaces as boolean;
            let neg = false;
            while (pattern.hasMore && pattern.currCh != ":") {
              if (pattern.currCh == "i") {
                ignoreCase = neg ? false : true;
              } else if (pattern.currCh == "s") {
                dotAll = neg ? false : true;
              } else if (pattern.currCh == "x") {
                ignoreSpaces2 = neg ? false : true;
              } else if (pattern.currCh == "-") {
                neg = true;
              }
              pattern.advance();
            }
            TSU.assert(advanceIf(pattern, ":"), "Expected ':'");
            const groupIndex = this.counter.next();
            let subExpr = this.parse(pattern, ignoreSpaces2, obCount + 1);
            if (subExpr.groupIndex >= 0) {
              // Already set so create cat
              subExpr = new Cat(subExpr);
            }
            subExpr.dotAll = dotAll;
            subExpr.ignoreCase = ignoreCase;
            subExpr.groupIndex = groupIndex;
            stack.push(subExpr);
            TSU.assert(advanceIf(pattern, ")"), "Expected ')'");
          }
        } else {
          // parse the subgroup and give it a group number
          const groupIndex = this.counter.next();
          let subExpr = this.parse(pattern, ignoreSpaces, obCount + 1);
          if (subExpr.groupIndex >= 0) {
            // Already set so create cat
            subExpr = new Cat(subExpr);
          }
          subExpr.groupIndex = groupIndex;
          stack.push(subExpr);
          TSU.assert(advanceIf(pattern, ")"), "Expected ')'");
        }
      } else if (currCh == ")") {
        if (obCount == 0) {
          throw new SyntaxError(`Unmatched ${currCh}.  Try using \\${currCh}`);
        }
        // stop here so we can recurse up
        break;
      } else if (currCh == "]" || currCh == "}") {
        throw new SyntaxError(`Unmatched ${currCh}.  Try using \\${currCh}`);
      } else if (advanceIf(pattern, "/")) {
        // LookAheads
        const prev = this.reduceLeft(stack);
        // this.parse everything to the right
        const rest = this.parse(pattern, ignoreSpaces, obCount);
        return new LookAhead(prev, rest, false);
      } else if (advanceIf(pattern, '"')) {
        // raw string
        while (pattern.currCh != '"') {
          if (!pattern.hasMore) {
            throw new SyntaxError("Unterminated string");
          }
          stack.push(this.parseChar(pattern));
        }
        pattern.advance();
      } else {
        // plain old alphabets
        stack.push(this.parseChar(pattern));
      }
    }
    if (stack.length == 1) return stack[0];
    return new Cat(...stack);
  }

  parseQuant(pattern: Tape, stack: Regex[]): void {
    let minCount = 1,
      maxCount = 1;
    if (advanceIf(pattern, "*")) {
      minCount = 0;
      maxCount = TSU.Constants.MAX_INT;
    } else if (advanceIf(pattern, "+")) {
      minCount = Math.min(minCount, 1);
      maxCount = TSU.Constants.MAX_INT;
    } else if (advanceIf(pattern, "?")) {
      minCount = 0;
      maxCount = Math.max(maxCount, 1);
    } else if (advanceIf(pattern, "{")) {
      let foundComma = false;
      let p1 = "";
      let p2 = "";
      while (pattern.hasMore && pattern.currCh != "}") {
        if (pattern.currCh == ",") foundComma = true;
        else {
          if (!foundComma) p1 += pattern.currCh;
          else p2 += pattern.currCh;
        }
        pattern.advance();
      }
      if (!pattern.hasMore) {
        throw new SyntaxError("Invalid property escape");
      }
      // see if this is a lone property escape
      p1 = p1.trim();
      p2 = p2.trim();
      // advance over the "}"
      pattern.advance();

      const part1 = parseInt(p1);
      const part2 = parseInt(p2);
      if (foundComma) {
        minCount = isNaN(part1) ? 0 : part1;
        maxCount = isNaN(part2) ? TSU.Constants.MAX_INT : part2;
        if (minCount > maxCount) {
          throw new SyntaxError(`Invalid Quant /${p1},${p2}/: Min must be <= Max`);
        }
      } else {
        if (isNaN(part1)) {
          if (p1.length > 0) {
            stack.push(new Var(p1));
            // nothing more
            return;
          } else {
            throw new SyntaxError(`Invalid quantifier: /${p1}/`);
          }
          minCount = maxCount = 1;
        } else {
          minCount = maxCount = part1;
        }
      }
    } else {
      throw new SyntaxError("Expected '{', '*', '?' or '+', Found: " + pattern.currCh);
    }
    // Quantifiers
    if (stack.length <= 0) {
      throw new SyntaxError("Quantifier cannot appear before an expression");
    }
    // no optimizations - convert the last one into a Quantifier
    // and we will start to fill in the quantities and greediness
    const last = stack[stack.length - 1];
    let quant: Quant;
    if (last.tag == RegexType.QUANT && last.groupIndex < 0) {
      // Fold repeated quants unless they are not in a group
      quant = last as Quant;
      quant.minCount = Math.min(minCount, quant.minCount);
      quant.maxCount = Math.max(maxCount, quant.maxCount);
    } else {
      quant = stack[stack.length - 1] = new Quant(last);
      quant.minCount = minCount;
      quant.maxCount = maxCount;
    }
    // check if there is an extra lazy quantifier
    if (quant.greedy && advanceIf(pattern, "?")) {
      quant.greedy = false;
    }
  }

  parseCharGroup(pattern: Tape): Char {
    const out: Char[] = [];
    TSU.assert(advanceIf(pattern, "["), "Expected '['");
    // first see which characters are in this (until the end)
    const neg = advanceIf(pattern, "^");
    while (pattern.currCh != "]") {
      const currch = this.parseChar(pattern);
      if (advanceIf(pattern, "-")) {
        if (pattern.hasMore) {
          // TODO - Should this be for all such "operator" charactors?
          if (pattern.currCh == "]" || pattern.currCh == "[") {
            // Special case for something like:
            // [....x-] or [.....x-[:alpha:]]
            out.push(currch);
            out.push(LeafChar.Single("-"));
          } else {
            const endch = this.parseChar(pattern);
            if (currch.op != CharType.SingleChar || endch.op != CharType.SingleChar) {
              throw new SyntaxError("Char range cannot start or end in a char class");
            }
            if (endch.args[0] < currch.args[0]) {
              throw new SyntaxError("End cannot be less than start");
            }
            // currch.end = endch.start;
            out.push(CharGroup.Range(currch, endch));
          }
        } else {
          throw new SyntaxError("Unterminated char class");
        }
      } else {
        out.push(currch);
      }
    }
    TSU.assert(advanceIf(pattern, "]"), "']' expected");
    return CharGroup.Union(neg, out);
  }

  parseChar(pattern: Tape): LeafChar {
    if (pattern.currCh == "\\") {
      return this.parseEscapeChar(pattern);
    } else {
      return this.parseSingleChar(pattern);
    }
  }

  parseSingleChar(pattern: Tape): LeafChar {
    // single char
    const ch = pattern.currCh;
    pattern.advance();
    return LeafChar.Single(ch);
  }

  parsePropertyEscape(pattern: Tape): LeafChar {
    TSU.assert(advanceIf(pattern, "\\{"), "Invalid property escape");
    pattern.advance(2);
    let foundEq = false;
    let propName = "";
    let propValue = "";
    while (pattern.hasMore && pattern.currCh != "}") {
      if (pattern.currCh == "=") foundEq = true;
      else {
        if (!foundEq) propName += pattern.currCh;
        else propValue += pattern.currCh;
      }
      pattern.advance();
    }
    if (!pattern.hasMore) {
      throw new SyntaxError("Invalid property escape");
    }
    // see if this is a lone property escape
    propName = propName.trim();
    propValue = propValue.trim();
    if (!foundEq) {
      propValue = propName;
      propName = "General_Category";
    }
    // advance over the "}"
    pattern.advance();
    return LeafChar.PropertyEscape(propName, propValue);
  }

  parseEscapeChar(pattern: Tape): LeafChar {
    TSU.assert(advanceIf(pattern, "\\"), "Expected '\\'");
    // escape char
    if (!pattern.hasMore) {
      throw new SyntaxError("Encounted unexpected end of input after \\");
    }
    if (advanceIf(pattern, "w")) {
      return LeafChar.Class(CharClassType.WORD_CHAR);
    } else if (advanceIf(pattern, "W")) {
      return LeafChar.Class(CharClassType.WORD_CHAR, true);
    } else if (advanceIf(pattern, "d")) {
      return LeafChar.Class(CharClassType.DIGITS);
    } else if (advanceIf(pattern, "D")) {
      return LeafChar.Class(CharClassType.DIGITS, true);
    } else if (advanceIf(pattern, "s")) {
      return LeafChar.Class(CharClassType.SPACES);
    } else if (advanceIf(pattern, "S")) {
      return LeafChar.Class(CharClassType.SPACES, true);
    } else if (advanceIf(pattern, "0")) {
      return LeafChar.Single("\0");
    } else if (advanceIf(pattern, "r")) {
      return LeafChar.Single("\r");
    } else if (advanceIf(pattern, "n")) {
      return LeafChar.Single("\n");
    } else if (advanceIf(pattern, "f")) {
      return LeafChar.Single("\f");
    } else if (advanceIf(pattern, "b")) {
      return LeafChar.Single("\b");
    } else if (advanceIf(pattern, "v")) {
      return LeafChar.Single("\v");
    } else if (advanceIf(pattern, "t")) {
      return LeafChar.Single("\t");
    } else if (advanceIf(pattern, "\\")) {
      return LeafChar.Single("\\");
    } else if (advanceIf(pattern, "'")) {
      return LeafChar.Single("'");
    } else if (advanceIf(pattern, '"')) {
      return LeafChar.Single('"');
    } else if (advanceIf(pattern, "x")) {
      // 2 digit hex digits
      if (!pattern.hasMore) {
        throw new SyntaxError(`Invalid hex sequence at ${pattern.index}`);
      }
      const hexSeq = pattern.currCh + pattern.nextCh;
      const hexVal = parseInt(hexSeq, 16);
      TSU.assert(!isNaN(hexVal), `Invalid hex sequence: '${hexSeq}'`);
      pattern.advance(2);
      return LeafChar.Single(hexVal);
    } else if (advanceIf(pattern, "u")) {
      // 4 digit hex digits for unicode
      if (pattern.index >= pattern.input.length - 3) {
        throw new SyntaxError(`Invalid unicode sequence at ${pattern.index}`);
      }
      const ucodeSeq = pattern.substring(pattern.index, pattern.index + 4);
      const ucodeVal = parseInt(ucodeSeq, 16);
      if (isNaN(ucodeVal)) {
        throw new SyntaxError(`Invalid unicode sequence: '${ucodeSeq}'`);
      }
      pattern.advance(4);
      return LeafChar.Single(ucodeVal);
    }
    // default
    const ch = pattern.currCh;
    pattern.advance();
    return LeafChar.Single(ch);
  }
}
