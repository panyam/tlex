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
  // NEG,
  REF,
  NUM_REF,
  QUANT,
  LOOK_AHEAD,
  LOOK_BACK,
  // Individual matchables
  // ANY,
  CHAR,
  // CHAR_GROUP,
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

/*
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
*/

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

/*
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
    if (this.expr.tag == RegexType.CHAR_GROUP) {
      const out = (this.expr as CharGroup).debugValue as string;
      return "[^" + out.substring(1, out.length - 1) + "]";
    } else {
      return ["NOT", this.expr.debugValue];
    }
  }
}
*/

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
  CharGroup,
  Custom, // User defined matchers to be plugged here
}

/**
 * Broad class of "char matchers".
 */
export class Char extends Regex {
  readonly tag: RegexType = RegexType.CHAR;
  readonly args: number[];

  // Type of opcode for this char match
  protected constructor(public readonly op: CharType, public readonly neg = false, ...data: number[]) {
    super();
    this.args = data;
  }

  reverse(): Char {
    return this;
  }

  static Any(neg = false): Char {
    return new Char(CharType.AnyChar, neg);
  }

  static Custom(neg = false, ...args: number[]): Char {
    return new Char(CharType.Custom, neg, ...args);
  }

  static Range(start: number, end: number, neg = false): Char {
    return new Char(CharType.CharRange, neg, start, end);
  }

  static Class(charClass: CharClassType, neg = false): Char {
    return new Char(CharType.CharClass, neg, charClass);
  }

  static Single(ch: string | number, neg = false): Char {
    if (typeof ch === "string") {
      ch = ch.charCodeAt(0);
    }
    return new Char(CharType.SingleChar, neg, ch);
  }

  static PropertyEscape(propNameOrId: string | number, propValueOrId: string | number, neg = false): Char {
    if (typeof propNameOrId === "string") propNameOrId = PropertyEscapes.propertyNameFor(propNameOrId);
    if (typeof propValueOrId === "string") propValueOrId = PropertyEscapes.propertyValueFor(propValueOrId);
    return new Char(CharType.PropertyEscape, neg, propNameOrId, propValueOrId);
  }

  static Group(neg = false, ...chars: Char[]): Char {
    const out = new Char(CharType.CharGroup, neg);
    for (const ch of chars) {
      if (ch.op == CharType.CharGroup) {
        // Or should these just be flattened?
        throw new SyntaxError("Char groups cannot be recursive");
      }
      out.args.push(ch.neg ? -ch.op : ch.op);
      out.args.push(...ch.args);
    }
    return out;
  }

  compareTo(another: Char): number {
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
    } else if (this.op == CharType.CharRange) {
      return `${stringRep(this.args[0])}-${stringRep(this.args[1])}`;
    } else if (this.op == CharType.PropertyEscape) {
      return this.neg ? "\\P{" : "\\p{" + "}";
      return `${PropertyEscapes.propertyNameString(this.args[0])}=${PropertyEscapes.propertyValueString(
        this.args[1],
      )}\}`;
    } else if (this.op == CharType.CharGroup) {
      const chars: Char[] = [];
      const args = this.args;
      for (let i = 0; i < args.length; ) {
        const op = Math.abs(args[i]);
        const neg = args[i] < 0;
        if (op == CharType.SingleChar) {
          chars.push(Char.Single(args[i + 1]));
          i += 2;
        } else if (op == CharType.CharClass) {
          chars.push(Char.Class(args[i + 1]));
          i += 2;
        } else if (op == CharType.CharRange) {
          chars.push(Char.Range(args[i + 1], args[i + 2]));
          i += 3;
        } else if (op == CharType.PropertyEscape) {
          chars.push(Char.PropertyEscape(args[i + 1], args[i + 2], neg));
          i += 3;
        } else {
          throw new Error("Unsupported op in CharGroup: " + op);
        }
      }
      const out = chars.map((ch) => ch.debugValue).join("");
      return out.length > 1 ? (this.neg ? "[^" : "[") + out + "]" : out;
    }
    return "Custom " + this.args.join(" ");
  }

  get debugValue(): any {
    return this.toString;
  }
}

/**
 * Character ranges
 */
/*
export class CharGroup extends Regex {
  readonly tag: RegexType = RegexType.CHAR_GROUP;
  neg = false;
  chars: Char[];
  constructor(...chars: Char[]) {
    super();
    this.chars = chars;
    // this.mergeRanges();
  }

  reverse(): CharGroup {
    return this;
  }

 */
/**
 * Adds a new Char into this range.
 * Doing so "merges" renges in this class so we dont have overlaps.
 */
/*
  add(ch: Char): this {
    this.chars.push(ch);
    // return this.mergeRanges();
  }
 */

/*
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
  */

/*
  protected evalREString(): string {
    const out = this.chars.map((ch) => ch.debugValue).join("");
    return out.length > 1 ? (this.neg ? "[^" : "[") + out + "]" : out;
  }

  get debugValue(): any {
    return this.chars.map((ch) => ch.debugValue);
  }
}
*/

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
 * Numeric reference to a capture group.
 */
export class NumRef extends Regex {
  readonly tag: RegexType = RegexType.NUM_REF;
  constructor(public readonly num: number, public readonly reversed = false) {
    super();
  }

  reverse(): NumRef {
    return new NumRef(this.num, !this.reversed);
  }

  protected evalREString(): string {
    return "\\" + this.num;
  }

  get debugValue(): any {
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
   * Whether to ignore case int his particular rule (only).  The compiler will emit
   * different instructions based on this flag.
   */
  ignoreCase?: boolean;

  /**
   * Whether to allow "." to match new lines.
   */
  dotAll?: boolean;

  /**
   * Whether ^ and $ are to be activated also on new line boundaries.
   */
  multiline?: boolean;

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
   * Whether to ignore case int his particular rule (only).  The compiler will emit
   * different instructions based on this flag.
   */
  ignoreCase: boolean;

  /**
   * Whether to allow "." to match new lines.
   */
  dotAll: boolean;

  /**
   * Whether ^ and $ are to be activated also on new line boundaries.
   */
  multiline: boolean;

  /**
   * A value set later on to identify the match index
   */
  matchIndex: number;

  /**
   * Constructor
   *
   * @param pattern   - The pattern to match for the rule.
   */
  constructor(pattern: string | RegExp, config?: RuleConfig) {
    config = config || ({} as RuleConfig);
    this.tag = TSU.Misc.dictGet(config, "tag", null);
    this.priority = TSU.Misc.dictGet(config, "priority", 10);
    this.isGreedy = TSU.Misc.dictGet(config, "isGreedy", true);
    this.dotAll = TSU.Misc.dictGet(config, "dotAll", true);
    this.multiline = TSU.Misc.dictGet(config, "multiline", true);
    this.ignoreCase = TSU.Misc.dictGet(config, "ignoreCase", false);
    this.matchIndex = TSU.Misc.dictGet(config, "matchIndex", -1);
    if (typeof pattern === "string") {
      this.pattern = pattern;
    } else {
      this.pattern = pattern.source;
      this.dotAll = pattern.dotAll;
      this.ignoreCase = pattern.ignoreCase;
      this.multiline = pattern.multiline;
    }
  }

  readonly pattern: string;

  /**
   * Whether to skip this rule or not.
   */
  skip = false;

  /**
   * The generated expression for this rule.
   */
  expr: Regex;

  static flatten(re: REPatternType | REPatternType[], index = 0, rules?: Rule[]): Rule[] {
    rules = rules || [];
    if (typeof re === "string") {
      rules.push(new Rule(re, { tag: index }));
    } else if (re.constructor == RegExp) {
      rules.push(new Rule(re, { tag: index }));
    } else if (re.constructor == Rule) {
      rules.push(re as Rule);
    } else {
      const res = re as (RegExp | Rule | string)[];
      for (let i = 0; i < res.length; i++) {
        Rule.flatten(res[i], i, rules);
      }
    }
    return rules;
  }
}
