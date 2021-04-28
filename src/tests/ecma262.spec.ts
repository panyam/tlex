const util = require("util");
import * as TSU from "@panyam/tsutils";
import { Tape } from "../tape";
import { Rule, Regex } from "../core";
import { RegexParser } from "../parser";
import { parse, compile } from "./utils";
import { Prog, Match } from "../vm";
import { InstrDebugValue, VM } from "../pikevm";

type REType = string | (Rule | string)[];
function execute(configs: any, repattern: REType, input: string, expected: any): Match[] {
  const found = [] as Match[];
  let prog: Prog;
  if (typeof repattern == "string") {
    prog = compile(null, repattern);
  } else {
    prog = compile(null, ...repattern);
  }
  const vm = new VM(prog, 0, -1, true, configs);
  const tape = new Tape(input);
  let next = vm.match(tape);
  while (next != null && next.end > next.start) {
    found.push(next);
    next = vm.match(tape);
  }
  if (configs.debug) {
    console.log(
      "Prog: \n",
      `${prog.debugValue(InstrDebugValue).join("\n")}`,
      "\n\nRE: ",
      repattern,
      "\n\nInput: ",
      input,
      "\n\nFound: ",
      util.inspect(found, {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
    );
    console.log(
      "\n\nExpected: ",
      util.inspect(expected, {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
    );
  }
  return found;
}

function testMatchD(repattern: REType, input: string, ...expected: number[]): Match[] {
  return testMatchO({ debug: true }, repattern, input, ...expected);
}

function testMatch(repattern: REType, input: string, ...expected: number[]): Match[] {
  return testMatchO({ debug: false }, repattern, input, ...expected);
}

function testMatchO(configs: any, repattern: REType, input: string, ...expected: number[]): Match[] {
  const found = execute(configs, repattern, input, expected);
  if (found.length == 0) expect(expected.length).toBe(0);
  else expect(found.length).toBe(expected.length - 1);
  for (let i = 0; i < found.length; i++) {
    expect(found[i].start).toBe(expected[i]);
    expect(found[i].end).toBe(expected[i + 1]);
    // expect(found[i].matchIndex).toBe(expected[i][2]);
  }
  return found;
}

function testMatchEx(configs: any, repattern: REType, input: string, expected: any[]): Match[] {
  const found = execute(configs, repattern, input, expected);
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
    testMatch("a|ab", "abc", 0, 1);
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
    testMatch("(Robert)|(Bobby)|(Bob)|(Rob)", "BobRobertRobBobby", 0, 3, 9, 12, 17);
  });
  test(caseLabel("15.10.2.5_A1_T1"), () => {
    testMatch("a[a-z]{2,4}", "abcdefghi", 0, 5);
  });
  test(caseLabel("15.10.2.5_A1_T2 - Needs to be fixed to handle greedy"), () => {
    testMatch("a[a-z]{2,4}?", "abcdefghi", 0, 3);
  });
  test(caseLabel("15.10.2.5_A1_T3"), () => {
    testMatch("(aa|aabaac|ba|b|c)*", "aabaac", 0, 4);
  });
  test(caseLabel("15.10.2.5_A1_T4"), () => {
    testMatch("(z)((a+)?(b+)?(c))*", "zaacbbbcac", 0, 10);
  });
  test.skip(caseLabel("15.10.2.5_A1_T5"), () => {
    // Not working yet
    testMatch("(a*)b\\1+", "aabaac", 0, 5);
  });
});

describe("ECMA Tests - Section 15.10.2.6", () => {
  test(caseLabel("15.10.2.6_A1_T1,T2"), () => {
    // /s$/.test("pairs\nmakes\tdouble");
    testMatch("s+$|\n", "sss\nss\nsssss\nsssss", 0, 3, 4, 6, 7, 12, 13, 18);
  });
  test(caseLabel("15.10.2.6_A1_T3,T4,T5"), () => {
    testMatchO({ multiline: false }, "s+$|.", "s\nssssss", 0, 1, 2, 8);
    testMatchO({ multiline: false }, "es$|.", "s\n\u0065s", 0, 1, 2, 4);
  });
  test(caseLabel("15.10.2.6_A2_T1,T2"), () => {
    testMatchO({ multiline: false }, "^hello|.", "\nhello", 0, 1, 2, 3, 4, 5, 6);
    testMatch("^hello|.", "\nhello", 0, 1, 6);
  });
  test(caseLabel("15.10.2.6_A2_T3,T4"), () => {
    testMatchO({ multiline: false }, "^p[a-z]|.", "\npaisa", 0, 1, 2, 3, 4, 5, 6);
    testMatchO({ multiline: true }, "^p[a-z]|.", "\npaisa", 0, 1, 3, 4, 5, 6);
  });
  test(caseLabel("15.10.2.6_A2_T5"), () => {
    testMatchO({ multiline: false }, "^[^p].|.", "\npaisa\nhola", 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
    testMatchO({ multiline: true }, "^[^p].|.", "\npaisa\nhola", 0, 2, 3, 4, 5, 6, 7, 9, 10, 11);
  });
  test(caseLabel("15.10.2.6_A2_T6"), () => {
    testMatchO({ multiline: true }, "^abc", "abcabcdefgh", 0, 3);
  });
  test.skip(caseLabel("15.10.2.6_A2_T7"), () => {
    // Not correct
    testMatchO({ multiline: true }, "^..^e", "ab\ncde", 0, 2);
  });
  test(caseLabel("15.10.2.6_A2_T8"), () => {
    testMatchO({ multiline: true }, "^xxx", "yyyyy");
  });
  test(caseLabel("15.10.2.6_A2_T9"), () => {
    testMatchO({ multiline: true }, "^\\^+", "^^^x", 0, 3);
  });
  test(caseLabel("15.10.2.6_A2_T10"), () => {
    testMatchO({ multiline: true }, "^\\d+|\\n", "12345\n67890", 0, 5, 6, 11);
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
    testMatch("\bhello|.", "hellohello", 0, 5, 6, 7, 8, 9, 10);
  });

  test(caseLabel("15.10.2.6_A4_T1 to -T8 Inverted word boundary - \\B"), () => {
    // Not implemented
  });
});

describe("ECMA Tests - Multiple boundary markers (^$\\b\\B) - 15.10.2.6_A5", () => {
  test(caseLabel("15.10.2.6_A5_T1"), () => {
    testMatch("^^^^^hello$$$$$", "hello", 0, 5);
  });
  test.skip(caseLabel("15.10.2.6_A5_T2"), () => {
    testMatch("\\B\\B\\Bbot\\b\\b\\b|.", "robot wall-e", 0, 1, 2, 5, 6, 7, 8, 9, 10, 11, 12);
  });
});

describe("ECMA Tests - Assertions in combination - 15.10.2.6", () => {
  test(caseLabel("15.10.2.6_A6_T1"), () => {
    testMatch("^.*?$", "hello world", 0, 11);
  });
  test.skip(caseLabel("15.10.2.6_A6_T2"), () => {
    // TODO - We match *atleast* 1 char by design - should this not be the case?
    testMatch("^.*?", "hello world");
  });
  test(caseLabel("15.10.2.6_A6_T3"), () => {
    testMatch("^.*?(:|$)", "hello: world", 0, 6);
  });
  test(caseLabel("15.10.2.6_A6_T4"), () => {
    testMatch("^.*(:|$)", "hello: world", 0, 12);
  });
});

describe("ECMA Tests - Decimal Digits - 15.10.2.7", () => {
  test(caseLabel("15.10.2.7_A1_T1,T2,T3,T4,T5"), () => {
    testMatch("\\d{2,4}", "100010", 0, 4, 6);
    testMatch("\\d{2,4}", "1");
    testMatch("\\d{2,4}", "100", 0, 3);
  });
  test(caseLabel("15.10.2.7_A1_T6,T7"), () => {
    testMatch("\\d{2,4}", "0\u0031\u0031b", 0, 3);
    testMatch("\\d{2,4}", "0\u0031\u00312b", 0, 4);
  });
  test(caseLabel("15.10.2.7_A1_T8,T9,T10"), () => {
    testMatch("b{2,4}c", "bbbcd", 0, 4);
    testMatch("b{100,150}c", "bcd");
    testMatch("b{0,150}c", "bbbbbbbcd", 0, 8);
  });

  test(caseLabel("15.10.2.7_A2_T1,T2,T3"), () => {
    testMatch("\\w{3}\\d?|.", "xabcde123", 0, 3, 7, 8, 9);
    testMatch("b{2}c|.", "bbbc", 0, 1, 4);
  });

  test(caseLabel("15.10.2.7_A3_T1-T14"), () => {
    testMatch("\\s+java\\s+|.", "x    java    ", 0, 1, 13);
    testMatch("\\s+java\\s+|.", "\t    java    ", 0, 13);
    testMatch("\\s+java\\s+", "\t    javax    ");
    testMatch("\\s+java\\s+", "java\n");
    testMatch("[a-z]+\\d+|.", "5 x2\n", 0, 1, 2, 4, 5);
    testMatch("[a-z]+(\\d+)|.", "abc1234\n", 0, 7, 8);
    testMatch("b+c|.", "bbbc", 0, 4);
    testMatch("b+c", "d");
    testMatch("b+c", "bc", 0, 2);
    testMatch("b+b+b+", "bbbbbb", 0, 6);
    testMatch("(b+)(b+)(b+)", "bbbbbb", 0, 6);
    testMatch("b+b*", "bbbbbb", 0, 6);
    testMatch("(b+)((b)+)", "bbbbbb", 0, 6);
    testMatch("b+b*", "bbbbbb", 0, 6);
  });

  test(caseLabel("15.10.2.7_A4_T1-T9"), () => {
    testMatch('[^"]*', '"beast"-nickname');
    testMatch('[^"]*', 'alice said: "don\'t"', 0, 12);
    testMatch('[^"]*', "abc'def'ghi", 0, 11);
    testMatch('[^"]*', 'alice "', 0, 6);
    testMatch('[^"]*', "alice \u0022", 0, 6);
    testMatch(`.*(["'][^"']*["'])`, "alice \u0022sweep\u0022", 0, 13);
    testMatch(`(["'][^"']*["'])`, "\u0022sweep\u0022", 0, 7);
    testMatch(`(["'][^"']*["'])`, "'sweep\"", 0, 7);
    testMatch(`(["'][^"']*["'])`, "'hello");
    testMatch(`(["'][^"']*["'])`, "''", 0, 2);
    testMatch(`(["'][^"']*["'])`, '""', 0, 2);
  });
  test.skip(caseLabel("15.10.2.7_A4_T10"), () => {
    // This should return "" but our greedy implementation returns ?
    // For some reason ab*c where a and c are "" b* is supposed to return ""
    // Even wierd .* has the opposite behaviour
    testMatch("d*", "ddddd");
  });
  test(caseLabel("15.10.2.7_A4_T11,T21"), () => {
    testMatch("dd*", "ddddd", 0, 5);
    testMatch("cx*d", "cdefg", 0, 2);
    testMatch("(x*)(x+)", "xxxxxxx", 0, 7);
    testMatch("(\\d*)(\\d+)", "1234567890", 0, 10);
    testMatch("(\\d*)\\d(\\d+)", "1234567890", 0, 10);
    testMatch("(x+)(x*)", "xxxxxxx", 0, 7);
    testMatch("x*y+$", "xxxxxyyyyy", 0, 10);
    testMatch("[\\d]*[\\s]*bc.", "bcdef", 0, 3);
    testMatch("bc..[\\d]*[\\s]*", "bcdef", 0, 4);
    testMatch(".*", "a1b2c3", 0, 6);
    testMatch("[xyz]*1", "a0.b2.c3");
  });

  test(caseLabel("15.10.2.7_A5_T1-T12"), () => {
    testMatch("java(script)?", "javascript is extension of ecma script", 0, 10);
    testMatch("java(script)?|.", "java javascript", 0, 4, 5, 15);
    testMatch("java(script)?", "JavaJavascript");
    testMatch("cd?e|.", "abcdef", 0, 1, 2, 5, 6);
    testMatch("cdx?e|.", "abcdef", 0, 1, 2, 5, 6);
    testMatch("o?pqrst", "pqrstuvw", 0, 5);
    testMatch("x?y?z?", "abcde");
    testMatch("x?ay?bz?c", "abcde", 0, 3);
    testMatch("b?b?b?", "bbbbc", 0, 3, 4);
    testMatch("\\d*ab?c?d?x?y?z", "123az789", 0, 5);
    testMatch("\\??\\??\\??\\??\\??", "?????", 0, 5);
    testMatch(".?.?.?.?.?.?.?", "test", 0, 4);
  });

  test(caseLabel("15.10.2.7_A6_T1-T4"), () => {
    testMatch("b{2,}c", "bbbbbbc", 0, 7);
    testMatch("b{10,}c", "bbbbbbc");
    testMatch("\\d{1,}c", "123456c", 0, 7);
    testMatch("(123){1,}", "123123123123", 0, 12);
    testMatch("(123){1,}x", "123123123x123", 0, 10);
    testMatch("(123){1,}x", "123123123x123", 0, 10);
  });
  test.skip(caseLabel("15.10.2.7_A6_T5"), () => {
    // Captured groups references not yet implemented
    testMatch("(123){1,}x\\1", "123123123x123", 0, 13);
  });
  test(caseLabel("15.10.2.7_A6_T6"), () => {
    testMatch("x{1,2}x{1,}", "xxxxxxxx", 0, 8);
  });
});

const DOT_STAR = new Rule(".*", 0, 0);

describe("ECMA Tests - Lookaheads - 15.10.2.8", () => {
  test(caseLabel("15.10.2.8_A1_T1-T5"), () => {
    testMatch("(?=(a+))", "aaa");
    testMatch("(?=(a+))a*b", "aaabac", 0, 4);
    testMatch("[Jj]ava([Ss]cript)?(?=:)", "Javascript");
    testMatch("[Jj]ava([Ss]cript)?(?=:)", "Javascript: the way af jedi", 0, 10);
    testMatch("[Jj]ava([Ss]cript)?(?=:)", "java: the cookbook", 0, 4);
  });
  test.skip(caseLabel("15.10.2.8_A2_T1"), () => {
    testMatch("(.*?)a(?!(a+)b\\2c)\\2(.*)", "baaabaaac", 0, 9);
  });
  test(caseLabel("15.10.2.8_A2_T2-T11"), () => {
    testMatch(["Java(?!Script)([A-Z]\\w*)", "."], " JavaBeans ", 0, 1, 10, 11);
    testMatch(["Java(?!Script)([A-Z]\\w*)"], "Java");
    testMatch(["Java(?!Script)([A-Z]\\w*)"], "JavaScripter");
    testMatch(["Java(?!Script)([A-Z]\\w*)"], "JavaScro ops", 0, 8);
    testMatch(["(\\.(?!com|org)|\\/)"], ".info", 0, 1);
    testMatch(["(\\.(?!com|org)|\\/)"], "/info", 0, 1);
    testMatch(["(\\.(?!com|org)|\\/)"], ".com");
    testMatch(["(\\.(?!com|org)|\\/)"], ".org");
    testMatch("(?!a|b)|c", "");
    testMatch("(?!a|b)|c", "bc");
    testMatch("(?!a|b)|c", "d");
  });

  test(caseLabel("15.10.2.8_A3_T1-T6"), () => {
    testMatch("([Jj]ava([Ss]cript)?)\\sis\\s(fun\\w*)", "javaScript is funny, really", 0, 19);
    testMatch("([Jj]ava([Ss]cript)?)\\sis\\s(fun\\w*)", "java is fun, really", 0, 11);
    testMatch("([Jj]ava([Ss]cript)?)\\sis\\s(fun\\w*)", "javascript is hard");
    // Need to examine submatch trackings
    testMatch("(abc)", "abc", 0, 3);
    testMatch("a(bc)d(ef)g", "abcdefg", 0, 7);
    testMatch("(.{3})(.{4})", "abcdefgh", 0, 7);
  });
  test.skip(caseLabel("15.10.2.8_A3_T7-T10"), () => {
    testMatch("(aa)bcd\\1", "aabcdaabcd", 0, 7);
    testMatch("(aa).+\\1", "aabcdaabcd", 0, 7);
    testMatch("(.{2}).+\\1", "aabcdaabcd", 0, 7);
    testMatch("(\\d{3})(\\d{3})\\1\\2", "123456123456", 0, 12);
  });
  test(caseLabel("15.10.2.8_A3_T11-T12"), () => {
    testMatch("a(..(..)..)", "abcdefgh", 0, 7);
    testMatch("(a(b(c)))(d(e(f)))", "abcdefg", 0, 6);
  });
  test.skip(caseLabel("15.10.2.8_A3_T13-T16"), () => {
    testMatch("(a(b(c)))(d(e(f)))\\2\\5", "abcdefbcefg", 0, 10);
    testMatch("a(.?)b\\1c\\1d\\1", "abcd", 0, 4);
    // TBD - https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/S15.10.2.8_A3_T15.js
    // TBD - https://github.com/tc39/test262/blob/master/test/built-ins/RegExp/S15.10.2.8_A3_T16.js
  });
  test(caseLabel("15.10.2.8_A3_T17"), () => {
    //
    let __body = "";
    __body += '<body onXXX="alert(event.type);">\n';
    __body += "<p>Kibology for all</p>\n";
    __body += "<p>All for Kibology</p>\n";
    __body += "</body>";

    const __html = "<html>\n" + __body + "\n</html>";
    // ignore case not yet implemented
    testMatchO({ debug: false, ignoreCase: true }, "<body.*>((.*\\n?)*?)<\\/body>|.", __html, 0, 7 + __body.length);
  });
  test.skip(caseLabel("15.10.2.8_A3_T18"), () => {
    // TBD
  });
  test(caseLabel("15.10.2.8_A3_T19"), () => {
    testMatch("([\\S]+([ \\t]+[\\S]+)*)[ \\t]*=[ \\t]*[\\S]+", "Course_Creator = Test", 0, 21);
  });
  test(caseLabel("15.10.2.8_A3_T20-T33"), () => {
    // TODO - In all these tests also verify the submatch groups
    testMatch("^(A)?(A.*)$", "AAA", 0, 3);
    testMatch("^(A)?(A.*)$", "AA", 0, 2);
    testMatch("^(A)?(A.*)$", "A", 0, 1);
    testMatch("^(A)?(A.*)$", "AAAaaAAaaaf;lrlrzs", 0, 18);
    testMatch("^(A)?(A.*)$", "AAaaAAaaaf;lrlrzs", 0, 17);
    testMatch("^(A)?(A.*)$", "AaaAAaaaf;lrlrzs", 0, 16);
    testMatch("(a)?a", "a", 0, 1);
    testMatch("a|(b)", "a", 0, 1);
    testMatch("(a)?(a)", "a", 0, 1);
    testMatch("^([a-z]+)*[a-z]$", "a", 0, 1);
    testMatch("^([a-z]+)*[a-z]$", "ab", 0, 2);
    testMatch("^([a-z]+)*[a-z]$", "abc", 0, 3);
    testMatch("^(([a-z]+)*[a-z]\\.)+[a-z]{2,}$", "www.netscape.com", 0, 16);
    testMatch("^(([a-z]+)*([a-z])\\.)+[a-z]{2,}$", "www.netscape.com", 0, 16);
  });
});
