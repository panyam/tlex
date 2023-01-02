import * as React from "react";
import Image from "next/image";
import toc from "./toc"
import styles from "./view.module.scss"

export default class TOC extends React.Component<{
    styles?: any;
  }> {
  state: any = {};
  get styles() {
    return this.props.styles || {};
  }

  render() {
    console.log("Props: ", toc)
    function createMenu(item: any) {
      if (item.isDir) {
          return <div className={styles.dirHolder}>
            { item.children.map(createMenu) }
          </div>
      } else {
        return <h3 className={styles.itemTitle}><a href={item.link}>{item.title}</a></h3>
      }
    }

    const items = toc.map(createMenu);
    return <div className={styles.tableOfContents}>
      <h2 className={styles.TOCTitle}>Table of contents</h2>
      <div className={styles.dirHolder}> { items } </div>
    </div>
  }
}
