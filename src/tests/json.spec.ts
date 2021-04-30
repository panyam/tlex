import * as fs from "fs";
import * as TSU from "@panyam/tsutils";
import { Rule } from "../core";
import { Prog, InstrDebugValue, VM } from "../vm";
import { Tape } from "../tape";
import { Lexer } from "../lexer";
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

function jsonLexer(): Lexer {
  const lexer = new Lexer();
  const AnyOf = (...x: string[]) => x.join("|");
  // JSON5NumericLiteral:
  lexer.addRule(new Rule(AnyOf("Infinity", "NaN", "<NumericLiteral>"), "JSON5NumericLiteral"));

  lexer.addVar("NumericLiteral", "<DecimalLiteral>|<HexIntegerLiteral>");
  lexer.addVar(
    "DecimalLiteral",
    AnyOf(
      "(<DecimalIntegerLiteral>.<DecimalDigits>?<ExponentPart>?)",
      "(.<DecimalDigits><ExponentPart>?)",
      "(<DecimalIntegerLiteral><ExponentPart>?)",
    ),
  );
  lexer.addVar("DecimalIntegerLiteral", AnyOf("0", "<NonZeroDigit><DecimalDigits>"));
  lexer.addVar("DecimalDigits", "<DecimalDigit>+");
  lexer.addVar("DecimalDigit", "[0-9]");
  lexer.addVar("NonZeroDigit", "[1-9]");
  lexer.addVar("ExponentPart", "<ExponentIndicator><SignedPart>");
  lexer.addVar("ExponentIndicator", "e|E");
  lexer.addVar("SignedInteger", AnyOf("<DecimalDigits>", "[\\-\\+]<DecimalDigits>"));
  lexer.addVar("HexIntegerLiteral", "0[xX]<HexDigit>+");
  lexer.addVar("HexDigit", "[0-9a-fA-F]");

  // JSON5String:
  lexer.addRule(new Rule(AnyOf("<JSON5SingleQuoteString>", "<JSON5DoubleQuoteString>"), "JSON5String"));
  lexer.addVar("JSON5SingleQuoteString", "'<JSONSingleQuoteStringChar>*'");
  lexer.addVar("JSON5DoubleQuoteString", "'<JSONDoubleQuoteStringChar>*'");
  lexer.addVar("JSONSingleQuoteStringChar", AnyOf("(^('|\\|<LineTerminator>))", "<JSON5MiscStringChar>"));
  lexer.addVar("JSONDoubleQuoteStringChar", AnyOf('(^("|\\|<LineTerminator>))', "<JSON5MiscStringChar>"));
  lexer.addVar("JSON5MiscStringChar", AnyOf("\u2028", "\u2029", "<LineContinuation>", "\\<EscapeSequence>"));

  // JSON5Comment - single and multi line
  lexer.addRule(new Rule(AnyOf("//.*$", `/\\*(^\\*/)*\\*/`), "JSON5Comment"));

  // JSON5 Literals
  lexer.addRule(new Rule("null", "NULL"));
  lexer.addRule(new Rule("true|false", "JSON5Boolean"));

  // operator tokens
  lexer.addRule(new Rule(",", "COMMA"));
  lexer.addRule(new Rule(":", "COLON"));
  lexer.addRule(new Rule("\\[", "OSQ"));
  lexer.addRule(new Rule("\\]", "CSQ"));
  lexer.addRule(new Rule("\\{", "OBRACE"));
  lexer.addRule(new Rule("\\}", "CBRACE"));

  // Spaces - Indicate these are to be skipped
  lexer.addRule(new Rule("[ \t\n\r]+", "SPACES"));

  // Default error rule
  lexer.addRule(new Rule(".", "ERROR"));
  return lexer;
}

const lexer = jsonLexer();

describe("JSON Tests", () => {
  test("Test Chars", () => {
    //
  });
});
