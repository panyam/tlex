import * as React from "react";
import * as TSU from "@panyam/tsutils";

export default class BaseComponent<T = any> extends React.Component<T> {
  static readonly eventHub = new TSU.Events.EventHub();
  constructor(props: T, context: any) {
    super(props, context);
    this.eventHubChanged();
  }

  get eventHub(): TSU.Events.EventHub {
    return BaseComponent.eventHub;
  }

  eventHubChanged() {
    //
  }

  updateState(updatedFields: any) {
    this.setState((ps: any) => ({
      ...ps,
      ...updatedFields,
    }));
  }
}
