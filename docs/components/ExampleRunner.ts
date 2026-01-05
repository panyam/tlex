/**
 * ExampleRunner - Interactive component for tokenizer examples
 *
 * Provides a 2-column layout with:
 * - Column 1: Lexer rules (editable with copy button)
 * - Column 2: Input (editable) + Token Output
 * - Run button to tokenize
 */

import * as T from "tlex";
import { IncrementalTokenizer } from "tlex";
import ace from "ace-builds";
import "ace-builds/src-min-noconflict/mode-text";
import "ace-builds/src-min-noconflict/mode-javascript";
import "ace-builds/src-min-noconflict/theme-monokai";
import "ace-builds/src-min-noconflict/theme-github";
import { initPageSetup } from "@panyam/tsappkit/docs";
import { TokenizerFromDSL } from "./playground/dsl";

interface ExampleConfig {
  rules?: string;
  input?: string;
  showRules?: boolean; // Default true - show rules editor
  mode?: "basic" | "incremental"; // Default basic - incremental shows side-by-side comparison
}

export class ExampleRunner {
  private container!: HTMLElement;
  private config!: ExampleConfig;

  private rulesEditor: ace.Ace.Editor | null = null;
  private inputEditor: ace.Ace.Editor | null = null;
  private outputContainer: HTMLElement | null = null;

  // Incremental mode state
  private tokenizer: T.Tokenizer | null = null;
  private incrementalTokenizer: IncrementalTokenizer | null = null;
  private lastInput: string = "";
  private fullOutputContainer: HTMLElement | null = null;
  private incrementalOutputContainer: HTMLElement | null = null;
  private fullStatsEl: HTMLElement | null = null;
  private incrementalStatsEl: HTMLElement | null = null;

  constructor(containerId: string, config: ExampleConfig) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container #${containerId} not found`);
      return;
    }
    this.container = container;
    this.config = {
      showRules: true,
      mode: "basic",
      ...config,
    };

    this.init();
  }

  private isDarkMode(): boolean {
    return document.documentElement.classList.contains("dark");
  }

  private getEditorTheme(): string {
    return this.isDarkMode() ? "ace/theme/monokai" : "ace/theme/github";
  }

  private init(): void {
    this.render();
    this.setupEditors();
    this.setupEventListeners();

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      this.updateEditorThemes();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Auto-run on load
    setTimeout(() => this.run(), 100);
  }

  private render(): void {
    const showRules = this.config.showRules !== false;
    const isIncremental = this.config.mode === "incremental";

    if (isIncremental) {
      this.renderIncrementalMode(showRules);
    } else {
      this.renderBasicMode(showRules);
    }
  }

  private renderBasicMode(showRules: boolean): void {
    this.container.innerHTML = `
      <div class="example-runner">
        <div class="example-main">
          ${
            showRules
              ? `
          <div class="example-column example-rules-column">
            <div class="example-panel-header">
              <span class="example-panel-title">Lexer Rules</span>
              <button class="example-copy-btn" data-target="rules" title="Copy rules">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="example-editor-container" id="${this.container.id}-rules-editor"></div>
          </div>
          `
              : ""
          }
          <div class="example-column example-io-column">
            <div class="example-io-row example-input-row">
              <div class="example-panel-header">
                <span class="example-panel-title">Input</span>
                <button class="example-run-btn" title="Run">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Run
                </button>
              </div>
              <div class="example-editor-container example-input-editor" id="${this.container.id}-input-editor"></div>
            </div>
            <div class="example-io-row example-output-row">
              <div class="example-panel-header">
                <span class="example-panel-title">Tokens</span>
                <span class="example-token-count" id="${this.container.id}-token-count"></span>
              </div>
              <div class="example-output-container" id="${this.container.id}-output"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderIncrementalMode(showRules: boolean): void {
    this.container.innerHTML = `
      <div class="example-runner example-runner-incremental">
        <div class="example-main">
          ${
            showRules
              ? `
          <div class="example-column example-rules-column">
            <div class="example-panel-header">
              <span class="example-panel-title">Lexer Rules</span>
              <button class="example-copy-btn" data-target="rules" title="Copy rules">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="example-editor-container" id="${this.container.id}-rules-editor"></div>
          </div>
          `
              : ""
          }
          <div class="example-column example-io-column">
            <div class="example-io-row example-input-row">
              <div class="example-panel-header">
                <span class="example-panel-title">Input</span>
                <span class="example-hint">(Edit to see incremental updates)</span>
                <button class="example-run-btn" title="Run">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Run
                </button>
              </div>
              <div class="example-editor-container example-input-editor" id="${this.container.id}-input-editor"></div>
            </div>
            <div class="example-io-row example-output-row example-comparison-row">
              <div class="example-comparison-columns">
                <div class="example-comparison-column">
                  <div class="example-panel-header">
                    <span class="example-panel-title">Full Tokenizer</span>
                    <span class="example-token-count" id="${this.container.id}-full-stats"></span>
                  </div>
                  <div class="example-output-container" id="${this.container.id}-full-output"></div>
                </div>
                <div class="example-comparison-column">
                  <div class="example-panel-header">
                    <span class="example-panel-title">Incremental</span>
                    <span class="example-token-count" id="${this.container.id}-incremental-stats"></span>
                  </div>
                  <div class="example-output-container" id="${this.container.id}-incremental-output"></div>
                </div>
              </div>
              <div class="example-speedup-bar" id="${this.container.id}-speedup"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEditors(): void {
    const theme = this.getEditorTheme();

    // Rules editor (if shown)
    if (this.config.showRules !== false) {
      const rulesContainer = document.getElementById(`${this.container.id}-rules-editor`);
      if (rulesContainer) {
        this.rulesEditor = ace.edit(rulesContainer);
        this.rulesEditor.setTheme(theme);
        this.rulesEditor.session.setMode("ace/mode/text");
        this.rulesEditor.setValue((this.config.rules || "").trim(), -1);
        this.rulesEditor.setOptions({
          fontSize: "13px",
          showPrintMargin: false,
          maxLines: 20,
          minLines: 5,
        });
      }
    }

    // Input editor
    const inputContainer = document.getElementById(`${this.container.id}-input-editor`);
    if (inputContainer) {
      this.inputEditor = ace.edit(inputContainer);
      this.inputEditor.setTheme(theme);
      this.inputEditor.session.setMode("ace/mode/text");
      this.inputEditor.setValue((this.config.input || "").trim(), -1);
      this.inputEditor.setOptions({
        fontSize: "13px",
        showPrintMargin: false,
        maxLines: 10,
        minLines: 3,
      });
    }

    // Output containers
    if (this.config.mode === "incremental") {
      this.fullOutputContainer = document.getElementById(`${this.container.id}-full-output`);
      this.incrementalOutputContainer = document.getElementById(`${this.container.id}-incremental-output`);
      this.fullStatsEl = document.getElementById(`${this.container.id}-full-stats`);
      this.incrementalStatsEl = document.getElementById(`${this.container.id}-incremental-stats`);
    } else {
      this.outputContainer = document.getElementById(`${this.container.id}-output`);
    }
  }

  private setupEventListeners(): void {
    // Run button
    const runBtn = this.container.querySelector(".example-run-btn");
    if (runBtn) {
      runBtn.addEventListener("click", () => this.run());
    }

    // Copy buttons
    const copyBtns = this.container.querySelectorAll(".example-copy-btn");
    copyBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.target;
        this.copyToClipboard(target || "");
      });
    });

    // Ctrl+Enter to run
    this.inputEditor?.commands.addCommand({
      name: "run",
      bindKey: { win: "Ctrl-Enter", mac: "Cmd-Enter" },
      exec: () => this.run(),
    });

    this.rulesEditor?.commands.addCommand({
      name: "run",
      bindKey: { win: "Ctrl-Enter", mac: "Cmd-Enter" },
      exec: () => this.run(),
    });

    // Real-time updates for incremental mode
    if (this.config.mode === "incremental" && this.inputEditor) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      this.inputEditor.session.on("change", () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.run(), 50);
      });
    }
  }

  private updateEditorThemes(): void {
    const theme = this.getEditorTheme();
    this.rulesEditor?.setTheme(theme);
    this.inputEditor?.setTheme(theme);
  }

  private copyToClipboard(target: string): void {
    let text = "";
    if (target === "rules" && this.rulesEditor) {
      text = this.rulesEditor.getValue();
    }

    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopyFeedback(target);
      });
    }
  }

  private showCopyFeedback(target: string): void {
    const btn = this.container.querySelector(`[data-target="${target}"]`);
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`;
      setTimeout(() => {
        btn.innerHTML = originalHTML;
      }, 1500);
    }
  }

  private run(): void {
    if (this.config.mode === "incremental") {
      this.runIncremental();
    } else {
      this.runBasic();
    }
  }

  private runBasic(): void {
    if (!this.outputContainer) return;

    const rulesText = this.rulesEditor?.getValue() || this.config.rules || "";
    const inputText = this.inputEditor?.getValue() || "";

    this.outputContainer.innerHTML = '<div class="example-loading">Tokenizing...</div>';

    try {
      // Build tokenizer from DSL
      const tokenizer = TokenizerFromDSL(rulesText, {});

      // Tokenize input
      const startTime = performance.now();
      const tokens = tokenizer.tokenize(inputText);
      const elapsed = performance.now() - startTime;

      // Update token count
      const countEl = document.getElementById(`${this.container.id}-token-count`);
      if (countEl) {
        countEl.textContent = `${tokens.length} tokens (${elapsed.toFixed(2)}ms)`;
      }

      // Display tokens
      this.displayTokens(tokens);
    } catch (e: any) {
      this.outputContainer.innerHTML = `<div class="example-error">${this.escapeHtml(e.message)}</div>`;
    }
  }

  private runIncremental(): void {
    const rulesText = this.rulesEditor?.getValue() || this.config.rules || "";
    const inputText = this.inputEditor?.getValue() || "";

    try {
      // Build tokenizers if not yet created or rules changed
      if (!this.tokenizer) {
        this.tokenizer = TokenizerFromDSL(rulesText, {});
        const incBase = TokenizerFromDSL(rulesText, {});
        this.incrementalTokenizer = new IncrementalTokenizer(incBase);
        this.lastInput = "";
      }

      // Run full tokenizer
      const fullStartTime = performance.now();
      this.tokenizer.reset();
      const fullTokens = this.tokenizer.tokenize(inputText);
      const fullElapsed = performance.now() - fullStartTime;

      // Run incremental tokenizer
      const incStartTime = performance.now();
      let incrementalTokens: T.Token[] = [];

      if (this.lastInput === "") {
        // First run - full tokenization
        incrementalTokens = this.incrementalTokenizer!.tokenize(inputText);
      } else {
        // Compute edit and update incrementally
        const edit = this.computeEdit(this.lastInput, inputText);
        if (edit) {
          incrementalTokens = this.incrementalTokenizer!.update(inputText, edit);
        } else {
          incrementalTokens = this.incrementalTokenizer!.getTokens();
        }
      }
      const incElapsed = performance.now() - incStartTime;
      this.lastInput = inputText;

      // Display comparison
      this.displayComparison(fullTokens, fullElapsed, incrementalTokens, incElapsed);
    } catch (e: any) {
      if (this.fullOutputContainer) {
        this.fullOutputContainer.innerHTML = `<div class="example-error">${this.escapeHtml(e.message)}</div>`;
      }
    }
  }

  private computeEdit(oldInput: string, newInput: string): T.EditRange | null {
    if (oldInput === newInput) return null;

    // Find common prefix
    let prefixLen = 0;
    const minLen = Math.min(oldInput.length, newInput.length);
    while (prefixLen < minLen && oldInput[prefixLen] === newInput[prefixLen]) {
      prefixLen++;
    }

    // Find common suffix
    let suffixLen = 0;
    while (
      suffixLen < minLen - prefixLen &&
      oldInput[oldInput.length - 1 - suffixLen] === newInput[newInput.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    return {
      start: prefixLen,
      end: oldInput.length - suffixLen,
      newText: newInput.slice(prefixLen, newInput.length - suffixLen),
    };
  }

  private displayComparison(
    fullTokens: T.Token[],
    fullElapsed: number,
    incrementalTokens: T.Token[],
    incElapsed: number
  ): void {
    // Display full tokenizer results
    if (this.fullOutputContainer) {
      this.fullOutputContainer.innerHTML = this.renderTokenRows(fullTokens);
    }
    if (this.fullStatsEl) {
      this.fullStatsEl.textContent = `${fullTokens.length} in ${fullElapsed.toFixed(2)}ms`;
    }

    // Display incremental results
    if (this.incrementalOutputContainer) {
      this.incrementalOutputContainer.innerHTML = this.renderTokenRows(incrementalTokens);
    }
    if (this.incrementalStatsEl) {
      this.incrementalStatsEl.textContent = `${incrementalTokens.length} in ${incElapsed.toFixed(2)}ms`;
    }

    // Show speedup bar
    const speedupEl = document.getElementById(`${this.container.id}-speedup`);
    if (speedupEl && fullElapsed > 0) {
      const speedup = fullElapsed / Math.max(incElapsed, 0.01);
      const tokensMatch = this.tokensEqual(fullTokens, incrementalTokens);
      speedupEl.innerHTML = `
        <span class="speedup-label ${tokensMatch ? 'match' : 'mismatch'}">
          ${tokensMatch ? '✓' : '✗'} Speedup: ${speedup.toFixed(1)}x faster
        </span>
      `;
    }
  }

  private renderTokenRows(tokens: T.Token[]): string {
    return tokens
      .map(
        (t, i) => `
        <div class="token-row">
          <span class="token-index">${i}</span>
          <span class="token-range">${t.start}-${t.end}</span>
          <span class="token-tag">${this.escapeHtml(String(t.tag))}</span>
          <span class="token-value">${this.escapeHtml(JSON.stringify(t.value))}</span>
        </div>
      `
      )
      .join("");
  }

  private tokensEqual(a: T.Token[], b: T.Token[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].tag !== b[i].tag || a[i].start !== b[i].start || a[i].end !== b[i].end) {
        return false;
      }
    }
    return true;
  }

  private displayTokens(tokens: T.Token[]): void {
    if (!this.outputContainer) return;

    if (tokens.length === 0) {
      this.outputContainer.innerHTML = '<div class="example-empty">No tokens</div>';
      return;
    }

    let html = '<div class="example-tokens">';
    tokens.forEach((token, index) => {
      html += `
        <div class="token-row">
          <span class="token-index">${index}</span>
          <span class="token-range">${token.start}-${token.end}</span>
          <span class="token-tag">${this.escapeHtml(String(token.tag))}</span>
          <span class="token-value">${this.escapeHtml(JSON.stringify(token.value))}</span>
        </div>
      `;
    });
    html += "</div>";

    this.outputContainer.innerHTML = html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-initialize from data attributes or script blocks
document.addEventListener("DOMContentLoaded", () => {
  // Initialize common page setup (sidebar highlighting, etc.)
  initPageSetup();

  const containers = document.querySelectorAll("[data-example-runner]");
  containers.forEach((container) => {
    const id = container.id;
    if (!id) return;

    // Try to get config from data-example-config attribute (legacy)
    const configAttr = container.getAttribute("data-example-config");
    if (configAttr) {
      try {
        const config = JSON.parse(configAttr);
        new ExampleRunner(id, config);
      } catch (e) {
        console.error("Failed to parse example config:", e);
      }
      return;
    }

    // Otherwise, load from hidden pre blocks
    const rulesPre = document.getElementById(`${id}-rules`);
    const inputPre = document.getElementById(`${id}-input`);

    const config: ExampleConfig = {
      rules: rulesPre?.textContent?.trim() || "",
      input: inputPre?.textContent?.trim() || "",
      mode: (container.getAttribute("data-example-mode") as "basic" | "incremental") || "basic",
      showRules: container.getAttribute("data-example-show-rules") !== "false",
    };

    new ExampleRunner(id, config);
  });
});

// Export for manual initialization
(window as any).ExampleRunner = ExampleRunner;
