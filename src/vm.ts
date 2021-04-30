import * as TSU from "@panyam/tsutils";
import { Tape } from "./tape";
import { CharClassHelpers } from "./charclasses";

function isNewLineChar(ch: string): boolean {
  return ch == "\r" || ch == "\n" || ch == "\u2028" || ch == "\u2029";
}

function isSpaceChar(ch: string): boolean {
  return ch == " " || ch == "\t";
}

export class Match {
  groups: [number, number][] = [];
  positions: number[] = [];
  constructor(public priority = 10, public matchIndex = -1, public start = -1, public end = -1) {}
}

export enum OpCode {
  Match,
  Noop,
  // Any character
  Any,
  // Any character not including a new line
  AnyNonNL,
  // ^ and $ that are not activated on newlines
  StartingChar,
  EndingChar,
  // ^ and $ that are activated on newlines as well
  MLStartingChar,
  MLEndingChar,
  // Case Sensitive char matches
  NegChar,
  Char,
  NegCharRange,
  CharRange,
  // Case Insensitive char matches
  CINegChar,
  CIChar,
  CINegCharRange,
  CICharRange,
  Save,
  Split,
  Jump,
  Begin,
  End,
  StartOfWord,
  EndOfWord,
  GroupStart,
  GroupEnd,
}

export class Prog {
  instrs: Instr[] = [];

  get length(): number {
    return this.instrs.length;
  }

  add(opcode: any, ...args: number[]): Instr {
    const out = new Instr(opcode).add(...args);
    out.offset = this.instrs.length;
    this.instrs.push(out);
    return out;
  }

  static with(initializer: (prog: Prog) => void): Prog {
    const out = new Prog();
    initializer(out);
    return out;
  }

  get reprString(): any {
    let out = "";
    this.instrs.forEach((instr) => (out += `p.add(${instr.opcode}, ${instr.args.join(", ")});`));
    return `Prog.with((p) => { ${out} })`;
  }

  debugValue(instrDebugValue?: (instr: Instr) => string): any {
    if (instrDebugValue) {
      return this.instrs.map((instr, index) => {
        if (instr.comment.trim().length > 0) return `L${index}: ${instrDebugValue(instr)}     # ${instr.comment}`;
        else return `L${index}: ${instrDebugValue(instr)}`;
      });
    } else {
      return this.instrs.map((instr, index) => `L${index}: ${instr.debugValue}`);
    }
  }
}

export class Instr {
  offset = 0;
  comment = "";
  args: number[] = [];
  constructor(public readonly opcode: any) {}

  add(...args: number[]): this {
    this.args.push(...args);
    return this;
  }

  get reprString(): any {
    return `new Instr(${this.opcode}, ${this.args.join(", ")})`;
  }

  get debugValue(): any {
    if (this.comment.trim().length > 0) return `${this.opcode} ${this.args.join(" ")}     # ${this.comment}`;
    else return `${this.opcode} ${this.args.join(" ")}`;
  }
}

/**
 * A thread that is performing an execution of the regex VM.
 */
export class Thread {
  parentId = -1;
  id = 0;
  priority = 0;
  /**
   * Saved positions into the input stream for the purpose of
   * partial and custom matches.
   */
  groups: [number, number][] = [];
  positions: number[] = [];
  registers: TSU.NumMap<number> = {};

  /**
   * Create a thread at the given offset
   */
  constructor(public readonly offset: number = 0, public readonly gen: number = 0) {}

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
  protected threadCounter = 0;
  protected currThreads: Thread[] = [];
  protected nextThreads: Thread[] = [];
  protected startPos = 0; // Where the match is beginning from - this will be set to tape.index when match is called

  protected gen = 0;
  // Records which "generation" of the match a particular
  // offset is in.  If a thread is added at a particular
  // offset the generation number is used to see if the
  // thread is a duplicate (and avoided if so).  This
  // ensures that are linearly bounded on the number of
  // number threads as we match.
  protected genForOffset: TSU.NumMap<number> = {};

  tracer: VMTracer;
  constructor(
    public readonly prog: Prog,
    public readonly start = 0,
    public readonly end = -1,
    public readonly forward = true,
    configs: any = {},
  ) {
    if (end < 0) {
      end = prog.length - 1;
    }
  }

  savePosition(thread: Thread, pos: number, tapeIndex: number): void {
    while (thread.positions.length <= pos) thread.positions.push(-1);
    thread.positions[pos] = tapeIndex;
  }

  jumpBy(thread: Thread, delta = 1): Thread {
    return this.jumpTo(thread, thread.offset + delta);
  }

  jumpTo(thread: Thread, newOffset: number): Thread {
    // TODO - Why create new thread here?
    const out = new Thread(newOffset, this.gen);
    out.id = thread.id;
    out.parentId = thread.parentId;
    out.priority = thread.priority;
    out.positions = thread.positions;
    out.groups = thread.groups;
    out.registers = thread.registers;
    return out;
  }

  forkTo(thread: Thread, newOffset: number): Thread {
    const out = new Thread(newOffset, this.gen);
    out.id = ++this.threadCounter;
    out.parentId = thread.id;
    out.priority = thread.priority;
    out.positions = [...thread.positions];
    out.groups = [...thread.groups];
    out.registers = { ...thread.registers };
    return out;
  }

  startGroup(thread: Thread, groupIndex: number, tapeIndex: number): Thread {
    const newThread = this.forkTo(thread, thread.offset + 1);
    newThread.groups.push([groupIndex, tapeIndex]);
    return newThread;
  }

  endGroup(thread: Thread, groupIndex: number, tapeIndex: number): Thread {
    const newThread = this.forkTo(thread, thread.offset + 1);
    newThread.groups.push([-groupIndex, tapeIndex]);
    return newThread;
  }

  addThread(thread: Thread, list: Thread[], tape: Tape, delta = 0): void {
    if (this.genForOffset[thread.offset - this.start] == this.gen) {
      // duplicate
      return;
    }
    this.genForOffset[thread.offset - this.start] = this.gen;
    const instr = this.prog.instrs[thread.offset];
    let nextCh: string;
    let lastCh: string;
    let newThread: Thread;
    // if (this.tracer) this.tracer.threadStepped(thread, tape.index, this.gen);
    const opcode = instr.opcode;
    switch (opcode) {
      case OpCode.Jump:
        newThread = this.jumpTo(thread, instr.args[0]);
        this.addThread(newThread, list, tape, delta);
        break;
      case OpCode.Split:
        for (let j = 0; j < instr.args.length; j++) {
          const newOff = instr.args[j];
          // TODO - only fork on position/group write instead of always forking on a split
          const newThread = j == 0 ? this.jumpTo(thread, newOff) : this.forkTo(thread, newOff);
          this.addThread(newThread, list, tape, delta);
        }
        break;
      case OpCode.Save:
        newThread = this.jumpTo(thread, thread.offset + 1);
        this.savePosition(newThread, instr.args[0], tape.index + delta);
        if (this.tracer) this.tracer.threadQueued(thread, tape.index + delta);
        this.addThread(newThread, list, tape, delta);
        break;
      case OpCode.GroupStart:
        newThread = this.startGroup(thread, instr.args[0], tape.index + delta);
        if (this.tracer) this.tracer.threadQueued(thread, tape.index + delta);
        this.addThread(newThread, list, tape, delta);
        break;
      case OpCode.GroupEnd:
        newThread = this.endGroup(thread, instr.args[0], tape.index + delta);
        if (this.tracer) this.tracer.threadQueued(thread, tape.index + delta);
        this.addThread(newThread, list, tape, delta);
        break;
      case OpCode.StartingChar:
      case OpCode.MLStartingChar:
        // only proceed further if prev was a newline or start
        lastCh = this.prevCh(tape);
        if (tape.index == 0 || (opcode == OpCode.MLStartingChar && isNewLineChar(lastCh))) {
          // have a match so can go forwrd but dont advance tape on
          // the same generation
          this.addThread(this.jumpBy(thread, 1), list, tape, delta);
        }
        break;
      case OpCode.EndingChar:
      case OpCode.MLEndingChar:
        // On end of input we dont advance tape but thread moves on
        // if at end of line boundary
        // check if next is end of input
        nextCh = this.nextCh(tape);
        if (nextCh == "" || (opcode == OpCode.MLEndingChar && isNewLineChar(nextCh))) {
          this.addThread(this.jumpBy(thread, 1), list, tape, delta);
        }
        break;
      case OpCode.StartOfWord:
        // only proceed further if prev was a newline or start
        /*
        lastCh = this.prevCh(tape);
        if (tape.index == 0 || (this.multiline && (isNewLineChar(lastCh) || isSpaceChar(lastCh)))) {
          // have a match so can go forwrd but dont advance tape on
          // the same generation
          this.addThread(this.jumpBy(thread, 1), list, tape, delta);
        }
       */
        break;
      case OpCode.EndOfWord:
        // On end of input we dont advance tape but thread moves on
        // if at end of line boundary
        // check if next is end of input
        /*
        nextCh = this.nextCh(tape);
        if (nextCh == "" || (this.multiline && (isNewLineChar(nextCh) || isSpaceChar(nextCh)))) {
          this.addThread(this.jumpBy(thread, 1), list, tape, delta);
        }
       */
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
            this.addThread(this.jumpTo(thread, end + 1), list, tape, delta);
          }
        }
        break;
      default:
        if (this.tracer) this.tracer.threadQueued(thread, tape.index);
        list.push(thread);
        break;
    }
  }

  matchChar(ch: number, arg0: number, arg1: number): boolean {
    if (arg0 < 0) {
      const helper = CharClassHelpers[arg1];
      return helper.match(ch);
    }
    return ch >= arg0 && ch <= arg1;
  }

  matchCurrPos(tape: Tape, arg0: number, arg1: number, ignoreCase = false): boolean {
    if (ignoreCase) {
      return this.matchChar(tape.currChCodeLower, arg0, arg1) || this.matchChar(tape.currChCodeUpper, arg0, arg1);
    } else {
      return this.matchChar(tape.currChCode, arg0, arg1);
    }
  }

  protected hasMore(tape: Tape): boolean {
    return this.forward ? tape.hasMore : tape.index > 0;
  }

  protected nextCh(tape: Tape): string {
    const next = tape.index + (this.forward ? 1 : -1);
    if (next < 0 || next >= tape.input.length) return "";
    return tape.input[next];
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
      // console.log(`   Thread (${i}): ${thread.offset}(${thread.gen})`);
      const nextMatch = this.stepThread(tape, thread);
      if (nextMatch != null) {
        if (
          currMatch == null ||
          nextMatch.priority > currMatch.priority ||
          (nextMatch.priority == currMatch.priority && nextMatch.end > currMatch.end)
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
        const out = new Match(-1, -1, this.startPos, tape.index);
        out.groups = thread.groups;
        out.positions = thread.positions;
        return out;
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
          currMatch.groups = thread.groups;
          currMatch.positions = thread.positions;
        }
        break;
      case OpCode.NegChar:
      case OpCode.CINegChar:
        advanceTape = !this.matchCurrPos(tape, args[0], args[1], opcode == OpCode.CINegChar);
        break;
      case OpCode.Char:
      case OpCode.CIChar:
        advanceTape = this.matchCurrPos(tape, args[0], args[1], opcode == OpCode.CIChar);
        break;
      case OpCode.NegCharRange:
      case OpCode.CINegCharRange:
        advanceTape = true;
        for (let a = 0; a < args.length; a += 2) {
          if (this.matchCurrPos(tape, args[a], args[a + 1], opcode == OpCode.CINegCharRange)) {
            advanceTape = false;
            break;
          }
        }
        break;
      case OpCode.CharRange:
      case OpCode.CICharRange:
        for (let a = 0; a < args.length; a += 2) {
          if (this.matchCurrPos(tape, args[a], args[a + 1], opcode == OpCode.CICharRange)) {
            advanceTape = true;
            break;
          }
        }
        break;
      case OpCode.AnyNonNL:
      case OpCode.Any:
        if (this.hasMore(tape)) {
          advanceTape = opcode == OpCode.Any || !isNewLineChar(tape.currCh);
        }
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
    case OpCode.CIChar:
    case OpCode.CINegChar:
      if (instr.args[0] < 0) {
        // Char Class
        return `${OpCode[instr.opcode].toString()} ${CharClassHelpers[instr.args[1]].reString()}`;
      } else {
        const start = (+"" + instr.args[0]).toString(16);
        const end = (+"" + instr.args[1]).toString(16);
        const s = start == end ? start : `${start}-${end}`;
        return `${OpCode[instr.opcode].toString()} ${s}`;
      }
    case OpCode.NegCharRange:
    case OpCode.CharRange:
    case OpCode.CINegCharRange:
    case OpCode.CICharRange:
      let out = OpCode[instr.opcode].toString();
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
    case OpCode.AnyNonNL:
      return "NL.";
    case OpCode.StartingChar:
      return "^";
    case OpCode.MLStartingChar:
      return "NL^";
    case OpCode.EndingChar:
      return "$NL";
    case OpCode.MLEndingChar:
      return "$|(?=[\n\r])";
    case OpCode.Save:
      return `Save ${instr.args[0]}`;
    case OpCode.GroupStart:
      return `GroupStart ${instr.args[0]}`;
    case OpCode.GroupEnd:
      return `GroupEnd ${instr.args[0]}`;
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
