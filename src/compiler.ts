import * as TSU from "@panyam/tsutils";

import {
  Rule,
  RegexType,
  Quant,
  Regex,
  Cat,
  Char,
  CharType,
  Var,
  BackNumRef,
  BackNamedRef,
  LookAhead,
  LookBack,
  Union,
} from "./core";
import { OpCode, Prog, Instr } from "./vm";

type RegexResolver = (name: string) => Regex;
type CompilerListener = (expr: Regex, prog: Prog, start: number, length: number) => void;
export class Compiler {
  emitGroups = false;
  emitPosition = true;
  constructor(
    public regexResolver: TSU.Nullable<RegexResolver>,
    public listener: TSU.Nullable<CompilerListener> = null,
  ) {}

  compile(rules: Rule[]): Prog {
    // Split across each of our expressions
    const out = new Prog();
    // only add the split instruction if we have more than one rule
    const split: Instr = rules.length <= 1 ? new Instr(OpCode.Split) : out.add(OpCode.Split, null);
    rules.forEach((rule, i) => {
      split.add(out.instrs.length);
      const ignoreCase = rule.expr.ignoreCase == null ? false : rule.expr.ignoreCase;
      const dotAll = rule.expr.dotAll == null ? true : rule.expr.dotAll;
      const multiline = rule.expr.multiline == null ? true : rule.expr.multiline;
      this.compileExpr(rule.expr, out, ignoreCase, dotAll, multiline);
      out.add(OpCode.Match, null).add(rule.priority, rule.matchIndex >= 0 ? rule.matchIndex : i);
    });
    return out;
  }

  /**
   * Compile a given expression into a set of instructions.
   */
  compileExpr(expr: Regex, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): number {
    const start = prog.length;
    const currOffset = prog.length;
    if (expr.groupIndex >= 0) {
      if (this.emitPosition) prog.add(OpCode.Save).add((1 + expr.groupIndex) * 2);
      if (this.emitGroups) prog.add(OpCode.GroupStart).add(1 + expr.groupIndex);
    }
    if (expr.tag == RegexType.CHAR) {
      this.compileChar(expr as Char, prog, ignoreCase, dotAll, multiline);
    } else if (expr.tag == RegexType.START_OF_INPUT) {
      const ml = expr.multiline == null ? multiline : expr.multiline;
      prog.add(ml ? OpCode.MLStartingChar : OpCode.StartingChar);
    } else if (expr.tag == RegexType.END_OF_INPUT) {
      const ml = expr.multiline == null ? multiline : expr.multiline;
      prog.add(ml ? OpCode.MLEndingChar : OpCode.EndingChar);
    } else if (expr.tag == RegexType.START_OF_WORD) {
      prog.add(OpCode.StartOfWord);
    } else if (expr.tag == RegexType.END_OF_WORD) {
      prog.add(OpCode.EndOfWord);
    } else if (expr.tag == RegexType.CAT) {
      this.compileCat(expr as Cat, prog, ignoreCase, dotAll, multiline);
    } else if (expr.tag == RegexType.UNION) {
      this.compileUnion(expr as Union, prog, ignoreCase, dotAll, multiline);
    } else if (expr.tag == RegexType.QUANT) {
      this.compileQuant(expr as Quant, prog, ignoreCase, dotAll, multiline);
    } else if (expr.tag == RegexType.VAR) {
      this.compileVar(expr as Var, prog, ignoreCase, dotAll, multiline);
    } else if (expr.tag == RegexType.BACK_NAMED_REF) {
      this.compileBackNamedRef(expr as BackNamedRef, prog, ignoreCase, dotAll, multiline);
    } else if (expr.tag == RegexType.BACK_NUM_REF) {
      this.compileBackNumRef(expr as BackNumRef, prog, ignoreCase, dotAll, multiline);
      // } else if (expr.tag == RegexType.NEG) { this.compileNeg(expr as Neg, prog);
    } else if (expr.tag == RegexType.LOOK_AHEAD) {
      this.compileLookAhead(expr as LookAhead, prog, ignoreCase, dotAll, multiline);
    } else if (expr.tag == RegexType.LOOK_BACK) {
      this.compileLookBack(expr as LookBack, prog, ignoreCase, dotAll, multiline);
    } else {
      throw new Error("Regex Type not yet supported: " + expr.tag);
    }
    if (expr.groupIndex >= 0) {
      if (this.emitGroups) prog.add(OpCode.GroupEnd).add(1 + expr.groupIndex);
      if (this.emitPosition) prog.add(OpCode.Save).add((1 + expr.groupIndex) * 2 + 1);
    }
    if (this.listener && prog.length > currOffset) {
      this.listener(expr, prog, currOffset, prog.length - currOffset);
    }
    return prog.length - start;
  }

  compileChar(char: Char, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    if (char.op == CharType.AnyChar) {
      // TODO - Should neg be ignored?
      prog.add(dotAll ? OpCode.Any : OpCode.AnyNonNL);
    } else {
      const instr = prog.add(ignoreCase ? OpCode.CIChar : OpCode.Char);
      instr.char = char;
      /*
      // We have Neg or not, CI or not
      const instr = prog.add(
        ignoreCase ? (char.neg ? OpCode.NegCIChar : OpCode.CIChar) : char.neg ? OpCode.NegChar : OpCode.Char,
      );
      instr.add(char.op);

      // And now the arguments
      for (const arg of char.args) instr.add(arg);
      */
    }
  }

  compileCat(cat: Cat, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    for (const child of cat.children) {
      this.compileExpr(child, prog, ignoreCase, dotAll, multiline);
    }
  }

  compileBackNumRef(ne: BackNumRef, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    // TODO - This may need a resolution at "runtime" so the instruction
    // should reflect as such?
  }

  compileBackNamedRef(ne: BackNamedRef, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    // TODO - This may need a resolution at "runtime" so the instruction
    // should reflect as such?
  }

  compileVar(v: Var, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    const name = v.name.trim();
    const expr = this.regexResolver ? this.regexResolver(name) : null;
    if (expr == null) {
      throw new Error(`Cannot find expression: ${name}`);
    }
    this.compileExpr(expr, prog, ignoreCase, dotAll, multiline);
  }

  compileUnion(union: Union, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    const split = prog.add(OpCode.Split);
    const jumps: Instr[] = [];

    for (let i = 0; i < union.options.length; i++) {
      split.add(prog.length);
      this.compileExpr(union.options[i], prog, ignoreCase, dotAll, multiline);
      if (i < union.options.length - 1) {
        jumps.push(prog.add(OpCode.Jump));
      }
    }
    for (const jmp of jumps) {
      jmp.add(prog.length);
    }
  }

  /**
   * Compiles a repetition (with quantifiers) into its instructions.
   *
   * Option 1 (currently used) - convert x{a,b} to xxxxxx (a) times followed by x? b - a times
   *  Problem with this is that it can have unbounded sizes on regexes.
   *
   * Option 2 - Experimental
   *  Problem is here is we must allow for duplicate threads for an offset in a given
   *  generation - possibly causing an exponential blowup.
   *
   * For Regex{A,B} do something like:
   * L0: AcquireReg     # acquire new register at L0 and set value to 0
   * L1: CodeFor expr   # Emit code for expr
   * L2: ...
   * L5: ... Code for Regex ends here
   * L6: IncReg L0    # Increment value of register at L0
   *
   * # If value of register at L0 is < A jump to L1
   * L7: JumpIfLt L0, A, L1
   *
   * # If value of register at L0 is >= B jump to LX (after split)
   * L8: JumpIfGt L0, B - 1, L10
   *
   * # Else split and repeat as we are between A and B
   * # Ofcourse swap L1 and L?? if match is not greedy
   * L9: Split L1, L10
   *
   * L10: ReleaseReg L0 # Release register - no longer used
   *
   * In the above if A == 0 then insert a Split L11 before L0 above
   */
  compileQuant(quant: Quant, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    // optimize the special cases of *, ? and +
    if (quant.minCount == 0 && quant.maxCount == TSU.Constants.MAX_INT) {
      // *
      this.compileAtleast0(quant.expr, prog, quant.greedy, ignoreCase, dotAll, multiline);
    } else if (quant.minCount == 1 && quant.maxCount == TSU.Constants.MAX_INT) {
      // +
      this.compileAtleast1(quant.expr, prog, quant.greedy, ignoreCase, dotAll, multiline);
    } else if (quant.minCount == 0 && quant.maxCount == 1) {
      // ?
      this.compileOptional(quant.expr, prog, quant.greedy, ignoreCase, dotAll, multiline);
    } else {
      // general case - Currently going with Option 1
      //
      // - convert x{a,b} to xxxxxx (a) times followed by x? b - a times
      for (let i = 0; i < quant.minCount; i++) {
        this.compileExpr(quant.expr, prog, ignoreCase, dotAll, multiline);
      }
      // generate x? b - a times
      if (quant.isUnlimited) {
        // then generate a a* here
        this.compileAtleast0(quant.expr, prog, quant.greedy, ignoreCase, dotAll, multiline);
      } else {
        for (let i = quant.minCount; i < quant.maxCount; i++) {
          this.compileOptional(quant.expr, prog, quant.greedy, ignoreCase, dotAll, multiline);
        }
      }
    }
  }

  compileAtleast1(
    expr: Regex,
    prog: Prog,
    greedy = true,
    ignoreCase: boolean,
    dotAll: boolean,
    multiline: boolean,
  ): void {
    const l1 = prog.length;
    this.compileExpr(expr, prog, ignoreCase, dotAll, multiline);
    const split = prog.add(OpCode.Split);
    const l3 = prog.length;
    if (greedy) {
      split.add(l1, l3);
    } else {
      split.add(l3, l1);
    }
  }

  compileAtleast0(
    expr: Regex,
    prog: Prog,
    greedy: boolean,
    ignoreCase: boolean,
    dotAll: boolean,
    multiline: boolean,
  ): void {
    const split = prog.add(OpCode.Split);
    const l1 = split.offset;
    const l2 = prog.length;
    this.compileExpr(expr, prog, ignoreCase, dotAll, multiline);
    prog.add(OpCode.Jump).add(l1);
    const l3 = prog.length;
    if (greedy) {
      split.add(l2, l3);
    } else {
      split.add(l3, l2);
    }
  }

  compileOptional(
    expr: Regex,
    prog: Prog,
    greedy: boolean,
    ignoreCase: boolean,
    dotAll: boolean,
    multiline: boolean,
  ): void {
    const split = prog.add(OpCode.Split);
    const l1 = prog.length;
    this.compileExpr(expr, prog, ignoreCase, dotAll, multiline);
    const l2 = prog.length;
    if (greedy) {
      split.add(l1, l2);
    } else {
      split.add(l2, l1);
    }
  }

  /**
   * Compiles lookahead assertions
   */
  compileLookAhead(la: LookAhead, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    // how should this work?
    // Ensure that assertion matches first before continuing with the expression
    this.compileExpr(la.expr, prog, ignoreCase, dotAll, multiline);
    const begin = prog.add(OpCode.Begin).add(0, la.negate ? 1 : 0); // negate if needed
    this.compileExpr(la.cond, prog, ignoreCase, dotAll, multiline);
    const end = prog.add(OpCode.End).add(begin.offset);
    begin.add(end.offset);
  }

  /**
   * Compiles lookback assertions
   */
  compileLookBack(lb: LookBack, prog: Prog, ignoreCase: boolean, dotAll: boolean, multiline: boolean): void {
    // Ensure that assertion matches first before continuing with the expression
    this.compileExpr(lb.expr, prog, ignoreCase, dotAll, multiline);
    TSU.assert(lb.expr.groupIndex >= 0, "LookBack Assertion requires expression to have a group Index");
    const begin = prog.add(OpCode.RBegin).add(lb.expr.groupIndex, lb.negate ? 1 : 0); // negate if needed
    this.compileExpr(lb.cond.reverse(), prog, ignoreCase, dotAll, multiline);
    const end = prog.add(OpCode.End).add(begin.offset);
    begin.add(end.offset);
  }
}
