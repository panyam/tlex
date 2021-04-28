import * as TSU from "@panyam/tsutils";
import { CharClassType, CharClassHelpers } from "./charclasses";

export enum RegexType {
  ANY,
  START_OF_INPUT,
  END_OF_INPUT,
  START_OF_WORD,
  END_OF_WORD,
  CHAR,
  CHAR_RANGE,
  UNION,
  CAT,
  NEG,
  REF,
  QUANT,
  LOOK_AHEAD,
  LOOK_BACK,
}

/**
 * A regex expression node.
 */
export abstract class Regex {
  readonly tag: RegexType;
  parent: TSU.Nullable<Regex> = null;
  protected reString = null as string | null;
  // If a group index is provided then this can be "referred" by
  // other parts of the regex.  These must be unique within a root.
  groupIndex = -1;
  // Name of the group corresponding to this part of the regex - MUST
  // be unique within the subtree.
  groupName: TSU.Nullable<string> = null;

  get debugValue(): any {
    return "";
  }

  // Tells if this regex is of a variable size (ie has quantifiers)
  // or is of a static size.
  get isVariable(): boolean {
    return false;
  }

  // Returns an expression that can match the reverse of strings
  // accepted by this expression
  abstract reverse(): Regex;

  get toString(): string {
    if (this.reString == null) {
      this.reString = this.evalREString();
    }
    return this.reString;
  }

  // Returns a minimally bracketted and syntactically valid string
  // representation of this expression.
  protected abstract evalREString(): string;
}

export class Any extends Regex {
  readonly tag: RegexType = RegexType.ANY;
  get debugValue(): string {
    return ".";
  }
  protected evalREString(): string {
    return ".";
  }
  reverse(): this {
    return this;
  }
}

export class StartOfInput extends Regex {
  readonly tag: RegexType = RegexType.START_OF_INPUT;
  get debugValue(): string {
    return "^";
  }
  reverse(): this {
    return this;
  }
  protected evalREString(): string {
    return "^";
  }
}

export class EndOfInput extends Regex {
  readonly tag: RegexType = RegexType.END_OF_INPUT;
  get debugValue(): string {
    return "$";
  }
  protected evalREString(): string {
    return "$";
  }
  reverse(): this {
    return this;
  }
}

export class StartOfWord extends Regex {
  readonly tag: RegexType = RegexType.START_OF_WORD;
  get debugValue(): string {
    return "\\b";
  }
  reverse(): this {
    return this;
  }
  protected evalREString(): string {
    return "\\b";
  }
}

export class EndOfWord extends Regex {
  readonly tag: RegexType = RegexType.END_OF_WORD;
  get debugValue(): string {
    return "\\b";
  }
  reverse(): this {
    return this;
  }
  protected evalREString(): string {
    return "\\b";
  }
}

export class LookAhead extends Regex {
  readonly tag: RegexType = RegexType.LOOK_AHEAD;
  /**
   * Creates a lookahead assertion.
   *
   * @param cond  - The Condition to check.
   */
  constructor(public readonly cond: Regex, public readonly negate = false) {
    super();
  }

  protected evalREString(): string {
    return `(?${this.negate ? "!" : "="}${this.cond.toString})`;
  }

  get debugValue(): any {
    return ["LookAhead" + (this.negate ? "!" : ""), this.cond.debugValue];
  }

  reverse(): Regex {
    return new LookBack(this.cond.reverse(), this.negate);
  }
}

export class LookBack extends Regex {
  readonly tag: RegexType = RegexType.LOOK_BACK;
  /**
   * Creates an assertion.
   *
   * @param cond  - The Condition to check.
   */
  constructor(public readonly cond: Regex, public readonly negate = false) {
    super();
  }

  protected evalREString(): string {
    return `(?<${this.negate ? "!" : "="}${this.cond.toString})`;
  }

  get debugValue(): any {
    return ["LookBack" + (this.negate ? "!" : ""), this.cond.debugValue];
  }

  reverse(): Regex {
    return new LookAhead(this.cond.reverse(), this.negate);
  }
}

export class Quant extends Regex {
  readonly tag: RegexType = RegexType.QUANT;
  constructor(public expr: Regex, public minCount = 1, public maxCount = 1, public greedy = true) {
    super();
  }

  get isUnlimited(): boolean {
    return this.maxCount < 0 || this.maxCount == TSU.Constants.MAX_INT;
  }

  // Tells if this regex is of a variable size (ie has quantifiers)
  // or is of a static size.
  get isVariable(): boolean {
    return this.minCount != this.maxCount || !this.expr.isVariable;
  }

  reverse(): Quant {
    return new Quant(this.expr.reverse(), this.minCount, this.maxCount, this.greedy);
  }

  protected evalREString(): string {
    let quant = "*";
    if (this.minCount == 1 && this.isUnlimited) quant = "+";
    else if (this.minCount == 0 && this.isUnlimited) quant = "*";
    else if (this.minCount == 0 && this.maxCount == 1) quant = "?";
    else if (this.minCount != 1 || this.maxCount != 1)
      quant = `{${this.minCount},${this.isUnlimited ? "" : this.maxCount}}`;
    return `${this.expr.toString}${quant}`;
  }

  get debugValue(): any {
    let quant = "*";
    if (this.minCount == 1 && this.isUnlimited) quant = "+";
    else if (this.minCount == 0 && this.isUnlimited) quant = "*";
    else if (this.minCount == 0 && this.maxCount == 1) quant = "?";
    else if (this.minCount != 1 || this.maxCount != 1)
      quant = `{${this.minCount},${this.isUnlimited ? "" : this.maxCount}}`;
    return [this.greedy ? "Quant" : "QuantLazy", [this.expr.debugValue, quant]];
  }
}

export class Cat extends Regex {
  readonly tag: RegexType = RegexType.CAT;
  children: Regex[];
  constructor(...children: Regex[]) {
    super();
    this.children = [];
    for (const child of children) {
      this.add(child);
    }
  }

  get isVariable(): boolean {
    for (const child of this.children) {
      if (child.isVariable) return true;
    }
    return false;
  }

  protected evalREString(): string {
    const out = this.children.map((c) => c.toString).join("");
    return this.children.length > 1 ? "(" + out + ")" : out;
  }

  reverse(): Cat {
    const out = this.children.map((c) => c.reverse());
    out.reverse();
    return new Cat(...out);
  }

  add(child: Regex): this {
    if (child.tag != RegexType.CAT || child.groupIndex >= 0) {
      this.children.push(child);
    } else {
      for (const opt of (child as Cat).children) {
        this.add(opt);
      }
    }
    return this;
  }

  get debugValue(): any {
    return ["Cat", this.children.map((c) => c.debugValue)];
  }
}

export class Union extends Regex {
  readonly tag: RegexType = RegexType.UNION;
  readonly options: Regex[];
  constructor(...options: Regex[]) {
    super();
    this.options = [];
    for (const option of options) {
      this.add(option);
    }
  }

  get isVariable(): boolean {
    for (const child of this.options) {
      if (child.isVariable) return true;
    }
    return false;
  }

  protected evalREString(): string {
    const out = this.options.map((c) => c.toString).join("|");
    return this.options.length > 1 ? "(" + out + ")" : out;
  }

  reverse(): Union {
    const out = this.options.map((c) => c.reverse());
    out.reverse();
    return new Union(...out);
  }

  add(option: Regex): this {
    if (option.tag != RegexType.UNION || option.groupIndex >= 0) {
      this.options.push(option);
    } else {
      for (const opt of (option as Union).options) {
        this.add(opt);
      }
    }
    return this;
  }

  get debugValue(): any {
    return ["Union", this.options.map((o) => o.debugValue)];
  }
}

export class Neg extends Regex {
  readonly tag: RegexType = RegexType.NEG;
  constructor(public expr: Regex) {
    super();
  }

  reverse(): Neg {
    return new Neg(this.expr.reverse());
  }

  evalREString(): string {
    return `(^${this.expr.toString})`;
  }

  get debugValue(): any {
    if (this.expr.tag == RegexType.CHAR_RANGE) {
      const out = (this.expr as CharRange).debugValue as string;
      return "[^" + out.substring(1, out.length - 1) + "]";
    } else {
      return ["NOT", this.expr.debugValue];
    }
  }
}

export class Char extends Regex {
  readonly tag: RegexType = RegexType.CHAR;
  // start == 0 and end == MAX_INT => ANY
  // start == end => Single char
  // start < end => Char range
  // Start == -1 => end = char class
  constructor(public start = 0, public end = 0, public neg = false) {
    super();
    if (end < start) {
      throw new SyntaxError("End cannot be less than Start");
    }
  }

  reverse(): Char {
    return this;
  }

  static CharClass(charClass: CharClassType, neg = false): Char {
    return new Char(-1, charClass, neg);
  }

  static of(ch: string | number): Char {
    if (typeof ch === "string") {
      ch = ch.charCodeAt(0);
    }
    return new Char(ch, ch);
  }

  get isCharClass(): boolean {
    return this.start < 0;
  }

  compareTo(another: Char): number {
    if (this.start == another.start) return this.end - another.end;
    return this.start - another.start;
  }

  get debugValue(): any {
    return this.start == this.end
      ? String.fromCharCode(this.start)
      : `${String.fromCharCode(this.start)}-${String.fromCharCode(this.end)}`;
  }

  protected evalREString(): string {
    if (this.isCharClass) {
      return CharClassHelpers[this.end].reString(this.neg);
    } else {
      return this.start == this.end
        ? String.fromCharCode(this.start)
        : `${String.fromCharCode(this.start)}-${String.fromCharCode(this.end)}`;
    }
  }
}

/**
 * Character ranges
 */
export class CharRange extends Regex {
  readonly tag: RegexType = RegexType.CHAR_RANGE;
  neg = false;
  chars: Char[];
  constructor(...chars: Char[]) {
    super();
    this.chars = chars;
    this.mergeRanges();
  }

  reverse(): CharRange {
    return this;
  }

  /**
   * Adds a new Char into this range.
   * Doing so "merges" renges in this class so we dont have overlaps.
   */
  add(ch: Char): this {
    this.chars.push(ch);
    return this.mergeRanges();
  }

  protected mergeRanges(): this {
    // sort ranges
    this.chars.sort((c1, c2) => c1.compareTo(c2));
    // merge ranges
    const ch2 = [] as Char[];
    for (const ch of this.chars) {
      const last = ch2[ch2.length - 1] || null;
      if (last == null || last.end < ch.start) {
        ch2.push(ch);
      } else {
        last.end = Math.max(last.end, ch.end);
      }
    }
    this.chars = ch2;
    return this;
  }

  protected evalREString(): string {
    const out = this.chars.map((ch) => ch.debugValue).join("");
    return out.length > 1 ? "[" + out + "]" : out;
  }

  get debugValue(): any {
    return this.chars.map((ch) => ch.debugValue);
  }
}

/**
 * Named expression referring to another regex by name.
 */
export class Ref extends Regex {
  readonly tag: RegexType = RegexType.REF;
  constructor(public readonly name: string, public readonly reversed = false) {
    super();
  }

  reverse(): Ref {
    return new Ref(this.name, !this.reversed);
  }

  protected evalREString(): string {
    return "<" + this.name + ">";
  }

  get debugValue(): any {
    return "<" + this.name + ">";
  }
}

/**
 * A rule defines a match to be performed and recognized by the lexer.
 */
export class Rule {
  /**
   * Constructor
   *
   * @param pattern   - The pattern to match for the rule.
   * @param tokenType - The token type to associate this rule with.
   *                    If tokenType is null then this will be treated
   *                    as a non-primary rule.  Only rules that are
   *                    "primary" rules will be targetted for matching
   *                    in the final NFA.  We can create non primary
   *                    rules as a way for short cuts.  Eg:
   *
   *                        WHITESPACE = [ \t\n]+
   *
   *                    can be a rule that is only used "inside" other
   *                    rules via <WHITESPACE>
   * @param priority  - Priority for a rule.  As the NFA runs through
   *                    the rules it could be matching several rules in
   *                    parallel.  However as soon as a rule that is of a
   *                    higher priority has matched all other rules
   *                    (still running) with a lower priority are halted.
   *                    We can use this to match literals over a regex
   *                    even though a regex can have a longer match.
   */
  constructor(
    public readonly pattern: string,
    public readonly tokenType: any | null,
    public readonly priority = 10,
    public readonly isGreedy = true,
  ) {}

  /**
   * The generated expression for this rule.
   */
  expr: Regex;
}
