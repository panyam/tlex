import Head from "next/head";
import styles from "./view.module.scss";
import RulesView from "../components/RulesView";
import ResultsView from "../components/ResultsView";
import InputView from "../components/InputView";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>TLEX Playground</title>
        <meta name="description" content="TLEX Playground" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>TLEX Playground</h1>
        </header>
        <div className={styles.center_div}>
          <div className={styles.rulesDiv}>
            <RulesView />
          </div>
          <div className={styles.inputDiv}>
            <InputView />
          </div>
          <div className={styles.resultsDiv}>
            <ResultsView />
          </div>
        </div>
      </main>
      <footer className={styles.footer}></footer>
    </div>
  );
}
