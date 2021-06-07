const util = require("util");
import * as TSU from "@panyam/tsutils";
import { Regex, Char, CharType } from "../core";
import { parse } from "./utils";
import { RegexParser } from "../parser";

function expectRegex(input: string, found: any, expected: any, debug = false, enforce = true): void {
  if (debug) {
    console.log(
      "Input: ",
      input,
      "RE String: ",
      found.toString,
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
}
function testRegex(input: string, expected: any, debug = false, enforce = true, config?: any): Regex {
  const found = parse(input, config);
  expectRegex(input, found, expected, debug, enforce);
  return found;
}

describe("Regex Tests", () => {
  test("Test Chars", () => {
    testRegex("abcde", ["Cat", ["a", "b", "c", "d", "e"]]);
    expect(Char.Range(10, 20).compareTo(Char.Range(10, 40))).toBeLessThan(0);
    expect(Char.Range(20, 20).compareTo(Char.Range(10, 40))).toBeGreaterThan(0);
    testRegex("\\x32\\u2028", ["Cat", ["2", "\u2028"]]);
  });

  test("Test Escape Chars", () => {
    testRegex("\\n\\r\\t\\f\\b\\\\\\\"\\'\\x32\\y", [
      "Cat",
      ["\\n", "\\r", "\\t", "\\f", "\\b", "\\", '"', "'", "2", "y"],
    ]);
  });

  test("Test Cat", () => {
    testRegex("a(?:b(?:c(?:d(?:e))))", ["Cat", ["a", "b", "c", "d", "e"]]);
  });

  test("Test Union", () => {
    testRegex("a|b|c|d|e", ["Union", ["a", "b", "c", "d", "e"]]);
  });

  test("Test Named Named Back Refs", () => {
    testRegex("a|b|\\k<Hello>|e", ["Union", ["a", "b", "\\k<Hello>", "e"]]);
    expect(() => testRegex("<  >", [])).toThrowError();
  });

  test("Test Grouping", () => {
    testRegex("a|b|(?:c|d)|e", ["Union", ["a", "b", "c", "d", "e"]]);
  });

  test("Test Quants", () => {
    testRegex("a*", ["Quant", ["a", "*"]]);
    testRegex("a+", ["Quant", ["a", "+"]]);
    testRegex("a?", ["Quant", ["a", "?"]]);
    testRegex("abc*?", ["Cat", ["a", "b", ["QuantLazy", ["c", "*"]]]]);
    testRegex("a(bc){10, 20}", ["Cat", ["a", ["Quant", [["Cat", ["b", "c"]], "{10,20}"]]]]);
    testRegex("a(bc){10}", ["Cat", ["a", ["Quant", [["Cat", ["b", "c"]], "{10,10}"]]]]);
    testRegex("a(bc){,10}", ["Cat", ["a", ["Quant", [["Cat", ["b", "c"]], "{0,10}"]]]]);
    testRegex("((ab)*)*", ["Quant", [["Quant", [["Cat", ["a", "b"]], "*"]], "*"]]);
    expect(() => testRegex("a{1,2,3}", [])).toThrowError();
    testRegex("a[a-z]{2,4}?", ["Cat", ["a", ["QuantLazy", ["[a-z]", "{2,4}"]]]]);
  });

  test("Test Char Ranges", () => {
    testRegex("[a-c]", "[a-c]");
    const ch = Char.Group(false, Char.Range(90, 200), Char.Range(10, 20), Char.Range(50, 150));
    expect(ch.args.length).toBe(9);
    expect(ch.args[0]).toBe(CharType.CharRange);
    expect(ch.args[1]).toBe(90);
    expect(ch.args[2]).toBe(200);
    expect(ch.args[3]).toBe(CharType.CharRange);
    expect(ch.args[4]).toBe(10);
    expect(ch.args[5]).toBe(20);
    expect(ch.args[6]).toBe(CharType.CharRange);
    expect(ch.args[7]).toBe(50);
    expect(ch.args[8]).toBe(150);
  });

  test("Test Special Char Ranges", () => {
    testRegex(".", ".");
    testRegex("^.$", ["Cat", ["^", ".", "$"]]);
  });

  test("Test LookAheads", () => {
    testRegex("hello (?=world)", [
      "LookAhead",
      {
        expr: ["Cat", ["h", "e", "l", "l", "o", " "]],
        cond: ["Cat", ["w", "o", "r", "l", "d"]],
      },
    ]);
    testRegex("hello (?!world)", [
      "LookAhead!",
      {
        expr: ["Cat", ["h", "e", "l", "l", "o", " "]],
        cond: ["Cat", ["w", "o", "r", "l", "d"]],
      },
    ]);
  });

  test("Test LookBacks", () => {
    testRegex("(?<=hello)world", [
      "LookBack",
      {
        expr: ["Cat", ["w", "o", "r", "l", "d"]],
        cond: ["Cat", ["h", "e", "l", "l", "o"]],
      },
    ]);
    testRegex("(?<!hello)world", [
      "LookBack!",
      {
        expr: ["Cat", ["w", "o", "r", "l", "d"]],
        cond: ["Cat", ["h", "e", "l", "l", "o"]],
      },
    ]);
    testRegex("((?<=hello)world) tour", [
      "Cat",
      [
        [
          "LookBack",
          {
            expr: ["Cat", ["w", "o", "r", "l", "d"]],
            cond: ["Cat", ["h", "e", "l", "l", "o"]],
          },
        ],
        " ",
        "t",
        "o",
        "u",
        "r",
      ],
    ]);
    testRegex("((?<!hello)world) tour", [
      "Cat",
      [
        [
          "LookBack!",
          {
            expr: ["Cat", ["w", "o", "r", "l", "d"]],
            cond: ["Cat", ["h", "e", "l", "l", "o"]],
          },
        ],
        " ",
        "t",
        "o",
        "u",
        "r",
      ],
    ]);
  });
  test("Test Vars", () => {
    const input = "a|b|{abcd}|e";
    const expected = ["Union", ["a", "b", "<abcd>", "e"]];
    const found = new RegexParser(input, false, true).parse();
    expectRegex(input, found, expected);
  });
});
