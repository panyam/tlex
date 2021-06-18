import * as TSU from "@panyam/tsutils";
import { CharClassType, CharClassHelpers } from "./charclasses";
import * as PropertyEscapes from "./propertyescapes";

export enum RegexType {
  START_OF_INPUT,
  END_OF_INPUT,
  START_OF_WORD,
  END_OF_WORD,
  UNION,
  CAT,
  VAR,
  BACK_NAMED_REF,
  BACK_NUM_REF,
  QUANT,
  LOOK_AHEAD,
  LOOK_BACK,
  // Individual matchables
  CHAR,
}

function stringRep(ch: number): string {
  return String.fromCharCode(ch)
    .replace("\n", "\\n")
    .replace("\0", "\\0")
    .replace("\r", "\\r")
    .replace("\t", "\\t")
    .replace("\f", "\\f")
    .replace("\b", "\\b");
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
  // Tells whether the group is silent or not
  groupIsSilent = false;

  /**
   * Whether to ignore case in this particular subtree (only).
   * The compiler will emit different instructions based on
   * this flag.
   * null implies value is inherited from parent.
   */
  ignoreCase: boolean | null = null;

  /**
   * Whether to allow "." to match new lines.
   * null implies value is inherited from parent.
   */
  dotAll: boolean | null = null;

  /**
   * Whether ^ and $ are to be activated also on new line
   * boundaries.
   * null implies value is inherited from parent.
   */
  multiline: boolean | null = null;

  setOptions(options: any): this {
    if ("dotAll" in options) this.dotAll = options.dotAll;
    if ("ignoreCase" in options) this.ignoreCase = options.ignoreCase;
    if ("groupIndex" in options) this.groupIndex = options.groupIndex;
    if ("multiline" in options) this.multiline = options.multiline;
    return this;
  }

  debugValue(): any {
    const out = {} as any;
    if (this.dotAll) out.dotAll = true;
    if (this.ignoreCase) out.ignoreCase = true;
    if (this.multiline) out.multiline = true;
    if (this.groupIndex >= 0) out.groupIndex = this.groupIndex;
    return out;
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

  get modifiers(): string {
    let mod = "";
    if (this.dotAll) mod += "d";
    if (this.ignoreCase) mod += "i";
    if (this.multiline) mod += "m";
    if (this.groupIndex >= 0) mod += "g:" + this.groupIndex;
    return mod.length == 0 ? mod : "<" + mod + ">";
  }
}

export class StartOfInput extends Regex {
  readonly tag: RegexType = RegexType.START_OF_INPUT;
  debugValue(): string {
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
  debugValue(): string {
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
  debugValue(): string {
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
  debugValue(): string {
    return "\\b";
  }
  reverse(): this {
    return this;
  }
  protected evalREString(): string {
    return "\\b";
  }
}

abstract class Assertion extends Regex {
  /**
   * Creates a look-back assertion.
   *
   * @param expr - The regex to match before asserting.
   * @param cond  - The Condition to check.
   */
  constructor(public readonly expr: Regex, public readonly cond: Regex, public readonly negate = false) {
    super();
  }
}

export class LookAhead extends Assertion {
  readonly tag: RegexType = RegexType.LOOK_AHEAD;

  protected evalREString(): string {
    return `${this.expr.toString}(?${this.negate ? "!" : "="}${this.cond.toString})`;
  }

  debugValue(): any {
    return [
      "LookAhead",
      {
        ...super.debugValue(),
        negate: this.negate,
        expr: this.expr.debugValue(),
        cond: this.cond.debugValue(),
      },
    ];
  }

  reverse(): Regex {
    return new LookBack(this.expr.reverse(), this.cond.reverse(), this.negate);
  }
}

export class LookBack extends Assertion {
  readonly tag: RegexType = RegexType.LOOK_BACK;

  protected evalREString(): string {
    return `(?<${this.negate ? "!" : "="}${this.cond.toString})${this.expr.toString}`;
  }

  debugValue(): any {
    return [
      "LookBack",
      {
        ...super.debugValue(),
        negate: this.negate,
        expr: this.expr.debugValue(),
        cond: this.cond.debugValue(),
      },
    ];
  }

  reverse(): Regex {
    return new LookAhead(this.expr.reverse(), this.cond.reverse(), this.negate);
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
    else if (this.minCount != 1 || this.maxCount != 1) {
      if (this.minCount == this.maxCount) {
        quant = `{${this.minCount}}`;
      } else {
        quant = `{${this.minCount},${this.isUnlimited ? "" : this.maxCount}}`;
      }
    }
    return `${this.expr.toString}${quant}`;
  }

  debugValue(): any {
    let quant = "*";
    if (this.minCount == 1 && this.isUnlimited) quant = this.greedy ? "+?" : "+";
    else if (this.minCount == 0 && this.isUnlimited) quant = this.greedy ? "*?" : "*";
    else if (this.minCount == 0 && this.maxCount == 1) quant = this.greedy ? "??" : "?";
    else if (this.minCount != 1 || this.maxCount != 1) {
      if (this.minCount == this.maxCount) {
        quant = `{${this.minCount}}` + (this.greedy ? "?" : "");
      } else {
        quant = `{${this.minCount},${this.maxCount}}` + (this.greedy ? "?" : "");
      }
    }
    return [quant, super.debugValue(), this.expr.debugValue()];
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

  debugValue(): any {
    return ["Cat", { ...super.debugValue() }, this.children.map((c) => c.debugValue())];
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

  debugValue(): any {
    return ["Union", { ...super.debugValue() }, this.options.map((c) => c.debugValue())];
  }
}

/**
 * Opcode for each char.
 * These MUST be >= 0 as -ve indicate the negated of a particular char type.
 */
export enum CharType {
  AnyChar = 1,
  SingleChar,
  CharRange,
  PropertyEscape,
  CharClass,
  Union,
  Intersection,
}

/**
 * Broad class of "char matchers".
 */
export abstract class Char extends Regex {
  readonly tag: RegexType = RegexType.CHAR;

  // Type of opcode for this char match
  protected constructor(public readonly op: CharType, public readonly neg = false) {
    super();
  }

  match(ch: number): boolean {
    const result = this.matchChar(ch);
    return (result && !this.neg) || (this.neg && !result);
    return result;
  }

  protected abstract matchChar(ch: number): boolean;

  abstract compareTo(another: this): number;

  reverse(): Char {
    return this;
  }

  debugValue(): any {
    return this.toString + this.modifiers;
  }
}

export class LeafChar extends Char {
  protected constructor(public readonly op: CharType, public readonly neg = false, readonly args: number[] = []) {
    super(op, neg);
  }

  static Any(neg = false): Char {
    return new LeafChar(CharType.AnyChar, neg);
  }

  static Class(charClass: CharClassType, neg = false): LeafChar {
    return new LeafChar(CharType.CharClass, neg, [charClass]);
  }

  static Single(ch: string | number, neg = false): LeafChar {
    if (typeof ch === "string") {
      ch = ch.charCodeAt(0);
    }
    return new LeafChar(CharType.SingleChar, neg, [ch]);
  }

  static PropertyEscape(propNameOrId: string | number, propValueOrId: string | number, neg = false): LeafChar {
    if (typeof propNameOrId === "string") propNameOrId = PropertyEscapes.propertyNameFor(propNameOrId);
    if (typeof propValueOrId === "string") propValueOrId = PropertyEscapes.propertyValueFor(propValueOrId);
    return new LeafChar(CharType.PropertyEscape, neg, [propNameOrId, propValueOrId]);
  }

  matchChar(ch: number): boolean {
    const args = this.args;
    switch (this.op) {
      case CharType.SingleChar:
        return ch == this.args[0];
      case CharType.CharClass:
        return CharClassHelpers[args[0]].matches(ch, false);
      case CharType.PropertyEscape:
        throw new Error("Property Escape Matching - TBD");
      default:
        throw new Error("Custom Chars - TBD i: " + this.op);
    }
    return false;
  }

  compareTo(another: this): number {
    if (this.op != another.op) return this.op - another.op;
    for (let i = 0; i < this.args.length && i < another.args.length; i++) {
      if (this.args[i] != another.args[i]) return this.args[i] - another.args[i];
    }
    return this.args.length - another.args.length;
  }

  protected evalREString(): string {
    if (this.op == CharType.AnyChar) {
      return ".";
    } else if (this.op == CharType.SingleChar) {
      return stringRep(this.args[0]);
    } else if (this.op == CharType.CharClass) {
      return CharClassHelpers[this.args[0]].reString(this.neg);
    } else if (this.op == CharType.PropertyEscape) {
      return this.neg ? "\\P{" : "\\p{" + "}";
      return `${PropertyEscapes.propertyNameString(this.args[0])}=${PropertyEscapes.propertyValueString(
        this.args[1],
      )}\}`;
    }
    return "Custom " + this.args.join(" ");
  }
}

export class CharGroup extends Char {
  protected constructor(public readonly op: CharType, public readonly neg = false, readonly chars: Char[] = []) {
    super(op, neg);
  }

  compareTo(another: CharGroup): number {
    if (this.op != another.op) return this.op - another.op;
    for (let i = 0; i < this.chars.length && i < another.chars.length; i++) {
      const d = this.chars[i].compareTo(another.chars[i]);
      if (d != 0) return d;
    }
    return this.chars.length - another.chars.length;
  }

  matchChar(ch: number): boolean {
    const chars = this.chars;
    switch (this.op) {
      case CharType.CharRange:
        return ch >= (chars[0] as LeafChar).args[0] && ch <= (chars[1] as LeafChar).args[0];
      case CharType.Union: {
        for (let i = 0; i < chars.length; i++) {
          if (chars[i].match(ch)) return true;
        }
        return false;
      }
      case CharType.Intersection: {
        for (let i = 0; i < chars.length; i++) {
          if (!chars[i].match(ch)) return false;
        }
        return true;
      }
      default:
        throw new Error("Custom CharGroup - TBD i: " + this.op);
    }
    return false;
  }

  protected evalREString(): string {
    const out = this.chars.map((ch) => ch.debugValue()).join("");
    if (this.op == CharType.CharRange) {
      return `${this.chars[0].toString}-${this.chars[1].toString}`;
    } else if (this.op == CharType.Union) {
      return out.length > 1 ? (this.neg ? "[^" : "[") + out + "]" : out;
    } else if (this.op == CharType.Intersection) {
      return out.length > 1 ? (this.neg ? "[^" : "[") + out + "]" : out;
    }
    return "Custom " + this.chars.join(" ");
  }

  static Range(start: LeafChar, end: LeafChar, neg = false): CharGroup {
    return new CharGroup(CharType.CharRange, neg, [start, end]);
  }

  static Union(neg = false, chars: Char[]): CharGroup {
    return new CharGroup(CharType.Union, neg, chars);
  }

  static Intersection(neg = false, chars: Char[]): CharGroup {
    return new CharGroup(CharType.Intersection, neg, chars);
  }
}

/**
 * Variables referring to shared expressions by name.
 */
export class Var extends Regex {
  readonly tag: RegexType = RegexType.VAR;
  constructor(public readonly name: string, public readonly reversed = false) {
    super();
  }

  reverse(): Var {
    return new Var(this.name, !this.reversed);
  }

  protected evalREString(): string {
    return "<" + this.name + ">";
  }

  debugValue(): any {
    return ["V:" + this.name, { ...super.debugValue() }];
  }
}

/**
 * Named expression referring to another regex by name.
 */
export class BackNamedRef extends Regex {
  readonly tag: RegexType = RegexType.BACK_NAMED_REF;
  constructor(public readonly name: string, public readonly reversed = false) {
    super();
  }

  reverse(): BackNamedRef {
    return new BackNamedRef(this.name, !this.reversed);
  }

  protected evalREString(): string {
    return "\\k<" + this.name + ">";
  }

  debugValue(): any {
    return { ...super.debugValue, BackRef: this.name };
  }
}

/**
 * Numeric reference to a capture group.
 */
export class BackNumRef extends Regex {
  readonly tag: RegexType = RegexType.BACK_NUM_REF;
  constructor(public readonly num: number, public readonly reversed = false) {
    super();
  }

  reverse(): BackNumRef {
    return new BackNumRef(this.num, !this.reversed);
  }

  protected evalREString(): string {
    return "\\" + this.num;
  }

  debugValue(): any {
    return "\\" + this.num;
  }
}

export type REPatternType = RegExp | Rule | string;

export interface RuleConfig {
  /**
   * Token's tag associated with this Rule.
   * This is used to associate a rule (and its lexeme)
   * with its token by the parser.
   */
  tag?: any;

  /**
   * Priority for a rule.  As the NFA runs through the rules it could be
   * matching several rules in parallel.  However as soon as a rule that
   * is of a higher priority has matched all other rules (still running)
   * with a lower priority are halted.
   * We can use this to match literals over a regex even though a regex
   * can have a longer match.
   */
  priority?: number;

  /**
   * Whether the rule is greedy or not.
   */
  isGreedy?: boolean;

  /**
   * A value set later on to identify the match index
   */
  matchIndex?: number;
}

/**
 * A rule defines a match to be performed and recognized by the lexer.
 */
export class Rule {
  /**
   * The token type tag to associate this rule with.  If tag is null
   * then this will be treated as a non-primary rule.  Only rules that are
   * "primary" rules will be targetted for matching in the final NFA.  We
   * can create non primary rules as a way for short cuts.  Eg:
   *
   *                        WHITESPACE = [ \t\n]+
   *
   * can be a rule that is only used "inside" other rules via <WHITESPACE>.
   */
  tag: any;

  /**
   * Priority for a rule.  As the NFA runs through the rules it could be
   * matching several rules in parallel.  However as soon as a rule that
   * is of a higher priority has matched all other rules (still running)
   * with a lower priority are halted.
   * We can use this to match literals over a regex even though a regex
   * can have a longer match.
   */
  priority: number;

  /**
   * Whether the rule is greedy or not.
   */
  isGreedy: boolean;

  /**
   * A value set later on to identify the match index
   */
  matchIndex: number;

  // readonly pattern: string;

  /**
   * Whether to skip this rule or not.
   */
  skip = false;

  /**
   * Source for this Regex before it is compiled.
   */
  pattern: string | RegExp;

  /**
   * Constructor
   *
   * @param pattern   - The pattern to match for the rule.
   */
  constructor(public expr: Regex, config?: RuleConfig) {
    config = config || ({} as RuleConfig);
    this.tag = TSU.Misc.dictGet(config, "tag", null);
    this.priority = TSU.Misc.dictGet(config, "priority", 10);
    this.isGreedy = TSU.Misc.dictGet(config, "isGreedy", true);
    this.matchIndex = TSU.Misc.dictGet(config, "matchIndex", -1);
  }
}
