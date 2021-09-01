import { Regex } from "./core";
import { flexRE } from "./builder";

export const SINGLE_QUOTE_STRING = (): Regex => flexRE`["]([^"\\\n]|\\.|\\\n)*["]`;
export const DOUBLE_QUOTE_STRING = (): Regex => flexRE`[']([^'\\\n]|\\.|\\\n)*[']`;

export const SIMPLE_JS_STRING = (): string => '"(.*?(?<!\\\\))"';

// Disabled as Safari will fail this one
export const JS_REGEXP = (): RegExp => /\/(.+?(?<!\\))\/([imus]*)/;
export const JS_REGEX_WITH_NEG_LB = (): string => String.raw`/(.+?(?<!\\))/([imus]*)`;
export const JS_REGEX_WITHOUT_NEG_LB = (): string => String.raw`/([^'\\/]|\\.|\\/)*/([imus]*)`;
