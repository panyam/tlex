import React from "react";
import defaultStyles from "./view.module.scss";
import * as events from "../events";
import BaseComponent from "../BaseComponent";
import * as TSU from "@panyam/tsutils";
import * as TLEX from "tlex";
import { timeIt, stripLinePrefixSpaces } from "../utils";

export default class InputView extends BaseComponent<{ styles?: any }> {
  state: any;
  incrementalCheckRef = React.createRef<HTMLInputElement>();
  inputTextareaRef = React.createRef<HTMLTextAreaElement>();
  tokenizer: TLEX.Tokenizer | null = null;

  constructor(props: any, context: any) {
    super(props, context);
    this.state = {
      input: props.input || "",
    };
  }

  get styles() {
    return this.props.styles || defaultStyles;
  }

  render() {
    const styles = this.styles;
    const state = this.state;
    return (
      <div className={styles.rootView}>
        <div className={styles.headingView}>
          <span>Enter Input:</span>
        </div>
        <textarea ref={this.inputTextareaRef} className={styles.inputTextArea} />
        <div className={styles.optionsArea}>
          <label>
            <input type="checkbox" onChange={(e) => this.onIncrementalChanged()} ref={this.incrementalCheckRef} />
            Incremental
          </label>
          <button onClick={() => this.tokenize()} style={{ float: "right" }}>
            Tokenize
          </button>
        </div>
      </div>
    );
  }

  componentDidMount() {
    this.eventHub.on(events.LANGUAGE_CHANGED, (evt: TSU.Events.TEvent) => {
      this.tokenizer = evt.payload.tokenizer;
      if (this.inputTextareaRef.current != null) {
        const lines = evt.payload.lang.sampleInput.split("\n");
        this.inputTextareaRef.current.value = stripLinePrefixSpaces(lines).join("\n").trim();
        this.tokenize();
      }
    });
  }

  get inputText(): string {
    return this.inputTextareaRef.current?.value || "";
  }

  onIncrementalChanged() {
    if (this.incrementalCheckRef.current) {
    }
  }

  tokenize() {
    const tokens = timeIt("Tokenized in: ", () => {
      const tape = new TLEX.Tape(this.inputText);
      const tokens = this.tokenizer?.tokenize(tape);
      console.log("Tokens: ", tokens);
      return tokens;
    });
    this.eventHub.emit(events.INPUT_TOKENIZED, this, { tokens: tokens });
    return tokens;
  }
}
