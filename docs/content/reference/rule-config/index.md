---
title: Rule Configuration
description: Configuring tokenization rules
section: reference
useExamples: true
---

## Overview

When adding tokenization rules, you can configure how they match, what priority they have, and how matched tokens are processed. This page covers all available configuration options.

```typescript
import { Tokenizer } from "tlex";

const tokenizer = new Tokenizer();

// Full configuration example
tokenizer.add(/pattern/, {
  tag: "TOKEN_TYPE",           // Token identifier
  priority: 10,                // Higher priority wins conflicts
  skip: false,                 // Skip this token (don't emit)
  activeStates: new Set(["INITIAL"]), // Only match in these states
});
```

## RuleConfig Interface

```typescript
interface RuleConfig {
  tag?: any;                    // Token type identifier
  priority?: number;            // Rule priority (default: 0)
  skip?: boolean;               // Skip token (default: false)
  matchIndex?: number;          // Internal: assigned by tokenizer
  activeStates?: Set<string>;   // States where rule is active
}
```

## Configuration Properties

### tag

The token type identifier. Can be a string, number, or any value. Used to categorize and identify tokens during parsing.

```typescript
// String tags (most common)
tokenizer.add(/[0-9]+/, { tag: "NUMBER" });
tokenizer.add(/[a-z]+/, { tag: "IDENTIFIER" });

// Numeric tags (for enum-based parsers)
enum TokenType { NUMBER = 1, IDENT = 2 }
tokenizer.add(/[0-9]+/, { tag: TokenType.NUMBER });

// Symbol tags (for unique identifiers)
const NUMBER = Symbol("NUMBER");
tokenizer.add(/[0-9]+/, { tag: NUMBER });
```

### priority

When multiple rules can match at the same position with the same length, higher priority wins. Default is `0`.

```typescript
// Keywords have higher priority than identifiers
tokenizer.add(/if|else|while|for|return/, { tag: "KEYWORD", priority: 10 });
tokenizer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER", priority: 0 });

// Input "if" matches KEYWORD (priority 10), not IDENTIFIER (priority 0)
```

**Priority Resolution:**

1. Longest match wins (regardless of priority)
2. Among equal-length matches, highest priority wins
3. Among equal-length and equal-priority matches, first rule added wins

```typescript
// Both match "123" with same length
tokenizer.add(/[0-9]+/, { tag: "INTEGER", priority: 0 });
tokenizer.add(/[0-9]+/, { tag: "NUMBER", priority: 5 });
// "123" → NUMBER (higher priority)

// Different lengths - longest wins
tokenizer.add(/if/, { tag: "KEYWORD", priority: 100 });
tokenizer.add(/[a-z]+/, { tag: "IDENTIFIER", priority: 0 });
// "iffy" → IDENTIFIER (longer match, despite lower priority)
```

### skip

When `true`, the matched text is consumed but no token is emitted. Useful for whitespace and comments.

```typescript
// Skip whitespace
tokenizer.add(/\s+/, { tag: "WS", skip: true });

// Skip single-line comments
tokenizer.add(/\/\/.*/, { tag: "COMMENT", skip: true });

// Skip multi-line comments
tokenizer.add(/\/\*[\s\S]*?\*\//, { tag: "BLOCK_COMMENT", skip: true });
```

**Note:** You can also skip tokens by returning `null` from a callback, which provides more flexibility for conditional skipping.

### activeStates

Restricts the rule to only match when the tokenizer is in one of the specified states. See [Tokenizer States](/tlex/reference/tokenizer-states/) for detailed state machine documentation.

```typescript
// String content only matches inside STRING state
tokenizer.add(/[^"\\]+/, {
  tag: "STRING_CONTENT",
  activeStates: new Set(["STRING"])
});

// Block comment content only matches inside COMMENT state
tokenizer.add(/[^*]+|\*(?!\/)/, {
  tag: "COMMENT_CONTENT",
  activeStates: new Set(["BLOCK_COMMENT"])
});
```

## Match Callbacks

Callbacks provide powerful control over token processing. They run after a rule matches and can modify or skip tokens.

### Callback Signature

```typescript
type RuleMatchHandler = (
  rule: Rule,       // The rule that matched
  tape: Tape,       // Input tape (for reading context)
  token: Token,     // The matched token
  owner: any        // Owner context from tokenize/next call
) => Token | null;  // Return token to emit, null to skip
```

### Adding Callbacks

```typescript
// As third argument to add()
tokenizer.add(/pattern/, { tag: "TOKEN" }, (rule, tape, token) => {
  // Process token
  return token;
});

// As second argument (config inferred)
tokenizer.add(/pattern/, (rule, tape, token) => {
  token.tag = "INFERRED_TAG";
  return token;
});

// Using on() for tag-based callbacks
tokenizer.on("STRING", (rule, tape, token) => {
  token.value = token.value.slice(1, -1); // Remove quotes
  return token;
});
```

### Common Callback Patterns

**Keyword Detection:**

```typescript
const KEYWORDS = new Set(["if", "else", "while", "for", "return", "function"]);

tokenizer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER" }, (rule, tape, token) => {
  if (KEYWORDS.has(token.value)) {
    token.tag = "KEYWORD";
  }
  return token;
});
```

**Numeric Conversion:**

```typescript
tokenizer.add(/[0-9]+/, { tag: "INTEGER" }, (rule, tape, token) => {
  token.numValue = parseInt(token.value, 10);
  return token;
});

tokenizer.add(/[0-9]+\.[0-9]+/, { tag: "FLOAT" }, (rule, tape, token) => {
  token.numValue = parseFloat(token.value);
  return token;
});
```

**String Unescaping:**

```typescript
tokenizer.add(/"([^"\\]|\\.)*"/, { tag: "STRING" }, (rule, tape, token) => {
  // Remove quotes and process escapes
  token.value = token.value
    .slice(1, -1)
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"');
  return token;
});
```

**Conditional Skipping:**

```typescript
// Skip comments unless in debug mode
const DEBUG = false;

tokenizer.add(/\/\/.*/, { tag: "COMMENT" }, (rule, tape, token) => {
  return DEBUG ? token : null;
});
```

**Nested Structure Handling:**

```typescript
// Track nesting depth
let braceDepth = 0;

tokenizer.add(/\{/, { tag: "OPEN_BRACE" }, (rule, tape, token) => {
  braceDepth++;
  token.depth = braceDepth;
  return token;
});

tokenizer.add(/\}/, { tag: "CLOSE_BRACE" }, (rule, tape, token) => {
  token.depth = braceDepth;
  braceDepth--;
  return token;
});
```

## Rule Class

For advanced use cases, you can create Rule objects directly:

```typescript
import { Rule, Builder } from "tlex";

// Create rule with full control
const rule = new Rule(
  Builder.exprFromJSRE(/[0-9]+/),  // Compiled regex
  { tag: "NUMBER", priority: 5 }
);

tokenizer.addRule(rule, (rule, tape, token) => {
  token.numValue = parseInt(token.value, 10);
  return token;
});
```

### Rule Properties

| Property | Type | Description |
|----------|------|-------------|
| `tag` | `any` | Token type identifier |
| `priority` | `number` | Rule priority (higher wins) |
| `skip` | `boolean` | Whether to skip matched tokens |
| `matchIndex` | `number` | Index assigned by tokenizer |
| `pattern` | `string \| Regex` | Original pattern |
| `expr` | `Regex` | Compiled regex expression |
| `activeStates` | `Set<string>` | Active states for this rule |

## Try It Live

Experiment with rule priorities:

<div id="example-priority" data-example-runner data-example-config='{"rules": "%token KEYWORD /if|else|while|for/\n%token IDENTIFIER /[a-zA-Z_][a-zA-Z0-9_]*/\n%token NUMBER /[0-9]+/\n%skip /\\s+/", "input": "if x while identifier123 for"}'></div>

## Best Practices

1. **Use meaningful tag names** - Tags should clearly describe what the token represents

2. **Set priorities explicitly** - Don't rely on rule order for disambiguation

3. **Keep callbacks simple** - Complex logic belongs in the parser, not tokenizer

4. **Use skip for noise** - Whitespace and comments should typically be skipped

5. **Prefer specific patterns** - `if|else|while` is clearer than generic patterns with callbacks

6. **Document priority levels** - Establish a convention (e.g., keywords=10, operators=5, identifiers=0)
