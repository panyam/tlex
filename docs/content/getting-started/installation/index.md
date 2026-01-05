---
title: Installation
description: How to install TLEX in your project
section: getting-started
---

## Package Manager

### npm

```bash
npm install tlex
```

### pnpm

```bash
pnpm add tlex
```

### yarn

```bash
yarn add tlex
```

## Import Styles

### ES Modules (recommended)

```typescript
import { Tokenizer } from 'tlex';
```

### CommonJS

```javascript
const { Tokenizer } = require('tlex');
```

## TypeScript Support

TLEX is written in TypeScript and includes full type definitions. No additional `@types` package is needed.

```typescript
import { Tokenizer, Token, Rule } from 'tlex';

const lexer: Tokenizer = new Tokenizer();
```
