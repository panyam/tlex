import Header from "../components/Header";
import TableOfContents from "../components/TableOfContents";
import styles from "../styles/Home.module.scss";

const Layout = (props: any) => {
  console.log("props.children: ", props.children)
  return (
    <div>
      <Header styles={styles}/>
      <div className={styles.tableOfContents}><TableOfContents /></div>
      <main className={styles.mainContainer}>{props.children}</main>
    </div>
  );
};

export default Layout;
