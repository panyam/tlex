const util = require("util");
import * as TSU from "@panyam/tsutils";
import { Rule, Regex } from "../core";
import { parse } from "./utils";
import { Prog } from "../vm";
import { OpCode, InstrDebugValue, Compiler } from "../pikevm";

function reprString(prog: Prog): any {
  let out = "";
  if (prog) {
    prog.instrs.forEach((instr) => (out += `p.add(OpCode.${OpCode[instr.opcode]}, ${instr.args.join(", ")});`));
  }
  return `Prog.with((p) => { ${out} })`;
}

function testRegexCompile(prog: Prog, expected: Prog | null, debug = false, enforce = true): Prog {
  if (debug || expected == null) {
    console.log(
      "Found Value: \n",
      util.inspect(reprString(prog), {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
      "\nExpected Value: \n",
      util.inspect(reprString(expected!), {
        showHidden: false,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null,
      }),
    );
    console.log(`Found Debug Value: \n${prog.debugValue(InstrDebugValue).join("\n")}`);
  }
  if (enforce) {
    // test 2 programs are equal
    expect(prog.length).toEqual(expected?.length);
    prog.instrs.forEach((instr, index) => {
      expect(instr.opcode).toEqual(expected?.instrs[index].opcode);
      expect(instr.args).toEqual(expected?.instrs[index].args);
    });
  }
  return prog;
}

function compile(exprResolver: null | ((name: string) => Regex), ...rules: Rule[]): Prog {
  const out = new Compiler(exprResolver);
  rules.forEach((rule) => (rule.expr = parse(rule.pattern)));
  return out.compile(rules);
}

describe("Regex Compile Tests", () => {
  test("Test Chars", () => {
    testRegexCompile(
      compile(null, new Rule("abcde", 0)),
      Prog.with((p) => {
        p.add(6, 97, 97);
        p.add(6, 98, 98);
        p.add(6, 99, 99);
        p.add(6, 100, 100);
        p.add(6, 101, 101);
        p.add(0, 10, 0);
      }),
    );
  });

  test("Test Escape Chars", () => {
    testRegexCompile(
      compile(null, new Rule("\\n\\r\\t\\f\\b\\\\\\\"\\'\\x32\\y", 0)),
      Prog.with((p) => {
        p.add(6, 10, 10);
        p.add(6, 13, 13);
        p.add(6, 9, 9);
        p.add(6, 12, 12);
        p.add(6, 8, 8);
        p.add(6, 92, 92);
        p.add(6, 34, 34);
        p.add(6, 39, 39);
        p.add(6, 50, 50);
        p.add(6, 121, 121);
        p.add(0, 10, 0);
      }),
    );
  });

  test("Test Union", () => {
    testRegexCompile(
      compile(null, new Rule("a|b|c|d|e", 0)),
      Prog.with((p) => {
        p.add(10, 1, 3, 5, 7, 9);
        p.add(6, 97, 97);
        p.add(11, 10);
        p.add(6, 98, 98);
        p.add(11, 10);
        p.add(6, 99, 99);
        p.add(11, 10);
        p.add(6, 100, 100);
        p.add(11, 10);
        p.add(6, 101, 101);
        p.add(0, 10, 0);
      }),
    );
  });

  test("Test Quants - a*", () => {
    testRegexCompile(
      compile(null, new Rule("a*", 0)),
      Prog.with((p) => {
        p.add(10, 1, 3);
        p.add(6, 97, 97);
        p.add(11, 0);
        p.add(0, 10, 0);
      }),
    );
  });

  test("Test Quants - a+", () => {
    testRegexCompile(
      compile(null, new Rule("a+", 0)),
      Prog.with((p) => {
        p.add(6, 97, 97);
        p.add(10, 0, 2);
        p.add(0, 10, 0);
      }),
    );
  });

  test("Test Quants - a?", () => {
    testRegexCompile(
      compile(null, new Rule("a?", 0)),
      Prog.with((p) => {
        p.add(OpCode.Split, 1, 2);
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Quants - (ab){3,5}", () => {
    testRegexCompile(
      compile(null, new Rule("(?:ab){3,5}", 0)),
      Prog.with((p) => {
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Split, 7, 9);
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Split, 10, 12);
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Char Ranges", () => {
    testRegexCompile(
      compile(null, new Rule("[a-c]", 0)),
      Prog.with((p) => {
        p.add(OpCode.CharRange, 97, 99);
        p.add(OpCode.Match, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, new Rule("[a-cb-j]", 0)),
      Prog.with((p) => {
        p.add(OpCode.CharRange, 97, 106);
        p.add(OpCode.Match, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, new Rule("[a-cm-q]", 0)),
      Prog.with((p) => {
        p.add(OpCode.CharRange, 97, 99, 109, 113);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Special Char Ranges", () => {
    testRegexCompile(
      compile(null, new Rule(".", 0)),
      Prog.with((p) => {
        p.add(OpCode.Any);
        p.add(OpCode.Match, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, new Rule("^.$", 0)),
      Prog.with((p) => {
        p.add(OpCode.StartOfInput);
        p.add(OpCode.Any);
        p.add(OpCode.EndOfInput);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Named Groups", () => {
    const prog = compile((name) => parse("abcde"), new Rule("<Hello  >", 10));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Char, 99, 99);
        p.add(OpCode.Char, 100, 100);
        p.add(OpCode.Char, 101, 101);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Lookahead", () => {
    testRegexCompile(
      compile(null, new Rule("abc(?=hello)", 0)),
      Prog.with((p) => {
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Char, 99, 99);
        p.add(OpCode.Begin, 1, 0, 0, 9);
        p.add(OpCode.Char, 104, 104);
        p.add(OpCode.Char, 101, 101);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Char, 111, 111);
        p.add(OpCode.End, 3);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Negative Lookahead", () => {
    const prog = compile(null, new Rule("abc(?!hello)", 0));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Char, 99, 99);
        p.add(OpCode.Begin, 1, 0, 1, 9);
        p.add(OpCode.Char, 104, 104);
        p.add(OpCode.Char, 101, 101);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Char, 111, 111);
        p.add(OpCode.End, 3);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Negative Lookahead", () => {
    const prog = compile(null, new Rule("abc(?!hello)", 0));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Char, 99, 99);
        p.add(OpCode.Begin, 1, 0, 1, 9);
        p.add(OpCode.Char, 104, 104);
        p.add(OpCode.Char, 101, 101);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Char, 111, 111);
        p.add(OpCode.End, 3);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Negative Lookback", () => {
    const prog = compile(null, new Rule("(?<!h*ell+o)abc", 0));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Begin, 0, 0, 1, 9);
        p.add(OpCode.Char, 111, 111);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Split, 2, 4);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Char, 101, 101);
        p.add(OpCode.Split, 7, 9);
        p.add(OpCode.Char, 104, 104);
        p.add(OpCode.Jump, 6);
        p.add(OpCode.End, 0);
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Char, 99, 99);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test LookBack", () => {
    const prog = compile(null, new Rule("(?<=h*ell+o)abc", 0));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Begin, 0, 0, 0, 9);
        p.add(OpCode.Char, 111, 111);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Split, 2, 4);
        p.add(OpCode.Char, 108, 108);
        p.add(OpCode.Char, 101, 101);
        p.add(OpCode.Split, 7, 9);
        p.add(OpCode.Char, 104, 104);
        p.add(OpCode.Jump, 6);
        p.add(OpCode.End, 0);
        p.add(OpCode.Char, 97, 97);
        p.add(OpCode.Char, 98, 98);
        p.add(OpCode.Char, 99, 99);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });
});
