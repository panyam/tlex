import "../styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../layouts/Layout";
import { MDXProvider } from "@mdx-js/react";
import Snippet from "../components/Snippet";
import { readdir, readFile, writeFile } from 'fs/promises';


export default function App({ Component, pageProps }: AppProps) {
  console.log("PP: ", pageProps)
  return <MDXProvider><Layout><Component {...pageProps} /></Layout></MDXProvider>;
}

import { findAllPosts } from "../components/utils"
App.getStaticProps = async (context: any) => {
  console.log("In get props")
  const posts = await findAllPosts();
  console.log("Info: ", posts)
  return {
    props: {
      toc: await findAllPosts()
    },
  };
}
