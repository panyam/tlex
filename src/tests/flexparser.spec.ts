const util = require("util");
import * as TSU from "@panyam/tsutils";
import { Regex, Char, CharType } from "../core";
import * as Builder from "../builder";
import { expectRegex } from "./utils";

function testRegex(input: string, expected: any, debug = false, enforce = true, config?: any): Regex {
  const found = Builder.fromFlexRE(input, config).expr;
  expectRegex(input, found, expected, debug, enforce);
  return found;
}

describe("Regex Tests", () => {
  test("Test Chars", () => {
    testRegex("abcde", ["Cat", {}, ["a", "b", "c", "d", "e"]]);
    expect(Char.Range(10, 20).compareTo(Char.Range(10, 40))).toBeLessThan(0);
    expect(Char.Range(20, 20).compareTo(Char.Range(10, 40))).toBeGreaterThan(0);
    testRegex("\\x32\\u2028", ["Cat", {}, ["2", "\u2028"]]);
  });

  test("Test Escape Chars", () => {
    testRegex("\\n\\r\\t\\f\\b\\\\\\\"\\'\\x32\\y", [
      "Cat",
      {},
      ["\\n", "\\r", "\\t", "\\f", "\\b", "\\", '"', "'", "2", "y"],
    ]);
  });

  test("Test Union", () => {
    testRegex("a|b|c|d|e", ["Union", {}, ["a", "b", "c", "d", "e"]]);
  });

  test("Test Cat", () => {
    testRegex("a(?:b(?:c(?:d(?:e))))", [
      "Cat",
      {},
      [
        "a",
        [
          "Cat",
          { groupIndex: 0 },
          ["b", ["Cat", { groupIndex: 1 }, ["c", ["Cat", { groupIndex: 2 }, ["d", "e<g:3>"]]]]],
        ],
      ],
    ]);
  });

  test("Test Grouping", () => {
    testRegex("a|b|(?:c|d)|e", ["Union", {}, ["a", "b", ["Union", { groupIndex: 0 }, ["c", "d"]], "e"]]);
  });

  test("Test Grouping2", () => {
    testRegex("(?:foo)", ["Cat", { groupIndex: 0 }, ["f", "o", "o"]]);
  });

  test("Test Quants", () => {
    testRegex("a*", ["*?", {}, "a"]);
    testRegex("a+", ["+?", {}, "a"]);
    testRegex("a?", ["??", {}, "a"]);
    testRegex("abc*?", ["Cat", {}, ["a", "b", ["*", {}, "c"]]]);
    testRegex("a(bc){10, 20}", ["Cat", {}, ["a", ["{10,20}?", {}, ["Cat", { groupIndex: 0 }, ["b", "c"]]]]]);
    testRegex("a(bc){10}", ["Cat", {}, ["a", ["{10}?", {}, ["Cat", { groupIndex: 0 }, ["b", "c"]]]]]);
    testRegex("a(bc){,10}", ["Cat", {}, ["a", ["{0,10}?", {}, ["Cat", { groupIndex: 0 }, ["b", "c"]]]]]);
    testRegex("((ab)*)*", ["*?", {}, ["*?", { groupIndex: 0 }, ["Cat", { groupIndex: 1 }, ["a", "b"]]]]);
    expect(() => testRegex("a{1,2,3}", [])).toThrowError();
    testRegex("a[a-z]{2,4}?", ["Cat", {}, ["a", ["{2,4}", {}, "[a-z]"]]]);
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
    testRegex("^.$", ["Cat", {}, ["^", ".", "$"]]);
  });

  /*
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
 */
});
