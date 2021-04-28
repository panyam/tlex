export enum CharClassType {
  WORD_CHAR,
  NOT_WORD_CHAR,
  DIGITS,
  NOT_DIGITS,
  SPACES,
  NOT_SPACES,
}

const ZERO = "0".charCodeAt(0);
const NINE = "9".charCodeAt(0);
const lA = "a".charCodeAt(0);
const lZ = "z".charCodeAt(0);
const uA = "A".charCodeAt(0);
const uZ = "Z".charCodeAt(0);
const USCORE = "_".charCodeAt(0);

abstract class CharClassHelper {
  constructor(public readonly negate = false) {}
  match(charCode: number): boolean {
    const result = this.matches(charCode);
    return this.negate ? !result : result;
  }
  protected abstract matches(charCode: number): boolean;
  abstract reString(): string;
}

// Spaces - \s => [ \b\c\u00a0\t\r\n\u2028\u2029<BOM><USP>]
// BOM = \uFEFF
// USP = Other unicode space separator
const spaceChars = " \bc\u00a0\t\r\n\u2028\u2029\uFEFF";
export class Spaces extends CharClassHelper {
  matches(charCode: number): boolean {
    for (let i = 0; i < spaceChars.length; i++) {
      if (spaceChars.charCodeAt(i) == charCode) return true;
    }
    return false;
  }

  reString(): string {
    return this.negate ? "\\S" : "\\s";
  }
}

// Digits - \d => 0-9
export class Digit extends CharClassHelper {
  matches(charCode: number): boolean {
    return charCode >= ZERO && charCode <= NINE;
  }

  reString(): string {
    return this.negate ? "\\D" : "\\d";
  }
}

//  Char Class - "\w"
export class WordChar extends CharClassHelper {
  matches(charCode: number): boolean {
    return (
      charCode == USCORE ||
      (charCode >= ZERO && charCode <= NINE) ||
      (charCode >= lA && charCode <= lZ) ||
      (charCode >= uA && charCode <= uZ)
    );
    return true;
  }

  reString(): string {
    return this.negate ? "\\W" : "\\w";
  }
}

export const CharClassHelpers: ReadonlyArray<CharClassHelper> = [
  new WordChar(),
  new WordChar(true),
  new Digit(),
  new Digit(true),
  new Spaces(),
  new Spaces(true),
];
