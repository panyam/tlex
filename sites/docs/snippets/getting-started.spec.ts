import * as TLEX from "tlex";

describe("Getting Started Tests", () => {
  test("T1", () => {
    /**
     * Step 1 - Create a tokenizer
     */
    const tokenizer = new TLEX.Tokenizer();

    /**
     * Step 2 - Add token rules
     * Rules in TLEX can either be literal strings, javascript regexes or FLEX regexes:
     */
    tokenizer
      .add("hello") // Add a literal to match
      .add(/\d+/) // Now add a javascript regex pattern
      .add(TLEX.Builder.flexRE`\s+`); // Finally a FLEX RE pattern

    /**
     * Step 3 - Tokenize inputs
     */
    let tokens = tokenizer.tokenize("hello 32 44");
    console.log(tokens.map((t: TLEX.Token) => t.value));
    // [ "hello", " ", "32", " ", "44" ]

    tokens = tokenizer.tokenize("90     hello     100");
    console.log(tokens.map((t: TLEX.Token) => t.value));
    // [ "90", "     ", "hello", "     ", "100" ]
  });
});
