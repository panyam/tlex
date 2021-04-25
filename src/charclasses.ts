export enum CharClassType {
  JS_WORD_CHAR,
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

export interface CharClassHelper {
  match(charCode: number): boolean;
  reString(neg: boolean): string;
}

// Spaces - \s => [ \b\c\u00a0\t\r\n\u2028\u2029<BOM><USP>]
// BOM = \uFEFF
// USP = Other unicode space separator
const spaceChars = " \bc\u00a0\t\r\n\u2028\u2029\uFEFF";
export class JSSpaces implements CharClassHelper {
  match(charCode: number): boolean {
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
export class Digit implements CharClassHelper {
  match(charCode: number): boolean {
    return charCode >= ZERO && charCode <= NINE;
  }

  reString(neg: boolean): string {
    return neg ? "\\D" : "\\d";
  }
}

// JS Char Class - "\w"
export class JSWordChar implements CharClassHelper {
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

export const CharClassHelpers: ReadonlyArray<CharClassHelper> = [new JSWordChar(), new Digit(), new JSSpaces()];
