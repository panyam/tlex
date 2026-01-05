---
title: API Reference
description: Complete TLEX API documentation
section: reference
---

## Tokenizer

The main class for building and running lexers.

### Constructor

```typescript
import { Tokenizer } from "tlex";

const tokenizer = new Tokenizer();
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `allRules` | `Rule[]` | All registered tokenization rules |
| `variables` | `Map<string, Regex>` | Named regex variables for reuse |
| `onError` | `TokenizerErrorHandler \| null` | Custom error handler |

### Methods

#### add(pattern, config?, onMatch?)

Add a tokenization rule with a pattern.

```typescript
// Simple pattern with tag
tokenizer.add(/[0-9]+/, { tag: "NUMBER" });

// Pattern with priority
tokenizer.add(/[a-z]+/, { tag: "IDENT", priority: 1 });

// Skip whitespace
tokenizer.add(/\s+/, { tag: "WS", skip: true });

// With match callback
tokenizer.add(/[a-z]+/, { tag: "KEYWORD" }, (rule, tape, token) => {
  // Check if it's a reserved keyword
  if (["if", "else", "while"].includes(token.value)) {
    token.tag = "KEYWORD";
  } else {
    token.tag = "IDENT";
  }
  return token;
});

// Callback as second argument (config inferred)
tokenizer.add(/\/\/.*/, (rule, tape, token) => {
  // Skip comments by returning null
  return null;
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | `string \| RegExp \| Regex` | The pattern to match |
| `config` | `RuleConfig \| RuleMatchHandler` | Rule configuration or callback |
| `onMatch` | `RuleMatchHandler \| null` | Callback when rule matches |

**Returns:** `this` (for chaining)

#### addRule(rule, onMatch?)

Add a pre-built Rule object.

```typescript
import { Rule } from "tlex";

const rule = new Rule(/[0-9]+/, { tag: "NUMBER", priority: 10 });
tokenizer.addRule(rule);
```

#### on(tag, onMatch)

Register a callback for a specific token tag.

```typescript
tokenizer.on("STRING", (rule, tape, token) => {
  // Process all STRING tokens
  token.value = token.value.slice(1, -1); // Remove quotes
  return token;
});
```

#### tokenize(input)

Tokenize a string and return all tokens.

```typescript
const tokens = tokenizer.tokenize("hello 123 world");
// Returns: Token[]

for (const token of tokens) {
  console.log(`${token.tag}: "${token.value}" [${token.start}-${token.end}]`);
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string \| Tape` | Input string or Tape object |

**Returns:** `Token[]`

#### next(tape, owner?)

Get the next token from input. Used for streaming tokenization.

```typescript
import { Tape } from "tlex";

const tape = new Tape("hello 123");
let token;
while ((token = tokenizer.next(tape, null)) !== null) {
  console.log(token);
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `tape` | `Tape` | Input tape to read from |
| `owner` | `any` | Optional owner context passed to callbacks |

**Returns:** `Token | null`

#### addVar(name, regex)

Add a named variable for reuse in patterns.

```typescript
tokenizer.addVar("DIGIT", /[0-9]/);
// Now use {DIGIT} in flex-style patterns
```

#### getVar(name)

Get a named variable.

```typescript
const digitRegex = tokenizer.getVar("DIGIT");
```

---

## Token

Represents a matched token from the tokenizer.

### Constructor

```typescript
// Tokens are created by the tokenizer, not directly
const token = new Token(tag, matchIndex, start, end);
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Unique token identifier |
| `tag` | `string \| number` | Token type identifier |
| `value` | `any` | Matched string value |
| `start` | `number` | Start position in input |
| `end` | `number` | End position in input |
| `matchIndex` | `number` | Index of the rule that matched |
| `groups` | `NumMap<number[]>` | Captured group values |
| `positions` | `NumMap<[number, number]>` | Position data for groups |

### Methods

#### isOneOf(...expected)

Check if token matches any of the expected tags.

```typescript
if (token.isOneOf("NUMBER", "STRING", "IDENT")) {
  // Handle literal tokens
}
```

---

## TokenBuffer

A wrapper for lookahead parsing with buffering capabilities.

### Constructor

```typescript
import { TokenBuffer, Tape } from "tlex";

const tape = new Tape("input string");
const buffer = new TokenBuffer(
  (tape, owner) => tokenizer.next(tape, owner),
  null // owner context
);
```

### Methods

#### peek(tape, nth?)

Look ahead at the nth token without consuming it.

```typescript
const current = buffer.peek(tape);      // Current token
const next = buffer.peek(tape, 1);      // Next token
const third = buffer.peek(tape, 2);     // Two tokens ahead
```

#### next(tape)

Get and consume the next token.

```typescript
const token = buffer.next(tape);
```

#### consume()

Consume the current token (after peeking).

```typescript
const token = buffer.peek(tape);
if (token.tag === "EXPECTED") {
  buffer.consume();
}
```

#### consumeIf(tape, ...expected)

Consume token if it matches expected tags.

```typescript
const token = buffer.consumeIf(tape, "SEMICOLON", "NEWLINE");
if (token) {
  // Token was consumed
}
```

#### expectToken(tape, ...expected)

Expect and consume a token, throw if not matched.

```typescript
// Throws UnexpectedTokenError if not matched
const token = buffer.expectToken(tape, "OPEN_PAREN");
```

#### ensureToken(tape, ...expected)

Ensure next token matches without consuming.

```typescript
// Throws if not matched, doesn't consume
const token = buffer.ensureToken(tape, "CLOSE_PAREN");
```

#### nextMatches(tape, ...expected)

Check if next token matches without consuming.

```typescript
if (buffer.nextMatches(tape, "COMMA")) {
  // Next token is a comma
}
```

---

## Tape

Input abstraction for character-by-character reading.

### Constructor

```typescript
import { Tape } from "tlex";

const tape = new Tape("input string");
const reverseTape = new Tape("input", false); // Read backwards
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | Current position in input |
| `forward` | `boolean` | Reading direction (true = forward) |
| `hasMore` | `boolean` | Whether more input is available |
| `currCh` | `string` | Character at current position |
| `prevCh` | `string` | Previous character |
| `nextCh` | `string` | Next character |

### Methods

#### advance(delta?)

Move the tape position.

```typescript
tape.advance();     // Move forward 1
tape.advance(3);    // Move forward 3
```

#### charAt(index)

Get character at specific index.

```typescript
const ch = tape.charAt(5);
```

#### substring(start, end)

Extract a substring.

```typescript
const str = tape.substring(0, 10);
```

#### push(content)

Append more content to the tape (for streaming).

```typescript
tape.push(" more input");
```

---

## Rule

Defines a tokenization rule with pattern and configuration.

### Constructor

```typescript
import { Rule } from "tlex";

const rule = new Rule(pattern, config);
```

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tag` | `any` | - | Token type identifier |
| `priority` | `number` | `0` | Higher priority wins on conflicts |
| `skip` | `boolean` | `false` | Skip this token (don't emit) |
| `matchIndex` | `number` | - | Index assigned by tokenizer |
| `pattern` | `string \| Regex` | - | The pattern to match |
| `expr` | `Regex` | - | Compiled regex expression |
| `activeStates` | `Set<string>` | - | States where rule is active |

---

## RuleConfig

Configuration options for tokenization rules.

```typescript
interface RuleConfig {
  tag?: any;              // Token type identifier
  priority?: number;      // Higher wins on conflicts (default: 0)
  skip?: boolean;         // Skip token (don't emit)
  matchIndex?: number;    // Internal use
  activeStates?: Set<string>; // Active lexer states
}
```

### Priority

When multiple rules can match at the same position, priority determines the winner:

```typescript
// Keywords have higher priority than identifiers
tokenizer.add(/if|else|while/, { tag: "KEYWORD", priority: 10 });
tokenizer.add(/[a-z]+/, { tag: "IDENT", priority: 0 });

// "if" matches KEYWORD (priority 10), not IDENT (priority 0)
```

### Skip

Use `skip: true` for tokens that should be recognized but not emitted:

```typescript
// Skip whitespace
tokenizer.add(/\s+/, { tag: "WS", skip: true });

// Skip comments
tokenizer.add(/\/\/.*/, { tag: "COMMENT", skip: true });
tokenizer.add(/\/\*[\s\S]*?\*\//, { tag: "BLOCK_COMMENT", skip: true });
```

---

## RuleMatchHandler

Callback function type for handling matched tokens.

```typescript
type RuleMatchHandler = (
  rule: Rule,
  tape: Tape,
  token: Token,
  owner: any
) => Token | null;
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `rule` | `Rule` | The rule that matched |
| `tape` | `Tape` | The input tape |
| `token` | `Token` | The matched token |
| `owner` | `any` | Owner context from tokenize/next call |

**Returns:**
- `Token` - The token to emit (can be modified)
- `null` - Skip this token

### Example: Keyword Detection

```typescript
const KEYWORDS = new Set(["if", "else", "while", "for", "return"]);

tokenizer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENT" }, (rule, tape, token) => {
  if (KEYWORDS.has(token.value)) {
    token.tag = "KEYWORD";
  }
  return token;
});
```

### Example: String Unescaping

```typescript
tokenizer.add(/"([^"\\]|\\.)*"/, { tag: "STRING" }, (rule, tape, token) => {
  // Remove quotes and unescape
  token.value = token.value
    .slice(1, -1)
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"');
  return token;
});
```

---

## Error Handling

### TokenizerError

Base error class for tokenization errors.

```typescript
import { TokenizerError } from "tlex";

try {
  const tokens = tokenizer.tokenize("invalid @ input");
} catch (err) {
  if (err instanceof TokenizerError) {
    console.log(`Error at position ${err.offset}: ${err.message}`);
  }
}
```

### Custom Error Handler

```typescript
tokenizer.onError = (error, tape, startIndex) => {
  console.warn(`Skipping invalid character at ${startIndex}`);
  tape.advance(); // Skip the bad character
  return null;    // Continue tokenizing (return error to stop)
};
```

---

## Builder Functions

Helper functions for creating patterns.

### build(pattern, config?)

Convert various pattern types to a Rule.

```typescript
import { build } from "tlex";

const rule = build(/[0-9]+/, { tag: "NUMBER" });
const rule2 = build("[0-9]+", { tag: "NUMBER" }); // String pattern
```

### Template Literals

```typescript
import { jsRE, flexRE } from "tlex";

// JavaScript regex syntax
const jsPattern = jsRE`[0-9]+`;

// Flex regex syntax
const flexPattern = flexRE`[0-9]+`;
```
