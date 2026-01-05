---
title: Editor Integration
description: Integrating TLEX with code editors for syntax highlighting
section: guides
---

This guide covers integrating TLEX's incremental tokenizer with code editors for real-time syntax highlighting. Whether you're building a custom editor, integrating with Monaco, CodeMirror, or Ace, the patterns here will help you achieve responsive highlighting.

## Architecture Overview

```markdown
┌─────────────────────────────────────────────────────────┐
│                      Editor                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │                   Document                       │   │
│  │                                                  │   │
│  │  "function add(a, b) { return a + b; }"          │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                    Edit Events                          │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │            IncrementalTokenizer                  │   │
│  │                                                  │   │
│  │  - Tracks token cache                            │   │
│  │  - Computes minimal re-tokenization              │   │
│  │  - Accumulates rapid edits                       │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                    Token Stream                         │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Syntax Highlighter                  │   │
│  │                                                  │   │
│  │  - Maps tokens to CSS classes                    │   │
│  │  - Updates DOM/canvas                            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Basic Integration

### Step 1: Define Your Tokenizer

```typescript
import { Tokenizer, IncrementalTokenizer } from "tlex";

function createJavaScriptTokenizer(): IncrementalTokenizer {
  const tokenizer = new Tokenizer();

  // Keywords
  tokenizer.add(
    /\b(function|return|if|else|for|while|const|let|var|class|extends|import|export|default|from|async|await)\b/,
    { tag: "keyword", priority: 10 }
  );

  // Built-in values
  tokenizer.add(/\b(true|false|null|undefined|NaN|Infinity)\b/, {
    tag: "builtin",
    priority: 10
  });

  // Numbers
  tokenizer.add(/0x[0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?/, { tag: "number" });

  // Strings
  tokenizer.add(/"(?:[^"\\]|\\.)*"/, { tag: "string" });
  tokenizer.add(/'(?:[^'\\]|\\.)*'/, { tag: "string" });
  tokenizer.add(/`(?:[^`\\]|\\.)*`/, { tag: "template" });

  // Comments
  tokenizer.add(/\/\/.*/, { tag: "comment" });
  tokenizer.add(/\/\*[\s\S]*?\*\//, { tag: "comment" });

  // Operators
  tokenizer.add(/[+\-*/%=<>!&|^~?:]+/, { tag: "operator" });

  // Punctuation
  tokenizer.add(/[{}()\[\];,.]/, { tag: "punctuation" });

  // Identifiers
  tokenizer.add(/[a-zA-Z_$][a-zA-Z0-9_$]*/, { tag: "identifier" });

  // Whitespace (skip)
  tokenizer.add(/\s+/, { tag: "whitespace", skip: true });

  return new IncrementalTokenizer(tokenizer);
}
```

### Step 2: Initialize on Document Load

```typescript
const incTokenizer = createJavaScriptTokenizer();
let documentText = editor.getValue();

// Initial tokenization
const tokens = incTokenizer.tokenize(documentText);
applyHighlighting(tokens);
```

### Step 3: Handle Edits

```typescript
editor.on("change", (event) => {
  const edit = {
    start: event.start,
    end: event.end,
    newText: event.text
  };

  documentText = editor.getValue();
  const tokens = incTokenizer.update(documentText, edit);
  applyHighlighting(tokens);
});
```

---

## Real-Time Character-by-Character Updates

For responsive typing, use the edit accumulator to batch rapid keystrokes:

```typescript
const incTokenizer = createJavaScriptTokenizer();

// Configure accumulation: flush after 10 edits or 16ms (one frame)
incTokenizer.configureAccumulator(
  { maxEdits: 10, maxDelayMs: 16 },
  (tokens) => {
    applyHighlighting(tokens);
  }
);

// Initial tokenization
incTokenizer.tokenize(editor.getValue());

// Handle each keystroke
editor.on("input", (event) => {
  if (event.type === "insert") {
    incTokenizer.insertChar(event.position, event.char);
  } else if (event.type === "delete") {
    incTokenizer.deleteChar(event.position);
  }
});

// Flush on blur or save
editor.on("blur", () => {
  incTokenizer.flushAccumulatedEdits();
});
```

---

## Monaco Editor Integration

```typescript
import * as monaco from "monaco-editor";
import { Tokenizer, IncrementalTokenizer } from "tlex";

class TLEXTokensProvider implements monaco.languages.TokensProvider {
  private incTokenizer: IncrementalTokenizer;
  private currentText: string = "";

  constructor(tokenizer: Tokenizer) {
    this.incTokenizer = new IncrementalTokenizer(tokenizer);
  }

  getInitialState(): monaco.languages.IState {
    return { clone: () => this, equals: () => true };
  }

  tokenize(line: string, state: monaco.languages.IState): monaco.languages.ILineTokens {
    // Monaco tokenizes line-by-line, but we can use TLEX for full document
    // This is a simplified approach - for best performance, track line boundaries

    const lineTokens: monaco.languages.IToken[] = [];
    const fullText = this.currentText;
    const lineStart = fullText.indexOf(line);

    const tokens = this.incTokenizer.getTokensInRange(lineStart, lineStart + line.length);

    for (const token of tokens) {
      const startInLine = Math.max(0, token.start - lineStart);
      lineTokens.push({
        startIndex: startInLine,
        scopes: this.mapTagToScope(token.tag)
      });
    }

    return { tokens: lineTokens, endState: state };
  }

  updateDocument(newText: string, edit: { start: number; end: number; newText: string }) {
    this.currentText = newText;
    this.incTokenizer.update(newText, edit);
  }

  private mapTagToScope(tag: string): string {
    const scopeMap: Record<string, string> = {
      keyword: "keyword",
      builtin: "constant.language",
      number: "constant.numeric",
      string: "string",
      template: "string.template",
      comment: "comment",
      operator: "keyword.operator",
      punctuation: "punctuation",
      identifier: "variable"
    };
    return scopeMap[tag] || "source";
  }
}

// Register language
monaco.languages.register({ id: "mylang" });
monaco.languages.setTokensProvider("mylang", new TLEXTokensProvider(createTokenizer()));
```

---

## CodeMirror 6 Integration

```typescript
import { EditorView, ViewPlugin, Decoration, DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { Tokenizer, IncrementalTokenizer, Token } from "tlex";

function tlexHighlighter(tokenizer: Tokenizer) {
  const incTokenizer = new IncrementalTokenizer(tokenizer);

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        const text = view.state.doc.toString();
        const tokens = incTokenizer.tokenize(text);
        this.decorations = this.buildDecorations(tokens);
      }

      update(update: any) {
        if (update.docChanged) {
          const newText = update.state.doc.toString();

          // Convert CodeMirror changes to EditRange
          update.changes.iterChanges((fromA: number, toA: number, fromB: number, toB: number, inserted: any) => {
            incTokenizer.update(newText, {
              start: fromA,
              end: toA,
              newText: inserted.toString()
            });
          });

          const tokens = incTokenizer.getTokens();
          this.decorations = this.buildDecorations(tokens);
        }
      }

      buildDecorations(tokens: Token[]): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        for (const token of tokens) {
          const decoration = Decoration.mark({
            class: `tok-${token.tag}`
          });
          builder.add(token.start, token.end, decoration);
        }

        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );
}

// Usage
const view = new EditorView({
  extensions: [tlexHighlighter(createTokenizer())],
  parent: document.querySelector("#editor")!
});
```

---

## Ace Editor Integration

```typescript
import * as ace from "ace-builds";
import { Tokenizer, IncrementalTokenizer, Token } from "tlex";

class TLEXHighlightRules extends ace.require("ace/mode/text_highlight_rules").TextHighlightRules {
  private incTokenizer: IncrementalTokenizer;

  constructor(tokenizer: Tokenizer) {
    super();
    this.incTokenizer = new IncrementalTokenizer(tokenizer);
  }

  getTokens(text: string): Token[] {
    return this.incTokenizer.tokenize(text);
  }
}

class TLEXMode extends ace.require("ace/mode/text").Mode {
  private incTokenizer: IncrementalTokenizer;

  constructor(tokenizer: Tokenizer) {
    super();
    this.incTokenizer = new IncrementalTokenizer(tokenizer);
    this.$id = "ace/mode/tlex";
  }

  // Override getTokenizer to use TLEX
  getTokenizer() {
    return {
      getLineTokens: (line: string, state: string, row: number) => {
        // Ace is line-based - for best results, maintain full document context
        const tokens = this.incTokenizer.getTokensInRange(0, line.length);

        return {
          tokens: tokens.map((t) => ({
            type: this.mapTagToAceType(t.tag),
            value: t.value
          })),
          state: "start"
        };
      }
    };
  }

  private mapTagToAceType(tag: string): string {
    const typeMap: Record<string, string> = {
      keyword: "keyword",
      builtin: "constant.language",
      number: "constant.numeric",
      string: "string",
      comment: "comment",
      operator: "keyword.operator",
      identifier: "identifier"
    };
    return typeMap[tag] || "text";
  }
}
```

---

## Applying Highlighting

### DOM-Based Highlighting

```typescript
function applyHighlighting(tokens: Token[], container: HTMLElement) {
  // Clear existing
  container.innerHTML = "";

  const text = incTokenizer.getInput();

  for (const token of tokens) {
    const span = document.createElement("span");
    span.className = `token-${token.tag}`;
    span.textContent = text.slice(token.start, token.end);
    container.appendChild(span);
  }
}
```

### Range-Based Highlighting (for contenteditable)

```typescript
function highlightRange(tokens: Token[], rootNode: Node) {
  // Clear existing highlights
  const existingHighlights = document.querySelectorAll(".syntax-highlight");
  existingHighlights.forEach((el) => el.remove());

  const text = incTokenizer.getInput();
  const range = document.createRange();

  for (const token of tokens) {
    // Create highlight overlay
    const highlight = document.createElement("span");
    highlight.className = `syntax-highlight token-${token.tag}`;

    // Position the highlight
    const textNode = findTextNodeAt(rootNode, token.start);
    if (textNode) {
      range.setStart(textNode.node, textNode.offset);
      range.setEnd(textNode.node, textNode.offset + token.value.length);

      const rect = range.getBoundingClientRect();
      highlight.style.left = `${rect.left}px`;
      highlight.style.top = `${rect.top}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;

      document.body.appendChild(highlight);
    }
  }
}
```

---

## CSS Token Styles

```css
/* Base token styles */
.token-keyword { color: #c678dd; font-weight: 500; }
.token-builtin { color: #e5c07b; }
.token-number { color: #d19a66; }
.token-string { color: #98c379; }
.token-template { color: #98c379; }
.token-comment { color: #5c6370; font-style: italic; }
.token-operator { color: #56b6c2; }
.token-punctuation { color: #abb2bf; }
.token-identifier { color: #61afef; }

/* Dark theme overrides */
.dark .token-keyword { color: #c678dd; }
.dark .token-string { color: #98c379; }
/* ... */
```

---

## Performance Tips

### 1. Debounce Large Edits

For operations like paste, debounce the tokenization:

```typescript
let debounceTimer: ReturnType<typeof setTimeout>;

editor.on("change", (event) => {
  clearTimeout(debounceTimer);

  if (event.text.length > 100) {
    // Large paste - debounce
    debounceTimer = setTimeout(() => {
      updateTokens(event);
    }, 50);
  } else {
    // Small edit - immediate
    updateTokens(event);
  }
});
```

### 2. Virtualize Token Rendering

For large files, only render visible tokens:

```typescript
function renderVisibleTokens(
  tokens: Token[],
  viewStart: number,
  viewEnd: number
) {
  const visibleTokens = incTokenizer.getTokensInRange(viewStart, viewEnd);
  // Only render these tokens
}
```

### 3. Use requestAnimationFrame

```typescript
let pendingRender = false;

function scheduleRender(tokens: Token[]) {
  if (pendingRender) return;

  pendingRender = true;
  requestAnimationFrame(() => {
    applyHighlighting(tokens);
    pendingRender = false;
  });
}
```

### 4. Web Worker for Initial Parse

For very large files, perform initial tokenization in a worker:

```typescript
// worker.ts
import { Tokenizer, IncrementalTokenizer } from "tlex";

const incTokenizer = createTokenizer();

self.onmessage = (event) => {
  const { type, text, edit } = event.data;

  if (type === "tokenize") {
    const tokens = incTokenizer.tokenize(text);
    self.postMessage({ tokens });
  } else if (type === "update") {
    const tokens = incTokenizer.update(text, edit);
    self.postMessage({ tokens });
  }
};

// main.ts
const worker = new Worker("worker.ts");

worker.postMessage({ type: "tokenize", text: largeDocument });
worker.onmessage = (event) => {
  applyHighlighting(event.data.tokens);
};
```

---

## Testing Your Integration

```typescript
describe("Editor Integration", () => {
  it("handles rapid typing", async () => {
    const incTokenizer = createJavaScriptTokenizer();
    incTokenizer.configureAccumulator({ maxEdits: 5, maxDelayMs: 10 }, () => {});

    incTokenizer.tokenize("");

    // Simulate typing "const"
    incTokenizer.insertChar(0, "c");
    incTokenizer.insertChar(1, "o");
    incTokenizer.insertChar(2, "n");
    incTokenizer.insertChar(3, "s");
    incTokenizer.insertChar(4, "t");

    const tokens = incTokenizer.flushAccumulatedEdits();
    expect(tokens[0].tag).toBe("keyword");
    expect(tokens[0].value).toBe("const");
  });

  it("maintains consistency after edits", () => {
    const incTokenizer = createJavaScriptTokenizer();

    // Full tokenization
    const initial = incTokenizer.tokenize("const x = 1;");

    // Edit in middle
    const updated = incTokenizer.update("const xy = 1;", {
      start: 7,
      end: 7,
      newText: "y"
    });

    // Re-tokenize from scratch for comparison
    const fresh = new IncrementalTokenizer(createTokenizer());
    const expected = fresh.tokenize("const xy = 1;");

    // Should produce identical results
    expect(updated.map((t) => t.tag)).toEqual(expected.map((t) => t.tag));
    expect(updated.map((t) => t.value)).toEqual(expected.map((t) => t.value));
  });
});
```

---

## See Also

- [IncrementalTokenizer API](/tlex/reference/incremental-tokenizer/) - Full API reference
- [Playground](/tlex/playground/) - Interactive demo with comparison view
- [Examples](/tlex/examples/) - Complete tokenizer examples
