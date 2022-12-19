const util = require("util");
import * as TSU from "@panyam/tsutils";
import { LeafChar, CharGroup, CharType, Rule, Regex } from "../core";
import * as Builder from "../builder";
import { Prog, OpCode, InstrDebugValue } from "../vm";
import { Compiler } from "../compiler";
import * as repr from "../repr";

/*
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
*/

function testRegexCompile(prog: Prog, expected: Prog | null, debug = false, enforce = true): Prog {
  if (debug || expected == null) {
    console.log(
      "Found Value: \n",
      prog == null ? null : repr.reprProg(prog),
      "\nExpected Value: \n",
      expected == null
        ? null
        : util.inspect(repr.reprProg(expected), {
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
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Char, LeafChar.Single(99, false));
        p.add(OpCode.Char, LeafChar.Single(100, false));
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Escape Chars", () => {
    testRegexCompile(
      compile(null, Builder.build("\\n\\r\\t\\f\\b\\\\\\\"\\'\\x32\\y")),
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(10, false));
        p.add(OpCode.Char, LeafChar.Single(13, false));
        p.add(OpCode.Char, LeafChar.Single(9, false));
        p.add(OpCode.Char, LeafChar.Single(12, false));
        p.add(OpCode.Char, LeafChar.Single(8, false));
        p.add(OpCode.Char, LeafChar.Single(92, false));
        p.add(OpCode.Char, LeafChar.Single(34, false));
        p.add(OpCode.Char, LeafChar.Single(39, false));
        p.add(OpCode.Char, LeafChar.Single(50, false));
        p.add(OpCode.Char, LeafChar.Single(121, false));
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Union", () => {
    testRegexCompile(
      compile(null, Builder.build("a|b|c|d|e")),
      Prog.with((p) => {
        p.add(OpCode.Split, null, 1, 3, 5, 7, 9);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Jump, null, 10);
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Jump, null, 10);
        p.add(OpCode.Char, LeafChar.Single(99, false));
        p.add(OpCode.Jump, null, 10);
        p.add(OpCode.Char, LeafChar.Single(100, false));
        p.add(OpCode.Jump, null, 10);
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Quants - a*", () => {
    testRegexCompile(
      compile(null, Builder.build("a*")),
      Prog.with((p) => {
        p.add(OpCode.Split, null, 1, 3);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Jump, null, 0);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Quants - a+", () => {
    testRegexCompile(
      compile(null, Builder.build("a+")),
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Split, null, 0, 2);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Quants - a?", () => {
    testRegexCompile(
      compile(null, Builder.build("a?")),
      Prog.with((p) => {
        p.add(OpCode.Split, null, 1, 2);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Quants - (ab){3,5}", () => {
    testRegexCompile(
      compile(null, Builder.build("(?:ab){3,5}")),
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Split, null, 7, 9);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Split, null, 10, 12);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Char Ranges", () => {
    testRegexCompile(
      compile(null, Builder.build("[a-c]")),
      Prog.with((p) => {
        p.add(
          OpCode.Char,
          CharGroup.Union(false, [CharGroup.Range(LeafChar.Single(97, false), LeafChar.Single(99, false), false)]),
        );
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, Builder.build("[a-cb-j]")),
      Prog.with((p) => {
        p.add(
          OpCode.Char,
          CharGroup.Union(false, [
            CharGroup.Range(LeafChar.Single(97, false), LeafChar.Single(99, false), false),
            CharGroup.Range(LeafChar.Single(98, false), LeafChar.Single(106, false), false),
          ]),
        );
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, Builder.build("[a-cm-q]")),
      Prog.with((p) => {
        p.add(
          OpCode.Char,
          CharGroup.Union(false, [
            CharGroup.Range(LeafChar.Single(97, false), LeafChar.Single(99, false), false),
            CharGroup.Range(LeafChar.Single(109, false), LeafChar.Single(113, false), false),
          ]),
        );
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Special Char Ranges", () => {
    testRegexCompile(
      compile(null, Builder.build(".")),
      Prog.with((p) => {
        p.add(OpCode.Any, null);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, Builder.build("^.$")),
      Prog.with((p) => {
        p.add(OpCode.MLStartingChar, null);
        p.add(OpCode.Any, null);
        p.add(OpCode.MLEndingChar, null);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test.skip("Test Back Named Groups", () => {
    const prog = compile((name) => Builder.build("abcde").expr, Builder.build("\\k<Hello  >"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Lookahead", () => {
    testRegexCompile(
      compile(null, Builder.build("hello (?=world)")),
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(104, false));
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(111, false));
        p.add(OpCode.Char, LeafChar.Single(32, false));
        p.add(OpCode.Begin, null, 0, 0, 12);
        p.add(OpCode.Char, LeafChar.Single(119, false));
        p.add(OpCode.Char, LeafChar.Single(111, false));
        p.add(OpCode.Char, LeafChar.Single(114, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(100, false));
        p.add(OpCode.End, null, 6);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Negative Lookahead", () => {
    const prog = compile(null, Builder.build("abc(?!hello)"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Char, LeafChar.Single(99, false));
        p.add(OpCode.Begin, null, 0, 1, 9);
        p.add(OpCode.Char, LeafChar.Single(104, false));
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(111, false));
        p.add(OpCode.End, null, 3);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Negative Lookahead", () => {
    const prog = compile(null, Builder.build("abc(?!hello)"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Char, LeafChar.Single(99, false));
        p.add(OpCode.Begin, null, 0, 1, 9);
        p.add(OpCode.Char, LeafChar.Single(104, false));
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(111, false));
        p.add(OpCode.End, null, 3);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Negative Lookback", () => {
    const prog = compile(null, Builder.build("(?<!h*ell+o)abc"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Save, null, 2);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Char, LeafChar.Single(99, false));
        p.add(OpCode.Save, null, 3);
        p.add(OpCode.RBegin, null, 0, 1, 14);
        p.add(OpCode.Char, LeafChar.Single(111, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Split, null, 7, 9);
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Split, null, 12, 14);
        p.add(OpCode.Char, LeafChar.Single(104, false));
        p.add(OpCode.Jump, null, 11);
        p.add(OpCode.End, null, 5);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test LookBack", () => {
    const prog = compile(null, Builder.build("(?<=h*ell+o)abc"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Save, null, 2);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(98, false));
        p.add(OpCode.Char, LeafChar.Single(99, false));
        p.add(OpCode.Save, null, 3);
        p.add(OpCode.RBegin, null, 0, 0, 14);
        p.add(OpCode.Char, LeafChar.Single(111, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Split, null, 7, 9);
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Split, null, 12, 14);
        p.add(OpCode.Char, LeafChar.Single(104, false));
        p.add(OpCode.Jump, null, 11);
        p.add(OpCode.End, null, 5);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Priorities", () => {
    testRegexCompile(
      compile(null, Builder.build("a*", { matchIndex: 1 }), Builder.build("a", { matchIndex: 0 })),
      Prog.with((p) => {
        p.add(OpCode.Split, null, 1, 5);
        p.add(OpCode.Split, null, 2, 4);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Jump, null, 1);
        p.add(OpCode.Match, null, 10, 1);
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Vars", () => {
    const prog = compile((name) => Builder.build("x").expr, Builder.build("a{hello}c"));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(120, false));
        p.add(OpCode.Char, LeafChar.Single(99, false));
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Vars Mixed with Strings in FlexRE", () => {
    const prog = compile((name) => Builder.jsRE`great`, new Rule(Builder.flexRE`"hello"{adjective}"world"`));
    testRegexCompile(
      prog,
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(104, false));
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(111, false));
        p.add(OpCode.Char, LeafChar.Single(103, false));
        p.add(OpCode.Char, LeafChar.Single(114, false));
        p.add(OpCode.Char, LeafChar.Single(101, false));
        p.add(OpCode.Char, LeafChar.Single(97, false));
        p.add(OpCode.Char, LeafChar.Single(116, false));
        p.add(OpCode.Char, LeafChar.Single(119, false));
        p.add(OpCode.Char, LeafChar.Single(111, false));
        p.add(OpCode.Char, LeafChar.Single(114, false));
        p.add(OpCode.Char, LeafChar.Single(108, false));
        p.add(OpCode.Char, LeafChar.Single(100, false));
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  test("Test Invalid Vars", () => {
    expect(() => compile(null, Builder.build("a{hello}c"))).toThrowError("Cannot find expression: hello");
  });

  test("Test JS SL Comment", () => {
    const rejs1 = Builder.build(/\/\/.*(?=\n)/, { tag: "SLComment" });
    const rejs2 = Builder.build(/\/\/.*$/, { tag: "SLComment" });
    const reflex = new Rule(Builder.flexRE`"//".*$`, { tag: "SLComment" });
    testRegexCompile(
      compile(null, rejs1),
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(47, false));
        p.add(OpCode.Char, LeafChar.Single(47, false));
        p.add(OpCode.Split, null, 3, 5);
        p.add(OpCode.AnyNonNL, null);
        p.add(OpCode.Jump, null, 2);
        p.add(OpCode.Begin, null, 0, 0, 7);
        p.add(OpCode.Char, LeafChar.Single(10, false));
        p.add(OpCode.End, null, 5);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, rejs2),
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(47, false));
        p.add(OpCode.Char, LeafChar.Single(47, false));
        p.add(OpCode.Split, null, 3, 5);
        p.add(OpCode.AnyNonNL, null);
        p.add(OpCode.Jump, null, 2);
        p.add(OpCode.EndingChar, null);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
    testRegexCompile(
      compile(null, reflex),
      Prog.with((p) => {
        p.add(OpCode.Char, LeafChar.Single(47, false));
        p.add(OpCode.Char, LeafChar.Single(47, false));
        p.add(OpCode.Split, null, 3, 5);
        p.add(OpCode.AnyNonNL, null);
        p.add(OpCode.Jump, null, 2);
        p.add(OpCode.MLEndingChar, null);
        p.add(OpCode.Match, null, 10, 0);
      }),
    );
  });

  /*
  test("Test Priorities on JS Comments+Regex", () => {
    testRegexCompile(
      compile(
        null,
        Builder.build(/\s+/m),
        Builder.build(/\/\*.*?\*\//),
        Builder.build(/\/\/.*$/),
        Builder.build(/\/(.+?(?<!\\))\//),
      ),
      Prog.with((p) => {
        p.add(OpCode.Split, 1, 4, 12, 19);
        p.add(OpCode.Char, CharType.CharClass, 2);
        p.add(OpCode.Split, 1, 3);
        p.add(OpCode.Match, 10, 0);
        p.add(OpCode.Char, CharType.SingleChar, 47);
        p.add(OpCode.Char, CharType.SingleChar, 42);
        p.add(OpCode.Split, 9, 7);
        p.add(OpCode.AnyNonNL);
        p.add(OpCode.Jump, 6);
        p.add(OpCode.Char, CharType.SingleChar, 42);
        p.add(OpCode.Char, CharType.SingleChar, 47);
        p.add(OpCode.Match, 10, 1);
        p.add(OpCode.Char, CharType.SingleChar, 47);
        p.add(OpCode.Char, CharType.SingleChar, 47);
        p.add(OpCode.Split, 15, 17);
        p.add(OpCode.AnyNonNL);
        p.add(OpCode.Jump, 14);
        p.add(OpCode.EndingChar);
        p.add(OpCode.Match, 10, 2);
        p.add(OpCode.Char, CharType.SingleChar, 47);
        p.add(OpCode.Save, 2);
        p.add(OpCode.AnyNonNL);
        p.add(OpCode.Split, 23, 21);
        p.add(OpCode.Save, 4);
        p.add(OpCode.Save, 5);
        p.add(OpCode.RBegin, 1, 1, 27);
        p.add(OpCode.Char, CharType.SingleChar, 92);
        p.add(OpCode.End, 25);
        p.add(OpCode.Save, 3);
        p.add(OpCode.Char, CharType.SingleChar, 47);
        p.add(OpCode.Match, 10, 3);
      }),
    );
  });
 */
});
