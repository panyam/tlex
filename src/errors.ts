import * as TSU from "@panyam/tsutils";
import { Token } from "./tokenizer";

export class TokenizerError extends Error {
  readonly name: string = "TokenizerError";

  constructor(public offset: number, public length: number, public type: string, public value: any = null) {
    super(`Tokenizer Error (${offset}-${offset + length}): ${type}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnexpectedTokenError extends Error {
  readonly name: string = "UnexpectedTokenError";
  expectedTokens: Token[];

  constructor(public foundToken: TSU.Nullable<Token>, ...expectedTokens: Token[]) {
    super(
      `Found Token: ${foundToken?.tag || "EOF"} (${foundToken?.value || ""}), Expected: ${expectedTokens.join(", ")}`,
    );
    this.expectedTokens = expectedTokens;
  }
}
