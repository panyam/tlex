/**
 * PlaygroundPage.ts - Main playground with DockView layout
 */

import { DockviewComponent, DockviewApi } from "dockview-core";
import "dockview-core/dist/styles/dockview.css";

// Import base documentation CSS from tsappkit (header, nav, etc.)
import "@panyam/tsappkit/dist/docs/DocsPage.css";

import * as T from "tlex";
import { EventHub, Events } from "./EventHub";
import { builtinLexers, BuiltinLexer } from "./configs";
import { TokenizerFromDSL } from "./dsl";

// Import Ace editor
import * as ace from "ace-builds";
import "ace-builds/src-min-noconflict/mode-text";
import "ace-builds/src-min-noconflict/theme-monokai";
import "ace-builds/src-min-noconflict/theme-github";

// Expose tlex globally
(window as any).T = T;

const LAYOUT_STORAGE_KEY = "tlex-playground-layout";

export class PlaygroundPage {
  private dockview: DockviewApi | null = null;
  private eventHub = new EventHub();

  // State
  private currentLexer: BuiltinLexer | null = null;
  private tokenizer: T.Tokenizer | null = null;

  // Editors
  private rulesEditor: ace.Ace.Editor | null = null;
  private inputEditor: ace.Ace.Editor | null = null;

  // DOM refs
  private tokensContainer: HTMLElement | null = null;
  private consoleOutput: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private isDarkMode(): boolean {
    return document.documentElement.classList.contains("dark");
  }

  private getEditorTheme(): string {
    return this.isDarkMode() ? "ace/theme/monokai" : "ace/theme/github";
  }

  private init(): void {
    const container = document.getElementById("dockview-container");
    if (!container) {
      console.error("Dockview container not found");
      return;
    }

    // Apply theme
    container.className = this.isDarkMode() ? "dockview-theme-dark" : "dockview-theme-light";

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const isDark = this.isDarkMode();
      container.className = isDark ? "dockview-theme-dark" : "dockview-theme-light";
      this.updateEditorThemes(isDark);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Create DockView
    const dockviewComponent = new DockviewComponent(container, {
      createComponent: (options) => this.createComponent(options),
    });

    this.dockview = dockviewComponent.api;

    // Try to restore saved layout, otherwise create default
    if (!this.loadLayout()) {
      this.createDefaultLayout();
    }

    // Listen for layout changes to persist them
    this.dockview.onDidLayoutChange(() => {
      this.saveLayout();
    });

    // Setup event listeners
    this.setupEventListeners();

    // Load initial lexer
    this.selectLexer(builtinLexers.find((l) => l.selected) || builtinLexers[0]);

    // Apply initial theme to editors
    setTimeout(() => this.updateEditorThemes(this.isDarkMode()), 100);
    setTimeout(() => this.updateEditorThemes(this.isDarkMode()), 500);
  }

  private updateEditorThemes(isDark: boolean): void {
    const theme = isDark ? "ace/theme/monokai" : "ace/theme/github";
    if (this.rulesEditor) this.rulesEditor.setTheme(theme);
    if (this.inputEditor) this.inputEditor.setTheme(theme);
  }

  private saveLayout(): void {
    if (!this.dockview) return;
    try {
      const layout = this.dockview.toJSON();
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {
      console.warn("Failed to save layout:", e);
    }
  }

  private loadLayout(): boolean {
    if (!this.dockview) return false;
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        const layout = JSON.parse(saved);
        this.dockview.fromJSON(layout);
        return true;
      }
    } catch (e) {
      console.warn("Failed to load layout:", e);
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
    }
    return false;
  }

  private createComponent(options: any): any {
    switch (options.name) {
      case "rules":
        return this.createRulesPanel();
      case "input":
        return this.createInputPanel();
      case "tokens":
        return this.createTokensPanel();
      case "console":
        return this.createConsolePanel();
      default:
        return {
          element: document.createElement("div"),
          init: () => {},
        };
    }
  }

  private createDefaultLayout(): void {
    if (!this.dockview) return;

    // Rules panel (left, 40%)
    this.dockview.addPanel({
      id: "rules",
      component: "rules",
      title: "Lexer Rules",
    });

    // Input panel (right-top)
    this.dockview.addPanel({
      id: "input",
      component: "input",
      title: "Input",
      position: { direction: "right", referencePanel: "rules" },
    });

    // Tokens panel (right-bottom)
    this.dockview.addPanel({
      id: "tokens",
      component: "tokens",
      title: "Tokens",
      position: { direction: "below", referencePanel: "input" },
    });

    // Console panel (bottom of tokens)
    this.dockview.addPanel({
      id: "console",
      component: "console",
      title: "Console",
      position: { direction: "below", referencePanel: "tokens" },
    });
  }

  private createRulesPanel(): any {
    const template = document.getElementById("rules-panel-template");
    const element = template?.cloneNode(true) as HTMLElement;
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.height = "100%";

    return {
      element,
      init: (params: any) => {
        // Setup lexer select
        const lexerSelect = element.querySelector("#lexer-select") as HTMLSelectElement;
        if (lexerSelect) {
          lexerSelect.innerHTML = builtinLexers
            .map((l) => `<option value="${l.name}" ${l.selected ? "selected" : ""}>${l.label}</option>`)
            .join("");
          lexerSelect.addEventListener("change", () => {
            const lexer = builtinLexers.find((l) => l.name === lexerSelect.value);
            if (lexer) this.selectLexer(lexer);
          });
        }

        // Setup compile button
        const compileBtn = element.querySelector("#compile-btn");
        compileBtn?.addEventListener("click", () => this.compile());

        // Setup Ace editor
        const editorContainer = element.querySelector("#rules-editor") as HTMLElement;
        if (editorContainer) {
          editorContainer.style.flex = "1";
          editorContainer.style.minHeight = "0";
          this.rulesEditor = ace.edit(editorContainer);
          this.rulesEditor.setTheme(this.getEditorTheme());
          this.rulesEditor.session.setMode("ace/mode/text");
          this.rulesEditor.setShowPrintMargin(false);
          this.rulesEditor.setFontSize(14);
        }
      },
    };
  }

  private createInputPanel(): any {
    const template = document.getElementById("input-panel-template");
    const element = template?.cloneNode(true) as HTMLElement;
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.height = "100%";

    return {
      element,
      init: (params: any) => {
        // Setup tokenize button
        const tokenizeBtn = element.querySelector("#tokenize-btn");
        tokenizeBtn?.addEventListener("click", () => this.tokenize());

        // Setup Ace editor
        const editorContainer = element.querySelector("#input-editor") as HTMLElement;
        if (editorContainer) {
          editorContainer.style.flex = "1";
          editorContainer.style.minHeight = "0";
          this.inputEditor = ace.edit(editorContainer);
          this.inputEditor.setTheme(this.getEditorTheme());
          this.inputEditor.session.setMode("ace/mode/text");
          this.inputEditor.setShowPrintMargin(false);
          this.inputEditor.setFontSize(14);
        }
      },
    };
  }

  private createTokensPanel(): any {
    const template = document.getElementById("tokens-panel-template");
    const element = template?.cloneNode(true) as HTMLElement;
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.height = "100%";

    return {
      element,
      init: (params: any) => {
        this.tokensContainer = element.querySelector("#tokens-container");

        // Setup clear button
        const clearBtn = element.querySelector("#clear-tokens-btn");
        clearBtn?.addEventListener("click", () => {
          if (this.tokensContainer) this.tokensContainer.innerHTML = "";
          const countEl = element.querySelector("#token-count");
          if (countEl) countEl.textContent = "0 tokens";
        });

        // Listen for tokens
        this.eventHub.on(Events.TOKENS_GENERATED, (tokens: T.Token[]) => {
          this.displayTokens(tokens, element);
        });
      },
    };
  }

  private createConsolePanel(): any {
    const template = document.getElementById("console-panel-template");
    const element = template?.cloneNode(true) as HTMLElement;
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.height = "100%";

    return {
      element,
      init: (params: any) => {
        this.consoleOutput = element.querySelector("#console-output");

        // Setup clear button
        const clearBtn = element.querySelector("#clear-console-btn");
        clearBtn?.addEventListener("click", () => {
          if (this.consoleOutput) this.consoleOutput.innerHTML = "";
        });

        // Listen for console events
        this.eventHub.on(Events.CONSOLE_LOG, (message: string) => {
          this.log(message, "info");
        });
        this.eventHub.on(Events.CONSOLE_ERROR, (message: string) => {
          this.log(message, "error");
        });
      },
    };
  }

  private setupEventListeners(): void {
    // Add keyboard shortcut for compile (Ctrl/Cmd + Enter)
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.compile();
        this.tokenize();
      }
    });
  }

  private selectLexer(lexer: BuiltinLexer): void {
    this.currentLexer = lexer;
    if (this.rulesEditor) {
      this.rulesEditor.setValue(lexer.rules.trim(), -1);
    }
    if (this.inputEditor) {
      this.inputEditor.setValue(lexer.sampleInput.trim(), -1);
    }
    this.eventHub.emit(Events.LEXER_CHANGED, lexer);

    // Auto-compile on selection
    this.compile();
    this.tokenize();
  }

  private compile(): void {
    if (!this.rulesEditor) return;

    const rules = this.rulesEditor.getValue();
    const startTime = performance.now();

    try {
      this.tokenizer = TokenizerFromDSL(rules, {});
      const elapsed = (performance.now() - startTime).toFixed(2);
      this.log(`Compiled in ${elapsed}ms`, "info");
      this.eventHub.emit(Events.LEXER_COMPILED, this.tokenizer);
    } catch (e: any) {
      this.log(`Compile error: ${e.message}`, "error");
      console.error("Compile error:", e);
    }
  }

  private tokenize(): void {
    if (!this.tokenizer || !this.inputEditor) return;

    const input = this.inputEditor.getValue();
    const startTime = performance.now();

    try {
      const tape = new T.Tape(input);
      const tokens = this.tokenizer.tokenize(tape);
      const elapsed = (performance.now() - startTime).toFixed(2);
      this.log(`Tokenized ${tokens.length} tokens in ${elapsed}ms`, "info");
      this.eventHub.emit(Events.TOKENS_GENERATED, tokens);
    } catch (e: any) {
      this.log(`Tokenize error: ${e.message}`, "error");
      console.error("Tokenize error:", e);
    }
  }

  private displayTokens(tokens: T.Token[], panelElement: HTMLElement): void {
    if (!this.tokensContainer) return;

    const countEl = panelElement.querySelector("#token-count");
    if (countEl) countEl.textContent = `${tokens.length} tokens`;

    this.tokensContainer.innerHTML = tokens
      .map(
        (t, i) => `
        <div class="token-row">
          <span class="token-index">${i}</span>
          <span class="token-range">${t.start}-${t.end}</span>
          <span class="token-tag">${t.tag}</span>
          <span class="token-value">${this.escapeHtml(String(t.value))}</span>
        </div>
      `
      )
      .join("");
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private log(message: string, level: "info" | "error" = "info"): void {
    if (!this.consoleOutput) return;

    const line = document.createElement("div");
    line.className = `console-line console-${level}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.consoleOutput.appendChild(line);
    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Only init if we're on the playground page
  if (document.getElementById("playground-container")) {
    (window as any).playgroundPage = new PlaygroundPage();
  }
});
