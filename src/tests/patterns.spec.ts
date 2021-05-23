import * as fs from "fs";
import * as TSU from "@panyam/tsutils";
import { Rule } from "../core";
import { Token } from "../tokenizer";
import { execute } from "./utils";

function expectMatchStrings(found: Token[], ...expected: [string, number][]): Token[] {
  const f2 = found.map((f) => [f.value, f.matchIndex]);
  expect(f2).toEqual(expected);
  return found;
}

describe("VM Tests", () => {
  test("Test STRING", () => {
    const re = '"(.*?(?<!\\\\))"';
    expectMatchStrings(execute({}, '"\\n"', re), ['"\\n"', 0]);
    expectMatchStrings(execute({}, '"\\""', re), ['"\\""', 0]);
    //  /"(.*(?<!abc))"/.exec('"asfzcxvadf"');
    expectMatchStrings(execute({}, '"abcdef"', '".*(?<!a)"'), ['"abcdef"', 0]);
    expectMatchStrings(execute({}, '"abcdefab"', '".*(?<!a)"'), ['"abcdefab"', 0]);
    // Above 2 but with marked groups
    expectMatchStrings(execute({}, '"abcdef"', '"(.*(?<!a))"'), ['"abcdef"', 0]);
    expectMatchStrings(execute({}, '"abcdefa"', '"(.*(?<!a))"'));
    expectMatchStrings(execute({}, '"abcdefab"', '"(.*(?<!a))"'), ['"abcdefab"', 0]);
  });
});
