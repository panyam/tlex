import * as TSU from "@panyam/tsutils";
const util = require("util");
import fs from "fs";
import * as Builder from "../builder";
import { Tape } from "../tape";
import { parse, compile, execute, runMatchTest } from "./utils";
import { Token } from "../tokenizer";
import { Prog, VM } from "../vm";

//
// Test cases from
//
// https://github.com/tc39/test262/tree/6e61dd7754e7c94ebcf3ee679cb8db3c54a37b50/test/built-ins/RegExp
//
function stringRep(ch: number): string {
  return String.fromCharCode(ch)
    .replace("\n", "\\n")
    .replace("\0", "\\0")
    .replace("\r", "\\r")
    .replace("\t", "\\t")
    .replace("\f", "\\f")
    .replace("\b", "\\b");
}

function range(start: number, end: number, delta = 1): number[] {
  const out = [] as number[];
  if (start < end) {
    if (delta < 0) delta = -delta;
    for (let i = start; i < end; i += delta) {
      out.push(i);
    }
  } else {
    if (delta > 0) delta = -delta;
    for (let i = start; i > end; i -= delta) {
      out.push(i);
    }
  }
  return out;
}

function expectMatchIndexes(found: Token[], ...expected: number[]): Token[] {
  if (found.length == 0) expect(expected.length).toBe(0);
  else expect(found.length).toBe(expected.length - 1);
  for (let i = 0; i < found.length; i++) {
    expect(found[i].start).toBe(expected[i]);
    expect(found[i].end).toBe(expected[i + 1]);
    // expect(found[i].matchIndex).toBe(expected[i][2]);
  }
  return found;
}

function caseLabel(testid: string): string {
  // testids are of this form : 15.10.2.5-3-1
  let hyphenPos = testid.indexOf("-");
  if (hyphenPos < 0) hyphenPos = testid.indexOf("_");
  let section = testid;
  const baseUrl = "https://262.ecma-international.org/5.1/#sec-";
  let out = `${testid} - ${baseUrl}`;
  let stepid = "";
  if (hyphenPos >= 0) {
    section = testid.substring(0, hyphenPos).trim();
    stepid = `(${testid.substring(hyphenPos + 1).trim()})`;
  }
  out += `${section} ${stepid}`;
  return out;
}

describe("ECMA Tests - Simple Parsing Error Tests", () => {
  test(caseLabel("15.10.2.15-6-1"), () => {
    expect(() => parse("^[z-a]$")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.5-3-1"), () => {
    expect(() => parse("0{2,1}")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.4.1-1"), () => {
    // Ignored as we dont have flags (for now)
    // expect(() => parse("0{2,1}")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.4.1-2"), () => {
    expect(() => parse("\\")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.4.1-3"), () => {
    // Ignored as we dont have flags (for now)
    // expect(() => parse("0{2,1}")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.4.1-4"), () => {
    // Ignored as we dont have flags (for now)
    // expect(() => parse("0{2,1}")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T1"), () => {
    expect(() => parse("a**")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T2"), () => {
    expect(() => parse("a***")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T3"), () => {
    expect(() => parse("a++")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T4"), () => {
    expect(() => parse("a+++")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T5"), () => {
    expect(() => parse("a???")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T6"), () => {
    expect(() => parse("a????")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T7"), () => {
    expect(() => parse("*a")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T8"), () => {
    expect(() => parse("**a")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T9"), () => {
    expect(() => parse("+a")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T10"), () => {
    expect(() => parse("++a")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T12"), () => {
    expect(() => parse("??a")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T13"), () => {
    expect(() => parse("x{1}{1,}")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T14"), () => {
    expect(() => parse("x{1,2}{1}")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T15"), () => {
    expect(() => parse("x{1,}{1}")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.1_A1_T16"), () => {
    expect(() => parse("x{0,1}{1,}")).toThrow(SyntaxError);
  });
});

describe("ECMA Tests - Simple Unicode Equivalence Tests", () => {
  test(caseLabel("15.10.2.10_A1.1_T1"), () => {
    runMatchTest("./cases/ecma262/15.10.2.10_A1.1_T1.test");
  });
  test(caseLabel("15.10.2.10_A1.2_T1"), () => {
    expectMatchIndexes(execute({}, "\u000a", /\n/), 0, 1);
    expectMatchIndexes(execute({}, "\u000a\u000ab", /\n\n/), 0, 2);
  });
  test(caseLabel("15.10.2.10_A1.3_T1"), () => {
    expectMatchIndexes(execute({}, "\u000B", /\v/), 0, 1);
    expectMatchIndexes(execute({}, "\u000B\u000Bb", /\v\v/), 0, 2);
  });
  test(caseLabel("15.10.2.10_A1.4_T1"), () => {
    expectMatchIndexes(execute({}, "\u000C", "\\f"), 0, 1);
    expectMatchIndexes(execute({}, "\u000C\u000Cb", /\f\f/), 0, 2);
  });
  test(caseLabel("15.10.2.10_A1.D_T1"), () => {
    expectMatchIndexes(execute({}, "\u000D", /\r/), 0, 1);
    expectMatchIndexes(execute({}, "\u000D\u000Db", /\r\r/), 0, 2);
  });
  test(caseLabel("15.10.2.10_A2.1_T1"), () => {
    // control chars A-Z
    for (let alpha = 0x0041; alpha <= 0x005a; alpha++) {
      const str = String.fromCharCode(alpha % 32);
      const re = "\\c" + String.fromCharCode(alpha);
      expectMatchIndexes(execute({}, str, re), 0, 1);
    }
  });
  test(caseLabel("15.10.2.10_A3.1_T1 _ Test strings with equal hex and unicode strings"), () => {
    expectMatchIndexes(execute({}, "\u0000", "\\x00"), 0, 1);
    expectMatchIndexes(execute({}, "\u0001", "\\x01"), 0, 1);
    expectMatchIndexes(execute({}, "\u000A", "\\x0A"), 0, 1);
    expectMatchIndexes(execute({}, "\u00FF", "\\xFF"), 0, 1);
  });
  test(caseLabel("15.10.2.10_A3.1_T2 _ Test strings with equal hex and unicode strings"), () => {
    let hex = [
      "\\x41",
      "\\x42",
      "\\x43",
      "\\x44",
      "\\x45",
      "\\x46",
      "\\x47",
      "\\x48",
      "\\x49",
      "\\x4A",
      "\\x4B",
      "\\x4C",
      "\\x4D",
      "\\x4E",
      "\\x4F",
      "\\x50",
      "\\x51",
      "\\x52",
      "\\x53",
      "\\x54",
      "\\x55",
      "\\x56",
      "\\x57",
      "\\x58",
      "\\x59",
      "\\x5A",
    ];
    let character = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ];
    // check lower case
    hex.forEach((h, index) => expectMatchIndexes(execute({}, character[index], h), 0, 1));

    hex = [
      "\\x61",
      "\\x62",
      "\\x63",
      "\\x64",
      "\\x65",
      "\\x66",
      "\\x67",
      "\\x68",
      "\\x69",
      "\\x6A",
      "\\x6B",
      "\\x6C",
      "\\x6D",
      "\\x6E",
      "\\x6F",
      "\\x70",
      "\\x71",
      "\\x72",
      "\\x73",
      "\\x74",
      "\\x75",
      "\\x76",
      "\\x77",
      "\\x78",
      "\\x79",
      "\\x7A",
    ];
    character = [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
      "k",
      "l",
      "m",
      "n",
      "o",
      "p",
      "q",
      "r",
      "s",
      "t",
      "u",
      "v",
      "w",
      "x",
      "y",
      "z",
    ];
    // Check upper case
    hex.forEach((h, index) => expectMatchIndexes(execute({}, character[index], h), 0, 1));
  });
  test(caseLabel("15.10.2.10_A4.1_T1 : Regex and input contain unicode symbols"), () => {
    expectMatchIndexes(execute({}, "\u0000", /\u0000/), 0, 1);
    expectMatchIndexes(execute({}, "\u0001", /\u0001/), 0, 1);
    expectMatchIndexes(execute({}, "\u000a", /\u000A/), 0, 1);
    expectMatchIndexes(execute({}, "\u000f", /\u000f/), 0, 1);
    expectMatchIndexes(execute({}, "\u00fF", /\u00Ff/), 0, 1);
    expectMatchIndexes(execute({}, "\u0fFf", /\u0FfF/), 0, 1);
    expectMatchIndexes(execute({}, "\uFfFf", /\uFFfF/), 0, 1);
  });
  test(caseLabel("15.10.2.10_A4.1_T2 : Tested string include ENGLISH CAPITAL ALPHABET and english small"), () => {
    let hex = [
      "\\u0041",
      "\\u0042",
      "\\u0043",
      "\\u0044",
      "\\u0045",
      "\\u0046",
      "\\u0047",
      "\\u0048",
      "\\u0049",
      "\\u004A",
      "\\u004B",
      "\\u004C",
      "\\u004D",
      "\\u004E",
      "\\u004F",
      "\\u0050",
      "\\u0051",
      "\\u0052",
      "\\u0053",
      "\\u0054",
      "\\u0055",
      "\\u0056",
      "\\u0057",
      "\\u0058",
      "\\u0059",
      "\\u005A",
    ];

    let character = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ];

    // check lower case
    hex.forEach((h, index) => expectMatchIndexes(execute({}, character[index], h), 0, 1));

    hex = [
      "\\u0061",
      "\\u0062",
      "\\u0063",
      "\\u0064",
      "\\u0065",
      "\\u0066",
      "\\u0067",
      "\\u0068",
      "\\u0069",
      "\\u006A",
      "\\u006B",
      "\\u006C",
      "\\u006D",
      "\\u006E",
      "\\u006F",
      "\\u0070",
      "\\u0071",
      "\\u0072",
      "\\u0073",
      "\\u0074",
      "\\u0075",
      "\\u0076",
      "\\u0077",
      "\\u0078",
      "\\u0079",
      "\\u007A",
    ];
    character = [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
      "k",
      "l",
      "m",
      "n",
      "o",
      "p",
      "q",
      "r",
      "s",
      "t",
      "u",
      "v",
      "w",
      "x",
      "y",
      "z",
    ];
    // Check upper case
    hex.forEach((h, index) => expectMatchIndexes(execute({}, character[index], h), 0, 1));
  });
  test(
    caseLabel(
      "15.10.2.10_A4.1_T3 : Tested string include RUSSIAN CAPITAL ALPHABET and russian small alphabet in unicode notation",
    ),
    () => {
      let hex = [
        "\\u0410",
        "\\u0411",
        "\\u0412",
        "\\u0413",
        "\\u0414",
        "\\u0415",
        "\\u0416",
        "\\u0417",
        "\\u0418",
        "\\u0419",
        "\\u041A",
        "\\u041B",
        "\\u041C",
        "\\u041D",
        "\\u041E",
        "\\u041F",
        "\\u0420",
        "\\u0421",
        "\\u0422",
        "\\u0423",
        "\\u0424",
        "\\u0425",
        "\\u0426",
        "\\u0427",
        "\\u0428",
        "\\u0429",
        "\\u042A",
        "\\u042B",
        "\\u042C",
        "\\u042D",
        "\\u042E",
        "\\u042F",
        "\\u0401",
      ];

      let character = [
        "\u0410",
        "\u0411",
        "\u0412",
        "\u0413",
        "\u0414",
        "\u0415",
        "\u0416",
        "\u0417",
        "\u0418",
        "\u0419",
        "\u041A",
        "\u041B",
        "\u041C",
        "\u041D",
        "\u041E",
        "\u041F",
        "\u0420",
        "\u0421",
        "\u0422",
        "\u0423",
        "\u0424",
        "\u0425",
        "\u0426",
        "\u0427",
        "\u0428",
        "\u0429",
        "\u042A",
        "\u042B",
        "\u042C",
        "\u042D",
        "\u042E",
        "\u042F",
        "\u0401",
      ];

      // check lower case
      hex.forEach((h, index) => expectMatchIndexes(execute({}, character[index], h), 0, 1));

      hex = [
        "\\u0430",
        "\\u0431",
        "\\u0432",
        "\\u0433",
        "\\u0434",
        "\\u0435",
        "\\u0436",
        "\\u0437",
        "\\u0438",
        "\\u0439",
        "\\u043A",
        "\\u043B",
        "\\u043C",
        "\\u043D",
        "\\u043E",
        "\\u043F",
        "\\u0440",
        "\\u0441",
        "\\u0442",
        "\\u0443",
        "\\u0444",
        "\\u0445",
        "\\u0446",
        "\\u0447",
        "\\u0448",
        "\\u0449",
        "\\u044A",
        "\\u044B",
        "\\u044C",
        "\\u044D",
        "\\u044E",
        "\\u044F",
        "\\u0451",
      ];

      character = [
        "\u0430",
        "\u0431",
        "\u0432",
        "\u0433",
        "\u0434",
        "\u0435",
        "\u0436",
        "\u0437",
        "\u0438",
        "\u0439",
        "\u043A",
        "\u043B",
        "\u043C",
        "\u043D",
        "\u043E",
        "\u043F",
        "\u0440",
        "\u0441",
        "\u0442",
        "\u0443",
        "\u0444",
        "\u0445",
        "\u0446",
        "\u0447",
        "\u0448",
        "\u0449",
        "\u044A",
        "\u044B",
        "\u044C",
        "\u044D",
        "\u044E",
        "\u044F",
        "\u0451",
      ];

      // Check upper case
      hex.forEach((h, index) => expectMatchIndexes(execute({}, character[index], h), 0, 1));
    },
  );
  test(caseLabel("15.10.2.10_A5.1_T1 : Tested string is \"~`!@#$%^&*()-+={[}]|\\\\:;'<,>./?\" + '\"'"), () => {
    const non_ident = "~`!@#$%^&*()-+={[}]|\\:;'<,>./?" + '"';
    for (let k = 0; k < non_ident.length; ++k) {
      // \\Z where Z is above will just match to Z
      const re = "\\" + non_ident[k];
      expectMatchIndexes(execute({}, non_ident[k], re), 0, 1);
    }
  });
  test(caseLabel("15.10.2.11_A1_T1 : Test null chars"), () => {
    expectMatchIndexes(execute({}, "\u0000", /\0/), 0, 1);
  });
});

// Refer to:
// https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/
// For more details on what the tests are checking for parity
describe("ECMA Tests - Numbered Group Matching Tests", () => {
  test.skip(caseLabel("15.10.2.11_A1_T4"), () => {
    expectMatchIndexes(execute({}, "AA", /(A)\1/), 0, 2);
  });
  test.skip(caseLabel("15.10.2.11_A1_T5"), () => {
    expectMatchIndexes(execute({}, "AA", /\1(A)/), 0, 2);
  });
  test.skip(caseLabel("15.10.2.11_A1_T6"), () => {
    expectMatchIndexes(execute({}, "AABB", /(A)\1(B)\2/), 0, 4);
  });
  test.skip(caseLabel("15.10.2.11_A1_T7"), () => {
    expectMatchIndexes(execute({}, "AABB", /\1(A)\2(B)/), 0, 4);
  });
  test.skip(caseLabel("15.10.2.11_A1_T8"), () => {
    expectMatchIndexes(execute({}, "AAAAAAAAAAA", /((((((((((A))))))))))\1\2\3\4\5\6\7\8\9\10/), 0, 11);
  });
  test.skip(caseLabel("15.10.2.11_A1_T9"), () => {
    expectMatchIndexes(execute({}, "AAAAAAAAAAA", /((((((((((A))))))))))\10\9\8\7\6\5\4\3\2\1/), 0, 11);
  });
});

describe("ECMA Tests - Character Classes", () => {
  test(caseLabel("15.10.2.12_A3_T5"), () => {
    const input = "_0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < input.length; i++) {
      expectMatchIndexes(execute({}, input[i], /\w/), 0, 1);
    }
  });
  test(caseLabel("15.10.2.12_A4_T5"), () => {
    let input = "_0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < input.length; i++) {
      // should not match
      expectMatchIndexes(execute({}, input[i], /\W/));
    }

    // All should match
    input = "\f\n\r\t\v~`!@#$%^&*()-+={[}]|\\:;'<,>./? ";
    for (let i = 0; i < input.length; i++) {
      expectMatchIndexes(execute({}, input[i], /\W/), 0, 1);
    }
  });
  test(caseLabel("15.10.2.13_A1_T1 and 15.10.2.13_A1_T2"), () => {
    expectMatchIndexes(execute({}, "\0a\0a", /[]a/));
    expectMatchIndexes(execute({}, "\0a\0a", /a[]/));
  });
  test(caseLabel("15.10.2.13_A1_T6"), () => {
    expectMatchIndexes(execute({}, "abcde", /ab[ercst]de/), 0, 5);
  });
  test(caseLabel("15.10.2.13_A1_T7"), () => {
    expectMatchIndexes(execute({}, "abcde", /ab[erst]de/));
  });
  test(caseLabel("15.10.2.13_A1_T8"), () => {
    expectMatchIndexes(execute({}, "defghijkl", /[d-h]+/), 0, 5);
  });
  test(caseLabel("15.10.2.13_A1_T9"), () => {
    const found = execute({}, "6defghijkl", /[1234567].{2}/);
    expectMatchIndexes(found, 0, 3);
  });
  test(caseLabel("15.10.2.13_A1_T10"), () => {
    expectMatchIndexes(execute({}, "abc324234\n", /[a-c\d]+/), 0, 9);
  });
  test(caseLabel("15.10.2.13_A1_T11"), () => {
    expectMatchIndexes(execute({}, "abc", /ab[.]?c/), 0, 3);
  });
  test(caseLabel("15.10.2.13_A1_T12"), () => {
    expectMatchIndexes(execute({}, "abc", /a[b]?c/), 0, 3);
  });
  test.skip(caseLabel("15.10.2.13_A1_T14"), () => {
    expectMatchIndexes(execute({}, "*&$", /[*&$]{,3}/));
  });
  test(caseLabel("15.10.2.13_A1_T15"), () => {
    expectMatchIndexes(execute({}, "1\nb3\nd", /[\d][\n][^\d]/), 0, 3, 6);
  });
  test(caseLabel("15.10.2.13_A1_T17"), () => {
    expectMatchIndexes(execute({}, "1\nb3\nd", /[\d][\n][^\d]/), 0, 3, 6);
  });
});

describe("ECMA Tests - Look Ahead/Look Back assertion test", () => {
  test(caseLabel("15.10.2.13_A1_T3"), () => {
    const re = /q[ax-zb](?=\s+)/;
    expectMatchIndexes(execute({}, "qy ", re), 0, 2);
  });
  test(caseLabel("15.10.2.13_A1_T4"), () => {
    const re = /q[ax-zb](?=\s+)/;
    expectMatchIndexes(execute({}, "qy ", re), 0, 2);
  });
  test(caseLabel("15.10.2.13_A1_T5"), () => {
    const re = /q[ax-zb](?=\s+)/;
    expectMatchIndexes(execute({}, "qa\t  qy ", re), 0, 2);
  });
});

describe("ECMA Tests - More Char Ranges", () => {
  test(caseLabel("15.10.2.13_A2_T1"), () => {
    const re = "[^]a";
    expectMatchIndexes(execute({}, "\naa ", re), 0, 2);
    expectMatchIndexes(execute({}, "aaa", re), 0, 2);
    expectMatchIndexes(execute({}, "a", re));
  });
  test(caseLabel("15.10.2.13_A2_T2"), () => {
    const re = "a[^]";
    expectMatchIndexes(execute({}, "aa\n", re), 0, 2);
    expectMatchIndexes(execute({}, "aaa", re), 0, 2);
    expectMatchIndexes(execute({}, "a", re));
  });
  test(caseLabel("15.10.2.13_A2_T3"), () => {
    const re = "a[^b-z]\\s+";
    expectMatchIndexes(execute({}, "aY aA    aB  ", re), 0, 3, 9, 13);
    expectMatchIndexes(execute({}, "aY ab    aB  ", re), 0, 3);
    expectMatchIndexes(execute({}, "ab ab    aB  ", re));
  });
  test(caseLabel("15.10.2.13_A2_T4"), () => {
    const re = "[^\\b]+";
    expectMatchIndexes(execute({}, "easy\bto\u0008ride", re), 0, 4);
  });
  test(caseLabel("15.10.2.13_A2_T5"), () => {
    const re = "a[^1-9]c";
    expectMatchIndexes(execute({}, "abcdef", re), 0, 3);
  });
  test(caseLabel("15.10.2.13_A2_T6"), () => {
    const re = "a[^b]c";
    expectMatchIndexes(execute({}, "abcdef", re));
  });
  test(caseLabel("15.10.2.13_A2_T7"), () => {
    expectMatchIndexes(execute({}, "%&*@ghi", /[^a-z]{4}/), 0, 4);
  });
  test(caseLabel("15.10.2.13_A2_T8"), () => {
    expectMatchIndexes(execute({}, "abcdef", /[^]/), 0, 1, 2, 3, 4, 5, 6);
  });
  test(caseLabel("15.10.2.13_A3_T1"), () => {
    expectMatchIndexes(execute({}, "c\bd", /.[\b]./), 0, 3);
  });
  test(caseLabel("15.10.2.13_A3_T2"), () => {
    expectMatchIndexes(execute({}, "c\b\b\bdef", /c[\b]{3}d/), 0, 5);
  });
  test(caseLabel("15.10.2.13_A3_T3"), () => {
    expectMatchIndexes(execute({}, "abc\bdef", /[^\[\b\]]+/), 0, 3);
  });
  test(caseLabel("15.10.2.13_A3_T4"), () => {
    expectMatchIndexes(execute({}, "abcdef", /[^\[\b\]]+/), 0, 6);
  });
});

describe("ECMA Tests - Section 15.10.2.15", () => {
  test(caseLabel("15.10.2.15_A1_T1"), () => {
    expect(() => parse("[b-ac-e]")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.15_A1_T2"), () => {
    expect(() => parse("[a-dc-b]")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.15_A1_T3 to T33"), () => {
    expect(() => parse("[\\db-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\Db-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\sb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\Sb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\wb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\Wb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\0b-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\10b-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\bb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\Bb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\tb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\nb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\vb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\fb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\rb-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\c0001d-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\x0061d-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\u0061d-G]")).toThrow(SyntaxError);
    expect(() => parse("[\\ad-G]")).toThrow(SyntaxError);
    expect(() => parse("[c-eb-a]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\d]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\D]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\s]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\S]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\w]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\W]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\0]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\10]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\b]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\B]")).toThrow(SyntaxError);
    expect(() => parse("[b-G\\t]")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.15_A1_T35"), () => {
    expect(() => parse("[d-G\\v]")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.15_A1_T36"), () => {
    expect(() => parse("[d-G\\f]")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.15_A1_T37"), () => {
    expect(() => parse("[d-G\\r]")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.15_A1_T38"), () => {
    expect(() => parse("[d-G\\c0001]")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.15_A1_T40"), () => {
    expect(() => parse("[d-G\\u0061]")).toThrow(SyntaxError);
  });
  test(caseLabel("15.10.2.15_A1_T41"), () => {
    expect(() => parse("[d-G\\a]")).toThrow(SyntaxError);
  });
});

describe("ECMA Tests - Section 15.10.2.3 and 15.10.2.5 - Differences here would be by matching longest rather than first alternative", () => {
  test(caseLabel("15.10.2.3_A1_T1"), () => {
    expectMatchIndexes(execute({}, "abc", /a|ab/), 0, 1);
  });
  test(caseLabel("15.10.2.3_A1_T2"), () => {
    expectMatchIndexes(execute({}, "abbcac", "((a)|(ab))((c)|(bc))"), 0, 4, 6);
  });
  test.skip(caseLabel("15.10.2.3_A1_T6, T7, T8 - Case insensitivity not yet supported"), () => {
    expectMatchIndexes(execute({}, "AEKFCD", "ab|cd|ef"), 0, 4, 6);
  });
  test.skip(caseLabel("15.10.2.3_A1_T9- Case insensitivity and Non capturing groups not supported"), () => {
    expectMatchIndexes(execute({}, "AEKeFCDab", "(?:ab|cd)+|ef"));
  });
  test(caseLabel("15.10.2.3_A1_T11"), () => {
    expectMatchIndexes(execute({}, "1111111111111111", "11111|111"), 0, 5, 10, 15);
  });
  test(caseLabel("15.10.2.3_A1_T12"), () => {
    expectMatchIndexes(execute({}, "abc", "xyz|..."), 0, 3);
  });
  // Need to find a way to return submatches too
  test(caseLabel("15.10.2.3_A1_T13"), () => {
    expectMatchIndexes(execute({}, "abc", "(.).."), 0, 3);
  });
  test(caseLabel("15.10.2.3_A1_T14"), () => {
    expectMatchIndexes(execute({}, "color: grey", ".+: gr(a|e)y"), 0, 11);
  });
  test(caseLabel("15.10.2.3_A1_T15"), () => {
    expectMatchIndexes(execute({}, "BobRobertRobBobby", "(Robert)|(Bobby)|(Bob)|(Rob)"), 0, 3, 9, 12, 17);
  });
  test(caseLabel("15.10.2.5_A1_T1"), () => {
    expectMatchIndexes(execute({}, "abcdefghi", "a[a-z]{2,4}"), 0, 5);
  });
  test(caseLabel("15.10.2.5_A1_T2 - Needs to be fixed to handle greedy"), () => {
    expectMatchIndexes(execute({}, "abcdefghi", "a[a-z]{2,4}?"), 0, 3);
  });
  test(caseLabel("15.10.2.5_A1_T3"), () => {
    expectMatchIndexes(execute({}, "aabaac", "(aa|aabaac|ba|b|c)*"), 0, 4);
  });
  test(caseLabel("15.10.2.5_A1_T4"), () => {
    expectMatchIndexes(execute({}, "zaacbbbcac", "(z)((a+)?(b+)?(c))*"), 0, 10);
  });
  test.skip(caseLabel("15.10.2.5_A1_T5"), () => {
    // Not working yet
    expectMatchIndexes(execute({}, "aabaac", "(a*)b\\1+"), 0, 5);
  });
});

describe("ECMA Tests - Section 15.10.2.6", () => {
  test(caseLabel("15.10.2.6_A1_T1,T2"), () => {
    // /s$/.test("pairs\nmakes\tdouble");
    expectMatchIndexes(execute({}, "sss\nss\nsssss\nsssss", "s+$|\n"), 0, 3, 4, 6, 7, 12, 13, 18);
  });
  test(caseLabel("15.10.2.6_A1_T3,T4,T5"), () => {
    expectMatchIndexes(execute({}, "s\nssssss", /s+$|./ms), 0, 1, 2, 8);
    expectMatchIndexes(execute({}, "s\n\u0065s", /es$|./ms), 0, 1, 2, 4);
  });
  test(caseLabel("15.10.2.6_A2_T1,T2"), () => {
    expectMatchIndexes(execute({}, "\nhello", /^hello|./s), 0, 1, 2, 3, 4, 5, 6);
    expectMatchIndexes(execute({}, "\nhello", /^hello|./ms), 0, 1, 6);
  });
  test(caseLabel("15.10.2.6_A2_T3,T4"), () => {
    expectMatchIndexes(execute({}, "\npaisa", /^p[a-z]|./s), 0, 1, 2, 3, 4, 5, 6);
    expectMatchIndexes(execute({}, "\npaisa", /^p[a-z]|./ms), 0, 1, 3, 4, 5, 6);
  });
  test(caseLabel("15.10.2.6_A2_T5"), () => {
    expectMatchIndexes(execute({}, "\npaisa\nhola", /^[^p].|./ms), 0, 2, 3, 4, 5, 6, 7, 9, 10, 11);
    expectMatchIndexes(execute({}, "\npaisa\nhola", /^[^p].|./s), 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
  });
  test(caseLabel("15.10.2.6_A2_T6"), () => {
    expectMatchIndexes(execute({}, "abcabcdefgh", /^abc/m), 0, 3);
  });
  test.skip(caseLabel("15.10.2.6_A2_T7"), () => {
    // Not correct
    expectMatchIndexes(execute({}, "ab\ncde", /^..^e/m), 0, 2);
  });
  test(caseLabel("15.10.2.6_A2_T8"), () => {
    expectMatchIndexes(execute({}, "yyyyy", /^xxx/m));
  });
  test(caseLabel("15.10.2.6_A2_T9"), () => {
    expectMatchIndexes(execute({}, "^^^x", /^\^+/m), 0, 3);
  });
  test(caseLabel("15.10.2.6_A2_T10"), () => {
    expectMatchIndexes(execute({}, "12345\n67890", /^\d+|\n/m), 0, 5, 6, 11);
  });
});

describe.skip("ECMA Tests - Word Boundary Tests - 15.10.2.6_A3,A4", () => {
  test(caseLabel("15.10.2.6_A3_T1 to T15 - \\b"), () => {
    // TODO - Start and End of word matches not implemented
    // These are similar to ^ and $ but with spaces instead of newline chars
    // Parsing is an issue here since \b can appear before or after an exp
    // so this has to be thought through.  Note that compilation and vm
    // components are implemented - just parsing needs to be figured out.
    // Alternatively we may get away with just treating \b as a "mix" of
    // ^ and $ so that a \b will be used for characters "before" and "after"?
    expectMatchIndexes(execute({}, "hellohello", /\bhello|./), 0, 5, 6, 7, 8, 9, 10);
  });

  test(caseLabel("15.10.2.6_A4_T1 to -T8 Inverted word boundary - \\B"), () => {
    // Not implemented
  });
});

describe("ECMA Tests - Multiple boundary markers (^$\\b\\B) - 15.10.2.6_A5", () => {
  test(caseLabel("15.10.2.6_A5_T1"), () => {
    expectMatchIndexes(execute({}, "hello", "^^^^^hello$$$$$"), 0, 5);
  });
  test.skip(caseLabel("15.10.2.6_A5_T2"), () => {
    expectMatchIndexes(execute({}, "robot wall-e", /\B\B\Bbot\b\b\b|./), 0, 1, 2, 5, 6, 7, 8, 9, 10, 11, 12);
  });
});

describe("ECMA Tests - Assertions in combination - 15.10.2.6", () => {
  test(caseLabel("15.10.2.6_A6_T1"), () => {
    expectMatchIndexes(execute({}, "hello world", "^.*?$"), 0, 11);
  });
  test.skip(caseLabel("15.10.2.6_A6_T2"), () => {
    // TODO - We match *atleast* 1 char by design - should this not be the case?
    expectMatchIndexes(execute({}, "hello world", "^.*?"));
  });
  test(caseLabel("15.10.2.6_A6_T3"), () => {
    expectMatchIndexes(execute({}, "hello: world", "^.*?(:|$)"), 0, 6);
  });
  test(caseLabel("15.10.2.6_A6_T4"), () => {
    expectMatchIndexes(execute({}, "hello: world", "^.*(:|$)"), 0, 12);
  });
});

describe("ECMA Tests - Decimal Digits - 15.10.2.7", () => {
  test(caseLabel("15.10.2.7_A1_T1,T2,T3,T4,T5"), () => {
    expectMatchIndexes(execute({}, "100010", "\\d{2,4}"), 0, 4, 6);
    expectMatchIndexes(execute({}, "1", "\\d{2,4}"));
    expectMatchIndexes(execute({}, "100", "\\d{2,4}"), 0, 3);
  });
  test(caseLabel("15.10.2.7_A1_T6,T7"), () => {
    expectMatchIndexes(execute({}, "0\u0031\u0031b", "\\d{2,4}"), 0, 3);
    expectMatchIndexes(execute({}, "0\u0031\u00312b", "\\d{2,4}"), 0, 4);
  });
  test(caseLabel("15.10.2.7_A1_T8,T9,T10"), () => {
    expectMatchIndexes(execute({}, "bbbcd", "b{2,4}c"), 0, 4);
    expectMatchIndexes(execute({}, "bcd", "b{100,150}c"));
    expectMatchIndexes(execute({}, "bbbbbbbcd", "b{0,150}c"), 0, 8);
  });

  test(caseLabel("15.10.2.7_A2_T1,T2,T3"), () => {
    expectMatchIndexes(execute({}, "xabcde123", /\w{3}\d?|./), 0, 3, 7, 8, 9);
    expectMatchIndexes(execute({}, "bbbc", /b{2}c|./), 0, 1, 4);
  });

  test(caseLabel("15.10.2.7_A3_T1-T14"), () => {
    expectMatchIndexes(execute({}, "x    java    ", /\s+java\s+|./), 0, 1, 13);
    expectMatchIndexes(execute({}, "\t    java    ", /\s+java\s+|./), 0, 13);
    expectMatchIndexes(execute({}, "\t    javax    ", /\s+java\s+/));
    expectMatchIndexes(execute({}, "java\n", /\s+java\s+/));
    expectMatchIndexes(execute({}, "5 x2\n", /[a-z]+\d+|./s), 0, 1, 2, 4, 5);
    expectMatchIndexes(execute({}, "abc1234\n", /[a-z]+(\d+)|./s), 0, 7, 8);
    expectMatchIndexes(execute({}, "bbbc", /b+c|./), 0, 4);
    expectMatchIndexes(execute({}, "d", /b+c/));
    expectMatchIndexes(execute({}, "bc", /b+c/), 0, 2);
    expectMatchIndexes(execute({}, "bbbbbb", /b+b+b+/), 0, 6);
    expectMatchIndexes(execute({}, "bbbbbb", /(b+)(b+)(b+)/), 0, 6);
    expectMatchIndexes(execute({}, "bbbbbb", /b+b*/), 0, 6);
    expectMatchIndexes(execute({}, "bbbbbb", "(b+)((b)+)"), 0, 6);
    expectMatchIndexes(execute({}, "bbbbbb", /b+b*/), 0, 6);
  });

  test(caseLabel("15.10.2.7_A4_T1-T9"), () => {
    expectMatchIndexes(execute({}, '"beast"-nickname', '[^"]*'));
    expectMatchIndexes(execute({}, 'alice said: "don\'t"', '[^"]*'), 0, 12);
    expectMatchIndexes(execute({}, "abc'def'ghi", '[^"]*'), 0, 11);
    expectMatchIndexes(execute({}, 'alice "', '[^"]*'), 0, 6);
    expectMatchIndexes(execute({}, "alice \u0022", '[^"]*'), 0, 6);
    expectMatchIndexes(execute({}, "alice \u0022sweep\u0022", /.*(["'][^"']*["'])/), 0, 13);
    expectMatchIndexes(execute({}, "\u0022sweep\u0022", `(["'][^"']*["'])`), 0, 7);
    expectMatchIndexes(execute({}, "'sweep\"", `(["'][^"']*["'])`), 0, 7);
    expectMatchIndexes(execute({}, "'hello", `(["'][^"']*["'])`));
    expectMatchIndexes(execute({}, "''", `(["'][^"']*["'])`), 0, 2);
    expectMatchIndexes(execute({}, '""', `(["'][^"']*["'])`), 0, 2);
  });
  test.skip(caseLabel("15.10.2.7_A4_T10"), () => {
    // This should return "" but our greedy implementation returns ?
    // For some reason ab*c where a and c are "" b* is supposed to return ""
    // Even wierd .* has the opposite behaviour
    expectMatchIndexes(execute({}, "d*", "ddddd"));
  });
  test(caseLabel("15.10.2.7_A4_T11,T21"), () => {
    expectMatchIndexes(execute({}, "ddddd", /dd*/), 0, 5);
    expectMatchIndexes(execute({}, "cdefg", /cx*d/), 0, 2);
    expectMatchIndexes(execute({}, "xxxxxxx", "(x*)(x+)"), 0, 7);
    expectMatchIndexes(execute({}, "1234567890", /(\d*)(\d+)/), 0, 10);
    expectMatchIndexes(execute({}, "1234567890", /(\d*)\d(\d+)/), 0, 10);
    expectMatchIndexes(execute({}, "xxxxxxx", /(x+)(x*)/), 0, 7);
    expectMatchIndexes(execute({}, "xxxxxyyyyy", /x*y+$/), 0, 10);
    expectMatchIndexes(execute({}, "bcdef", /[\d]*[\s]*bc./), 0, 3);
    expectMatchIndexes(execute({}, "bcdef", /bc..[\d]*[\s]*/), 0, 4);
    expectMatchIndexes(execute({}, "a1b2c3", /.*/), 0, 6);
    expectMatchIndexes(execute({}, "a0.b2.c3", /[xyz]*1/));
  });

  test(caseLabel("15.10.2.7_A5_T1-T12"), () => {
    expectMatchIndexes(execute({}, "javascript is extension of ecma script", /java(script)?/), 0, 10);
    expectMatchIndexes(execute({}, "java javascript", /java(script)?|./), 0, 4, 5, 15);
    expectMatchIndexes(execute({}, "JavaJavascript", /java(script)?/));
    expectMatchIndexes(execute({}, "abcdef", /cd?e|./), 0, 1, 2, 5, 6);
    expectMatchIndexes(execute({}, "abcdef", /cdx?e|./), 0, 1, 2, 5, 6);
    expectMatchIndexes(execute({}, "pqrstuvw", /o?pqrst/), 0, 5);
    expectMatchIndexes(execute({}, "abcde", /x?y?z?/));
    expectMatchIndexes(execute({}, "abcde", /x?ay?bz?c/), 0, 3);
    expectMatchIndexes(execute({}, "bbbbc", /b?b?b?/), 0, 3, 4);
    expectMatchIndexes(execute({}, "123az789", /\d*ab?c?d?x?y?z/), 0, 5);
    expectMatchIndexes(execute({}, "?????", /\??\??\??\??\??/), 0, 5);
    expectMatchIndexes(execute({}, "test", /.?.?.?.?.?.?.?/), 0, 4);
  });

  test(caseLabel("15.10.2.7_A6_T1-T4"), () => {
    expectMatchIndexes(execute({}, "bbbbbbc", "b{2,}c"), 0, 7);
    expectMatchIndexes(execute({}, "bbbbbbc", "b{10,}c"));
    expectMatchIndexes(execute({}, "123456c", "\\d{1,}c"), 0, 7);
    expectMatchIndexes(execute({}, "123123123123", "(123){1,}"), 0, 12);
    expectMatchIndexes(execute({}, "123123123x123", "(123){1,}x"), 0, 10);
    expectMatchIndexes(execute({}, "123123123x123", "(123){1,}x"), 0, 10);
  });
  test.skip(caseLabel("15.10.2.7_A6_T5"), () => {
    // Captured groups references not yet implemented
    expectMatchIndexes(execute({}, "(123){1,}x\\1", "123123123x123"), 0, 13);
  });
  test(caseLabel("15.10.2.7_A6_T6"), () => {
    expectMatchIndexes(execute({}, "xxxxxxxx", /x{1,2}x{1,}/), 0, 8);
  });
});

describe("ECMA Tests - Lookaheads - 15.10.2_A1_T1", () => {
  test(caseLabel("15.10.2_A1_T1"), () => {
    //
    const TextSE = "[^<]+";
    const UntilHyphen = "[^-]*-";
    const Until2Hyphens = UntilHyphen + "([^-]" + UntilHyphen + ")*-";
    const CommentCE = Until2Hyphens + ">?";
    const UntilRSBs = "[^\\]]*\\]([^\\]]+\\])*\\]+";
    const CDATA_CE = UntilRSBs + "([^\\]>]" + UntilRSBs + ")*>";
    const S = "[ \\n\\t\\r]+";
    const NameStrt = "[A-Za-z_:]|[^\\x00-\\x7F]";
    const NameChar = "[A-Za-z0-9_:.-]|[^\\x00-\\x7F]";
    const Name = "(" + NameStrt + ")(" + NameChar + ")*";
    const QuoteSE = '"[^"]' + "*" + '"' + "|'[^']*'";
    const DT_IdentSE = S + Name + "(" + S + "(" + Name + "|" + QuoteSE + "))*";
    const MarkupDeclCE = "([^\\]\"'><]+|" + QuoteSE + ")*>";
    const S1 = "[\\n\\r\\t ]";
    const UntilQMs = "[^?]*\\?+";
    const PI_Tail = "\\?>|" + S1 + UntilQMs + "([^>?]" + UntilQMs + ")*>";
    const DT_ItemSE =
      "<(!(--" + Until2Hyphens + ">|[^-]" + MarkupDeclCE + ")|\\?" + Name + "(" + PI_Tail + "))|%" + Name + ";|" + S;
    const DocTypeCE = DT_IdentSE + "(" + S + ")?(\\[(" + DT_ItemSE + ")*\\](" + S + ")?)?>?";
    const DeclCE = "--(" + CommentCE + ")?|\\[CDATA\\[(" + CDATA_CE + ")?|DOCTYPE(" + DocTypeCE + ")?";
    const PI_CE = Name + "(" + PI_Tail + ")?";
    const EndTagCE = Name + "(" + S + ")?>?";
    const AttValSE = '"[^<"]' + "*" + '"' + "|'[^<']*'";
    const ElemTagCE = Name + "(" + S + Name + "(" + S + ")?=(" + S + ")?(" + AttValSE + "))*(" + S + ")?/?>?";
    const MarkupSPE = "<(!(" + DeclCE + ")?|\\?(" + PI_CE + ")?|/(" + EndTagCE + ")?|(" + ElemTagCE + ")?)";
    const XML_SPE = TextSE + "|" + MarkupSPE;
    const __patterns = [
      TextSE,
      UntilHyphen,
      Until2Hyphens,
      CommentCE,
      UntilRSBs,
      CDATA_CE,
      S,
      NameStrt,
      NameChar,
      Name,
      QuoteSE,
      DT_IdentSE,
      MarkupDeclCE,
      S1,
      UntilQMs,
      PI_Tail,
      DT_ItemSE,
      DocTypeCE,
      DeclCE,
      PI_CE,
      EndTagCE,
      AttValSE,
      ElemTagCE,
      MarkupSPE,
      XML_SPE,
      ".",
    ];
    const __html =
      "" +
      '<html xmlns="http://www.w3.org/1999/xhtml"\n' +
      '      xmlns:xlink="http://www.w3.org/XML/XLink/0.9">\n' +
      "  <head><title>Three Namespaces</title></head>\n" +
      "  <body>\n" +
      '    <h1 align="center">An Ellipse and a Rectangle</h1>\n' +
      '    <svg xmlns="http://www.w3.org/Graphics/SVG/SVG-19991203.dtd"\n' +
      '         width="12cm" height="10cm">\n' +
      '      <ellipse rx="110" ry="130" />\n' +
      '      <rect x="4cm" y="1cm" width="3cm" height="6cm" />\n' +
      "    </svg>\n" +
      '    <p xlink:type="simple" xlink:href="ellipses.html">\n' +
      "      More about ellipses\n" +
      "    </p>\n" +
      '    <p xlink:type="simple" xlink:href="rectangles.html">\n' +
      "      More about rectangles\n" +
      "    </p>\n" +
      "    <hr/>\n" +
      "    <p>Last Modified February 13, 2000</p>\n" +
      "  </body>\n" +
      "</html>";
    /*
    const matches = execute({ debug: true }, __html, ...__patterns);
    expectMatchIndexes(matches);
    */
    __patterns.forEach((pat, index) => {
      const repat = ".*?(" + pat + ")";
      const matches = execute({}, repat, __html);
      // console.log("Testing pattern at index: ", index, repat);
      expectMatchIndexes(matches);
    });
  });
});

describe.skip("ECMA Tests - 15.10.3.1", () => {
  // Basic RegExp Constructor tests - not needed
});

describe("ECMA Tests - Lookaheads - 15.10.2.8", () => {
  test(caseLabel("15.10.2.8_A1_T1-T5"), () => {
    expectMatchIndexes(execute({}, "aaa", /(?=(a+))/));
    expectMatchIndexes(execute({}, "aaabac", /(?=(a+))a*b/), 0, 4);
    expectMatchIndexes(execute({}, "Javascript", /[Jj]ava([Ss]cript)?(?=:)/));
    expectMatchIndexes(execute({}, "Javascript: the way af jedi", /[Jj]ava([Ss]cript)?(?=:)/), 0, 10);
    expectMatchIndexes(execute({}, "java: the cookbook", /[Jj]ava([Ss]cript)?(?=:)/), 0, 4);
  });
  test.skip(caseLabel("15.10.2.8_A2_T1"), () => {
    expectMatchIndexes(execute({}, "(.*?)a(?!(a+)b\\2c)\\2(.*)", "baaabaaac"), 0, 9);
  });
  test(caseLabel("15.10.2.8_A2_T2-T11"), () => {
    expectMatchIndexes(execute({}, " JavaBeans ", /Java(?!Script)([A-Z]\w*)/, "."), 0, 1, 10, 11);
    expectMatchIndexes(execute({}, "Java", /Java(?!Script)([A-Z]\w*)/));
    expectMatchIndexes(execute({}, "JavaScripter", /Java(?!Script)([A-Z]\w*)/));
    expectMatchIndexes(execute({}, "JavaScro ops", /Java(?!Script)([A-Z]\w*)/), 0, 8);
    expectMatchIndexes(execute({}, ".info", /(\.(?!com|org)|\/)/), 0, 1);
    expectMatchIndexes(execute({}, "/info", /(\.(?!com|org)|\/)/), 0, 1);
    expectMatchIndexes(execute({}, ".com", /(\.(?!com|org)|\/)/));
    expectMatchIndexes(execute({}, ".org", /(\.(?!com|org)|\/)/));
    expectMatchIndexes(execute({}, "", /(?!a|b)|c/));
    expectMatchIndexes(execute({}, "bc", /(?!a|b)|c/));
    expectMatchIndexes(execute({}, "d", /(?!a|b)|c/));
  });

  test(caseLabel("15.10.2.8_A3_T1-T6"), () => {
    expectMatchIndexes(execute({}, "javaScript is funny, really", /([Jj]ava([Ss]cript)?)\sis\s(fun\w*)/), 0, 19);
    expectMatchIndexes(execute({}, "java is fun, really", /([Jj]ava([Ss]cript)?)\sis\s(fun\w*)/), 0, 11);
    expectMatchIndexes(execute({}, "javascript is hard", /([Jj]ava([Ss]cript)?)\sis\s(fun\w*)/));
    // Need to examine submatch trackings
    expectMatchIndexes(execute({}, "abc", /(abc)/), 0, 3);
    expectMatchIndexes(execute({}, "abcdefg", /a(bc)d(ef)g/), 0, 7);
    expectMatchIndexes(execute({}, "abcdefgh", /(.{3})(.{4})/), 0, 7);
  });
  test.skip(caseLabel("15.10.2.8_A3_T7-T10"), () => {
    expectMatchIndexes(execute({}, "aabcdaabcd", /(aa)bcd\1/), 0, 7);
    expectMatchIndexes(execute({}, "aabcdaabcd", /(aa).+\1/), 0, 7);
    expectMatchIndexes(execute({}, "aabcdaabcd", /(.{2}).+\1/), 0, 7);
    expectMatchIndexes(execute({}, "123456123456", /(\d{3})(\d{3})\1\2/), 0, 12);
  });
  test(caseLabel("15.10.2.8_A3_T11-T12"), () => {
    expectMatchIndexes(execute({}, "abcdefgh", /a(..(..)..)/), 0, 7);
    expectMatchIndexes(execute({}, "abcdefg", /(a(b(c)))(d(e(f)))/), 0, 6);
  });
  test.skip(caseLabel("15.10.2.8_A3_T13-T16"), () => {
    expectMatchIndexes(execute({}, "abcdefbcefg", /(a(b(c)))(d(e(f)))\2\5/), 0, 10);
    expectMatchIndexes(execute({}, "abcd", /a(.?)b\1c\1d\1/), 0, 4);
    // TBD - https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/S15.10.2.8_A3_T15.js
    // TBD - https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/S15.10.2.8_A3_T16.js
  });
  test(caseLabel("15.10.2.8_A3_T15"), () => {
    const numParens = 200;
    const pattern = `${range(0, numParens)
      .map((x) => "(")
      .join("")}hello${range(0, numParens)
      .map((x) => ")")
      .join("")}`;
    const matches = expectMatchIndexes(execute({}, "hello", pattern), 0, 5);
    expect(matches.length).toBe(1);
    expect(matches).toEqual([
      {
        matchIndex: 0,
        id: 549,
        tag: 0,
        start: 0,
        end: 5,
        value: "hello",
        groups: {},
        positions: {
          "1": [0, 5],
          "2": [0, 5],
          "3": [0, 5],
          "4": [0, 5],
          "5": [0, 5],
          "6": [0, 5],
          "7": [0, 5],
          "8": [0, 5],
          "9": [0, 5],
          "10": [0, 5],
          "11": [0, 5],
          "12": [0, 5],
          "13": [0, 5],
          "14": [0, 5],
          "15": [0, 5],
          "16": [0, 5],
          "17": [0, 5],
          "18": [0, 5],
          "19": [0, 5],
          "20": [0, 5],
          "21": [0, 5],
          "22": [0, 5],
          "23": [0, 5],
          "24": [0, 5],
          "25": [0, 5],
          "26": [0, 5],
          "27": [0, 5],
          "28": [0, 5],
          "29": [0, 5],
          "30": [0, 5],
          "31": [0, 5],
          "32": [0, 5],
          "33": [0, 5],
          "34": [0, 5],
          "35": [0, 5],
          "36": [0, 5],
          "37": [0, 5],
          "38": [0, 5],
          "39": [0, 5],
          "40": [0, 5],
          "41": [0, 5],
          "42": [0, 5],
          "43": [0, 5],
          "44": [0, 5],
          "45": [0, 5],
          "46": [0, 5],
          "47": [0, 5],
          "48": [0, 5],
          "49": [0, 5],
          "50": [0, 5],
          "51": [0, 5],
          "52": [0, 5],
          "53": [0, 5],
          "54": [0, 5],
          "55": [0, 5],
          "56": [0, 5],
          "57": [0, 5],
          "58": [0, 5],
          "59": [0, 5],
          "60": [0, 5],
          "61": [0, 5],
          "62": [0, 5],
          "63": [0, 5],
          "64": [0, 5],
          "65": [0, 5],
          "66": [0, 5],
          "67": [0, 5],
          "68": [0, 5],
          "69": [0, 5],
          "70": [0, 5],
          "71": [0, 5],
          "72": [0, 5],
          "73": [0, 5],
          "74": [0, 5],
          "75": [0, 5],
          "76": [0, 5],
          "77": [0, 5],
          "78": [0, 5],
          "79": [0, 5],
          "80": [0, 5],
          "81": [0, 5],
          "82": [0, 5],
          "83": [0, 5],
          "84": [0, 5],
          "85": [0, 5],
          "86": [0, 5],
          "87": [0, 5],
          "88": [0, 5],
          "89": [0, 5],
          "90": [0, 5],
          "91": [0, 5],
          "92": [0, 5],
          "93": [0, 5],
          "94": [0, 5],
          "95": [0, 5],
          "96": [0, 5],
          "97": [0, 5],
          "98": [0, 5],
          "99": [0, 5],
          "100": [0, 5],
          "101": [0, 5],
          "102": [0, 5],
          "103": [0, 5],
          "104": [0, 5],
          "105": [0, 5],
          "106": [0, 5],
          "107": [0, 5],
          "108": [0, 5],
          "109": [0, 5],
          "110": [0, 5],
          "111": [0, 5],
          "112": [0, 5],
          "113": [0, 5],
          "114": [0, 5],
          "115": [0, 5],
          "116": [0, 5],
          "117": [0, 5],
          "118": [0, 5],
          "119": [0, 5],
          "120": [0, 5],
          "121": [0, 5],
          "122": [0, 5],
          "123": [0, 5],
          "124": [0, 5],
          "125": [0, 5],
          "126": [0, 5],
          "127": [0, 5],
          "128": [0, 5],
          "129": [0, 5],
          "130": [0, 5],
          "131": [0, 5],
          "132": [0, 5],
          "133": [0, 5],
          "134": [0, 5],
          "135": [0, 5],
          "136": [0, 5],
          "137": [0, 5],
          "138": [0, 5],
          "139": [0, 5],
          "140": [0, 5],
          "141": [0, 5],
          "142": [0, 5],
          "143": [0, 5],
          "144": [0, 5],
          "145": [0, 5],
          "146": [0, 5],
          "147": [0, 5],
          "148": [0, 5],
          "149": [0, 5],
          "150": [0, 5],
          "151": [0, 5],
          "152": [0, 5],
          "153": [0, 5],
          "154": [0, 5],
          "155": [0, 5],
          "156": [0, 5],
          "157": [0, 5],
          "158": [0, 5],
          "159": [0, 5],
          "160": [0, 5],
          "161": [0, 5],
          "162": [0, 5],
          "163": [0, 5],
          "164": [0, 5],
          "165": [0, 5],
          "166": [0, 5],
          "167": [0, 5],
          "168": [0, 5],
          "169": [0, 5],
          "170": [0, 5],
          "171": [0, 5],
          "172": [0, 5],
          "173": [0, 5],
          "174": [0, 5],
          "175": [0, 5],
          "176": [0, 5],
          "177": [0, 5],
          "178": [0, 5],
          "179": [0, 5],
          "180": [0, 5],
          "181": [0, 5],
          "182": [0, 5],
          "183": [0, 5],
          "184": [0, 5],
          "185": [0, 5],
          "186": [0, 5],
          "187": [0, 5],
          "188": [0, 5],
          "189": [0, 5],
          "190": [0, 5],
          "191": [0, 5],
          "192": [0, 5],
          "193": [0, 5],
          "194": [0, 5],
          "195": [0, 5],
          "196": [0, 5],
          "197": [0, 5],
          "198": [0, 5],
          "199": [0, 5],
          "200": [0, 5],
        },
      },
    ]);
  });
  test(caseLabel("15.10.2.8_A3_T16"), () => {
    const numParens = 200;
    const pattern = `${range(0, numParens)
      .map((x) => "(?:")
      .join("")}hello${range(0, numParens)
      .map((x) => ")")
      .join("")}`;
    const matches = expectMatchIndexes(execute({}, "hello", pattern), 0, 5);
    expect(matches.length).toBe(1);
    expect(matches[0].groups).toEqual({});
    expect(matches[0].positions).toEqual({});
  });
  test(caseLabel("15.10.2.8_A3_T17"), () => {
    let __body = "";
    __body += '<body onXXX="alert(event.type);">\n';
    __body += "<p>Kibology for all</p>\n";
    __body += "<p>All for Kibology</p>\n";
    __body += "</body>";

    const __html = `<html>\n${__body}\n</html>`;
    const found = execute({}, __html, /<BoDy.*>((.*\n?)*?)<\/bOdY>|.|\n/i);
    expectMatchIndexes(found, 0, 1, 2, 3, 4, 5, 6, 7, 96, 97, 98, 99, 100, 101, 102, 103, 104);
  });
  test(caseLabel("15.10.2.8_A3_T18"), () => {
    const input = "Click |here|https:www.xxxx.org/subscribe.htm|";
    const re = /Click (\|)([\w\x81-\xff ]*)(\|)([\/a-z][\w:\/\.]*\.[a-z]{3,4})(\|)/i;
    // ignore case not yet implemented
    const match = expectMatchIndexes(execute({}, input, re), 0, input.length)[0];
    expect(match.groups).toEqual({});
    expect(match.positions).toEqual({ "1": [6, 7], "2": [7, 11], "3": [11, 12], "4": [12, 44], "5": [44, 45] });
  });
  test(caseLabel("15.10.2.8_A3_T19"), () => {
    expectMatchIndexes(execute({}, "Course_Creator = Test", /([\S]+([ \t]+[\S]+)*)[ \t]*=[ \t]*[\S]+/), 0, 21);
  });
  test(caseLabel("15.10.2.8_A3_T20-T33"), () => {
    // TODO - In all these tests also verify the submatch groups
    expectMatchIndexes(execute({}, "AAA", /^(A)?(A.*)$/), 0, 3);
    expectMatchIndexes(execute({}, "AA", /^(A)?(A.*)$/), 0, 2);
    expectMatchIndexes(execute({}, "A", /^(A)?(A.*)$/), 0, 1);
    expectMatchIndexes(execute({}, "AAAaaAAaaaf;lrlrzs", /^(A)?(A.*)$/), 0, 18);
    expectMatchIndexes(execute({}, "AAaaAAaaaf;lrlrzs", "^(A)?(A.*)$"), 0, 17);
    expectMatchIndexes(execute({}, "AaaAAaaaf;lrlrzs", "^(A)?(A.*)$"), 0, 16);
    expectMatchIndexes(execute({}, "a", "(a)?a"), 0, 1);
    expectMatchIndexes(execute({}, "a", "a|(b)"), 0, 1);
    expectMatchIndexes(execute({}, "a", "(a)?(a)"), 0, 1);
    expectMatchIndexes(execute({}, "a", "^([a-z]+)*[a-z]$"), 0, 1);
    expectMatchIndexes(execute({}, "ab", "^([a-z]+)*[a-z]$"), 0, 2);
    expectMatchIndexes(execute({}, "abc", "^([a-z]+)*[a-z]$"), 0, 3);
    expectMatchIndexes(execute({}, "www.netscape.com", /^(([a-z]+)*[a-z]\.)+[a-z]{2,}$/), 0, 16);
    expectMatchIndexes(execute({}, "www.netscape.com", /^(([a-z]+)*([a-z])\.)+[a-z]{2,}$/), 0, 16);
  });
  test(caseLabel("15.10.2.8_A4_T1-T5"), () => {
    expectMatchIndexes(execute({}, "abcde", /ab.de/), 0, 5);
    expectMatchIndexes(execute({ multiline: false }, "line 1\nline 2", /.+/), 0, 6);
    expectMatchIndexes(execute({}, "this is a test", ".*a.*"), 0, 14);
    expectMatchIndexes(execute({}, "this is a *&^%$# test", ".+"), 0, 21);
    expectMatchIndexes(execute({}, "....", ".+"), 0, 4);
    expectMatchIndexes(execute({}, "abcdefghijklmnopqrstuvwxyz", ".+"), 0, 26);
    expectMatchIndexes(execute({}, "`1234567890-=~!@#$%^&*()_+", ".+"), 0, "`1234567890-=~!@#$%^&*()_+".length);
    expectMatchIndexes(execute({}, "|\\[{]};:\"',<>.?/", /.+/), 0, "|\\[{]};:\"',<>.?/".length);
  });

  test(caseLabel("15.10.2.8_A5_T1-T2"), () => {
    expectMatchIndexes(execute({}, "ABC def ghi", /[a-z]+/i), 0, 3);
    expectMatchIndexes(execute({}, "ABC def ghi", /[a-z]+/));
  });
  test.skip(caseLabel("15.10.2.9_A1_T1,T2"), () => {
    // TBD - https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/S15.10.2.9_A1_T1.js
    // TBD - https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/S15.10.2.9_A1_T2.js
    // TBD - https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/S15.10.2.9_A1_T3.js
    // TBD - https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/S15.10.2.9_A1_T5.js
  });
});

describe.skip("ECMA Tests - 15.10.4.1", () => {
  // Basic RegExp Constructor tests - not needed
});
describe.skip("ECMA Tests - 15.10.5.1", () => {
  // Basic RegExp Constructor tests - not needed
});
describe.skip("ECMA Tests - 15.10.7.1", () => {
  // Basic RegExp Constructor tests - not needed
});

function testFileLink(x: string): string {
  if (!x.endsWith(".js")) x += ".js";
  return "https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/" + x;
}

describe("ECMA Tests - Unicode Char Tests", () => {
  test(testFileLink("character-class-escape-non-whitespace-u180e"), () => {
    expectMatchIndexes(execute({}, String.fromCharCode(0x180e), /\S+/), 0, 1);
    expectMatchIndexes(execute({}, String.fromCharCode(0x180e), /\s+/));
  });
  test.skip(testFileLink("character-class-escape-non-whitespace"), () => {
    const whitespaceChars = [
      0x0009,
      0x000a,
      0x000b,
      0x000c,
      0x000d,
      0x0020,
      0x00a0,
      0x1680,
      0x2000,
      0x2001,
      0x2002,
      0x2003,
      0x2004,
      0x2005,
      0x2006,
      0x2007,
      0x2008,
      0x2009,
      0x200a,
      0x2028,
      0x2029,
      0x202f,
      0x205f,
      0x3000,
    ];
    const prog: Prog = compile(null, /\S+/);
    const vm = new VM(prog, 0, -1, true, {});
    for (let j = 0x0000; j < 0x10000; j++) {
      if (j === 0x180e) {
        // Skip 0x180E, in previous test
        continue;
      }
      if (j === 0xfeff) {
        // Ignore BOM
        continue;
      }
      const str = String.fromCharCode(j);
      try {
        const match = vm.match(new Tape(str));
        if (whitespaceChars.indexOf(j) >= 0) {
          expect(match).toEqual(null);
        } else {
          expect(match?.start).toEqual(0);
          expect(match?.end).toEqual(1);
        }
      } catch (error) {
        console.log("Test Failed: ", j);
        throw error;
      }
    }
  });
  test(testFileLink("regexp-class-chars"), () => {
    expectMatchIndexes(execute({}, "/", /[/]/), 0, 1);
    expectMatchIndexes(execute({}, "x", /[/]/));
    expectMatchIndexes(execute({}, "/", /[//]/), 0, 1);
    expectMatchIndexes(execute({}, "x", /[//]/));
  });
  test(testFileLink("regexp-class-chars"), () => {
    expectMatchIndexes(execute({}, "\u0008", /[\b]/), 0, 1);
    expectMatchIndexes(execute({}, "A", /[\b-A]/), 0, 1);
  });

  test("https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/unicode_identity_escape.js", () => {
    expectMatchIndexes(execute({}, "^", /\^/u), 0, 1);
    expectMatchIndexes(execute({}, "$", /\$/u), 0, 1);
    expectMatchIndexes(execute({}, "\\", /\\/u), 0, 1);
    expectMatchIndexes(execute({}, ".", /\./u), 0, 1);
    expectMatchIndexes(execute({}, "*", /\*/u), 0, 1);
    expectMatchIndexes(execute({}, "+", /\+/u), 0, 1);
    expectMatchIndexes(execute({}, "?", /\?/u), 0, 1);
    expectMatchIndexes(execute({}, "(", /\(/u), 0, 1);
    expectMatchIndexes(execute({}, ")", /\)/u), 0, 1);
    expectMatchIndexes(execute({}, "[", /\[/u), 0, 1);
    expectMatchIndexes(execute({}, "]", /\]/u), 0, 1);
    expectMatchIndexes(execute({}, "{", /\{/u), 0, 1);
    expectMatchIndexes(execute({}, "}", /\}/u), 0, 1);
    expectMatchIndexes(execute({}, "|", /\|/u), 0, 1);
    expectMatchIndexes(execute({}, "/", /\//u), 0, 1);

    // IdentityEscape in ClassEscape
    expectMatchIndexes(execute({}, "^", /[\^]/u), 0, 1);
    expectMatchIndexes(execute({}, "$", /[\$]/u), 0, 1);
    expectMatchIndexes(execute({}, "\\", /[\\]/u), 0, 1);
    expectMatchIndexes(execute({}, ".", /[\.]/u), 0, 1);
    expectMatchIndexes(execute({}, "*", /[\*]/u), 0, 1);
    expectMatchIndexes(execute({}, "+", /[\+]/u), 0, 1);
    expectMatchIndexes(execute({}, "?", /[\?]/u), 0, 1);
    expectMatchIndexes(execute({}, "(", /[\(]/u), 0, 1);
    expectMatchIndexes(execute({}, ")", /[\)]/u), 0, 1);
    expectMatchIndexes(execute({}, "[", /[\[]/u), 0, 1);
    expectMatchIndexes(execute({}, "]", /[\]]/u), 0, 1);
    expectMatchIndexes(execute({}, "{", /[\{]/u), 0, 1);
    expectMatchIndexes(execute({}, "}", /[\}]/u), 0, 1);
    expectMatchIndexes(execute({}, "|", /[\|]/u), 0, 1);
    expectMatchIndexes(execute({}, "/", /[\/]/u), 0, 1);
  });
  test(testFileLink("unicode_restricted_brackets"), () => {
    expect(() => parse("(")).toThrow(SyntaxError);
    expect(() => parse(")")).toThrow(SyntaxError);
    expect(() => parse("[")).toThrow(SyntaxError);
    expect(() => parse("]")).toThrow(SyntaxError);
    expect(() => parse("{")).toThrow(SyntaxError);
    expect(() => parse("}")).toThrow(SyntaxError);
  });
  test(testFileLink("unicode_restricted_character_class_escape"), () => {
    // Leading CharacterClassEscape.
    expect(() => parse("[\\d-a]")).toThrowError(SyntaxError);
    expect(() => parse("[\\D-a]")).toThrowError(SyntaxError);
    expect(() => parse("[\\s-a]")).toThrowError(SyntaxError);
    expect(() => parse("[\\S-a]")).toThrowError(SyntaxError);
    expect(() => parse("[\\w-a]")).toThrowError(SyntaxError);
    expect(() => parse("[\\W-a]")).toThrowError(SyntaxError);

    // Trailing CharacterClassEscape.
    expect(() => parse("[a-\\d]")).toThrowError(SyntaxError);
    expect(() => parse("[a-\\D]")).toThrowError(SyntaxError);
    expect(() => parse("[a-\\s]")).toThrowError(SyntaxError);
    expect(() => parse("[a-\\S]")).toThrowError(SyntaxError);
    expect(() => parse("[a-\\w]")).toThrowError(SyntaxError);
    expect(() => parse("[a-\\W]")).toThrowError(SyntaxError);

    // Leading and trailing CharacterClassEscape.
    expect(() => parse("[\\d-\\d]")).toThrowError(SyntaxError);
    expect(() => parse("[\\D-\\D]")).toThrowError(SyntaxError);
    expect(() => parse("[\\s-\\s]")).toThrowError(SyntaxError);
    expect(() => parse("[\\S-\\S]")).toThrowError(SyntaxError);
    expect(() => parse("[\\w-\\w]")).toThrowError(SyntaxError);
    expect(() => parse("[\\W-\\W]")).toThrowError(SyntaxError);
  });
  test.skip(testFileLink("unicode_restricted_identity_escape"), () => {
    //
    function isSyntaxCharacter(c: string): boolean {
      switch (c) {
        case "^":
        case "$":
        case "\\":
        case ".":
        case "*":
        case "+":
        case "?":
        case "(":
        case ")":
        case "[":
        case "]":
        case "{":
        case "}":
        case "|":
          return true;
        default:
          return false;
      }
    }

    function isAlphaDigit(c: string): boolean {
      return ("0" <= c && c <= "9") || ("A" <= c && c <= "Z") || ("a" <= c && c <= "z");
    }

    // IdentityEscape in AtomEscape.
    //
    // AtomEscape[U] :: CharacterEscape[?U]
    // CharacterEscape[U] :: IdentityEscape[?U]
    for (let cu = 0x00; cu <= 0x7f; ++cu) {
      const s = String.fromCharCode(cu);
      if (!isAlphaDigit(s) && !isSyntaxCharacter(s) && s !== "/") {
        const re = "\\" + s;
        console.log("Testing cu: ", cu, "|" + re + "|");
        expect(() => parse(re)).toThrow(SyntaxError);
      }
    }

    // IdentityEscape in ClassEscape.
    //
    // ClassEscape[U] :: CharacterEscape[?U]
    // CharacterEscape[U] :: IdentityEscape[?U]
    for (let cu = 0x00; cu <= 0x7f; ++cu) {
      const s = String.fromCharCode(cu);
      if (!isAlphaDigit(s) && !isSyntaxCharacter(s) && s !== "/" && s !== "-") {
        const re = "[\\" + s + "]";
        console.log("Testing cu: ", cu, "|" + re + "|");
        expect(() => parse(re)).toThrow(SyntaxError);
      }
    }
  });
  test(testFileLink("unicode_restricted_octal_escape.js"), () => {
    // DecimalEscape without leading 0 in AtomEscape.
    //
    // AtomEscape[U] :: DecimalEscape
    // DecimalEscape :: DecimalIntegerLiteral [lookahead /= DecimalDigit]
    expect(() => parse("\\1", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\2", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\3", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\4", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\5", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\6", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\7", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\8", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\9", { unicode: true })).toThrowError(SyntaxError);

    // DecimalEscape without leading 0 in ClassEscape.
    //
    // ClassEscape[U] :: DecimalEscape
    // DecimalEscape :: DecimalIntegerLiteral [lookahead /= DecimalDigit]
    expect(() => parse("[\\1]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\2]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\3]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\4]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\5]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\6]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\7]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\8]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\9]", { unicode: true })).toThrowError(SyntaxError);

    // DecimalEscape with leading 0 in AtomEscape.
    //
    // Atom[U] :: DecimalEscape
    // DecimalEscape :: DecimalIntegerLiteral [lookahead /= DecimalDigit]
    expect(() => parse("\\00", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\01", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\02", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\03", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\04", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\05", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\06", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\07", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\08", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\09", { unicode: true })).toThrowError(SyntaxError);

    // DecimalEscape with leading 0 in ClassEscape.
    //
    // ClassEscape[U] :: DecimalEscape
    // DecimalEscape :: DecimalIntegerLiteral [lookahead /= DecimalDigit]
    expect(() => parse("[\\00]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\01]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\02]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\03]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\04]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\05]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\06]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\07]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\08]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\09]", { unicode: true })).toThrowError(SyntaxError);
  });
  test(testFileLink("unicode_restricted_quantifiable_assertion"), () => {
    // Positive lookahead with quantifier.
    expect(() => parse("(?=.)*", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.)+", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.)?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1,}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1,2}", { unicode: true })).toThrowError(SyntaxError);

    // Positive lookahead with reluctant quantifier.
    expect(() => parse("(?=.)*?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.)+?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.)??", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1,}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1,2}?", { unicode: true })).toThrowError(SyntaxError);

    // Negative lookahead with quantifier.
    expect(() => parse("(?!.)*", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.)+", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.)?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1,}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1,2}", { unicode: true })).toThrowError(SyntaxError);

    // Negative lookahead with reluctant quantifier.
    expect(() => parse("(?!.)*?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.)+?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.)??", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1,}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1,2}?", { unicode: true })).toThrowError(SyntaxError);
  });
  test(testFileLink("unicode_restricted_quantifier_without_atom"), () => {
    // Quantifier without atom.
    expect(() => parse("*", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("+", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1,}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1,2}", { unicode: true })).toThrowError(SyntaxError);

    // Reluctant quantifier without atom.
    expect(() => parse("*?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("+?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("??", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1,}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1,2}?", { unicode: true })).toThrowError(SyntaxError);
  });
  test(testFileLink("unicode_restricted_quantifiable_assertion"), () => {
    // Positive lookahead with quantifier.
    expect(() => parse("(?=.)*", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.)+", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.)?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1,}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1,2}", { unicode: true })).toThrowError(SyntaxError);

    // Positive lookahead with reluctant quantifier.
    expect(() => parse("(?=.)*?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.)+?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.)??", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1,}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?=.){1,2}?", { unicode: true })).toThrowError(SyntaxError);

    // Negative lookahead with quantifier.
    expect(() => parse("(?!.)*", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.)+", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.)?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1,}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1,2}", { unicode: true })).toThrowError(SyntaxError);

    // Negative lookahead with reluctant quantifier.
    expect(() => parse("(?!.)*?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.)+?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.)??", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1,}?", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("(?!.){1,2}?", { unicode: true })).toThrowError(SyntaxError);
  });
  test(testFileLink("unicode_restricted_incomplete_quantifier"), () => {
    // Incomplete quantifier with atom.
    expect(() => parse("a{", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("a{1", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("a{1,", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("a{1,2", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1,", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("{1,2", { unicode: true })).toThrowError(SyntaxError);
  });
  test(testFileLink("unicode_restricted_identity_escape_x.js"), () => {
    expect(() => parse("\\x", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\x1", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\x]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\x1]", { unicode: true })).toThrowError(SyntaxError);
  });
  test(testFileLink("unicode_restricted_identity_escape_u.js"), () => {
    // Incomplete RegExpUnicodeEscapeSequence in AtomEscape not parsed as IdentityEscape.
    //
    // AtomEscape[U] :: CharacterEscape[?U]
    // CharacterEscape[U] :: RegExpUnicodeEscapeSequence[?U]
    expect(() => parse("\\u", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\u1", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\u12", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\u123", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\u{", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\u{}", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\u{1", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\u{12", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("\\u{123", { unicode: true })).toThrowError(SyntaxError);

    // Incomplete RegExpUnicodeEscapeSequence in ClassEscape not parsed as IdentityEscape.
    //
    // ClassEscape[U] :: CharacterEscape[?U]
    // CharacterEscape[U] :: RegExpUnicodeEscapeSequence[?U]
    expect(() => parse("[\\u]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\u1]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\u12]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\u123]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\u{]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\u{}]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\u{1]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\u{12]", { unicode: true })).toThrowError(SyntaxError);
    expect(() => parse("[\\u{123]", { unicode: true })).toThrowError(SyntaxError);
  });
  test(testFileLink("unicode_restricted_identity_escape_c.js"), () => {
    function isAlpha(c: string): boolean {
      return ("A" <= c && c <= "Z") || ("a" <= c && c <= "z");
    }

    expect(() => parse("\\c", true)).toThrowError(SyntaxError);
    for (let cu = 0x00; cu <= 0x7f; ++cu) {
      const s = String.fromCharCode(cu);
      if (!isAlpha(s)) {
        // "c ControlLetter" sequence in AtomEscape.
        //
        // AtomEscape[U] :: CharacterEscape[?U]
        // CharacterEscape[U] :: c ControlLetter
        expect(() => parse("\\c" + s, { unicode: true })).toThrowError(SyntaxError);
        // "c ControlLetter" sequence in ClassEscape.
        //
        // ClassEscape[U] :: CharacterEscape[?U]
        // CharacterEscape[U] :: c ControlLetter
        expect(() => parse("[\\c" + s + "]", { unicode: true })).toThrowError(SyntaxError);
      }
    }
  });
  test(testFileLink("unicode_restricted_identity_escape_alpha.js"), () => {
    function isValidAlphaEscapeInAtom(s: string): boolean {
      switch (s) {
        // Assertion [U] :: \b
        case "b":
        // Assertion [U] :: \B
        case "B":
        // ControlEscape :: one of f n r t v
        case "f":
        case "n":
        case "r":
        case "t":
        case "v":
        // CharacterClassEscape :: one of d D s S w W
        case "d":
        case "D":
        case "s":
        case "S":
        case "w":
        case "W":
          return true;
        default:
          return false;
      }
    }

    function isValidAlphaEscapeInClass(s: string): boolean {
      switch (s) {
        // ClassEscape[U] :: b
        case "b":
        // ControlEscape :: one of f n r t v
        case "f":
        case "n":
        case "r":
        case "t":
        case "v":
        // CharacterClassEscape :: one of d D s S w W
        case "d":
        case "D":
        case "s":
        case "S":
        case "w":
        case "W":
          return true;
        default:
          return false;
      }
    }

    // IdentityEscape in AtomEscape
    for (let cu = 0x41 /* A */; cu <= 0x5a /* Z */; ++cu) {
      const s = String.fromCharCode(cu);
      if (!isValidAlphaEscapeInAtom(s)) {
        expect(() => parse("\\" + s, { unicode: true })).toThrowError(SyntaxError);
      }
    }
    for (let cu = 0x61 /* a */; cu <= 0x7a /* z */; ++cu) {
      const s = String.fromCharCode(cu);
      if (!isValidAlphaEscapeInAtom(s)) {
        expect(() => parse("\\" + s, { unicode: true })).toThrowError(SyntaxError);
      }
    }

    // IdentityEscape in ClassEscape
    for (let cu = 0x41 /* A */; cu <= 0x5a /* Z */; ++cu) {
      const s = String.fromCharCode(cu);
      if (!isValidAlphaEscapeInClass(s)) {
        expect(() => parse("[\\" + s + "]", { unicode: true })).toThrowError(SyntaxError);
      }
    }
    for (let cu = 0x61 /* a */; cu <= 0x7a /* z */; ++cu) {
      const s = String.fromCharCode(cu);
      if (!isValidAlphaEscapeInClass(s)) {
        expect(() => parse("[\\" + s + "]", { unicode: true })).toThrowError(SyntaxError);
      }
    }
  });
});

describe(`ECMA Tests - Lookbehind Tests`, () => {
  test.skip(testFileLink("lookBehind/alternations"), () => {
    expectMatchIndexes(execute({}, "xabcd", /.*(?<=(..|...|....))(.*)/), 0, 5);
    expectMatchIndexes(execute({}, "xabcd", /.*(?<=(xx|...|....))(.*)/), 0, 5);
    expectMatchIndexes(execute({}, "xxabcd", /.*(?<=(xx|...))(.*)/), 0, 6);
    expectMatchIndexes(execute({}, "xxabcd", /.*(?<=(xx|xxx))(.*)/), 0, 6);
  });
  test.skip(testFileLink("lookBehind/back-references-to-captures"), () => {
    expectMatchIndexes(execute({}, "abcCd", /(?<=\1(\w))d/i));
    expectMatchIndexes(execute({}, "abxxd", /(?<=\1([abx]))d/));
    expectMatchIndexes(execute({}, "ababc", /(?<=\1(\w+))c/));
    expectMatchIndexes(execute({}, "ababbc", /(?<=\1(\w+))c/));
    expectMatchIndexes(execute({}, "ababdc", /(?<=\1(\w+))c/));
    expectMatchIndexes(execute({}, "ababc", /(?<=(\w+)\1)c/));
  });
  test(testFileLink("lookBehind/negative"), () => {
    expectMatchIndexes(execute({}, "abcdef", /(?<!abc)\w\w\w/), 0, 3);
    expectMatchIndexes(execute({}, "abcdef", /(?<!a[a-z])\w\w\w/), 0, 3, 6);
    expectMatchIndexes(execute({}, "abcdef", /(?<!a[a-z]{2})\w\w\w/), 0, 3);
    expectMatchIndexes(execute({}, "abcdef", /abc|(?<!abc)def/), 0, 3);
    expectMatchIndexes(execute({}, "abcdef", /abc|(?<!a.c)def/), 0, 3);
    expectMatchIndexes(execute({}, "abcdef", /abc|(?<!a\wc)def/), 0, 3);
    expectMatchIndexes(execute({}, "abcdef", /abc|(?<!a[a-z][a-z])def/), 0, 3);
    expectMatchIndexes(execute({}, "abcdef", /abc|(?<!a[a-z]{2})def/), 0, 3);
    expectMatchIndexes(execute({}, "abcdef", /ab|(?<!a{1}b{1})cde/), 0, 2);
    expectMatchIndexes(execute({}, "abcdef", /abc|(?<!a{1}[a-z]{2})def/), 0, 3);
  });
  test(testFileLink("lookBehind/back-references"), () => {
    // TODO
  });
  test(testFileLink("lookBehind/captures-negative"), () => {
    // TODO
  });
});

describe(`ECMA Tests - dotAll tests`, () => {
  test(testFileLink("dotall/with-dotall-unicode.js"), () => {
    for (const re of [/^.$/su, /^.$/msu]) {
      expectMatchIndexes(execute({}, "a", re), 0, 1);
      expectMatchIndexes(execute({}, "3", re), 0, 1);
      expectMatchIndexes(execute({}, "π", re), 0, 1);
      expectMatchIndexes(execute({}, "\u2027", re), 0, 1);
      expectMatchIndexes(execute({}, "\u0085", re), 0, 1);
      expectMatchIndexes(execute({}, "\v", re), 0, 1);
      expectMatchIndexes(execute({}, "\f", re), 0, 1);
      expectMatchIndexes(execute({}, "\u180E", re), 0, 1);
      expectMatchIndexes(execute({}, "\u{10300}", re), 0, 1);
      expectMatchIndexes(execute({}, "\n", re), 0, 1);
      expectMatchIndexes(execute({}, "\r", re), 0, 1);
      expectMatchIndexes(execute({}, "\u2028", re), 0, 1);
      expectMatchIndexes(execute({}, "\u2029", re), 0, 1);
      expectMatchIndexes(execute({}, "\uD800", re), 0, 1);
      expectMatchIndexes(execute({}, "\uDFFF", re), 0, 1);
    }
  });
  test(testFileLink("dotall/with-dotall.js"), () => {
    for (const re of [/^.$/s, /^.$/ms]) {
      expectMatchIndexes(execute({}, "a", re), 0, 1);
      expectMatchIndexes(execute({}, "3", re), 0, 1);
      expectMatchIndexes(execute({}, "π", re), 0, 1);
      expectMatchIndexes(execute({}, "\u2027", re), 0, 1);
      expectMatchIndexes(execute({}, "\u0085", re), 0, 1);
      expectMatchIndexes(execute({}, "\v", re), 0, 1);
      expectMatchIndexes(execute({}, "\f", re), 0, 1);
      expectMatchIndexes(execute({}, "\u180E", re), 0, 1);
      expectMatchIndexes(execute({}, "\n", re), 0, 1);
      expectMatchIndexes(execute({}, "\r", re), 0, 1);
      expectMatchIndexes(execute({}, "\u2028", re), 0, 1);
      expectMatchIndexes(execute({}, "\u2029", re), 0, 1);
      expectMatchIndexes(execute({}, "\uD800", re), 0, 1);
      expectMatchIndexes(execute({}, "\uDFFF", re), 0, 1);
      expectMatchIndexes(execute({}, "\u{10300}", re), 0, 1);
    }
  });
  test(testFileLink("dotall/without-dotall-unicode.js"), () => {
    for (const re of [/^.$/u, /^.$/mu]) {
      expectMatchIndexes(execute({}, "a", re), 0, 1);
      expectMatchIndexes(execute({}, "3", re), 0, 1);
      expectMatchIndexes(execute({}, "π", re), 0, 1);
      expectMatchIndexes(execute({}, "\u2027", re), 0, 1);
      expectMatchIndexes(execute({}, "\u0085", re), 0, 1);
      expectMatchIndexes(execute({}, "\v", re), 0, 1);
      expectMatchIndexes(execute({}, "\f", re), 0, 1);
      expectMatchIndexes(execute({}, "\u180E", re), 0, 1);
      expectMatchIndexes(execute({}, "\u{10300}", re), 0, 1);
      expectMatchIndexes(execute({}, "\n", re));
      expectMatchIndexes(execute({}, "\r", re));
      expectMatchIndexes(execute({}, "\u2028", re));
      expectMatchIndexes(execute({}, "\u2029", re));
      expectMatchIndexes(execute({}, "\uD800", re), 0, 1);
      expectMatchIndexes(execute({}, "\uDFFF", re), 0, 1);
    }
  });
  test(testFileLink("dotall/without-dotall.js"), () => {
    for (const re of [/^.$/, /^.$/m]) {
      expectMatchIndexes(execute({}, "a", re), 0, 1);
      expectMatchIndexes(execute({}, "3", re), 0, 1);
      expectMatchIndexes(execute({}, "π", re), 0, 1);
      expectMatchIndexes(execute({}, "\u2027", re), 0, 1);
      expectMatchIndexes(execute({}, "\u0085", re), 0, 1);
      expectMatchIndexes(execute({}, "\v", re), 0, 1);
      expectMatchIndexes(execute({}, "\f", re), 0, 1);
      expectMatchIndexes(execute({}, "\u180E", re), 0, 1);
      expectMatchIndexes(execute({}, "\u{10300}", re), 0, 1);
      expectMatchIndexes(execute({}, "\n", re));
      expectMatchIndexes(execute({}, "\r", re));
      expectMatchIndexes(execute({}, "\u2028", re));
      expectMatchIndexes(execute({}, "\u2029", re));
      expectMatchIndexes(execute({}, "\uD800", re), 0, 1);
      expectMatchIndexes(execute({}, "\uDFFF", re), 0, 1);
    }
  });
});
