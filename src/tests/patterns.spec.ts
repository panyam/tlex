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
    const re = '".*?(?<!\\\\)"';
    expectMatchStrings(execute({}, '"\\n"', re), ['"\\n"', 0]);
  });
});
