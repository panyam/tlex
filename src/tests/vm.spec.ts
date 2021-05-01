import * as fs from "fs";
import * as TSU from "@panyam/tsutils";
import { Rule } from "../core";
import { Match } from "../lexer";
import { execute } from "./utils";

/*
function testInput(
  prog: Prog,
  input: string,
  expectedTokens: [string, number][],
  debug = false,
  reportFile: TSU.Nullable<string> = null,
): void {
  const tape = new Tape(input);
  const vm = new VM(prog);
  const tracer = new VMTracer();
  if (debug) {
    console.log(
      "Prog: \n",
      `${prog.debugValue(InstrDebugValue).join("\n")}`,
      "\n",
      "\n",
      "Input: ",
      input,
      "\n",
      "Expected Tokens: ",
      expectedTokens,
    );
    vm.tracer = tracer;
  }
  const found = [] as [string, number][];
  let next = vm.match(tape);
  while (next != null && next.end > next.start) {
    found.push([tape.substring(next.start, next.end), next.matchIndex]);
    next = vm.match(tape);
  }
  if (debug) {
    console.log("VM Tracer: ");
    // console.log(tracer.trace.join("\n"));
    console.log("Found Tokens: ", found);
    const reportHtml = `<html>
        <head>
          <style>
            .threadInstrsCell  { padding-left: 10px; padding-right: 10px; vertical-align: top; }
            .inputCharCell { font-weight: bold; text-align: center; }
            .threadIdCell { font-weight: bold; text-align: left; vertical-align: top; }
          </style>
        </head>
        <body>${layoutThreadNodes(input, tracer.allThreadNodes)}</body>
       </html>`;
    if (reportFile != null) {
      if (reportFile.trim().length > 0) {
        fs.writeFileSync(reportFile, reportHtml);
      } else {
        console.log(reportHtml);
      }
    }
  }
  expect(found).toEqual(expectedTokens);
}
*/

function expectMatchStrings(found: Match[], ...expected: [string, number][]): Match[] {
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
    const re = [new Rule("a", 0, 100), "aa", "aaa"];
    expectMatchStrings(execute({}, "aaaa", ...re), ["a", 0], ["a", 0], ["a", 0], ["a", 0]);
  });

  test("Test a|aa|aaa without priority", () => {
    const re = ["a", "aa", "aaa"];
    expectMatchStrings(execute({}, "aaaa", ...re), ["a", 0], ["a", 0], ["a", 0], ["a", 0]);
  });

  test("Test a|aa|aaa without priority", () => {
    const re = "a|aa|aaa";
    expectMatchStrings(execute({}, "aaaaa", re), ["a", 0], ["a", 0], ["a", 0], ["a", 0], ["a", 0]);
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
    const re = [new Rule("aa", 1, 20), "a*?"];
    expectMatchStrings(execute({}, "aaaaa", ...re), ["aa", 0], ["aa", 0], ["a", 1]);
  });

  test("Test (a|b){0, 10}(a|b){5,10}", () => {
    const re = "(a){0, 10}(a|b){5,10}";
    expectMatchStrings(execute({}, "abbbaaaba", re), ["abbbaaaba", 0]);
  });

  test("Test Comments", () => {
    const re = [`/\\*.*?\\*/`, `[ \t\n\r]+`];
    // const re = (`/\*.*\*/`, `\"(?<!\\\\)\"`, "//.*$");
    expectMatchStrings(
      execute({}, `/* c1 */ /** C2\n */  `, ...re),
      ["/* c1 */", 0],
      [" ", 1],
      ["/** C2\n */", 0],
      ["  ", 1],
    );
  });

  test("Test Lines", () => {
    const re = [
      new Rule("^ *a+", 0, 20),
      new Rule("b*$", 1, 15),
      new Rule(`[\n\r]+`, 3, 10),
      new Rule(`[ \t]+`, 2, 10),
      new Rule(".", 4, 0),
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
