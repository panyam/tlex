---
title: VM Architecture
description: How the regex virtual machine works
section: concepts
---

TLEX uses a virtual machine (VM) approach to regex matching, implementing a variant of Ken Thompson's NFA algorithm. This provides efficient pattern matching with predictable O(nm) time complexity, where n is input length and m is pattern length.

## Why a VM?

Traditional regex engines use one of two approaches:

| Approach | Pros | Cons |
|----------|------|------|
| Backtracking DFA | Fast for simple patterns | Exponential blowup on pathological cases |
| Thompson NFA | Predictable performance | Slightly more overhead per character |

TLEX uses Thompson NFA for:
- **Predictable performance**: No exponential blowup on adversarial inputs
- **Multiple simultaneous matches**: Can track many pattern candidates at once
- **Efficient lexer support**: Can match first of many rules simultaneously

---

## Compilation Pipeline

```text
    Source              AST                  Prog              Match
  ┌──────────┐      ┌──────────┐       ┌───────────┐      ┌──────────┐
  │ "[a-z]+" │  →   │   Quant  │   →   │ L0: Char  │  →   │ { start, │
  │          │      │    │     │       │ L1: Split │      │   end,   │
  │          │      │  Range   │       │ L2: Match │      │   ... }  │
  └──────────┘      └──────────┘       └───────────┘      └──────────┘
      Parse           Compile            Execute
```

1. **Parse**: Regex string → AST (see [Regex AST](/tlex/concepts/regex-ast/))
2. **Compile**: AST → VM Instructions (`Prog`)
3. **Execute**: VM runs instructions against input tape

---

## Data Structures

### Prog (Program)

A compiled regex program containing VM instructions.

```typescript
import { Prog } from 'tlex';

class Prog {
  instrs: Instr[];                    // Instruction array
  stateMapping: Map<string, number>;  // Named states → indices

  // Properties
  get length(): number;               // Number of instructions

  // Methods
  add(opcode, char?, ...args): Instr; // Add instruction
  registerState(name: string): number; // Register a named state
  debugValue(): string[];              // Human-readable listing
}
```

### Instr (Instruction)

A single VM instruction.

```typescript
class Instr {
  opcode: OpCode;      // Operation type
  char: Char | null;   // Character matcher (for Char/CIChar opcodes)
  args: number[];      // Opcode-specific arguments
  offset: number;      // Position in program
  comment: string;     // Debug annotation
}
```

### Thread

An execution thread tracking a potential match path.

```typescript
class Thread {
  offset: number;              // Current instruction pointer
  gen: number;                 // Generation (for deduplication)
  id: number;                  // Unique thread ID
  parentId: number;            // Parent thread (for forks)
  priority: number;            // Match priority
  groups: [number, number][]; // Capture group positions
  positions: number[];         // Saved positions (Save opcode)
  registers: NumMap<number>;   // General-purpose registers
}
```

### VM (Virtual Machine)

The execution engine.

```typescript
class VM {
  // Configuration
  prog: Prog;        // The program to execute
  start: number;     // Start instruction index
  end: number;       // End instruction index
  forward: boolean;  // Direction (forward or reverse for lookbehind)

  // State
  currState: number; // Current lexer state (for EnsureState)

  // Main API
  match(tape: Tape): Match | null;
  getState(): number;
  setState(state: number): void;
}
```

---

## Instruction Set (OpCode)

### Character Matching

| OpCode | Description | Example |
|--------|-------------|---------|
| `Any` | Match any character | `.` |
| `AnyNonNL` | Match any except newline | `.` (without dotAll) |
| `Char` | Match character/class | `a`, `[a-z]`, `\d` |
| `CIChar` | Case-insensitive match | `/a/i` |

### Control Flow

| OpCode | Args | Description |
|--------|------|-------------|
| `Jump` | `target` | Unconditional jump to instruction |
| `Split` | `target1, target2, ...` | Fork execution to multiple paths |
| `Match` | `priority, matchIndex` | Successful match (end state) |
| `Noop` | - | No operation |

### Position Assertions

| OpCode | Description | Regex |
|--------|-------------|-------|
| `StartingChar` | Start of input | `^` |
| `EndingChar` | End of input | `$` |
| `MLStartingChar` | Start of input/line | `^` with multiline |
| `MLEndingChar` | End of input/line | `$` with multiline |
| `StartOfWord` | Word boundary start | `\b` |
| `EndOfWord` | Word boundary end | `\b` |

### Capture Groups

| OpCode | Args | Description |
|--------|------|-------------|
| `Save` | `positionIndex` | Save current tape position |
| `GroupStart` | `groupIndex` | Begin capture group |
| `GroupEnd` | `groupIndex` | End capture group |

### Lookahead/Lookbehind

| OpCode | Args | Description |
|--------|------|-------------|
| `Begin` | `consume, negate, endOffset` | Start lookahead region |
| `RBegin` | `groupIndex, negate, endOffset` | Start lookbehind (reverse) |
| `End` | - | End lookahead/lookbehind region |

### State Management

| OpCode | Args | Description |
|--------|------|-------------|
| `EnsureState` | `state1, state2, ...` | Only proceed if in matching state |

---

## Execution Model

### Thompson NFA Algorithm

The VM maintains two lists of threads: `currThreads` (processing current character) and `nextThreads` (awaiting next character).

```text
Input: "ab"
Pattern: /a+b/

Step 0: Start
  currThreads: [Thread@L0]   // L0: Char 'a'

Step 1: Read 'a'
  Thread@L0 matches 'a', advances to L1
  currThreads: []
  nextThreads: [Thread@L1]   // L1: Split L0,L2

Step 2: Process epsilon transitions
  Thread@L1 splits into L0 (more 'a's) and L2 ('b')
  currThreads: [Thread@L0, Thread@L2]

Step 3: Read 'b'
  Thread@L0 fails (expected 'a')
  Thread@L2 matches 'b', advances to L3
  nextThreads: [Thread@L3]   // L3: Match

Step 4: Match!
  Thread@L3 is a Match instruction → success
```

### Thread Deduplication

To prevent exponential blowup, the VM tracks which instructions have been visited in the current "generation":

```typescript
// genForOffset[offset] stores the generation when offset was last visited
if (genForOffset[thread.offset] === currentGen) {
  return; // Skip duplicate - already have a thread here this gen
}
genForOffset[thread.offset] = currentGen;
```

This ensures O(m) threads per input character, giving O(nm) total time.

### Epsilon Transitions

Instructions that don't consume input are processed immediately via `addThread`:

```typescript
addThread(thread, list, tape) {
  switch (instr.opcode) {
    case OpCode.Jump:
      // Follow jump immediately
      addThread(jumpTo(thread, target), list, tape);
      break;

    case OpCode.Split:
      // Fork to all targets immediately
      for (const target of instr.args) {
        addThread(forkTo(thread, target), list, tape);
      }
      break;

    case OpCode.Char:
      // Consuming instruction - defer to list
      list.push(thread);
      break;
  }
}
```

### Character Stepping

The main loop processes one character at a time:

```typescript
match(tape: Tape): Match | null {
  startMatching(tape);
  let bestMatch = null;

  while (currThreads.length > 0) {
    gen++;  // New generation

    for (const thread of currThreads) {
      const match = stepThread(tape, thread);
      if (match && isBetterMatch(match, bestMatch)) {
        bestMatch = match;
      }
    }

    tape.advance(1);
    currThreads = nextThreads;
    nextThreads = [];
  }

  return bestMatch;
}
```

---

## Match Priority

When multiple patterns can match, TLEX uses priority to determine the winner:

```typescript
class Match {
  priority: number;    // Higher = more preferred
  matchIndex: number;  // Rule index in tokenizer
  start: number;       // Match start position
  end: number;         // Match end position
}
```

Priority resolution:
1. **Higher priority wins** (configurable per rule)
2. **Longer match wins** (maximal munch) for equal priority
3. **Earlier rule wins** for equal priority and length

---

## Lookahead Implementation

### Positive Lookahead `(?=...)`

```text
Pattern: a(?=b)

L0: Char 'a'
L1: Begin 0 0 L3    # consume=0, negate=0, end=L3
L2: Char 'b'
L3: End
L4: Match

When L1 is reached:
1. Save current tape position
2. Create sub-VM for L2-L3
3. If sub-match succeeds, continue to L4
4. Restore tape position (lookahead doesn't consume)
```

### Negative Lookahead `(?!...)`

Same as positive, but `negate=1` - success if sub-match *fails*.

### Lookbehind `(?<=...)` / `(?<!...)`

Uses `RBegin` with `forward=false`:

```text
Pattern: (?<=a)b

L0: Save 0                    # Save current position as group 0
L1: RBegin 0 0 L3             # groupIndex=0, negate=0, end=L3
L2: Char 'a'                  # Matched in reverse
L3: End
L4: Char 'b'
L5: Match

When L1 is reached:
1. Get position from group 0
2. Create sub-VM starting at that position, going backwards
3. Execute L2-L3 in reverse direction
4. If reverse match succeeds, continue to L4
```

---

## State Management

TLEX supports lexer states (Flex-style start conditions) via `EnsureState`:

```typescript
// Rule: <STRING>"  → only match in STRING state
L0: EnsureState 1       // State index for "STRING"
L1: Char '"'
L2: Match
```

The VM checks `currState` against allowed states and only continues if there's a match.

**API for Incremental Lexing:**

```typescript
const vm = tokenizer.getVM();

// Save state for incremental restart
const savedState = vm.getState();

// Later, restore state
vm.setState(savedState);
```

---

## Compiled Program Example

Pattern: `[a-z]+`

```text
L0: Char [a-z]        # Match one lowercase letter
L1: Split L0, L2      # Try more letters, or proceed to match
L2: Match 10 0        # Priority 10, rule index 0
```

Pattern: `if|[a-z]+` (keyword with fallback)

```text
L0: Split L1, L4      # Try 'if' first, then identifier
L1: Char 'i'
L2: Char 'f'
L3: Match 20 0        # 'if' has higher priority
L4: Char [a-z]
L5: Split L4, L6
L6: Match 10 1        # identifier has lower priority
```

---

## Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|-----------------|-------|
| Match | O(nm) | n = input, m = pattern size |
| Thread creation | O(1) amortized | Pooling possible |
| Split processing | O(k) | k = number of alternatives |
| Lookahead | O(nm) per assertion | Nested VMs |

**Memory**: O(m) threads maximum at any time due to deduplication.

**Worst case**: Patterns with many overlapping alternatives (e.g., `a*a*a*...`) still run in O(nm) time, unlike backtracking engines which can take exponential time.

---

## Debugging

Get a human-readable program listing:

```typescript
import { compile } from 'tlex';

const prog = compile(/[a-z]+/);
console.log(prog.debugValue().join('\n'));

// Output:
// L0: Char [a-z]
// L1: Split 0, 2
// L2: Match 10 0
```

---

## See Also

- [Regex AST](/tlex/concepts/regex-ast/) - How patterns are represented before compilation
- [Incremental Tokenizer](/tlex/reference/incremental-tokenizer/) - Uses VM state for efficient re-lexing
- [Tokenizer States](/tlex/reference/tokenizer-states/) - Flex-style start conditions
