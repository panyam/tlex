import Header from "../components/Header";
import { TOC } from "../components/TOC";
import styles from "../styles/Home.module.scss";

const Layout = ({ children }) => {
  return (
    <div>
      <Header styles={styles}/>
      <TOC />
      <main className='max-width-container main'>{children}</main>
    </div>
  );
};

export default Layout;
