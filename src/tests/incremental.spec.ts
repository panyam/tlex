import { Tokenizer } from "../tokenizer";
import { IncrementalTokenizer } from "../incremental";
import { Token } from "../token";

/**
 * Helper to create a simple tokenizer for testing.
 * Recognizes: identifiers, numbers, whitespace, and punctuation.
 */
function createTestTokenizer(): Tokenizer {
  const tokenizer = new Tokenizer();

  // Identifiers
  tokenizer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "ID" });

  // Numbers
  tokenizer.add(/[0-9]+/, { tag: "NUM" });

  // Whitespace (skipped)
  tokenizer.add(/\s+/, { tag: "WS", skip: true });

  // Single-character operators/punctuation
  tokenizer.add(/[+\-*/=<>!&|(){}[\];,.]/, { tag: "PUNCT" });

  return tokenizer;
}

/**
 * Helper to compare token arrays, ignoring incremental-specific fields.
 */
function tokensEqual(a: Token[], b: Token[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].tag !== b[i].tag ||
      a[i].start !== b[i].start ||
      a[i].end !== b[i].end ||
      a[i].value !== b[i].value
    ) {
      return false;
    }
  }
  return true;
}

describe("IncrementalTokenizer", () => {
  let tokenizer: Tokenizer;
  let incTokenizer: IncrementalTokenizer;

  beforeEach(() => {
    tokenizer = createTestTokenizer();
    incTokenizer = new IncrementalTokenizer(tokenizer);
  });

  describe("Initial tokenization", () => {
    it("should tokenize simple input", () => {
      const tokens = incTokenizer.tokenize("foo bar");
      expect(tokens.length).toBe(2);
      expect(tokens[0].tag).toBe("ID");
      expect(tokens[0].value).toBe("foo");
      expect(tokens[1].tag).toBe("ID");
      expect(tokens[1].value).toBe("bar");
    });

    it("should track state on each token", () => {
      const tokens = incTokenizer.tokenize("x y z");
      for (const token of tokens) {
        expect(token.state).toBeDefined();
      }
    });

    it("should track lookback on each token", () => {
      const tokens = incTokenizer.tokenize("a b c");
      for (const token of tokens) {
        expect(token.lookback).toBe(1);
      }
    });

    it("should handle empty input", () => {
      const tokens = incTokenizer.tokenize("");
      expect(tokens.length).toBe(0);
    });
  });

  describe("Single edit updates", () => {
    it("should handle insertion in the middle", () => {
      incTokenizer.tokenize("foo bar");

      // Insert "X" between foo and bar -> "foo Xbar"
      const newInput = "foo Xbar";
      const tokens = incTokenizer.update(newInput, {
        start: 4,
        end: 4,
        newText: "X",
      });

      // Should produce: foo, Xbar
      expect(tokens.length).toBe(2);
      expect(tokens[0].value).toBe("foo");
      expect(tokens[1].value).toBe("Xbar");
    });

    it("should handle deletion", () => {
      incTokenizer.tokenize("foo bar baz");

      // Delete "bar " -> "foo baz"
      const newInput = "foo baz";
      const tokens = incTokenizer.update(newInput, {
        start: 4,
        end: 8,
        newText: "",
      });

      expect(tokens.length).toBe(2);
      expect(tokens[0].value).toBe("foo");
      expect(tokens[1].value).toBe("baz");
    });

    it("should handle replacement", () => {
      incTokenizer.tokenize("foo bar baz");

      // Replace "bar" with "qux" -> "foo qux baz"
      const newInput = "foo qux baz";
      const tokens = incTokenizer.update(newInput, {
        start: 4,
        end: 7,
        newText: "qux",
      });

      expect(tokens.length).toBe(3);
      expect(tokens[1].value).toBe("qux");
    });

    it("should handle edit at the beginning", () => {
      incTokenizer.tokenize("foo bar");

      // Insert "pre_" at start -> "pre_foo bar"
      const newInput = "pre_foo bar";
      const tokens = incTokenizer.update(newInput, {
        start: 0,
        end: 0,
        newText: "pre_",
      });

      expect(tokens.length).toBe(2);
      expect(tokens[0].value).toBe("pre_foo");
    });

    it("should handle edit at the end", () => {
      incTokenizer.tokenize("foo bar");

      // Append " baz" -> "foo bar baz"
      const newInput = "foo bar baz";
      const tokens = incTokenizer.update(newInput, {
        start: 7,
        end: 7,
        newText: " baz",
      });

      expect(tokens.length).toBe(3);
      expect(tokens[2].value).toBe("baz");
    });

    it("should produce same result as full re-tokenization", () => {
      const input1 = "alpha beta gamma";
      incTokenizer.tokenize(input1);

      const input2 = "alpha delta gamma";
      const incrementalTokens = incTokenizer.update(input2, {
        start: 6,
        end: 10,
        newText: "delta",
      });

      // Fresh tokenizer for comparison
      const freshTokenizer = new IncrementalTokenizer(createTestTokenizer());
      const freshTokens = freshTokenizer.tokenize(input2);

      expect(tokensEqual(incrementalTokens, freshTokens)).toBe(true);
    });
  });

  describe("Batch edits", () => {
    it("should handle multiple edits in order", () => {
      incTokenizer.tokenize("a b c d e");

      // Change "b" to "X" and "d" to "Y"
      const newInput = "a X c Y e";
      const tokens = incTokenizer.updateBatch(newInput, [
        { start: 2, end: 3, newText: "X" },
        { start: 6, end: 7, newText: "Y" },
      ]);

      expect(tokens.length).toBe(5);
      expect(tokens[1].value).toBe("X");
      expect(tokens[3].value).toBe("Y");
    });
  });

  describe("Character-by-character editing", () => {
    it("should accumulate edits", () => {
      incTokenizer.tokenize("foo");
      incTokenizer.configureAccumulator({ maxEdits: 3 }, () => {});

      // Insert "b", "a", "r" one by one
      expect(incTokenizer.insertChar(3, "b")).toBe(false);
      expect(incTokenizer.insertChar(4, "a")).toBe(false);
      expect(incTokenizer.insertChar(5, "r")).toBe(true); // Should flush

      const tokens = incTokenizer.getTokens();
      expect(tokens.length).toBe(1);
      expect(tokens[0].value).toBe("foobar");
    });

    it("should support deleteChar", () => {
      incTokenizer.tokenize("foobar");
      incTokenizer.configureAccumulator({ maxEdits: 10 }, () => {});

      incTokenizer.deleteChar(3); // Delete 'b'
      incTokenizer.deleteChar(3); // Delete 'a'
      incTokenizer.deleteChar(3); // Delete 'r'
      const tokens = incTokenizer.flushAccumulatedEdits();

      expect(tokens.length).toBe(1);
      expect(tokens[0].value).toBe("foo");
    });

    it("should support replaceChar", () => {
      incTokenizer.tokenize("abc");
      incTokenizer.configureAccumulator({ maxEdits: 10 }, () => {});

      incTokenizer.replaceChar(1, "X"); // Replace 'b' with 'X'
      const tokens = incTokenizer.flushAccumulatedEdits();

      expect(tokens[0].value).toBe("aXc");
    });
  });

  describe("Token access", () => {
    it("should find token at offset", () => {
      incTokenizer.tokenize("foo bar baz");

      // "foo" is at 0-3, "bar" at 4-7, "baz" at 8-11
      expect(incTokenizer.getTokenAt(0)?.value).toBe("foo");
      expect(incTokenizer.getTokenAt(2)?.value).toBe("foo");
      expect(incTokenizer.getTokenAt(4)?.value).toBe("bar");
      expect(incTokenizer.getTokenAt(8)?.value).toBe("baz");
    });

    it("should return null for offset between tokens", () => {
      incTokenizer.tokenize("foo bar");
      // Position 3 is the space (skipped token)
      expect(incTokenizer.getTokenAt(3)).toBe(null);
    });

    it("should find tokens in range", () => {
      incTokenizer.tokenize("a b c d e");

      // Get tokens in range 2-7 (should get b, c, d)
      // Tokens: a(0-1), b(2-3), c(4-5), d(6-7), e(8-9)
      // Range [2, 7) overlaps with tokens starting before 7 and ending after 2
      const tokens = incTokenizer.getTokensInRange(2, 7);
      expect(tokens.length).toBe(3);
      expect(tokens[0].value).toBe("b");
      expect(tokens[1].value).toBe("c");
      expect(tokens[2].value).toBe("d");
    });
  });

  describe("Convergence", () => {
    it("should converge quickly for local edits", () => {
      // Create a longer input to test convergence
      const input = "alpha beta gamma delta epsilon zeta eta theta";
      incTokenizer.tokenize(input);

      // Edit "gamma" to "GAMMA" - should converge quickly
      const newInput = "alpha beta GAMMA delta epsilon zeta eta theta";
      const tokens = incTokenizer.update(newInput, {
        start: 11,
        end: 16,
        newText: "GAMMA",
      });

      // Tokens after the edit should be reused (same object references)
      // We can verify correctness by checking the result
      expect(tokens.length).toBe(8);
      expect(tokens[2].value).toBe("GAMMA");

      // Verify all tokens are correct
      const freshTokenizer = new IncrementalTokenizer(createTestTokenizer());
      const freshTokens = freshTokenizer.tokenize(newInput);
      expect(tokensEqual(tokens, freshTokens)).toBe(true);
    });

    it("should handle edits that change token boundaries", () => {
      incTokenizer.tokenize("abc def");

      // Merge tokens by removing space: "abcdef"
      const newInput = "abcdef";
      const tokens = incTokenizer.update(newInput, {
        start: 3,
        end: 4,
        newText: "",
      });

      expect(tokens.length).toBe(1);
      expect(tokens[0].value).toBe("abcdef");
    });

    it("should handle edits that split tokens", () => {
      incTokenizer.tokenize("abcdef");

      // Split by inserting space: "abc def"
      const newInput = "abc def";
      const tokens = incTokenizer.update(newInput, {
        start: 3,
        end: 3,
        newText: " ",
      });

      expect(tokens.length).toBe(2);
      expect(tokens[0].value).toBe("abc");
      expect(tokens[1].value).toBe("def");
    });
  });

  describe("Lazy position updates", () => {
    it("should handle multiple edits with lazy updates", () => {
      incTokenizer.tokenize("a b c d e f g h i j");

      // Edit near the beginning
      let tokens = incTokenizer.update("X b c d e f g h i j", {
        start: 0,
        end: 1,
        newText: "X",
      });
      expect(tokens[0].value).toBe("X");

      // Edit again near the beginning
      tokens = incTokenizer.update("X Y c d e f g h i j", {
        start: 2,
        end: 3,
        newText: "Y",
      });
      expect(tokens[1].value).toBe("Y");

      // All tokens should have correct positions
      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].start).toBeLessThan(tokens[i].end);
        if (i > 0) {
          expect(tokens[i].start).toBeGreaterThan(tokens[i - 1].end - 1);
        }
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle update on empty cache", () => {
      // No initial tokenize call
      const tokens = incTokenizer.update("foo bar", {
        start: 0,
        end: 0,
        newText: "foo bar",
      });

      expect(tokens.length).toBe(2);
    });

    it("should handle complete replacement", () => {
      incTokenizer.tokenize("old content here");

      const tokens = incTokenizer.update("new stuff", {
        start: 0,
        end: 16,
        newText: "new stuff",
      });

      expect(tokens.length).toBe(2);
      expect(tokens[0].value).toBe("new");
      expect(tokens[1].value).toBe("stuff");
    });

    it("should handle single token input", () => {
      incTokenizer.tokenize("x");

      const tokens = incTokenizer.update("xyz", {
        start: 1,
        end: 1,
        newText: "yz",
      });

      expect(tokens.length).toBe(1);
      expect(tokens[0].value).toBe("xyz");
    });

    it("should handle numbers", () => {
      incTokenizer.tokenize("x 123 y");

      // Change 123 to 456
      const tokens = incTokenizer.update("x 456 y", {
        start: 2,
        end: 5,
        newText: "456",
      });

      expect(tokens.length).toBe(3);
      expect(tokens[1].tag).toBe("NUM");
      expect(tokens[1].value).toBe("456");
    });
  });
});

describe("IncrementalTokenizer with stateful lexer", () => {
  it("should handle state changes in string literals", () => {
    const tokenizer = new Tokenizer();

    // Simple string literal support
    tokenizer.add(/"[^"]*"/, { tag: "STRING" });
    tokenizer.add(/[a-zA-Z_][a-zA-Z0-9_]*/, { tag: "ID" });
    tokenizer.add(/\s+/, { tag: "WS", skip: true });

    const incTokenizer = new IncrementalTokenizer(tokenizer);
    const tokens = incTokenizer.tokenize('foo "hello" bar');

    expect(tokens.length).toBe(3);
    expect(tokens[0].tag).toBe("ID");
    expect(tokens[1].tag).toBe("STRING");
    expect(tokens[1].value).toBe('"hello"');
    expect(tokens[2].tag).toBe("ID");
  });
});
