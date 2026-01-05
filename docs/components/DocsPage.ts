/**
 * DocsPage.ts - Main entry point for TLEX documentation pages
 * Initializes code blocks with copy functionality and sets up page
 */

import * as T from "tlex";
import { initCodeBlocks, initPageSetup } from "@panyam/tsappkit/docs";

// Import base documentation CSS from tsappkit (webpack will bundle this)
import "@panyam/tsappkit/dist/DocsPage.css";

// Expose tlex globally for debugging
(window as any).T = T;

export class DocsPage {
  constructor() {
    this.initCodeBlocks();
    initPageSetup();
  }

  private initCodeBlocks(): void {
    initCodeBlocks();
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  (window as any).docsPage = new DocsPage();
});
