
import React from "react";
import Image from "next/image";

export class TOC extends React.Component<{
    styles?: any;
  }> {
  state: any = {};
  get styles() {
    return this.props.styles || {};
  }

  render() {
    return (
      <div>Table of contents - {this.props.blah}</div>
    );
  }
}

export async function getStaticProps(context: any) {
  return {
    props: {
      "blah": "woooo",
    },
  };
}
