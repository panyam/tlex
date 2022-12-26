import "../styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../layouts/Layout";
import { MDXProvider } from "@mdx-js/react";
import SnipCode from "../components/SnipCode";


const MDXComponents = {
  // pre: (props) => <SnipCode {...props} />,
};

export default function App({ Component, pageProps }: AppProps) {
  return <MDXProvider components = {MDXComponents}><Layout><Component {...pageProps} /></Layout></MDXProvider>;
}
