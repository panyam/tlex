---
title: Regex AST
description: Understanding the regex abstract syntax tree
section: concepts
---

TLEX represents regular expressions as an Abstract Syntax Tree (AST). This allows for:
- Programmatic pattern construction
- Pattern analysis and optimization
- Support for multiple regex syntaxes (JavaScript, Flex)
- Reversible patterns for lookbehind assertions

## Node Hierarchy

```text
Regex (abstract base)
├── Anchors
│   ├── StartOfInput    (^)
│   ├── EndOfInput      ($)
│   ├── StartOfWord     (\b start)
│   └── EndOfWord       (\b end)
├── Assertions
│   ├── LookAhead       (?=...) (?!...)
│   └── LookBack        (?<=...) (?<!...)
├── Combinators
│   ├── Cat             (concatenation: ab)
│   ├── Union           (alternation: a|b)
│   └── Quant           (quantifiers: *, +, ?, {n,m})
├── Character Matchers
│   ├── LeafChar        (single chars, classes)
│   └── CharGroup       (ranges, unions)
└── References
    ├── Var             (named variables)
    ├── BackNamedRef    (\k<name>)
    └── BackNumRef      (\1, \2, etc.)
```

---

## Base Class: Regex

All AST nodes extend the abstract `Regex` class.

```typescript
import { Regex, RegexType } from 'tlex';
```

### Common Properties

| Property | Type | Description |
|----------|------|-------------|
| `tag` | `RegexType` | Node type identifier |
| `parent` | `Regex \| null` | Parent node in tree |
| `groupIndex` | `number` | Capture group index (-1 if not a group) |
| `groupName` | `string \| null` | Named capture group name |
| `groupIsSilent` | `boolean` | Non-capturing group flag |
| `ignoreCase` | `boolean \| null` | Case-insensitive flag |
| `dotAll` | `boolean \| null` | Dot matches newlines flag |
| `multiline` | `boolean \| null` | `^`/`$` match line boundaries |

### RegexType Enum

```typescript
enum RegexType {
  START_OF_INPUT,   // ^
  END_OF_INPUT,     // $
  START_OF_WORD,    // \b (word start)
  END_OF_WORD,      // \b (word end)
  UNION,            // a|b
  CAT,              // ab
  VAR,              // {variable}
  BACK_NAMED_REF,   // \k<name>
  BACK_NUM_REF,     // \1
  QUANT,            // *, +, ?, {n,m}
  LOOK_AHEAD,       // (?=...) (?!...)
  LOOK_BACK,        // (?<=...) (?<!...)
  CHAR,             // Character matchers
}
```

---

## Anchors

### StartOfInput / EndOfInput

Match the start (`^`) or end (`$`) of input.

```typescript
import { StartOfInput, EndOfInput } from 'tlex';

const start = new StartOfInput();  // Matches ^
const end = new EndOfInput();      // Matches $
```

With `multiline` flag, these also match at line boundaries.

### StartOfWord / EndOfWord

Match word boundaries (`\b`).

```typescript
import { StartOfWord, EndOfWord } from 'tlex';

const wordStart = new StartOfWord();  // \b at word start
const wordEnd = new EndOfWord();      // \b at word end
```

---

## Combinators

### Cat (Concatenation)

Matches patterns in sequence: `ab` matches "a" followed by "b".

```typescript
import { Cat, LeafChar } from 'tlex';

// Match "abc"
const abc = new Cat(
  LeafChar.Single('a'),
  LeafChar.Single('b'),
  LeafChar.Single('c')
);

// Add more children
abc.add(LeafChar.Single('d'));  // Now matches "abcd"
```

Cat automatically flattens nested concatenations:

```typescript
const a = new Cat(LeafChar.Single('a'), LeafChar.Single('b'));
const b = new Cat(LeafChar.Single('c'), LeafChar.Single('d'));
const flat = new Cat(a, b);  // Equivalent to Cat('a', 'b', 'c', 'd')
```

### Union (Alternation)

Matches any one of the alternatives: `a|b` matches "a" or "b".

```typescript
import { Union, LeafChar } from 'tlex';

// Match "cat" or "dog"
const catOrDog = new Union(
  new Cat(LeafChar.Single('c'), LeafChar.Single('a'), LeafChar.Single('t')),
  new Cat(LeafChar.Single('d'), LeafChar.Single('o'), LeafChar.Single('g'))
);

// Add more alternatives
catOrDog.add(LeafChar.Single('x'));  // Now matches "cat", "dog", or "x"
```

### Quant (Quantifiers)

Matches a pattern a specified number of times.

```typescript
import { Quant, LeafChar } from 'tlex';

const a = LeafChar.Single('a');

// a* (zero or more)
const star = new Quant(a, 0, Infinity, true);

// a+ (one or more)
const plus = new Quant(a, 1, Infinity, true);

// a? (zero or one)
const optional = new Quant(a, 0, 1, true);

// a{3} (exactly 3)
const exactly3 = new Quant(a, 3, 3, true);

// a{2,5} (2 to 5)
const range = new Quant(a, 2, 5, true);

// a{3,} (3 or more)
const atLeast3 = new Quant(a, 3, Infinity, true);
```

**Constructor:**

```typescript
new Quant(
  expr: Regex,       // Pattern to repeat
  minCount: number,  // Minimum repetitions (default: 1)
  maxCount: number,  // Maximum repetitions (default: 1, use Infinity for unlimited)
  greedy: boolean    // Greedy matching (default: true)
)
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `expr` | `Regex` | The repeated pattern |
| `minCount` | `number` | Minimum repetitions |
| `maxCount` | `number` | Maximum repetitions |
| `greedy` | `boolean` | Greedy (true) or lazy (false) |
| `isUnlimited` | `boolean` | True if maxCount is unlimited |
| `isVariable` | `boolean` | True if min != max |

---

## Character Matchers

### LeafChar

Matches individual characters or character classes.

```typescript
import { LeafChar, CharType } from 'tlex';

// Any character (.)
const any = LeafChar.Any();

// Single character
const a = LeafChar.Single('a');
const tab = LeafChar.Single('\t');

// Character class (\d, \w, \s, etc.)
const digit = LeafChar.Class(CharClassType.Digit);
const word = LeafChar.Class(CharClassType.Word);
const space = LeafChar.Class(CharClassType.Space);

// Negated versions
const notDigit = LeafChar.Class(CharClassType.Digit, true);  // \D
const notAny = LeafChar.Any(true);  // [^\s\S] (matches nothing)
```

**CharType Enum:**

```typescript
enum CharType {
  AnyChar,         // .
  SingleChar,      // Literal character
  CharRange,       // a-z
  PropertyEscape,  // \p{...}
  CharClass,       // \d, \w, \s
  Union,           // [abc]
  Intersection,    // [a&&b]
}
```

### CharGroup

Matches character ranges, unions, or intersections.

```typescript
import { CharGroup, LeafChar } from 'tlex';

// Range: a-z
const lowercase = CharGroup.Range(
  LeafChar.Single('a'),
  LeafChar.Single('z')
);

// Union: [aeiou]
const vowels = CharGroup.Union(false, [
  LeafChar.Single('a'),
  LeafChar.Single('e'),
  LeafChar.Single('i'),
  LeafChar.Single('o'),
  LeafChar.Single('u')
]);

// Negated: [^0-9]
const notDigit = CharGroup.Range(
  LeafChar.Single('0'),
  LeafChar.Single('9'),
  true  // negated
);

// Complex: [a-zA-Z_]
const identifier = CharGroup.Union(false, [
  CharGroup.Range(LeafChar.Single('a'), LeafChar.Single('z')),
  CharGroup.Range(LeafChar.Single('A'), LeafChar.Single('Z')),
  LeafChar.Single('_')
]);
```

---

## Assertions

### LookAhead

Matches without consuming input (zero-width).

```typescript
import { LookAhead, Cat, LeafChar } from 'tlex';

// Positive lookahead: a(?=b) - matches "a" only if followed by "b"
const aFollowedByB = new LookAhead(
  LeafChar.Single('a'),     // expr: what to match
  LeafChar.Single('b'),     // cond: what must follow
  false                      // negate: false for positive
);

// Negative lookahead: a(?!b) - matches "a" only if NOT followed by "b"
const aNotFollowedByB = new LookAhead(
  LeafChar.Single('a'),
  LeafChar.Single('b'),
  true                       // negate: true for negative
);
```

### LookBack

Matches based on what precedes (zero-width).

```typescript
import { LookBack, LeafChar } from 'tlex';

// Positive lookbehind: (?<=a)b - matches "b" only if preceded by "a"
const bPrecededByA = new LookBack(
  LeafChar.Single('b'),     // expr: what to match
  LeafChar.Single('a'),     // cond: what must precede
  false                      // negate: false for positive
);

// Negative lookbehind: (?<!a)b - matches "b" only if NOT preceded by "a"
const bNotPrecededByA = new LookBack(
  LeafChar.Single('b'),
  LeafChar.Single('a'),
  true                       // negate: true for negative
);
```

---

## References

### Var (Variable Reference)

References a named pattern defined elsewhere.

```typescript
import { Var } from 'tlex';

// Reference a variable named "DIGIT"
const digitRef = new Var('DIGIT');

// For reverse matching (lookbehind)
const reversedDigitRef = new Var('DIGIT', true);
```

Variables are resolved during compilation against the tokenizer's variable registry.

### BackNamedRef / BackNumRef

Backreferences to captured groups.

```typescript
import { BackNamedRef, BackNumRef } from 'tlex';

// Named backreference: \k<quote>
const quoteRef = new BackNamedRef('quote');

// Numeric backreference: \1
const firstGroup = new BackNumRef(1);
```

---

## Building Patterns

### From JavaScript Regex

```typescript
import { exprFromJSRE } from 'tlex';

// Parse JS regex string to AST
const ast = exprFromJSRE('[a-z]+');
const astWithFlags = exprFromJSRE('hello', 'i');  // case-insensitive
```

### From Flex Syntax

```typescript
import { exprFromFlex } from 'tlex';

// Parse Flex-style pattern
const ast = exprFromFlex('[a-z]+');
const withVar = exprFromFlex('{DIGIT}+');  // Uses variable
```

### Programmatic Construction

```typescript
import { Cat, Union, Quant, LeafChar, CharGroup } from 'tlex';

// Build: [a-zA-Z_][a-zA-Z0-9_]*
const identifier = new Cat(
  // First char: [a-zA-Z_]
  CharGroup.Union(false, [
    CharGroup.Range(LeafChar.Single('a'), LeafChar.Single('z')),
    CharGroup.Range(LeafChar.Single('A'), LeafChar.Single('Z')),
    LeafChar.Single('_')
  ]),
  // Rest: [a-zA-Z0-9_]*
  new Quant(
    CharGroup.Union(false, [
      CharGroup.Range(LeafChar.Single('a'), LeafChar.Single('z')),
      CharGroup.Range(LeafChar.Single('A'), LeafChar.Single('Z')),
      CharGroup.Range(LeafChar.Single('0'), LeafChar.Single('9')),
      LeafChar.Single('_')
    ]),
    0, Infinity, true
  )
);
```

---

## Pattern Reversal

All AST nodes support `reverse()` for lookbehind matching:

```typescript
const abc = new Cat(
  LeafChar.Single('a'),
  LeafChar.Single('b'),
  LeafChar.Single('c')
);

const cba = abc.reverse();  // Matches "cba"
```

This is used internally for lookbehind assertions, which match backwards from the current position.

---

## String Representation

Get the regex string representation:

```typescript
const pattern = new Cat(
  LeafChar.Single('a'),
  new Quant(LeafChar.Single('b'), 1, Infinity, true)
);

console.log(pattern.toString);  // "ab+"
```

---

## See Also

- [VM Architecture](/tlex/concepts/vm-architecture/) - How patterns are compiled and executed
- [JavaScript Regex Syntax](/tlex/reference/js-regex-syntax/) - JS regex features
- [Flex Syntax](/tlex/reference/flex-syntax/) - Flex-style patterns
