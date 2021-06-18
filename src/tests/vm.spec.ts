import * as fs from "fs";
import * as TSU from "@panyam/tsutils";
import { Rule } from "../core";
import * as Builder from "../builder";
import { Token } from "../tokenizer";
import { execute } from "./utils";

function expectMatchStrings(found: Token[], ...expected: [string, number][]): Token[] {
  const f2 = found.map((f) => [f.value, f.matchIndex]);
  expect(f2).toEqual(expected);
  return found;
}

describe("VM Tests", () => {
  test("Test Chars", () => {
    expectMatchStrings(execute({}, "abcdeabcde", "abcde"), ["abcde", 0], ["abcde", 0]);
  });

  test("Test Chars Ranges", () => {
    const re = "[a-e]";
    expectMatchStrings(
      execute({}, "abcdeabcde", re),
      ["a", 0],
      ["b", 0],
      ["c", 0],
      ["d", 0],
      ["e", 0],
      ["a", 0],
      ["b", 0],
      ["c", 0],
      ["d", 0],
      ["e", 0],
    );
  });

  test("Test a|aa|aaa with priority", () => {
    const re = [Builder.build("a", { priority: 100 }), "aa", "aaa"];
    expectMatchStrings(execute({}, "aaaa", ...re), ["a", 0], ["a", 0], ["a", 0], ["a", 0]);
  });

  test("Test a|aa|aaa without priority", () => {
    const re = ["a", "aa", "aaa"];
    expectMatchStrings(execute({}, "aaaa", ...re), ["a", 0], ["a", 0], ["a", 0], ["a", 0]);
  });

  test("Test a*", () => {
    const re = "a*";
    expectMatchStrings(execute({}, "aaaaa", re), ["aaaaa", 0]);
  });

  test("Test (a|b)*", () => {
    const re = "(a|b)*";
    expectMatchStrings(execute({}, "abbbaaaba", re), ["abbbaaaba", 0]);
  });

  test("Test (a|b){0, 2}", () => {
    const re = "(a|b){0,2}";
    expectMatchStrings(execute({}, "abbbaaaba", re), ["ab", 0], ["bb", 0], ["aa", 0], ["ab", 0], ["a", 0]);
  });

  test("Test (a|b){0, 2}?", () => {
    const re = "(a|b){0,2}?";
    expectMatchStrings(
      execute({}, "abbbaaaba", re),
      ["a", 0],
      ["b", 0],
      ["b", 0],
      ["b", 0],
      ["a", 0],
      ["a", 0],
      ["a", 0],
      ["b", 0],
      ["a", 0],
    );
  });

  test("Test a|aa|aaa without priority", () => {
    const re = "a|aa|aaa";
    expectMatchStrings(execute({}, "aaaaa", re), ["a", 0], ["a", 0], ["a", 0], ["a", 0], ["a", 0]);
  });

  test("Test a,b,c,d,e", () => {
    const re = ["a", "b", "c", "d", "e"];
    expectMatchStrings(
      execute({}, "edcbaabcde", ...re),
      ["e", 4],
      ["d", 3],
      ["c", 2],
      ["b", 1],
      ["a", 0],
      ["a", 0],
      ["b", 1],
      ["c", 2],
      ["d", 3],
      ["e", 4],
    );
  });

  test("Test a*? | aa without priority", () => {
    const re = ["a*?", "aa"];
    expectMatchStrings(execute({}, "aaaaa", ...re), ["a", 0], ["a", 0], ["a", 0], ["a", 0], ["a", 0]);
  });

  test("Test a*? | aa with priority", () => {
    const re = [Builder.build("aa", { tag: 1, priority: 20 }), "a*?"];
    expectMatchStrings(execute({}, "aaaaa", ...re), ["aa", 0], ["aa", 0], ["a", 1]);
  });

  test("Test (a|b){0, 10}(a|b){5,10}", () => {
    const re = "(a){0, 10}(a|b){5,10}";
    expectMatchStrings(execute({}, "abbbaaaba", re), ["abbbaaaba", 0]);
  });

  test("Test One Comment", () => {
    const re = [`/\\*.*?\\*/`, `[ \t\n\r]+`];
    const input = `/**2\n*/ `;
    expectMatchStrings(execute({}, input, ...re), ["/**2\n*/", 0], [" ", 1]);
  });
  test("Test Comments", () => {
    const re = [`/\\*.*?\\*/`, `[ \t\n\r]+`];
    const input = `/* c1 */ /** C2\n */  `;
    // const re = (`/\*.*\*/`, `\"(?<!\\\\)\"`, "//.*$");
    expectMatchStrings(execute({}, input, ...re), ["/* c1 */", 0], [" ", 1], ["/** C2\n */", 0], ["  ", 1]);
  });

  test("Test Lines", () => {
    const re = [
      Builder.build("^ *a+", { tag: 0, priority: 20 }),
      Builder.build("b*$", { tag: 1, priority: 15 }),
      Builder.build(`[\n\r]+`, { tag: 3, priority: 10 }),
      Builder.build(`[ \t]+`, { tag: 2, priority: 10 }),
      Builder.build(".", { tag: 4, priority: 0 }),
    ];
    expectMatchStrings(
      execute(
        {},
        `
      aaaaabcdefgh
      bbbbb
      ccc\n   \n\n\n`,
        ...re,
      ),
      ["\n", 2],
      ["      aaaaa", 0],
      ["b", 4],
      ["c", 4],
      ["d", 4],
      ["e", 4],
      ["f", 4],
      ["g", 4],
      ["h", 4],
      ["\n", 2],
      ["      ", 3],
      ["bbbbb", 1],
      ["\n", 2],
      ["      ", 3],
      ["c", 4],
      ["c", 4],
      ["c", 4],
      ["\n", 2],
      ["   ", 3],
      ["\n\n\n", 2],
    );
  });
});

describe.skip("VM Tests", () => {
  test("Test JS Comments+Regexes", () => {
    const re = [
      Builder.build(/\s+/m, { tag: "SPACES" }),
      Builder.build(/\/\*.*?\*\//m, { tag: "MLComment" }),
      Builder.build(/\/\/.*$/, { tag: "SLComment" }),
      Builder.build(/\/(([^\/])+?(?<!\\))\//, { tag: "REGEX" }),
    ];
    expectMatchStrings(
      execute(
        { debug: "all" },
        `//m
        /*
        *m
        */
        /SomeRegex/`,
        ...re,
      ),
      ["   ", 0],
    );
  });
  /*
  test("Test invalid char", () => {
    const re = "[a-e]";
    expectMatchStrings(execute({}, "abcdef", re), ["a", 0], ["b", 0], ["c", 0], ["d", 0], ["e", 0], ["f", 0]);
  });
  */
});
