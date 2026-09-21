import { Tape } from "../tape";
import { Tokenizer } from "../tokenizer";
import { TokenBuffer } from "../token";

function newBuffer(input: string, context: any = null): [TokenBuffer, Tape] {
  const lexer = new Tokenizer();
  lexer.add(/[a-z]+/, { tag: "IDENT" });
  lexer.add(/\s+/m, { tag: "SPACES" }, () => null);
  return [new TokenBuffer((tape, owner) => lexer.next(tape, owner), context), new Tape(input)];
}

describe("TokenBuffer.reset", () => {
  test("discards buffered lookahead without rewinding the tape", () => {
    const [buffer, tape] = newBuffer("a b c d");
    expect(buffer.peek(tape, 2)?.value).toBe("c");
    expect(buffer.buffer.length).toBe(3);

    buffer.reset();

    expect(buffer.buffer.length).toBe(0);
    expect(buffer.peek(tape)?.value).toBe("d");
  });

  test("is a no-op on an empty buffer", () => {
    const [buffer, tape] = newBuffer("a b");
    buffer.reset();
    expect(buffer.next(tape)?.value).toBe("a");
    expect(buffer.next(tape)?.value).toBe("b");
    expect(buffer.next(tape)).toBeNull();
  });

  test("keeps the tokenizer context", () => {
    const context = { mode: "outer" };
    const [buffer, tape] = newBuffer("a b", context);
    buffer.peek(tape);
    buffer.reset();
    expect(buffer.tokenizerContext).toBe(context);
  });
});
