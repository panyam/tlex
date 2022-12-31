import "../styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../layouts/Layout";
import { MDXProvider } from "@mdx-js/react";
import Snippet from "../components/Snippet";
import { readdir, readFile, writeFile } from 'fs/promises';



const MDXComponents = {
  // pre: Snippet,
};

export default function App({ Component, pageProps }: AppProps) {
  return <MDXProvider components = {MDXComponents}><Layout><Component {...pageProps} /></Layout></MDXProvider>;
}
