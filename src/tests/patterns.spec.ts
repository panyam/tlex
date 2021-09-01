/**
 * @jest-environment jsdom
 */
import { Token } from "../tokenizer";
import { execute } from "./utils";
import * as samples from "../samples";

function expectMatchStrings(found: Token[], ...expected: [string, number][]): Token[] {
  const f2 = found.map((f) => [f.value, f.matchIndex]);
  expect(f2).toEqual(expected);
  return found;
}

const JS_STRING = samples.SIMPLE_JS_STRING;
const JS_REGEXP = /\/(.+?(?<!\\))\/([imus]*)/;
const JS_REGEX_WITH_NEG_LB = samples.JS_REGEX;
const JS_REGEX_WITHOUT_NEG_LB = samples.JS_REGEX_WITHOUT_LB;

describe("VM Tests", () => {
  test("Test STRING", () => {
    const re = JS_STRING;
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

  test("Test V4 Syntax Single Line Raw Literal", () => {
    const re = /^[ \t]*>(.*)$/m;
    expectMatchStrings(execute({}, "> hello world", re), ["> hello world", 0]);
    expectMatchStrings(execute({}, " > hello world", re), [" > hello world", 0]);
    expectMatchStrings(execute({}, " > hello\nworld", re), [" > hello", 0]);
  });

  // Testing regexes for javascript regexes!
  // With and without negative lookbacks as Safari does not support negative look-behind
  test("Test JS Regexes", () => {
    let pattern = "/hello/";
    let expected: [string, number][] = [["/hello/", 0]];
    expectMatchStrings(execute({}, pattern, JS_REGEXP), ...expected);
    expectMatchStrings(execute({}, pattern, JS_REGEX_WITH_NEG_LB), ...expected);
    expectMatchStrings(execute({}, pattern, JS_REGEX_WITHOUT_NEG_LB), ...expected);

    pattern = "/hello/imu";
    expected = [["/hello/imu", 0]];
    expectMatchStrings(execute({}, pattern, JS_REGEXP), ...expected);
    expectMatchStrings(execute({}, pattern, JS_REGEX_WITH_NEG_LB), ...expected);
    expectMatchStrings(execute({}, pattern, JS_REGEX_WITHOUT_NEG_LB), ...expected);

    pattern = "/a*.\\x\\//imu/abc/";
    expected = [
      ["/a*.\\x\\//imu", 0],
      ["/abc/", 0],
    ];
    expectMatchStrings(execute({}, pattern, JS_REGEXP), ...expected);
    expectMatchStrings(execute({}, pattern, JS_REGEX_WITH_NEG_LB), ...expected);
    expectMatchStrings(execute({}, pattern, JS_REGEX_WITHOUT_NEG_LB), ...expected);
  });
});
