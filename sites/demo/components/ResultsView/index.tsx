import React from "react";
import BaseComponent from "../BaseComponent";
import defaultStyles from "./view.module.scss";
import * as events from "../events"
import { timeIt } from "../utils";
import * as TSU from "@panyam/tsutils";
import * as TLEX from "tlex";

export default class ResultsView extends BaseComponent<{ styles?: any, }> {
  state: any;

  constructor(props: any, context: any) {
    super(props, context);
    this.state = {
      results: props.results || "",
      tokens: props.tokens || [],
    };
  }
    
  get styles() {
    return this.props.styles || defaultStyles;
  }

  render() {
    const styles = this.styles;
    const state = this.state;
    const tokenElements = (state.tokens || []).map((t: TLEX.Token, i: number) => (
        <>
          <span key={`${i}_range`} className={styles.tokenStartEnd}>({t.start} - {t.end})</span>
          <span key={`${i}_tag`} className={styles.tokenTag}>{t.tag}</span>
          <span key={`${i}_value`} className={styles.tokenValue}>{t.value}</span>
        </>
      ));
    return (
      <div className = {styles.rootView}>
        <div className={styles.tokensArea} key = "tokenElementsDiv">
          {tokenElements}
        </div>
      </div>
    );
  }

  componentDidMount() {
    this.eventHub.on(events.INPUT_TOKENIZED, (evt: TSU.Events.TEvent) => {
      this.updateState({
        tokens: evt.payload.tokens,
      });
    });
  }
}
