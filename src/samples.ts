import { flexRE } from "./builder";

export const SINGLE_QUOTE_STRING = flexRE`["]([^"\\\n]|\\.|\\\n)*["]`;
export const DOUBLE_QUOTE_STRING = flexRE`[']([^'\\\n]|\\.|\\\n)*[']`;
export const SIMPLE_JS_STRING = '"(.*?(?<!\\\\))"';
export const JS_REGEX = String.raw`/([^\\/]|\\.)*/([imus]*)`;
export const JS_REGEX_WITH_LB = String.raw`/(.+?(?<!\\))/([imus]*)`;
