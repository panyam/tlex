const util = require("util");
import * as TSU from "@panyam/tsutils";
import { CharType, Rule, Regex } from "../core";
import * as Builder from "../builder";
import { parse } from "./utils";
import { Prog, OpCode, InstrDebugValue } from "../vm";
import { Compiler } from "../compiler";

function reprString(prog: Prog): any {
  let out = "";
  if (prog) {
    prog.instrs.forEach((instr) => {
      const opcode = instr.opcode;
      if (opcode == OpCode.Char || opcode == OpCode.CIChar || opcode == OpCode.NegChar || opcode == OpCode.NegCIChar) {
        out += `p.add(OpCode.${OpCode[opcode]}, CharType.${CharType[instr.args[0]]}, ${instr.args
          .slice(1)
          .join(", ")});`;
      } else {
        out += `p.add(OpCode.${OpCode[opcode]}, ${instr.args.join(", ")});`;
      }
    });
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
  // rules.forEach((rule) => (rule.expr = parse(rule.pattern)));
  return out.compile(rules);
}

describe("Regex Compile Tests", () => {
  test("Test Chars", () => {
    testRegexCompile(
      compile(null, Builder.build("abcde")),
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Char, CharType.SingleChar, 99);
        p.add(OpCode.Char, CharType.SingleChar, 100);
        p.add(OpCode.Char, CharType.SingleChar, 101);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Escape Chars", () => {
    testRegexCompile(
      compile(null, Builder.build("\\n\\r\\t\\f\\b\\\\\\\"\\'\\x32\\y")),
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.SingleChar, 10);
        p.add(OpCode.Char, CharType.SingleChar, 13);
        p.add(OpCode.Char, CharType.SingleChar, 9);
        p.add(OpCode.Char, CharType.SingleChar, 12);
        p.add(OpCode.Char, CharType.SingleChar, 8);
        p.add(OpCode.Char, CharType.SingleChar, 92);
        p.add(OpCode.Char, CharType.SingleChar, 34);
        p.add(OpCode.Char, CharType.SingleChar, 39);
        p.add(OpCode.Char, CharType.SingleChar, 50);
        p.add(OpCode.Char, CharType.SingleChar, 121);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Union", () => {
    testRegexCompile(
      compile(null, Builder.build("a|b|c|d|e")),
      Prog.with((p) => {
        p.add(OpCode.Split, 1, 3, 5, 7, 9);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Jump, 10);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Jump, 10);
        p.add(OpCode.Char, CharType.SingleChar, 99);
        p.add(OpCode.Jump, 10);
        p.add(OpCode.Char, CharType.SingleChar, 100);
        p.add(OpCode.Jump, 10);
        p.add(OpCode.Char, CharType.SingleChar, 101);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Quants - a*", () => {
    testRegexCompile(
      compile(null, Builder.build("a*")),
      Prog.with((p) => {
        p.add(OpCode.Split, 1, 3);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Jump, 0);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Quants - a+", () => {
    testRegexCompile(
      compile(null, Builder.build("a+")),
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Split, 0, 2);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Quants - a?", () => {
    testRegexCompile(
      compile(null, Builder.build("a?")),
      Prog.with((p) => {
        p.add(OpCode.Split, 1, 2);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Quants - (ab){3,5}", () => {
    testRegexCompile(
      compile(null, Builder.build("(?:ab){3,5}")),
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Split, 7, 9);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Split, 10, 12);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Char Ranges", () => {
    testRegexCompile(
      compile(null, Builder.build("[a-c]")),
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.CharGroup, 3, 97, 99);
        p.add(OpCode.Match, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, Builder.build("[a-cb-j]")),
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.CharGroup, 3, 97, 99, 3, 98, 106);
        p.add(OpCode.Match, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, Builder.build("[a-cm-q]")),
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.CharGroup, 3, 97, 99, 3, 109, 113);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Special Char Ranges", () => {
    testRegexCompile(
      compile(null, Builder.build(".")),
      Prog.with((p) => {
        p.add(OpCode.Any);
        p.add(OpCode.Match, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, Builder.build("^.$")),
      Prog.with((p) => {
        p.add(OpCode.MLStartingChar);
        p.add(OpCode.Any);
        p.add(OpCode.MLEndingChar);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Named Groups", () => {
    const prog = compile((name) => parse("abcde"), Builder.build("\\k<Hello  >"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Lookahead", () => {
    testRegexCompile(
      compile(null, Builder.build("hello (?=world)")),
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.SingleChar, 104);
        p.add(OpCode.Char, CharType.SingleChar, 101);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 111);
        p.add(OpCode.Char, CharType.SingleChar, 32);
        p.add(OpCode.Begin, 0, 0, 12);
        p.add(OpCode.Char, CharType.SingleChar, 119);
        p.add(OpCode.Char, CharType.SingleChar, 111);
        p.add(OpCode.Char, CharType.SingleChar, 114);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 100);
        p.add(OpCode.End, 6);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Negative Lookahead", () => {
    const prog = compile(null, Builder.build("abc(?!hello)"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Char, CharType.SingleChar, 99);
        p.add(OpCode.Begin, 0, 1, 9);
        p.add(OpCode.Char, CharType.SingleChar, 104);
        p.add(OpCode.Char, CharType.SingleChar, 101);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 111);
        p.add(OpCode.End, 3);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Negative Lookahead", () => {
    const prog = compile(null, Builder.build("abc(?!hello)"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Char, CharType.SingleChar, 99);
        p.add(OpCode.Begin, 0, 1, 9);
        p.add(OpCode.Char, CharType.SingleChar, 104);
        p.add(OpCode.Char, CharType.SingleChar, 101);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 111);
        p.add(OpCode.End, 3);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Negative Lookback", () => {
    const prog = compile(null, Builder.build("(?<!h*ell+o)abc"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Save, 2);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Char, CharType.SingleChar, 99);
        p.add(OpCode.Save, 3);
        p.add(OpCode.RBegin, 0, 1, 14);
        p.add(OpCode.Char, CharType.SingleChar, 111);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Split, 7, 9);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 101);
        p.add(OpCode.Split, 12, 14);
        p.add(OpCode.Char, CharType.SingleChar, 104);
        p.add(OpCode.Jump, 11);
        p.add(OpCode.End, 5);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test LookBack", () => {
    const prog = compile(null, Builder.build("(?<=h*ell+o)abc"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Save, 2);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Char, CharType.SingleChar, 98);
        p.add(OpCode.Char, CharType.SingleChar, 99);
        p.add(OpCode.Save, 3);
        p.add(OpCode.RBegin, 0, 0, 14);
        p.add(OpCode.Char, CharType.SingleChar, 111);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Split, 7, 9);
        p.add(OpCode.Char, CharType.SingleChar, 108);
        p.add(OpCode.Char, CharType.SingleChar, 101);
        p.add(OpCode.Split, 12, 14);
        p.add(OpCode.Char, CharType.SingleChar, 104);
        p.add(OpCode.Jump, 11);
        p.add(OpCode.End, 5);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });

  test("Test Priorities", () => {
    testRegexCompile(
      compile(null, Builder.build("a*", { matchIndex: 1 }), Builder.build("a", { matchIndex: 0 })),
      Prog.with((p) => {
        p.add(OpCode.Split, 1, 5);
        p.add(OpCode.Split, 2, 4);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Jump, 1);
        p.add(OpCode.Match, 10, 1);
        p.add(OpCode.Char, CharType.SingleChar, 97);
        p.add(OpCode.Match, 10, 0);
      }),
    );
  });
});
