# TLEX

A lexical analyzer (tokenizer) generator in TypeScript.

TLEX provides a flexible tokenizer with regex-based pattern matching, support for both JavaScript and Flex-style regex syntax, and stateful lexing. It works in Node.js and browsers with full TypeScript support.

## Documentation

Full documentation and interactive examples: **[panyam.github.io/tlex](https://panyam.github.io/tlex/)**

Try tokenizers in the browser: **[Playground](https://panyam.github.io/tlex/playground/)**

## Installation

```bash
npm install tlex
```

## Quick Example

```typescript
import { Tokenizer } from "tlex";

const tokenizer = new Tokenizer();

// Add token rules
tokenizer.add(/[0-9]+/, { tag: "NUMBER" });
tokenizer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "IDENTIFIER" });
tokenizer.add(/\+|\-|\*|\//, { tag: "OPERATOR" });
tokenizer.add(/\s+/, { tag: "WS", skip: true });

// Tokenize input
const tokens = tokenizer.tokenize("x + 42 * y");
// Returns: [IDENTIFIER "x", OPERATOR "+", NUMBER "42", OPERATOR "*", IDENTIFIER "y"]
```

## Features

- **Regex-based patterns** - Use JavaScript regex or Flex-style patterns
- **Rule priorities** - Control which rule matches on conflicts
- **Skip tokens** - Automatically skip whitespace and comments
- **Stateful lexing** - Context-sensitive tokenization with lexer states
- **Token callbacks** - Custom handlers for token processing
- **Lookahead support** - TokenBuffer for parser lookahead
- **TypeScript native** - Full type definitions included

## Examples

The documentation includes several runnable examples:

- [JSON Tokenizer](https://panyam.github.io/tlex/examples/json-tokenizer/) - Complete JSON lexer
- [Calculator](https://panyam.github.io/tlex/examples/calculator/) - Expression tokenizer
- [C Lexer](https://panyam.github.io/tlex/examples/c-lexer/) - C-style language with states

## Reference

- [API Reference](https://panyam.github.io/tlex/reference/api/) - Tokenizer, Token, Rule classes
- [JS Regex Syntax](https://panyam.github.io/tlex/reference/js-regex-syntax/) - JavaScript regex support
- [Flex Syntax](https://panyam.github.io/tlex/reference/flex-syntax/) - Flex-style patterns
- [Rule Configuration](https://panyam.github.io/tlex/reference/rule-config/) - Priority, skip, states

## License

MIT
