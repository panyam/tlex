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

abstract class CharClassHelper {
  matches(charCode: number, neg: boolean): boolean {
    const res = this.match(charCode);
    return neg ? !res : res;
  }
  protected abstract match(charCode: number): boolean;
  abstract reString(neg: boolean): string;
}

// Spaces - \s => [ \b\c\u00a0\t\r\n\u2028\u2029<BOM><USP>]
// BOM = \uFEFF
// USP = Other unicode space separator
const spaceChars = " \f\n\r\t\v\u00a0\u1680\u2028\u2029\u202f\u205f\u3000\ufeff";
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

// Digits - \d => 0-9
export class Digit extends CharClassHelper {
  match(charCode: number): boolean {
    return charCode >= ZERO && charCode <= NINE;
  }

  reString(neg: boolean): string {
    return neg ? "\\D" : "\\d";
  }
}

//  Char Class - "\w"
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
