import * as fs from "fs";
import * as TSU from "@panyam/tsutils";
import * as Builder from "../builder";
import { Prog, InstrDebugValue, VM } from "../vm";
import { Tape } from "../tape";
import { Tokenizer } from "../tokenizer";
import { VMTracer, layoutThreadNodes } from "./utils";

function testInput(
  prog: Prog,
  input: string,
  expectedTokens: [string, number][],
  debug = false,
  reportFile: TSU.Nullable<string> = null,
): void {
  const tape = new Tape(input);
  const vm = new VM(prog);
  const tracer = new VMTracer();
  if (debug) {
    console.log(
      "Prog: \n",
      `${prog.debugValue(InstrDebugValue).join("\n")}`,
      "\n",
      "\n",
      "Input: ",
      input,
      "\n",
      "Expected Tokens: ",
      expectedTokens,
    );
    vm.tracer = tracer;
  }
  const found = [] as [string, number][];
  let next = vm.match(tape);
  while (next != null && next.end > next.start) {
    found.push([tape.substring(next.start, next.end), next.matchIndex]);
    next = vm.match(tape);
  }
  if (debug) {
    console.log("VM Tracer: ");
    // console.log(tracer.trace.join("\n"));
    console.log("Found Tokens: ", found);
    const reportHtml = `<html>
        <head>
          <style>
            .threadInstrsCell  { padding-left: 10px; padding-right: 10px; vertical-align: top; }
            .inputCharCell { font-weight: bold; text-align: center; }
            .threadIdCell { font-weight: bold; text-align: left; vertical-align: top; }
          </style>
        </head>
        <body>${layoutThreadNodes(input, tracer.allThreadNodes)}</body>
       </html>`;
    if (reportFile != null) {
      if (reportFile.trim().length > 0) {
        fs.writeFileSync(reportFile, reportHtml);
      } else {
        console.log(reportHtml);
      }
    }
  }
  expect(found).toEqual(expectedTokens);
}

function jsonTokenizer(): Tokenizer {
  const tokenizer = new Tokenizer();
  const AnyOf = (...x: string[]) => x.join("|");
  // JSON5NumericLiteral:
  tokenizer.addRule(Builder.build(AnyOf("Infinity", "NaN", "<NumericLiteral>"), { tag: "JSON5NumericLiteral" }));

  tokenizer.addVar("NumericLiteral", "<DecimalLiteral>|<HexIntegerLiteral>");
  tokenizer.addVar(
    "DecimalLiteral",
    AnyOf(
      "(<DecimalIntegerLiteral>.<DecimalDigits>?<ExponentPart>?)",
      "(.<DecimalDigits><ExponentPart>?)",
      "(<DecimalIntegerLiteral><ExponentPart>?)",
    ),
  );
  tokenizer.addVar("DecimalIntegerLiteral", AnyOf("0", "<NonZeroDigit><DecimalDigits>"));
  tokenizer.addVar("DecimalDigits", "<DecimalDigit>+");
  tokenizer.addVar("DecimalDigit", "[0-9]");
  tokenizer.addVar("NonZeroDigit", "[1-9]");
  tokenizer.addVar("ExponentPart", "<ExponentIndicator><SignedPart>");
  tokenizer.addVar("ExponentIndicator", "e|E");
  tokenizer.addVar("SignedInteger", AnyOf("<DecimalDigits>", "[\\-\\+]<DecimalDigits>"));
  tokenizer.addVar("HexIntegerLiteral", "0[xX]<HexDigit>+");
  tokenizer.addVar("HexDigit", "[0-9a-fA-F]");

  // JSON5String:
  tokenizer.addRule(
    Builder.build(AnyOf("<JSON5SingleQuoteString>", "<JSON5DoubleQuoteString>"), { tag: "JSON5String" }),
  );
  tokenizer.addVar("JSON5SingleQuoteString", "'<JSONSingleQuoteStringChar>*'");
  tokenizer.addVar("JSON5DoubleQuoteString", "'<JSONDoubleQuoteStringChar>*'");
  tokenizer.addVar("JSONSingleQuoteStringChar", AnyOf("(^('|\\|<LineTerminator>))", "<JSON5MiscStringChar>"));
  tokenizer.addVar("JSONDoubleQuoteStringChar", AnyOf('(^("|\\|<LineTerminator>))', "<JSON5MiscStringChar>"));
  tokenizer.addVar("JSON5MiscStringChar", AnyOf("\u2028", "\u2029", "<LineContinuation>", "\\<EscapeSequence>"));

  // JSON5Comment - single and multi line
  tokenizer.addRule(Builder.build(AnyOf("//.*$", `/\\*(^\\*/)*\\*/`), { tag: "JSON5Comment" }));

  // JSON5 Literals
  tokenizer.addRule(Builder.build("null", { tag: "NULL" }));
  tokenizer.addRule(Builder.build("true|false", { tag: "JSON5Boolean" }));

  // operator tokens
  tokenizer.addRule(Builder.build(",", { tag: "COMMA" }));
  tokenizer.addRule(Builder.build(":", { tag: "COLON" }));
  tokenizer.addRule(Builder.build("\\[", { tag: "OSQ" }));
  tokenizer.addRule(Builder.build("\\]", { tag: "CSQ" }));
  tokenizer.addRule(Builder.build("\\{", { tag: "OBRACE" }));
  tokenizer.addRule(Builder.build("\\}", { tag: "CBRACE" }));

  // Spaces - Indicate these are to be skipped
  tokenizer.addRule(Builder.build("[ \t\n\r]+", { tag: "SPACES" }));

  // Default error rule
  tokenizer.addRule(Builder.build(".", { tag: "ERROR" }));
  return tokenizer;
}

const tokenizer = jsonTokenizer();

describe("JSON Tests", () => {
  test("Test Chars", () => {
    //
  });
});
