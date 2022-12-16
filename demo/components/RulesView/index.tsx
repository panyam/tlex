import React from "react";
import defaultStyles from "./view.module.scss";
import BaseComponent from "../BaseComponent";
import * as events from "../events"
import { builtinLexers } from "./configs";
import * as DSL from "../dsl";

export default class RulesView extends BaseComponent<{ styles?: any, }> {
  state: any;
  langSelectRef = React.createRef<HTMLSelectElement>();
  inputTextareaRef = React.createRef<HTMLTextAreaElement>();
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
    const lexerOptions = builtinLexers.map(bl => { return (
      <option value={bl.name}
              selected = {state.selectedLang == bl.name ||
                          bl.selected || false}>{bl.label}</option>
    )});
    return (
      <div className = {styles.rootView}>
        <div className={styles.headingView}>
          <span>Enter Rules</span>
          <span>{state.modified ? "(modified)" : ""}</span>
        </div>
        <textarea ref={this.inputTextareaRef}
                  onKeyDown={this.onInputChanged.bind(this)}
                  className={styles.inputTextArea} />
        <div className={styles.optionsArea}>
            <span style={{float: "left"}} > Examples:</span>
            <select style={{float: "left"}} ref={this.langSelectRef}
                    onChange={this.onLangChanged.bind(this)}>
              {lexerOptions}
            </select>
            <button style={{float: "right"}} >Compile</button>
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
      if (this.inputTextareaRef.current != null) {
        this.inputTextareaRef.current.value = info.rules;
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
    if (this.inputTextareaRef.current == null) return null;
    const lines = this.inputTextareaRef.current.value;
    const tokenizer = DSL.TokenizerFromDSL(lines, {});
    this.setState((ps) => ({
      ...ps,
      modifed: false,
    }));
    return tokenizer;
  }
}
