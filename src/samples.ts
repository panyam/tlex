import { Regex } from "./core";
import { flexRE } from "./builder";

export const SINGLE_QUOTE_STRING = (): Regex => flexRE`["]([^"\\\n]|\\.|\\\n)*["]`;
export const DOUBLE_QUOTE_STRING = (): Regex => flexRE`[']([^'\\\n]|\\.|\\\n)*[']`;

export const SIMPLE_JS_STRING = (): string => '"(.*?(?<!\\\\))"';

export function JS_REGEXP(mode: "with_lb" | "without_lb" = "without_lb"): string {
  if (mode == "without_lb") {
    return String.raw`/([^'\\/]|\\.|\\/)*/([imus]*)`;
  } else {
    // without negative lb
    return String.raw`/(.+?(?<!\\))/([imus]*)`;
  }
}
