import * as TSU from "@panyam/tsutils";
import { Tape } from "./tape";
import { Rule, RegexType, Quant, Regex, Cat, Neg, Char, CharRange, Ref, LookAhead, LookBack, Union } from "./core";
import { CharClassHelpers } from "./charclasses";
import { Prog, Instr, Match } from "./vm";

export enum OpCode {
  Match,
  Noop,
  Any,
  StartOfInput,
  EndOfInput,
  NegChar,
  Char,
  NegCharRange,
  CharRange,
  Save,
  Split,
  Jump,
  Begin,
  End,
}

type RegexResolver = (name: string) => Regex;
type CompilerListener = (expr: Regex, prog: Prog, start: number, length: number) => void;

function matchChar(ch: number, arg0: number, arg1: number): boolean {
  if (arg0 < 0) {
    // char class
    const helper = CharClassHelpers[arg1];
    return helper.match(ch);
  }
  return ch >= arg0 && ch <= arg1;
}

export class Compiler {
  constructor(
    public regexResolver: TSU.Nullable<RegexResolver>,
    public listener: TSU.Nullable<CompilerListener> = null,
  ) {}

  compile(rules: Rule[]): Prog {
    // Sort rules so high priority ones get put out first
    const sortedRules: [Rule, number][] = rules.map((rule, index) => [rule, index]);
    sortedRules.sort((x, y) => {
      const [r1, i1] = x;
      const [r2, i2] = y;
      if (r1.priority != r2.priority) return r2.priority - r1.priority;
      return i1 - i2;
    });
    // Split across each of our expressions
    const out = new Prog();
    // only add the split instruction if we have more than one rule
    const split: Instr = rules.length <= 1 ? new Instr(OpCode.Split) : out.add(OpCode.Split);
    sortedRules.forEach(([rule, i]) => {
      if (rule.tokenType != null) {
        split.add(out.instrs.length);
        this.compileExpr(rule.expr, out);
        out.add(OpCode.Match, rule.priority, i);
      }
    });
    /*
    // Add the error case to match -1 if nothing else matches
    // should technically never come here if atleast one rule matches
    out.add(OpCode.Save, 0);
    this.compileRegex(new Any(), out);
    out.add(OpCode.Save, 1);
    out.add(OpCode.Match, 0, -1);
    */
    return out;
  }

  /**
   * Compile a given expression into a set of instructions.
   */
  compileExpr(expr: Regex, prog: Prog): number {
    const start = prog.length;
    const currOffset = prog.length;
    if (expr.groupIndex >= 0) {
      prog.add(OpCode.Save, expr.groupIndex * 2);
    }
    if (expr.tag == RegexType.CHAR) {
      const char = expr as Char;
      const instr = prog.add(char.neg ? OpCode.NegChar : OpCode.Char, char.start, char.end);
    } else if (expr.tag == RegexType.CHAR_RANGE) {
      const charRange = expr as CharRange;
      const instr = prog.add(charRange.neg ? OpCode.NegCharRange : OpCode.CharRange);
      for (const char of charRange.chars) {
        instr.add(char.start, char.end);
      }
    } else if (expr.tag == RegexType.START_OF_INPUT) {
      prog.add(OpCode.StartOfInput);
    } else if (expr.tag == RegexType.END_OF_INPUT) {
      prog.add(OpCode.EndOfInput);
    } else if (expr.tag == RegexType.ANY) {
      prog.add(OpCode.Any);
    } else if (expr.tag == RegexType.CAT) {
      this.compileCat(expr as Cat, prog);
    } else if (expr.tag == RegexType.UNION) {
      this.compileUnion(expr as Union, prog);
    } else if (expr.tag == RegexType.QUANT) {
      this.compileQuant(expr as Quant, prog);
    } else if (expr.tag == RegexType.REF) {
      this.compileRef(expr as Ref, prog);
    } else if (expr.tag == RegexType.NEG) {
      this.compileNeg(expr as Neg, prog);
    } else if (expr.tag == RegexType.LOOK_AHEAD) {
      this.compileLookAhead(expr as LookAhead, prog);
    } else if (expr.tag == RegexType.LOOK_BACK) {
      this.compileLookBack(expr as LookBack, prog);
    } else {
      throw new Error("Regex Type not yet supported: " + expr.tag);
    }
    if (expr.groupIndex >= 0) {
      prog.add(OpCode.Save, 1 + expr.groupIndex * 2);
    }
    if (this.listener) {
      this.listener(expr, prog, currOffset, prog.length - currOffset);
    }
    return prog.length - start;
  }

  compileCat(cat: Cat, prog: Prog): void {
    for (const child of cat.children) {
      this.compileExpr(child, prog);
    }
  }

  compileRef(ne: Ref, prog: Prog): void {
    const name = ne.name.trim();
    const expr = this.regexResolver ? this.regexResolver(name) : null;
    if (expr == null) {
      throw new Error(`Cannot find expression: ${name}`);
    }
    this.compileExpr(expr, prog);
  }

  compileUnion(union: Union, prog: Prog): void {
    const split = prog.add(OpCode.Split);
    const jumps: Instr[] = [];

    for (let i = 0; i < union.options.length; i++) {
      split.add(prog.length);
      this.compileExpr(union.options[i], prog);
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
  compileQuant(quant: Quant, prog: Prog): void {
    // optimize the special cases of *, ? and +
    if (quant.minCount == 0 && quant.maxCount == TSU.Constants.MAX_INT) {
      // *
      this.compileAtleast0(quant.expr, prog, quant.greedy);
    } else if (quant.minCount == 1 && quant.maxCount == TSU.Constants.MAX_INT) {
      // +
      this.compileAtleast1(quant.expr, prog, quant.greedy);
    } else if (quant.minCount == 0 && quant.maxCount == 1) {
      // ?
      this.compileOptional(quant.expr, prog, quant.greedy);
    } else {
      // general case - Currently going with Option 1
      //
      // - convert x{a,b} to xxxxxx (a) times followed by x? b - a times
      for (let i = 0; i < quant.minCount; i++) {
        this.compileExpr(quant.expr, prog);
      }
      // generate x? b - a times
      for (let i = quant.minCount; i < quant.maxCount; i++) {
        this.compileOptional(quant.expr, prog, quant.greedy);
      }
    }
  }

  compileAtleast1(expr: Regex, prog: Prog, greedy = true): void {
    const l1 = prog.length;
    this.compileExpr(expr, prog);
    const split = prog.add(OpCode.Split);
    const l3 = prog.length;
    if (greedy) {
      split.add(l1, l3);
    } else {
      split.add(l3, l1);
    }
  }

  compileAtleast0(expr: Regex, prog: Prog, greedy = true): void {
    const split = prog.add(OpCode.Split);
    const l1 = split.offset;
    const l2 = prog.length;
    this.compileExpr(expr, prog);
    prog.add(OpCode.Jump, l1);
    const l3 = prog.length;
    if (greedy) {
      split.add(l2, l3);
    } else {
      split.add(l3, l2);
    }
  }

  compileOptional(expr: Regex, prog: Prog, greedy = true): void {
    const split = prog.add(OpCode.Split);
    const l1 = prog.length;
    this.compileExpr(expr, prog);
    const l2 = prog.length;
    if (greedy) {
      split.add(l1, l2);
    } else {
      split.add(l2, l1);
    }
  }

  /**
   * Compiles Negative matches.
   */
  compileNeg(neg: Neg, prog: Prog): void {
    const begin = prog.add(OpCode.Begin, 1, 1, 1); // forward, advance and negate if needed
    this.compileExpr(neg.expr, prog);
    const end = prog.add(OpCode.End, begin.offset);
    begin.add(end.offset);
  }

  /**
   * Compiles lookahead assertions
   */
  compileLookAhead(la: LookAhead, prog: Prog): void {
    // how should this work?
    // Ensure that assertion matches first before continuing with the expression
    const begin = prog.add(OpCode.Begin, 1, 0, la.negate ? 1 : 0); // forward and negate if needed
    this.compileExpr(la.cond, prog);
    const end = prog.add(OpCode.End, begin.offset);
    begin.add(end.offset);
  }

  /**
   * Compiles lookback assertions
   */
  compileLookBack(lb: LookBack, prog: Prog): void {
    // Ensure that assertion matches first before continuing with the expression
    const begin = prog.add(OpCode.Begin, 0, 0, lb.negate ? 1 : 0); // forward and negate if needed
    this.compileExpr(lb.cond.reverse(), prog);
    const end = prog.add(OpCode.End, begin.offset);
    begin.add(end.offset);
  }
}

/**
 * A thread that is performing an execution of the regex VM.
 */
export class Thread {
  /**
   * Saved positions into the input stream for the purpose of
   * partial and custom matches.
   */
  parentId = -1;
  id = 0;
  priority = 0;
  positions: number[] = [];
  registers: TSU.NumMap<number> = {};

  /**
   * Create a thread at the given offset
   */
  constructor(public readonly offset: number = 0, public readonly gen: number = 0) {}

  ensurePosition(index: number): void {
    while (this.positions.length <= index) {
      this.positions.push(-1);
    }
  }

  regIncr(regId: number): void {
    if (!(regId in this.registers)) {
      throw new Error(`Register at offset ${regId} is invalid`);
    }
    this.registers[regId]++;
  }

  regAcquire(regId: number): void {
    if (regId in this.registers) {
      throw new Error(`Register at offset ${regId} already acquired.  Release it first`);
    }
    this.registers[regId] = 0;
  }

  regRelease(regId: number): void {
    if (!(regId in this.registers)) {
      throw new Error(`Register at offset ${regId} is invalid`);
    }
    delete this.registers[regId];
  }

  regValue(regId: number): number {
    if (!(regId in this.registers)) {
      throw new Error(`Register at offset ${regId} is invalid`);
    }
    return this.registers[regId];
  }
}

export interface VMTracer {
  threadDequeued(thread: Thread, tapeIndex: number): void;
  threadStepped(thread: Thread, tapeIndex: number, gen: number): void;
  threadQueued(thread: Thread, tapeIndex: number): void;
}

export class VM {
  // TODO - To prevent excessive heap activity and GC
  // create a pool of threads and just have a cap on
  // match sizes
  // To eve simplify each Thread could just be something like:
  // number[] where
  //  number[0] == offset
  //  number[1-2*MaxSubs] = Substitutions
  //  number[2*MaxSubs - 2*MaxSubs + M] = Registers
  //      where M = Max number of NewReg instructions
  threadCounter = 0;
  currThreads: Thread[] = [];
  nextThreads: Thread[] = [];
  tracer: VMTracer;
  startPos = 0; // Where the match is beginning from - this will be set to tape.index when match is called

  gen = 0;
  // Records which "generation" of the match a particular
  // offset is in.  If a thread is added at a particular
  // offset the generation number is used to see if the
  // thread is a duplicate (and avoided if so).  This
  // ensures that are linearly bounded on the number of
  // number threads as we match.
  genForOffset: TSU.NumMap<number> = {};

  constructor(
    public readonly prog: Prog,
    public readonly start = 0,
    public readonly end = -1,
    public readonly forward = true,
  ) {
    if (end < 0) {
      end = prog.length - 1;
    }
  }

  jumpBy(thread: Thread, delta = 1): Thread {
    return this.jumpTo(thread, thread.offset + delta);
  }

  jumpTo(thread: Thread, newOffset: number): Thread {
    const out = new Thread(newOffset, this.gen);
    out.id = thread.id;
    out.parentId = thread.parentId;
    out.priority = thread.priority;
    out.positions = thread.positions;
    out.registers = thread.registers;
    return out;
  }

  forkTo(thread: Thread, newOffset: number): Thread {
    const out = new Thread(newOffset, this.gen);
    out.id = ++this.threadCounter;
    out.parentId = thread.id;
    out.priority = thread.priority;
    out.positions = [...thread.positions];
    out.registers = { ...thread.registers };
    return out;
  }

  addThread(thread: Thread, list: Thread[], tape: Tape, delta = 0): void {
    if (this.genForOffset[thread.offset - this.start] == this.gen) {
      // duplicate
      return;
    }
    this.genForOffset[thread.offset - this.start] = this.gen;
    const instr = this.prog.instrs[thread.offset];
    let newThread: Thread;
    // if (this.tracer) this.tracer.threadStepped(thread, tape.index, this.gen);
    switch (instr.opcode) {
      case OpCode.Jump:
        newThread = this.jumpTo(thread, instr.args[0]);
        this.addThread(newThread, list, tape);
        break;
      case OpCode.Split:
        // add in reverse order so backtracking happens correctly
        for (let j = 0; j < instr.args.length; j++) {
          const newOff = instr.args[j];
          const newThread = this.jumpTo(thread, newOff);
          if (j != 0) {
            newThread.parentId = thread.id;
            newThread.id = ++this.threadCounter;
            newThread.registers = { ...thread.registers };
          }
          this.addThread(newThread, list, tape);
        }
        break;
      case OpCode.Save:
        newThread = this.forkTo(thread, thread.offset + 1);
        newThread.positions[instr.args[0]] = tape.index;
        this.addThread(newThread, list, tape);
        break;
      case OpCode.StartOfInput:
        // only proceed further if prev was a newline or start
        const lastCh = this.prevCh(tape);
        if (tape.index == 0 || lastCh == "\r" || lastCh == "\n" || lastCh == "\u2028" || lastCh == "\u2029") {
          // have a match so can go forwrd but dont advance tape on
          // the same generation
          this.addThread(this.jumpBy(thread, 1), list, tape);
        }
        break;
      case OpCode.EndOfInput:
        // On end of input we dont advance tape but thread moves on
        // if at end of line boundary
        // check if next is end of input
        const currCh = this.nextCh(tape);
        if (currCh == "\r" || currCh == "\n" || currCh == "\u2028" || currCh == "\u2029" || !this.hasMore(tape)) {
          this.addThread(this.jumpBy(thread, 1), list, tape);
        }
        break;
      case OpCode.Begin:
        // This results in a new VM being created for this sub program and
        // kicking off a backtracking execution - Making these as explicit
        // constructs for the user to use means the user can make this choice
        // on their own voilition
        const [forward, consume, negate, end] = instr.args;
        if (consume == 1) {
          // since this results in the consumption of a character (similar to "Char")
          // defer this to the list
          if (this.tracer) this.tracer.threadQueued(thread, tape.index);
          list.push(thread);
        } else {
          const [matchSuccess, matchEnd] = this.recurseMatch(tape, instr.offset + 1, end, forward == 1, negate == 1);
          if (matchSuccess) {
            // TODO - Consider using a DFA for this case so we can mitigate
            // pathological cases with an exponential blowup on a success
            this.addThread(this.jumpTo(thread, end + 1), list, tape);
          }
        }
        break;
      default:
        if (this.tracer) this.tracer.threadQueued(thread, tape.index);
        list.push(thread);
        break;
    }
  }

  protected hasMore(tape: Tape): boolean {
    return this.forward ? tape.hasMore : tape.index > 0;
  }

  protected nextCh(tape: Tape): string {
    return tape.input[tape.index + (this.forward ? 1 : -1)];
  }

  protected prevCh(tape: Tape): string {
    return tape.input[tape.index - (this.forward ? 1 : -1)];
  }

  /**
   * Runs the given instructions and returns a triple:
   * [matchId, matchStart, matchEnd]
   */
  match(tape: Tape): Match | null {
    // this.gen = 0; this.genForOffset = {};
    this.startMatching(tape);
    let bestMatch: TSU.Nullable<Match> = null;
    while (this.currThreads.length > 0) {
      bestMatch = this.stepChar(tape, bestMatch);
    }
    // ensure tape is rewound to end of last match
    if (bestMatch != null) tape.index = bestMatch.end;
    return bestMatch;
  }

  recurseMatch(tape: Tape, startOffset: number, endOffset: number, forward = true, negate = false): [boolean, number] {
    const vm = new VM(this.prog, startOffset, endOffset, forward);
    const savedPos = tape.index;
    tape.advance();
    const match = vm.match(tape);
    const newPos = tape.index;
    tape.index = savedPos; // always restore it first and let caller use it
    return [(match != null && !negate) || (match == null && negate), newPos];
  }

  startMatching(tape: Tape): void {
    this.currThreads = [];
    this.nextThreads = [];
    this.gen++;
    this.addThread(new Thread(this.start, this.gen), this.currThreads, tape);
    // let largestMatchEnd = -1;
    // let lastMatchIndex = -1;
    this.startPos = tape.index;
  }

  stepChar(tape: Tape, currMatch: TSU.Nullable<Match> = null): TSU.Nullable<Match> {
    // At this point all our threads are point to the next "transition" or "match" action.
    this.gen++;
    // console.log(`Ch (@${tape.index}): ${tape.currChCode}, Gen (${this.gen})`);
    for (let i = 0; i < this.currThreads.length; i++) {
      const thread = this.currThreads[i];
      // console.log(`Thread (${i}): ${thread.offset}(${thread.gen})`);
      const nextMatch = this.stepThread(tape, thread);
      if (nextMatch != null) {
        if (currMatch == null || (
          nextMatch.priority > currMatch.priority ||
          (nextMatch.priority == currMatch.priority && nextMatch.end > currMatch.end))
        ) {
          currMatch = nextMatch;
          break;
        } else if (currMatch != nextMatch) {
          // Since we kill of lower priority matches becuase of matchedInGen
          // we should not be here
          // TSU.assert(false, "Should not be here");
        }
      }
    }
    if (this.hasMore(tape)) {
      tape.advance(this.forward ? 1 : -1);
    }
    this.currThreads = this.nextThreads;
    this.nextThreads = [];
    return currMatch;
  }

  stepThread(tape: Tape, thread: Thread): TSU.Nullable<Match> {
    if (this.tracer) this.tracer.threadStepped(thread, tape.index, this.gen);
    let currMatch: TSU.Nullable<Match> = null;
    const instrs = this.prog.instrs;
    const instr = instrs[thread.offset];
    const opcode = instr.opcode;
    const args = instr.args;
    const delta = this.forward ? 1 : -1;
    // Do char match based actions
    let advanceTape = false;
    let ch: number;
    switch (opcode) {
      case OpCode.Begin:
        const [forward, consume, negate, end] = instr.args;
        TSU.assert(consume == 1, "Plain lookahead cannot be here");
        const [matchSuccess, matchEnd] = this.recurseMatch(tape, instr.offset + 1, end, forward == 1, negate == 1);
        if (matchSuccess) {
          // TODO - Consider using a DFA for this case so we can mitigate
          // pathological cases with an exponential blowup
          // on a success we have a few options
          this.addThread(this.jumpTo(thread, end + 1), this.nextThreads, tape);
        }
        break;
      case OpCode.End:
        // Return back to calling VM - very similar to a match
        return new Match(-1, -1, this.startPos, tape.index);
        break;
      case OpCode.Match:
        // we have a match on this thread so return it
        // Update the match if we are a higher prioirty or longer match
        // than what was already found (if any)
        if (tape.index > this.startPos) {
          const currPriority = instr.args[0];
          const matchIndex = instr.args[1];
          currMatch = new Match();
          currMatch.start = this.startPos;
          currMatch.end = tape.index;
          currMatch.priority = currPriority;
          currMatch.matchIndex = matchIndex;
        }
        break;
      case OpCode.NegChar:
        ch = tape.currChCode;
        advanceTape = !matchChar(ch, args[0], args[1]);
        break;
      case OpCode.Char:
        ch = tape.currChCode;
        advanceTape = matchChar(ch, args[0], args[1]);
        break;
      case OpCode.NegCharRange:
        ch = tape.currChCode;
        advanceTape = true;
        for (let a = 0; a < args.length; a += 2) {
          if (matchChar(ch, args[a], args[a + 1])) {
            advanceTape = false;
            break;
          }
        }
        break;
      case OpCode.CharRange:
        ch = tape.currChCode;
        for (let a = 0; a < args.length; a += 2) {
          if (matchChar(ch, args[a], args[a + 1])) {
            advanceTape = true;
            break;
          }
        }
        break;
      case OpCode.Any:
        advanceTape = this.hasMore(tape);
        break;
    }
    if (advanceTape && this.hasMore(tape)) {
      this.addThread(this.jumpBy(thread, 1), this.nextThreads, tape, delta);
    }
    return currMatch;
  }
}

export function InstrDebugValue(instr: Instr): string {
  switch (instr.opcode) {
    case OpCode.Match:
      return `Match ${instr.args[0]} ${instr.args[1]}`;
    case OpCode.Char:
    case OpCode.NegChar:
      if (instr.args[0] < 0) {
        // Char Class
        return `Char ${CharClassHelpers[instr.args[1]].reString(instr.opcode == OpCode.NegChar)}`;
      } else {
        const start = (+"" + instr.args[0]).toString(16);
        const end = (+"" + instr.args[1]).toString(16);
        const s = start == end ? start : `${start}-${end}`;
        return `Char ${s}`;
      }
    case OpCode.NegCharRange:
    case OpCode.CharRange:
      let out = instr.opcode == OpCode.NegCharRange ? "NegCharRange " : "CharRange ";
      for (let i = 0; i < instr.args.length; i += 2) {
        const start = (+"" + instr.args[i]).toString(16);
        const end = (+"" + instr.args[i + 1]).toString(16);
        const s = start == end ? start : `${start}-${end}`;
        if (i > 0) out += " ";
        out += s;
      }
      return out;
    case OpCode.Any:
      return ".";
    case OpCode.StartOfInput:
      return "^";
    case OpCode.EndOfInput:
      return "$";
    case OpCode.Save:
      return `Save ${instr.args[0]}`;
    case OpCode.Split:
      return `Split ${instr.args.join(", ")}`;
    case OpCode.Jump:
      return `Jump ${instr.args[0]}`;
    case OpCode.Begin:
      return `Begin ${instr.args.join(" ")}`;
    case OpCode.End:
      return `End ${instr.args.join(" ")}`;
    default:
      throw new Error("Invalid Opcode: " + instr.opcode);
  }
}
