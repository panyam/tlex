export enum CharClassType {
  WORD_CHAR,
  DIGITS,
  SPACES,
}

const ZERO = "0".charCodeAt(0);
const NINE = "9".charCodeAt(0);
const lA = "a".charCodeAt(0);
const lZ = "z".charCodeAt(0);
const uA = "A".charCodeAt(0);
const uZ = "Z".charCodeAt(0);
const USCORE = "_".charCodeAt(0);

/**
 * An abstract class to be implemented for enabling different types of char classes.
 * Char classes are a form of "short codes" to identify characters.  eg SPACES, DIGITS etc.
 * Char classes are only shortcuts.  One can get away without using them and instead explicitly
 * construct the underlying state machine or regex (eg DIGIT could be replaced with [0-9]).
 */
export abstract class CharClassHelper {
  matches(charCode: number, neg: boolean): boolean {
    const res = this.match(charCode);
    return neg ? !res : res;
  }
  protected abstract match(charCode: number): boolean;
  abstract reString(neg: boolean): string;
}

const spaceChars = " \f\n\r\t\v\u00a0\u1680\u2028\u2029\u202f\u205f\u3000\ufeff";

/**
 * Spaces - \s => [ \b\c\u00a0\t\r\n\u2028\u2029<BOM><USP>]
 * BOM = \uFEFF
 * USP = Other unicode space separator
 */
export class Spaces extends CharClassHelper {
  match(charCode: number): boolean {
    // if (charCode == 0x180e) return true;
    if (charCode >= 0x2000 && charCode <= 0x200a) return true;
    for (let i = 0; i < spaceChars.length; i++) {
      if (spaceChars.charCodeAt(i) == charCode) return true;
    }
    return false;
  }

  reString(neg: boolean): string {
    return neg ? "\\S" : "\\s";
  }
}

/**
 * Char class for denoting a digit - [0-9].
 */
export class Digit extends CharClassHelper {
  match(charCode: number): boolean {
    return charCode >= ZERO && charCode <= NINE;
  }

  reString(neg: boolean): string {
    return neg ? "\\D" : "\\d";
  }
}

/**
 * Char class for denoting "\\w" - ie any WordChar
 */
export class WordChar extends CharClassHelper {
  match(charCode: number): boolean {
    return (
      charCode == USCORE ||
      (charCode >= ZERO && charCode <= NINE) ||
      (charCode >= lA && charCode <= lZ) ||
      (charCode >= uA && charCode <= uZ)
    );
    return true;
  }

  reString(neg: boolean): string {
    return neg ? "\\W" : "\\w";
  }
}

export const CharClassHelpers: ReadonlyArray<CharClassHelper> = [new WordChar(), new Digit(), new Spaces()];
