---
title: Tokenizer States
description: State-based tokenization
section: reference
---

## Overview

Tokenizer states allow context-sensitive tokenization, similar to Flex start conditions.

## Defining States

```typescript
const lexer = new Tokenizer();

// Rule active only in STRING state
lexer.add(/[^"]+/, {
  tag: "STRING_CONTENT",
  activeStates: new Set(["STRING"])
});

// Transition to STRING state
lexer.add(/"/, { tag: "QUOTE" }, (rule, tape, token) => {
  lexer.pushState("STRING");
  return token;
});
```

## State Stack

- `pushState(name)` - Push a new state
- `popState()` - Return to previous state
- `currentState` - Get current state

## Example: String Parsing

```typescript
// Handle escape sequences inside strings
lexer.add(/\\./, {
  tag: "ESCAPE",
  activeStates: new Set(["STRING"])
});
```
