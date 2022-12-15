import { LEXER as C11 } from "./c11";

export const builtinLexers = [
  {
    name: "C11",
    label: "C11",
    rules: C11,
    sampleInput: `
      int main(int argc, char *argv[]) {
        printf("Hello world\n");
        return 0;
      }
    `,
  },
  {
    name: "JSON",
    label: "JSON",
    selected: true,
    grammar: `
      %token NUMBER /-?\\d+(\\.\\d+)?([eE][+-]?\\d+)?/
      %token STRING /".*?(?<!\\\\)"/
      %skip /[ \\t\\n\\f\\r]+/
    `,
    sampleInput:
      '{\n  "name": "Milky Way",\n  "age": 4600000000,\n  "star": "sun",\n  "planets": [ "Mercury", "Venus", "Earth" ],\n  "hot": true,\n  "x": null\n}\n',
  },
];
