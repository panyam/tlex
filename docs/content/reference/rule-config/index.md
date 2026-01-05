---
title: Rule Configuration
description: Configuring tokenization rules
section: reference
---

## Rule Options

When adding rules, you can specify configuration options:

```typescript
lexer.add(pattern, {
  tag: "TOKEN_TYPE",      // Token identifier
  priority: 10,           // Higher priority wins conflicts
  skip: false,            // Skip this token (don't emit)
  activeStates: ["INITIAL"], // Only match in these states
});
```

## Configuration Properties

### tag

The token type identifier. Used to categorize tokens.

### priority

When multiple rules match at the same position, higher priority wins.

### skip

If `true`, the matched text is consumed but no token is emitted.

### activeStates

Set of lexer states where this rule is active.

## Callbacks

Rules can have callbacks for custom processing:

```typescript
lexer.add(/\d+/, { tag: "NUMBER" }, (rule, tape, token) => {
  token.value = parseInt(token.value, 10);
  return token;
});
```
