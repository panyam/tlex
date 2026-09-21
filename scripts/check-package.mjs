import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packed = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }),
)[0];
const paths = packed.files.map((f) => f.path);
const failures = [];

const testPaths = paths.filter((p) => /(^|\/)tests\//.test(p));
if (testPaths.length > 0) {
  failures.push(
    `Compiled test code is in the tarball (issue 10). tsconfig.json 'exclude' needs to cover the whole test directory, not just *.spec.ts:\n  ${testPaths.join("\n  ")}`,
  );
}

const declarations = paths.filter((p) => p.endsWith(".d.ts"));
if (declarations.length === 0) {
  failures.push("No .d.ts files in the tarball, so consumers get no types at all.");
} else {
  const documented = declarations.filter((p) => readFileSync(p, "utf8").includes("@param"));
  if (documented.length === 0) {
    failures.push(
      `None of the ${declarations.length} .d.ts files carry JSDoc (issue 11), so no exported symbol shows hover docs at a call site. Check 'removeComments' in tsconfig.json, which strips declarations as well as emitted JS.`,
    );
  }
}

if (failures.length > 0) {
  console.error(`package check failed for ${packed.name}@${packed.version}\n\n${failures.join("\n\n")}`);
  process.exit(1);
}

const documented = declarations.filter((p) => readFileSync(p, "utf8").includes("@param")).length;
console.log(
  `package check ok: ${paths.length} files, ${declarations.length} declarations, ${documented} carrying JSDoc, ${Math.round(packed.unpackedSize / 1024)} kB unpacked`,
);
