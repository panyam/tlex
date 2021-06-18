const util = require("util");
import * as TSU from "@panyam/tsutils";
import { Regex, LeafChar, CharGroup, CharType } from "../core";
import * as Builder from "../builder";
import { expectRegex } from "./utils";

function testRegex(input: string, expected: any, debug = false, enforce = true, config?: any): Regex {
  const found = Builder.build(input, config).expr;
  expectRegex(input, found, expected, debug, enforce);
  return found;
}

describe("Regex Tests", () => {
  test("Test Chars", () => {
    testRegex("abcde", ["Cat", {}, ["a", "b", "c", "d", "e"]]);
    expect(
      CharGroup.Range(LeafChar.Single(10), LeafChar.Single(20)).compareTo(
        CharGroup.Range(LeafChar.Single(10), LeafChar.Single(40)),
      ),
    ).toBeLessThan(0);
    expect(
      CharGroup.Range(LeafChar.Single(20), LeafChar.Single(20)).compareTo(
        CharGroup.Range(LeafChar.Single(10), LeafChar.Single(40)),
      ),
    ).toBeGreaterThan(0);
    testRegex("\\x32\\u2028", ["Cat", {}, ["2", "\u2028"]]);
  });

  test("Test Escape Chars", () => {
    testRegex("\\n\\r\\t\\f\\b\\\\\\\"\\'\\x32\\y", [
      "Cat",
      {},
      ["\\n", "\\r", "\\t", "\\f", "\\b", "\\", '"', "'", "2", "y"],
    ]);
  });

  test("Test Cat", () => {
    testRegex("a(?:b(?:c(?:d(?:e))))", ["Cat", {}, ["a", "b", "c", "d", "e"]]);
  });

  test("Test Union", () => {
    testRegex("a|b|c|d|e", ["Union", {}, ["a", "b", "c", "d", "e"]]);
  });

  test("Test Named Named Back Refs", () => {
    testRegex("a|b|\\k<Hello>|e", ["Union", {}, ["a", "b", { BackRef: "Hello" }, "e"]]);
    expect(() => testRegex("<  >", [])).toThrowError();
  });

  test("Test Grouping", () => {
    testRegex("a|b|(?:c|d)|e", ["Union", {}, ["a", "b", "c", "d", "e"]]);
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

  test("Test CharGroup.Ranges", () => {
    testRegex("[a-c]", "[a-c]");
    const ch = CharGroup.Union(false, [
      CharGroup.Range(LeafChar.Single(90), LeafChar.Single(200)),
      CharGroup.Range(LeafChar.Single(10), LeafChar.Single(20)),
      CharGroup.Range(LeafChar.Single(50), LeafChar.Single(150)),
    ]);
    expect(ch.chars.length).toBe(3);
    expect(ch.chars[0].op).toBe(CharType.CharRange);
    const chgs = ch.chars as CharGroup[];
    expect((chgs[0].chars[0] as LeafChar).args[0]).toBe(90);
    expect((chgs[0].chars[1] as LeafChar).args[0]).toBe(200);
    expect((chgs[1].chars[0] as LeafChar).args[0]).toBe(10);
    expect((chgs[1].chars[1] as LeafChar).args[0]).toBe(20);
    expect((chgs[2].chars[0] as LeafChar).args[0]).toBe(50);
    expect((chgs[2].chars[1] as LeafChar).args[0]).toBe(150);
  });

  test("Test Special CharGroup.Ranges", () => {
    testRegex(".", ".");
    testRegex("^.$", ["Cat", {}, ["^", ".", "$"]]);
  });

  test("Test LookAheads", () => {
    testRegex("hello (?=world)", [
      "LookAhead",
      {
        negate: false,
        expr: ["Cat", {}, ["h", "e", "l", "l", "o", " "]],
        cond: ["Cat", {}, ["w", "o", "r", "l", "d"]],
      },
    ]);
    testRegex("hello (?!world)", [
      "LookAhead",
      {
        negate: true,
        expr: ["Cat", {}, ["h", "e", "l", "l", "o", " "]],
        cond: ["Cat", {}, ["w", "o", "r", "l", "d"]],
      },
    ]);
  });

  test("Test LookBacks", () => {
    testRegex("(?<=hello)world", [
      "LookBack",
      {
        negate: false,
        expr: ["Cat", { groupIndex: 0 }, ["w", "o", "r", "l", "d"]],
        cond: ["Cat", {}, ["h", "e", "l", "l", "o"]],
      },
    ]);
    testRegex("(?<!hello)world", [
      "LookBack",
      {
        negate: true,
        expr: ["Cat", { groupIndex: 0 }, ["w", "o", "r", "l", "d"]],
        cond: ["Cat", {}, ["h", "e", "l", "l", "o"]],
      },
    ]);
    testRegex("((?<=hello)world) tour", [
      "Cat",
      {},
      [
        [
          "LookBack",
          {
            expr: ["Cat", { groupIndex: 1 }, ["w", "o", "r", "l", "d"]],
            cond: ["Cat", {}, ["h", "e", "l", "l", "o"]],
            negate: false,
            groupIndex: 0,
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
      {},
      [
        [
          "LookBack",
          {
            groupIndex: 0,
            negate: true,
            expr: ["Cat", { groupIndex: 1 }, ["w", "o", "r", "l", "d"]],
            cond: ["Cat", {}, ["h", "e", "l", "l", "o"]],
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
    const expected = ["Union", {}, ["a", "b", ["V:abcd", {}], "e"]];
    const found = Builder.build(input).expr;
    expectRegex(input, found, expected);
  });

  test("Char Class with Hyphen", () => {
    testRegex("[+-]", "[+-]");
  });
});
