import * as TSU from "@panyam/tsutils";
import { Regex } from "./core";
import { flexRE } from "./builder";

export const SINGLE_QUOTE_STRING = (): Regex => flexRE`["]([^"\\\n]|\\.|\\\n)*["]`;
export const DOUBLE_QUOTE_STRING = (): Regex => flexRE`[']([^'\\\n]|\\.|\\\n)*[']`;

export const SIMPLE_JS_STRING = (): string => '"(.*?(?<!\\\\))"';

// Disabled as Safari will fail this one
export function JS_REGEXP(mode: "native" | "with_lb" | "without_lb" = "without_lb") {
  if (mode == "native") {
    if (!TSU.Browser.IS_SAFARI()) {
      return /\/(.+?(?<!\\))\/([imus]*)/;
    } else {
      return String.raw`/([^'\\/]|\\.|\\/)*/([imus]*)`;
    }
  } else if (mode == "without_lb") {
    return String.raw`/([^'\\/]|\\.|\\/)*/([imus]*)`;
  } else {
    // without negative lb
    return String.raw`/(.+?(?<!\\))/([imus]*)`;
  }
}
