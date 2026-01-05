---
title: Tokenizer States
description: State-based tokenization
section: reference
---

## Overview

Tokenizer states enable context-sensitive tokenization, similar to Flex start conditions. Rules can be restricted to only match in specific states, allowing you to handle constructs like string literals, comments, and nested structures where the same character sequence has different meanings in different contexts.

## The activeStates Option

Use the `activeStates` option to restrict a rule to specific states:

```typescript
import { Tokenizer } from "tlex";

const tokenizer = new Tokenizer();

// Rules without activeStates match in all states (including INITIAL)
tokenizer.add(/[a-z]+/, { tag: "IDENTIFIER" });

// Rule only matches in STRING state
tokenizer.add(/[^"\\]+/, {
  tag: "STRING_CONTENT",
  activeStates: new Set(["STRING"])
});

// Rule matches in multiple states
tokenizer.add(/\n/, {
  tag: "NEWLINE",
  activeStates: new Set(["INITIAL", "COMMENT"])
});

// Wildcard "*" matches all states (same as no activeStates)
tokenizer.add(/\s+/, {
  tag: "WHITESPACE",
  skip: true,
  activeStates: new Set(["*"])
});
```

## State Matching Rules

1. **No activeStates** - Rule matches in all states
2. **Empty Set** - Rule matches in all states
3. **Set with "*"** - Rule matches in all states (explicit wildcard)
4. **Set with state names** - Rule only matches when current state is in the set

```typescript
// These are equivalent - all match in any state
tokenizer.add(/pattern/, { tag: "A" });
tokenizer.add(/pattern/, { tag: "B", activeStates: new Set() });
tokenizer.add(/pattern/, { tag: "C", activeStates: new Set(["*"]) });

// This only matches in INITIAL state
tokenizer.add(/pattern/, { tag: "D", activeStates: new Set(["INITIAL"]) });
```

## Managing State Transitions

State transitions are managed through match callbacks. Track the current state and update it when appropriate tokens are matched:

```typescript
import { Tokenizer, Tape } from "tlex";

// State management
let currentState = "INITIAL";
const stateStack: string[] = [];

function pushState(state: string) {
  stateStack.push(currentState);
  currentState = state;
}

function popState(): string {
  currentState = stateStack.pop() || "INITIAL";
  return currentState;
}

const tokenizer = new Tokenizer();

// Enter STRING state on opening quote
tokenizer.add(/"/, { tag: "STRING_START" }, (rule, tape, token) => {
  pushState("STRING");
  return token;
});

// Exit STRING state on closing quote
tokenizer.add(/"/, {
  tag: "STRING_END",
  activeStates: new Set(["STRING"])
}, (rule, tape, token) => {
  popState();
  return token;
});

// String content only in STRING state
tokenizer.add(/[^"\\]+/, {
  tag: "STRING_CONTENT",
  activeStates: new Set(["STRING"])
});

// Escape sequences in STRING state
tokenizer.add(/\\./, {
  tag: "ESCAPE_SEQUENCE",
  activeStates: new Set(["STRING"])
});
```

## Example: String Literal Parsing

Complete example for parsing string literals with escape sequences:

```typescript
import { Tokenizer, Token, Tape } from "tlex";

let inString = false;

const tokenizer = new Tokenizer();

// Normal tokens (outside strings)
tokenizer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER" });
tokenizer.add(/[0-9]+/, { tag: "NUMBER" });
tokenizer.add(/\s+/, { skip: true });

// Opening quote - enter string mode
tokenizer.add(/"/, { tag: "STRING_START" }, (rule, tape, token) => {
  inString = true;
  return token;
});

// Closing quote - exit string mode (only when in string)
tokenizer.add(/"/, {
  tag: "STRING_END",
  activeStates: new Set(["STRING"])
}, (rule, tape, token) => {
  inString = false;
  return token;
});

// String content
tokenizer.add(/[^"\\]+/, {
  tag: "STRING_CHARS",
  activeStates: new Set(["STRING"])
});

// Escape sequences
tokenizer.add(/\\[nrt"\\]/, {
  tag: "ESCAPE",
  activeStates: new Set(["STRING"])
}, (rule, tape, token) => {
  const escapeMap: Record<string, string> = {
    "\\n": "\n",
    "\\r": "\r",
    "\\t": "\t",
    '\\"': '"',
    "\\\\": "\\"
  };
  token.value = escapeMap[token.value] || token.value;
  return token;
});
```

## Example: Block Comments

Handling C-style block comments:

```typescript
let commentDepth = 0;

const tokenizer = new Tokenizer();

// Enter comment
tokenizer.add(/\/\*/, { tag: "COMMENT_START" }, (rule, tape, token) => {
  commentDepth++;
  return token;
});

// Exit comment (only when in comment)
tokenizer.add(/\*\//, {
  tag: "COMMENT_END",
  activeStates: new Set(["COMMENT"])
}, (rule, tape, token) => {
  commentDepth--;
  return commentDepth === 0 ? token : null; // Only emit when fully exited
});

// Comment content
tokenizer.add(/[^*]+|\*(?!\/)/, {
  tag: "COMMENT_CONTENT",
  activeStates: new Set(["COMMENT"]),
  skip: true // Skip comment content
});

// Regular tokens (outside comments)
tokenizer.add(/[a-z]+/, { tag: "WORD" });
tokenizer.add(/\s+/, { skip: true });
```

## Example: Nested Structures

Handling nested braces with depth tracking:

```typescript
let braceDepth = 0;

const tokenizer = new Tokenizer();

tokenizer.add(/\{/, { tag: "OPEN_BRACE" }, (rule, tape, token) => {
  braceDepth++;
  token.depth = braceDepth;
  return token;
});

tokenizer.add(/\}/, { tag: "CLOSE_BRACE" }, (rule, tape, token) => {
  token.depth = braceDepth;
  braceDepth--;
  if (braceDepth < 0) {
    throw new Error("Unmatched closing brace");
  }
  return token;
});

// Content inside braces (depth > 0)
tokenizer.add(/[^{}]+/, {
  tag: "BRACE_CONTENT",
  activeStates: new Set(["BRACES"])
});
```

## State-Aware Priority

When combining states with priority, both are considered:

```typescript
// In STRING state, escape has higher priority than content
tokenizer.add(/\\./, {
  tag: "ESCAPE",
  priority: 10,
  activeStates: new Set(["STRING"])
});

tokenizer.add(/[^"\\]+/, {
  tag: "CONTENT",
  priority: 0,
  activeStates: new Set(["STRING"])
});
```

## Best Practices

1. **Use INITIAL for default state** - Convention from Flex, represents the starting state

2. **Keep state logic simple** - Complex state machines are hard to debug

3. **Pair enter/exit rules** - Every state entry should have a corresponding exit

4. **Consider alternatives** - For simple cases, lookahead/lookbehind may be simpler than states

5. **Track depth for nesting** - Use a counter for structures that can nest

6. **Handle errors** - Check for unterminated strings/comments at end of input

## Comparison with Flex

| Feature | TLEX | Flex |
|---------|------|------|
| State declaration | Implicit (used in rules) | `%s STATE` or `%x STATE` |
| State restriction | `activeStates: new Set([...])` | `<STATE>pattern` |
| State transition | Manual in callbacks | `BEGIN(STATE)` |
| State stack | Manual implementation | `yy_push_state()`, `yy_pop_state()` |
| Inclusive states | Use `"*"` wildcard | `%s` declaration |
| Exclusive states | Default behavior | `%x` declaration |
