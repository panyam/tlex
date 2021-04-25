const util = require("util");
import * as TSU from "@panyam/tsutils";
import { Tape } from "../tape";
import { Regex } from "../core";
import { RegexParser } from "../parser";
import { parse, compile } from "./utils";
import { Match } from "../vm";
import { InstrDebugValue, VM } from "../pikevm";

function testMatchD(repattern: string, input: string, ...expected: number[]): Match[] {
  return testMatchO(true, repattern, input, ...expected);
}

function testMatch(repattern: string, input: string, ...expected: number[]): Match[] {
  return testMatchO(false, repattern, input, ...expected);
}

function testMatchO(debug: boolean, repattern: string, input: string, ...expected: number[]): Match[] {
  const found = [] as Match[];
  const prog = compile(null, repattern);
  const vm = new VM(prog);
  const tape = new Tape(input);
  let next = vm.match(tape);
  while (next != null && next.end > next.start) {
    found.push(next);
    next = vm.match(tape);
  }
  if (debug) {
    /*
    (found.length == 0 && expected.length != 0) ||
    (expected.length == 0 && found.length != 0) ||
    found.length != expected.length - 1
  ) {
 */
    console.log(
      "Prog: \n",
      `${prog.debugValue(InstrDebugValue).join("\n")}`,
      "\n\nRE: ",
      repattern,
      "\n\nInput: ",
      input,
      "\n\nExpected: ",
      expected,
      "\n\nFound: ",
      found,
    );
  }
  if (found.length == 0) expect(expected.length).toBe(0);
  else expect(found.length).toBe(expected.length - 1);
  for (let i = 0; i < found.length; i++) {
    expect(found[i].start).toBe(expected[i]);
    expect(found[i].end).toBe(expected[i + 1]);
    // expect(found[i].matchIndex).toBe(expected[i][2]);
  }
  return found;
}

function testRegex(input: string, expected: any, debug = false, enforce = true): Regex {
  const found = parse(input);
  if (debug) {
    console.log(
      "Found Value: \n",
      util.inspect(found.debugValue, {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
      "\nExpected Value: \n",
      util.inspect(expected, {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
    );
  }
  if (enforce) expect(found.debugValue).toEqual(expected);
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
    testMatch("\\t", "\u0009", 0, 1);
    testMatch("\\t\\t", "\u0009\u0009b", 0, 2);
  });
  test(caseLabel("15.10.2.10_A1.2_T1"), () => {
    testMatch("\\n", "\u000a", 0, 1);
    testMatch("\\n\\n", "\u000a\u000ab", 0, 2);
  });
  test(caseLabel("15.10.2.10_A1.3_T1"), () => {
    testMatch("\\v", "\u000B", 0, 1);
    testMatch("\\v\\v", "\u000B\u000Bb", 0, 2);
  });
  test(caseLabel("15.10.2.10_A1.4_T1"), () => {
    testMatch("\\f", "\u000C", 0, 1);
    testMatch("\\f\\f", "\u000C\u000Cb", 0, 2);
  });
  test(caseLabel("15.10.2.10_A1.D_T1"), () => {
    testMatch("\\r", "\u000D", 0, 1);
    testMatch("\\r\\r", "\u000D\u000Db", 0, 2);
  });
  test(caseLabel("15.10.2.10_A2.1_T1"), () => {
    // control chars A-Z
    for (let alpha = 0x0041; alpha <= 0x005a; alpha++) {
      const str = String.fromCharCode(alpha % 32);
      const re = "\\c" + String.fromCharCode(alpha);
      testMatch(re, str, 0, 1);
    }
  });
  test(caseLabel("15.10.2.10_A3.1_T1 _ Test strings with equal hex and unicode strings"), () => {
    testMatch("\\x00", "\u0000", 0, 1);
    testMatch("\\x01", "\u0001", 0, 1);
    testMatch("\\x0A", "\u000A", 0, 1);
    testMatch("\\xFF", "\u00FF", 0, 1);
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
    hex.forEach((h, index) => testMatch(h, character[index], 0, 1));

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
    hex.forEach((h, index) => testMatch(h, character[index], 0, 1));
  });
  test(caseLabel("15.10.2.10_A4.1_T1 : Regex and input contain unicode symbols"), () => {
    testMatch("\\u0000", "\u0000", 0, 1);
    testMatch("\\u0001", "\u0001", 0, 1);
    testMatch("\\u000A", "\u000a", 0, 1);
    testMatch("\\u000f", "\u000f", 0, 1);
    testMatch("\\u00Ff", "\u00fF", 0, 1);
    testMatch("\\u0FfF", "\u0fFf", 0, 1);
    testMatch("\\uFFfF", "\uFfFf", 0, 1);
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
    hex.forEach((h, index) => testMatch(h, character[index], 0, 1));

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
    hex.forEach((h, index) => testMatch(h, character[index], 0, 1));
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
      hex.forEach((h, index) => testMatch(h, character[index], 0, 1));

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
      hex.forEach((h, index) => testMatch(h, character[index], 0, 1));
    },
  );
  test(caseLabel("15.10.2.10_A5.1_T1 : Tested string is \"~`!@#$%^&*()-+={[}]|\\\\:;'<,>./?\" + '\"'"), () => {
    const non_ident = "~`!@#$%^&*()-+={[}]|\\:;'<,>./?" + '"';
    for (let k = 0; k < non_ident.length; ++k) {
      // \\Z where Z is above will just match to Z
      const re = "\\" + non_ident[k];
      testMatch(re, non_ident[k], 0, 1);
    }
  });
  test(caseLabel("15.10.2.11_A1_T1 : Test null chars"), () => {
    testMatch("\0", "\u0000", 0, 1);
  });
});

// Refer to:
// https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/
// For more details on what the tests are checking for parity
describe("ECMA Tests - Numbered Group Matching Tests", () => {
  test.skip(caseLabel("15.10.2.11_A1_T4"), () => {
    testMatch("(A)\\1", "AA", 0, 2);
  });
  test.skip(caseLabel("15.10.2.11_A1_T5"), () => {
    testMatch("\\1(A)", "AA", 0, 2);
  });
  test.skip(caseLabel("15.10.2.11_A1_T6"), () => {
    testMatch("(A)\\1(B)\\2", "AABB", 0, 4);
  });
  test.skip(caseLabel("15.10.2.11_A1_T7"), () => {
    testMatch("\\1(A)\\2(B)", "AABB", 0, 4);
  });
  test.skip(caseLabel("15.10.2.11_A1_T8"), () => {
    testMatch("((((((((((A))))))))))\\1\\2\\3\\4\\5\\6\\7\\8\\9\\10", "AAAAAAAAAAA", 0, 11);
  });
  test.skip(caseLabel("15.10.2.11_A1_T9"), () => {
    testMatch("((((((((((A))))))))))\\10\\9\\8\\7\\6\\5\\4\\3\\2\\1", "AAAAAAAAAAA", 0, 11);
  });
});

describe("ECMA Tests - Character Classes", () => {
  test(caseLabel("15.10.2.12_A3_T5"), () => {
    const input = "_0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < input.length; i++) {
      testMatch("\\w", input[i], 0, 1);
    }
  });
  test(caseLabel("15.10.2.12_A4_T5"), () => {
    let input = "_0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < input.length; i++) {
      // should not match
      testMatch("\\W", input[i]);
    }

    // All should match
    input = "\f\n\r\t\v~`!@#$%^&*()-+={[}]|\\:;'<,>./? ";
    for (let i = 0; i < input.length; i++) {
      testMatch("\\W", input[i], 0, 1);
    }
  });
  test(caseLabel("15.10.2.13_A1_T1 and 15.10.2.13_A1_T2"), () => {
    testMatch("[]a", "\0a\0a");
    testMatch("a[]", "\0a\0a");
  });
  test(caseLabel("15.10.2.13_A1_T6"), () => {
    testMatch("ab[ercst]de", "abcde", 0, 5);
  });
  test(caseLabel("15.10.2.13_A1_T7"), () => {
    testMatch("ab[erst]de", "abcde");
  });
  test(caseLabel("15.10.2.13_A1_T8"), () => {
    testMatch("[d-h]+", "defghijkl", 0, 5);
  });
  test(caseLabel("15.10.2.13_A1_T9"), () => {
    testMatch("[1234567].{2}", "6defghijkl", 0, 3);
  });
  test(caseLabel("15.10.2.13_A1_T10"), () => {
    testMatch("[a-c\\d]+", "abc324234\n", 0, 9);
  });
  test(caseLabel("15.10.2.13_A1_T11"), () => {
    testMatch("ab[.]?c", "abc", 0, 3);
  });
  test(caseLabel("15.10.2.13_A1_T12"), () => {
    testMatch("a[b]?c", "abc", 0, 3);
  });
  test.skip(caseLabel("15.10.2.13_A1_T14"), () => {
    testMatch("[*&$]{,3}", "*&$");
  });
  test(caseLabel("15.10.2.13_A1_T15"), () => {
    testMatch("[\\d][\\n][^\\d]", "1\nb3\nd", 0, 3, 6);
  });
  test(caseLabel("15.10.2.13_A1_T17"), () => {
    testMatch("[\\d][\\n][^\\d]", "1\nb3\nd", 0, 3, 6);
  });
});
describe("ECMA Tests - Look Ahead/Look Back assertion test", () => {
  test(caseLabel("15.10.2.13_A1_T3"), () => {
    const re = "q[ax-zb](?=\\s+)";
    testMatch(re, "qy ", 0, 2);
  });
  test(caseLabel("15.10.2.13_A1_T4"), () => {
    const re = "q[ax-zb](?=\\s+)";
    testMatch(re, "qy ", 0, 2);
  });
  test(caseLabel("15.10.2.13_A1_T5"), () => {
    const re = "q[ax-zb](?=\\s+)";
    testMatch(re, "qa\t  qy ", 0, 2);
  });
});

describe("ECMA Tests - More Char Ranges", () => {
  test(caseLabel("15.10.2.13_A2_T1"), () => {
    const re = "[^]a";
    testMatch(re, "\naa ", 0, 2);
    testMatch(re, "aaa", 0, 2);
    testMatch(re, "a");
  });
  test(caseLabel("15.10.2.13_A2_T2"), () => {
    const re = "a[^]";
    testMatch(re, "aa\n", 0, 2);
    testMatch(re, "aaa", 0, 2);
    testMatch(re, "a");
  });
  test(caseLabel("15.10.2.13_A2_T3"), () => {
    const re = "a[^b-z]\\s+";
    testMatch(re, "aY aA    aB  ", 0, 3, 9, 13);
    testMatch(re, "aY ab    aB  ", 0, 3);
    testMatch(re, "ab ab    aB  ");
  });
  test(caseLabel("15.10.2.13_A2_T4"), () => {
    const re = "[^\\b]+";
    testMatch(re, "easy\bto\u0008ride", 0, 4);
  });
  test(caseLabel("15.10.2.13_A2_T5"), () => {
    const re = "a[^1-9]c";
    testMatch(re, "abcdef", 0, 3);
  });
  test(caseLabel("15.10.2.13_A2_T6"), () => {
    const re = "a[^b]c";
    testMatch(re, "abcdef");
  });
  test(caseLabel("15.10.2.13_A2_T7"), () => {
    testMatch("[^a-z]{4}", "%&*@ghi", 0, 4);
  });
  test(caseLabel("15.10.2.13_A2_T8"), () => {
    testMatch("[^]", "abcdef", 0, 1, 2, 3, 4, 5, 6);
  });
  test(caseLabel("15.10.2.13_A3_T1"), () => {
    testMatch(".[\\b].", "c\bd", 0, 3);
  });
  test(caseLabel("15.10.2.13_A3_T2"), () => {
    testMatch("c[\\b]{3}d", "c\b\b\bdef", 0, 5);
  });
  test(caseLabel("15.10.2.13_A3_T3"), () => {
    testMatch("[^\\[\\b\\]]+", "abc\bdef", 0, 3);
  });
  test(caseLabel("15.10.2.13_A3_T4"), () => {
    testMatch("[^\\[\\b\\]]+", "abcdef", 0, 6);
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
    testMatch("a|ab", "abc", 0, 2);
  });
  test(caseLabel("15.10.2.3_A1_T2"), () => {
    testMatch("((a)|(ab))((c)|(bc))", "abbcac", 0, 4, 6);
  });
  test.skip(caseLabel("15.10.2.3_A1_T6, T7, T8 - Case insensitivity not yet supported"), () => {
    testMatch("ab|cd|ef", "AEKFCD", 0, 4, 6);
  });
  test.skip(caseLabel("15.10.2.3_A1_T9- Case insensitivity and Non capturing groups not supported"), () => {
    testMatch("(?:ab|cd)+|ef", "AEKeFCDab");
  });
  test(caseLabel("15.10.2.3_A1_T11"), () => {
    testMatch("11111|111", "1111111111111111", 0, 5, 10, 15);
  });
  test(caseLabel("15.10.2.3_A1_T12"), () => {
    testMatch("xyz|...", "abc", 0, 3);
  });
  // Need to find a way to return submatches too
  test(caseLabel("15.10.2.3_A1_T13"), () => {
    testMatch("(.)..", "abc", 0, 3);
  });
  test(caseLabel("15.10.2.3_A1_T14"), () => {
    testMatch(".+: gr(a|e)y", "color: grey", 0, 11);
  });
  test(caseLabel("15.10.2.3_A1_T15"), () => {
    testMatch("(Rob)|(Bob)|(Robert)|(Bobby)", "BobRobertRobBobby", 0, 3, 9, 12, 17);
  });
  test(caseLabel("15.10.2.5_A1_T1"), () => {
    testMatch("a[a-z]{2,4}", "abcdefghi", 0, 5);
  });
  test(caseLabel("15.10.2.5_A1_T2 - Needs to be fixed to handle greedy"), () => {
    testMatchD("a[a-z]{2,4}?", "abcdefghi", 0, 3);
  });
  test(caseLabel("15.10.2.5_A1_T3"), () => {
    testMatch("(aa|aabaac|ba|b|c)*", "aabaac", 0, 6);
  });
  test(caseLabel("15.10.2.5_A1_T4"), () => {
    testMatch("(z)((a+)?(b+)?(c))*", "zaacbbbcac", 0, 10);
  });
  test(caseLabel("15.10.2.5_A1_T5"), () => {
    // Not working
    testMatch("(a*)b\\1+", "aabaac", 0, 5);
  });
});

describe("ECMA Tests - Section 15.10.2.6", () => {
  test(caseLabel("15.10.2.6_A1_T1"), () => {
    // /s$/.test("pairs\nmakes\tdouble");
    testMatch("s+$|\n", "sss\nss\nsssss\n", 0, 3, 4, 6, 7, 12);
  });
});
