---
title: Incremental Tokenizer
description: API reference for incremental lexing
section: reference
---

The `IncrementalTokenizer` enables efficient re-tokenization of large documents by only processing affected portions after edits. Based on Tim Wagner & Susan Graham's "General Incremental Lexical Analysis" (1999).

## Overview

Traditional tokenization processes the entire input on every change. Incremental tokenization:

- Tracks lexer state at each token boundary
- Finds the minimal affected region after an edit
- Re-tokenizes only until convergence with cached tokens
- Achieves sub-millisecond updates for typical edits

## Basic Usage

```typescript
import { Tokenizer, IncrementalTokenizer } from "tlex";

// Create base tokenizer with your rules
const tokenizer = new Tokenizer();
tokenizer.add(/[0-9]+/, { tag: "NUMBER" });
tokenizer.add(/[a-z]+/, { tag: "IDENT" });
tokenizer.add(/\s+/, { tag: "WS", skip: true });

// Wrap with IncrementalTokenizer
const incTokenizer = new IncrementalTokenizer(tokenizer);

// Initial tokenization (full scan)
const tokens = incTokenizer.tokenize("hello 123 world");

// After an edit - only affected region is re-tokenized
const newTokens = incTokenizer.update("hello 456 world", {
  start: 6,
  end: 9,
  newText: "456"
});
```

---

## IncrementalTokenizer

### Constructor

```typescript
const incTokenizer = new IncrementalTokenizer(tokenizer: Tokenizer);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tokenizer` | `Tokenizer` | Base tokenizer with rules configured |

---

## Core Methods

### tokenize(input)

Perform full tokenization with state tracking. This establishes the initial token cache.

```typescript
const tokens = incTokenizer.tokenize("function add(a, b) { return a + b; }");
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` | Complete input text |

**Returns:** `Token[]` - All tokens with state information

### update(newInput, edit)

Apply a single edit and return updated tokens. This is the primary incremental update method.

```typescript
const edit = {
  start: 9,      // Start offset in old input
  end: 12,       // End offset in old input (exclusive)
  newText: "multiply"  // Replacement text
};

const tokens = incTokenizer.update(newInput, edit);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newInput` | `string` | The complete new input text |
| `edit` | `EditRange` | Description of the edit |

**Returns:** `Token[]` - Updated token array

### updateBatch(newInput, edits)

Apply multiple edits in a single update. Edits should be provided in document order (ascending by start position).

```typescript
const edits = [
  { start: 0, end: 0, newText: "// Comment\n" },  // Insert at start
  { start: 20, end: 25, newText: "" },            // Delete at offset 20
];

const tokens = incTokenizer.updateBatch(newInput, edits);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newInput` | `string` | The complete new input text |
| `edits` | `EditRange[]` | Array of edits in document order |

**Returns:** `Token[]` - Updated token array

---

## Token Access Methods

### getTokens()

Get all tokens with positions fully materialized.

```typescript
const tokens = incTokenizer.getTokens();
```

**Returns:** `Token[]`

### getTokenAt(offset)

Get the token containing the given character offset using binary search. O(log n) complexity.

```typescript
const token = incTokenizer.getTokenAt(15);
if (token) {
  console.log(`Token at offset 15: ${token.tag} = "${token.value}"`);
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `offset` | `number` | Character offset in input |

**Returns:** `Token | null`

### getTokensInRange(start, end)

Get all tokens overlapping the given character range.

```typescript
// Get tokens in selection
const tokens = incTokenizer.getTokensInRange(10, 50);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `start` | `number` | Range start offset |
| `end` | `number` | Range end offset |

**Returns:** `Token[]`

### getInput()

Get the current input text.

```typescript
const currentText = incTokenizer.getInput();
```

**Returns:** `string`

---

## Character-by-Character Editing

For real-time editor integration, the IncrementalTokenizer supports character-by-character edit accumulation. Edits are batched and applied together for efficiency.

### configureAccumulator(config, onUpdate)

Configure edit accumulation behavior.

```typescript
incTokenizer.configureAccumulator(
  {
    maxEdits: 10,      // Flush after 10 edits
    maxDelayMs: 16     // Or after 16ms (one frame)
  },
  (tokens) => {
    // Called when accumulated edits are applied
    renderTokens(tokens);
  }
);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `EditAccumulatorConfig` | Accumulation settings |
| `onUpdate` | `(tokens: Token[]) => void` | Callback on flush |

### insertChar(position, char)

Insert a single character. Returns `true` if edits were flushed.

```typescript
// User types 'a' at position 5
const flushed = incTokenizer.insertChar(5, 'a');
```

### deleteChar(position)

Delete a single character at the given position.

```typescript
// User presses backspace at position 5
incTokenizer.deleteChar(5);
```

### replaceChar(position, char)

Replace a single character at the given position.

```typescript
// User overwrites character at position 5
incTokenizer.replaceChar(5, 'x');
```

### accumulateEdit(edit)

Add any edit to the accumulator.

```typescript
incTokenizer.accumulateEdit({
  start: 10,
  end: 15,
  newText: "new"
});
```

### flushAccumulatedEdits()

Immediately flush all accumulated edits.

```typescript
const tokens = incTokenizer.flushAccumulatedEdits();
```

---

## EditRange Interface

```typescript
interface EditRange {
  /** Start offset in the old input */
  start: number;

  /** End offset in the old input (exclusive) */
  end: number;

  /** Replacement text (empty string for deletion) */
  newText: string;
}
```

### Common Edit Patterns

```typescript
// Insert "hello" at position 10
{ start: 10, end: 10, newText: "hello" }

// Delete characters 10-15
{ start: 10, end: 15, newText: "" }

// Replace characters 10-15 with "world"
{ start: 10, end: 15, newText: "world" }
```

---

## EditAccumulatorConfig Interface

```typescript
interface EditAccumulatorConfig {
  /** Maximum edits to accumulate before flushing (default: 10) */
  maxEdits?: number;

  /** Maximum delay in ms before flushing (default: 16) */
  maxDelayMs?: number;
}
```

---

## Token State Fields

When using incremental tokenization, tokens include additional state information:

| Field | Type | Description |
|-------|------|-------------|
| `state` | `number` | Lexer state when token was constructed |
| `lookahead` | `number` | Characters read beyond token's lexeme |
| `lookback` | `number` | Tokens back with lookahead reaching here |

These fields enable the incremental algorithm to determine where to restart tokenization and when convergence is achieved.

---

## How It Works

### Token-Based State Tracking

Each token stores the lexer state at its construction point. When an edit occurs:

1. **Find affected token** - Binary search for first token containing/after the edit
2. **Apply lookback** - Go back by lookback count to find restart point
3. **Restore state** - Reset lexer to state from preceding token
4. **Re-tokenize** - Process input until convergence
5. **Detect convergence** - Stop when tag + position + state match cached token

### Convergence Example

```text
Before edit: "hello world"
Tokens: IDENT("hello") WS(" ") IDENT("world")

Edit: Insert "123 " at position 6

After edit: "hello 123 world"
           ^---- re-lex from here

Re-lexing produces:
- WS(" ") at 5-6      // Different from original WS
- NUMBER("123") at 6-9 // New token
- WS(" ") at 9-10     // New token
- IDENT("world") at 10-15 // Matches original (adjusted +4)
                          // State matches → CONVERGED!

Only 4 tokens re-lexed instead of 5
```

### Lazy Position Updates

For performance, suffix token positions are updated lazily:

- Suffix tokens keep their original positions with a pending delta
- Positions are materialized on access (getTokens, getTokenAt, etc.)
- Reduces copying for large files with small edits

---

## Performance Characteristics

| Operation | Complexity |
|-----------|------------|
| Initial tokenize | O(n) |
| Single edit update | O(k + log n) where k = affected tokens |
| getTokenAt | O(log n) |
| getTokensInRange | O(log n + m) where m = tokens in range |

For typical editing operations (single character changes), expect sub-millisecond updates even on large files (100k+ lines).

---

## Best Practices

1. **Reuse the IncrementalTokenizer** - Create once, update many times
2. **Use edit accumulation for typing** - Batch rapid keystrokes
3. **Compute minimal edits** - Smaller edits = faster updates
4. **Keep tokenizer stateless** - Avoid side effects in match callbacks

---

## See Also

- [Editor Integration Guide](/tlex/guides/editor-integration/) - Full integration tutorial
- [API Reference](/tlex/reference/api/) - Core Tokenizer API
- [Tokenizer States](/tlex/reference/tokenizer-states/) - State management
