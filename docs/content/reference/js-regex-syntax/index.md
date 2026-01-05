---
title: JavaScript Regex Syntax
description: JavaScript regular expression syntax supported by TLEX
section: reference
---

## Overview

TLEX supports standard JavaScript RegExp syntax for defining patterns. You can use native `RegExp` objects or string patterns.

```typescript
// Native RegExp
tokenizer.add(/[0-9]+/, { tag: "NUMBER" });

// String pattern (parsed as JS regex)
tokenizer.add("[0-9]+", { tag: "NUMBER" });
```

## Character Literals

### Basic Characters

Most characters match themselves literally:

```typescript
/hello/     // Matches "hello"
/abc123/    // Matches "abc123"
```

### Escape Sequences

| Escape | Description |
|--------|-------------|
| `\n` | Newline |
| `\r` | Carriage return |
| `\t` | Tab |
| `\f` | Form feed |
| `\v` | Vertical tab |
| `\0` | Null character |
| `\\` | Backslash |
| `\/` | Forward slash |

### Unicode Escapes

```typescript
/\u0041/      // Matches "A" (hex code point)
/\x41/        // Matches "A" (hex byte)
```

## Character Classes

### Basic Classes

| Pattern | Description |
|---------|-------------|
| `[abc]` | Any character in set (a, b, or c) |
| `[^abc]` | Any character NOT in set |
| `[a-z]` | Character range (a through z) |
| `[a-zA-Z]` | Multiple ranges |
| `[a-z0-9_]` | Mixed ranges and literals |

### Predefined Classes

| Pattern | Equivalent | Description |
|---------|------------|-------------|
| `.` | `[^\n]` | Any character except newline |
| `\d` | `[0-9]` | Digit |
| `\D` | `[^0-9]` | Non-digit |
| `\w` | `[a-zA-Z0-9_]` | Word character |
| `\W` | `[^a-zA-Z0-9_]` | Non-word character |
| `\s` | `[ \t\n\r\f\v]` | Whitespace |
| `\S` | `[^ \t\n\r\f\v]` | Non-whitespace |

### Character Class Operations

```typescript
// Negation
/[^0-9]/     // Any non-digit

// Range with dash at end (literal dash)
/[a-z-]/     // a-z or literal dash

// Special chars in class
/[[\]\\]/    // Matches [, ], or \
```

## Quantifiers

### Basic Quantifiers

| Pattern | Description |
|---------|-------------|
| `*` | Zero or more (greedy) |
| `+` | One or more (greedy) |
| `?` | Zero or one (optional) |
| `{n}` | Exactly n times |
| `{n,}` | n or more times |
| `{n,m}` | Between n and m times |

### Examples

```typescript
/a*/        // "", "a", "aa", "aaa", ...
/a+/        // "a", "aa", "aaa", ...
/a?/        // "" or "a"
/a{3}/      // "aaa"
/a{2,4}/    // "aa", "aaa", or "aaaa"
/a{2,}/     // "aa", "aaa", "aaaa", ...
```

### Non-Greedy (Lazy) Quantifiers

Add `?` after a quantifier for non-greedy matching:

```typescript
/a*?/       // Zero or more (lazy)
/a+?/       // One or more (lazy)
/a??/       // Zero or one (lazy)
/a{2,4}?/   // 2 to 4 (lazy - prefers 2)
```

## Anchors

| Pattern | Description |
|---------|-------------|
| `^` | Start of input (or line with multiline flag) |
| `$` | End of input (or line with multiline flag) |
| `\b` | Word boundary |
| `\B` | Non-word boundary |

### Examples

```typescript
/^hello/    // "hello" at start of input
/world$/    // "world" at end of input
/\bword\b/  // "word" as whole word
/\Bword/    // "word" not at word boundary
```

## Groups

### Capturing Groups

Parentheses create capturing groups:

```typescript
/(abc)/           // Capture "abc"
/(\d+)-(\d+)/     // Capture two number groups
```

Groups are numbered left-to-right starting from 1.

### Non-Capturing Groups

Use `(?:...)` for grouping without capture:

```typescript
/(?:abc)+/        // Match "abc" one or more times, no capture
/(?:red|blue)/    // Match "red" or "blue", no capture
```

### Named Groups

Use `(?<name>...)` to name a group:

```typescript
/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
```

### Backreferences

Reference previously captured groups:

```typescript
/(\w+)\s+\1/       // Numeric backreference: "word word"
/(?<word>\w+)\s+\k<word>/  // Named backreference
```

## Alternation

Use `|` for alternatives:

```typescript
/cat|dog/         // "cat" or "dog"
/red|green|blue/  // Any of the three colors
/(cat|dog)s?/     // "cat", "cats", "dog", or "dogs"
```

## Lookahead and Lookbehind

### Positive Lookahead

`(?=...)` matches if followed by pattern (without consuming):

```typescript
/foo(?=bar)/      // "foo" only if followed by "bar"
/\d+(?=px)/       // Digits only if followed by "px"
```

### Negative Lookahead

`(?!...)` matches if NOT followed by pattern:

```typescript
/foo(?!bar)/      // "foo" only if NOT followed by "bar"
/\d+(?!%)/        // Digits NOT followed by "%"
```

### Positive Lookbehind

`(?<=...)` matches if preceded by pattern:

```typescript
/(?<=\$)\d+/      // Digits preceded by "$"
/(?<=@)\w+/       // Word chars preceded by "@"
```

### Negative Lookbehind

`(?<!...)` matches if NOT preceded by pattern:

```typescript
/(?<!\$)\d+/      // Digits NOT preceded by "$"
/(?<!un)happy/    // "happy" NOT preceded by "un"
```

## Flags

When using `RegExp` objects, flags modify matching behavior:

| Flag | Description |
|------|-------------|
| `i` | Case-insensitive matching |
| `m` | Multiline mode (^ and $ match line boundaries) |
| `s` | Dotall mode (. matches newlines) |
| `u` | Unicode mode |

```typescript
tokenizer.add(/hello/i, { tag: "GREETING" });  // Case-insensitive
tokenizer.add(/^line$/m, { tag: "LINE" });     // Multiline
```

## Common Patterns

### Numbers

```typescript
/[0-9]+/                    // Integer
/[0-9]+\.[0-9]+/           // Simple decimal
/[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/  // Scientific notation
/-?[0-9]+/                  // Signed integer
/0x[0-9a-fA-F]+/           // Hexadecimal
/0b[01]+/                   // Binary
/0o[0-7]+/                  // Octal
```

### Strings

```typescript
/"[^"]*"/                   // Simple double-quoted
/'[^']*'/                   // Simple single-quoted
/"([^"\\]|\\.)*"/          // Double-quoted with escapes
/`([^`\\]|\\.)*`/          // Template literal
```

### Identifiers

```typescript
/[a-zA-Z_][a-zA-Z0-9_]*/   // C-style identifier
/[a-zA-Z$_][a-zA-Z0-9$_]*/ // JavaScript identifier
/[a-z][a-z0-9-]*/i         // Kebab-case (case-insensitive)
```

### Whitespace & Comments

```typescript
/\s+/                       // Whitespace
/\/\/.*/                    // Single-line comment
/\/\*[\s\S]*?\*\//         // Multi-line comment (non-greedy)
```

### URLs and Emails

```typescript
/https?:\/\/[^\s]+/         // Simple URL
/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/  // Email
```

## Differences from Standard JavaScript

TLEX's regex engine is designed for tokenization and has some differences:

1. **No global flag** - Each rule matches once at the current position
2. **Longest match** - TLEX uses longest-match semantics by default
3. **Priority-based** - Use rule priority for disambiguation
4. **Compiled to NFA** - Internally uses Thompson NFA for execution

## Performance Tips

1. **Anchor when possible** - Use `^` for patterns that must start at position
2. **Avoid backtracking** - Prefer specific patterns over `.*`
3. **Use character classes** - `[aeiou]` is faster than `a|e|i|o|u`
4. **Priority over complexity** - Use simple patterns with priority rules
