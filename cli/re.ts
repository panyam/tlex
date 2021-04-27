import * as fs from "fs";
import * as TSU from "@panyam/tsutils";
import { parse, compile, VMTracer, layoutThreadNodes } from "../src/tests/utils";
import { Tape } from "../src/tape";
import { InstrDebugValue, VM } from "../src/pikevm";

function usage(): void {
  console.log("Usage: <regex> <teststring>");
}

const args = process.argv.slice(2);
const pattern = args[0];
const teststring = args[1];
const debug = args[2] != "false";
const reportFile = args[3] || null;

const tape = new Tape(teststring);
const tracer: VMTracer = new VMTracer();
const regex = parse(pattern);
const prog = compile(null, pattern);
if (debug) {
  console.log(`Regex (${pattern}): `, regex.toString);
  console.log(`Test String: '${teststring}'`);
  console.log("Prog: \n", `${prog.debugValue(InstrDebugValue).join("\n")}`, "\n");
}
const vm = new VM(prog);
// Now start matching
const found = [] as [string, number][];
let next = vm.match(tape);
while (next != null && next.end > next.start) {
  found.push([tape.substring(next.start, next.end), next.matchIndex]);
  next = vm.match(tape);
}
console.log("Found Tokens: ", found);
if (reportFile) {
  const reportHtml = `<html>
        <head>
          <style>
            .threadInstrsCell  { padding-left: 10px; padding-right: 10px; vertical-align: top; }
            .inputCharCell { font-weight: bold; text-align: center; }
            .threadIdCell { font-weight: bold; text-align: left; vertical-align: top; }
          </style>
        </head>
        <body>${layoutThreadNodes(teststring, tracer.allThreadNodes)}</body>
       </html>`;
  if (reportFile.trim().length > 0) {
    fs.writeFileSync(reportFile, reportHtml);
  } else {
    console.log(reportHtml);
  }
}
