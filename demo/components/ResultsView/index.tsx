import React from "react";
import defaultStyles from "./view.module.scss";

export default class ResultsView extends React.Component<{ styles?: any, }> {
  state: any;

  constructor(props: any, context: any) {
    super(props, context);
    this.state = {
      results: props.results || "",
    };
  }
    
  get styles() {
    return this.props.styles || defaultStyles;
  }

  render() {
    const styles = this.styles;
    const state = this.state;
    return (
      <div className={styles.resultsView}>
        Enter Results:
      </div>
    );
  }
}
