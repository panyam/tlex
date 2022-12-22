import React from "react";
import defaultStyles from "./view.module.scss";
import BaseComponent from "../BaseComponent";
import * as events from "../events";
import { builtinLexers } from "./configs";
import * as DSL from "../dsl";
import { timeIt, stripLinePrefixSpaces } from "../utils";

export default class RulesView extends BaseComponent<{ styles?: any }> {
  state: any;
  langSelectRef = React.createRef<HTMLSelectElement>();
  rulesTextareaRef = React.createRef<HTMLTextAreaElement>();
  selectElementRef = React.createRef<HTMLSelectElement>();

  constructor(props: any, context: any) {
    super(props, context);
    this.state = {
      rules: props.rules || "",
      selectedLang: null,
      modified: false,
    };
  }

  get styles() {
    return this.props.styles || defaultStyles;
  }

  render() {
    const styles = this.styles;
    const state = this.state;
    let selectedLang = "";
    const lexerOptions = builtinLexers.map((bl, index) => {
      if (bl.name == state.selectedLang || bl.selected) {
        selectedLang = bl.name;
      }
      return <option key={index}>{bl.label}</option>;
    });
    return (
      <div className={styles.rootView}>
        <div className={styles.headingView}>
          <span>Enter Rules</span>
          <span>{state.modified ? "(modified)" : ""}</span>
        </div>
        <textarea
          ref={this.rulesTextareaRef}
          onKeyDown={this.onInputChanged.bind(this)}
          className={styles.inputTextArea}
        />
        <div className={styles.optionsArea}>
          <span style={{ float: "left" }}>Examples:</span>
          <select
            defaultValue={selectedLang}
            style={{ float: "left" }}
            ref={this.langSelectRef}
            onChange={this.onLangChanged.bind(this)}
          >
            {lexerOptions}
          </select>
          <button style={{ float: "right" }}>Compile</button>
        </div>
      </div>
    );
  }

  componentDidMount() {
    this.onLangChanged();
  }

  onLangChanged(evt?: React.ChangeEvent) {
    if (this.langSelectRef.current != null) {
      const lang = this.langSelectRef.current.value;
      const info = builtinLexers.find(x => x.name == lang);
      if (this.rulesTextareaRef.current != null) {
        this.rulesTextareaRef.current.value = stripLinePrefixSpaces(info!.rules.split("\n")).join("\n").trim();
      }
      console.log("Event: ", evt);
      console.log("Lang: ", info);
      this.setState((ps) => ({
        ...ps,
        selectedLang: lang,
      }));
      if (info != null) {
        const tokenizer = this.compile();
        this.eventHub.emit(events.LANGUAGE_CHANGED, this, {
          "lang": info,
          "tokenizer": tokenizer,
        });
      }
    }
  }

  onInputChanged(evt: React.KeyboardEvent) {
    if (!this.state.modified) {
      console.log("Evt: ", evt.nativeEvent)
      this.setState((ps) => ({
        ...ps,
        modifed: true,
      }));
    }
  }

  compile() {
    if (this.rulesTextareaRef.current == null) return null;
    const lines = this.rulesTextareaRef.current.value;
    const tokenizer = timeIt("Tokenizer Creation Time: ", () => DSL.TokenizerFromDSL(lines, {}));
    this.setState((ps) => ({
      ...ps,
      modifed: false,
    }));
    return tokenizer;
  }
}
