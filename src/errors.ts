import * as TSU from "@panyam/tsutils";
import { Token } from "./tokenizer";

export class TokenizerError extends Error {
  readonly name: string = "TokenizerError";

  constructor(public offset: number, public message: string) {
    super(`Error at (${offset}): ${message}`);
  }
}

export class UnexpectedCharacterError extends TokenizerError {
  readonly name: string = "UnexpectedCharacterError";

  constructor(public offset: number, public foundChar: string) {
    super(offset, `Unexpected character ('${foundChar}')`);
  }
}

export class UnexpectedLexemeError extends TokenizerError {
  readonly name: string = "UnexpectedLexemeError";

  constructor(public offset: number, public endOffset: number) {
    super(offset, `Unexpected lexeme until ${endOffset}`);
  }
}

export class UnexpectedTokenError extends TokenizerError {
  readonly name: string = "UnexpectedTokenError";
  expectedTokens: Token[];

  constructor(public foundToken: TSU.Nullable<Token>, ...expectedTokens: Token[]) {
    super(
      foundToken?.start || 0,
      `Found Token: ${foundToken?.tag || "EOF"} (${foundToken?.value || ""}), Expected: ${expectedTokens.join(", ")}`,
    );
    this.expectedTokens = expectedTokens;
  }
}
