import { EditorState } from "@codemirror/state";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { classMap } from "lit/directives/class-map.js";
import {
  createReqEditorState,
  createRespEditorState,
} from "./codemirror/create_editor_state.js";
import { ensureJsonState } from "./codemirror/json_state.js";
import "./editor.js";
import { Editor } from "./editor.js";
import { toJson } from "./json/to_json.js";
import type { Json, Method, MethodList } from "./json/types.js";
import { generateLlmsTxt } from "./llms/llms_doc_generator.js";

@customElement("skir-studio-app")
export class App extends LitElement {
  static override styles = css`
    @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap");

    :host {
      --bg-dark: #0a0b12;
      --bg-panel: #13141f;
      --bg-lighter: #1a1b26;
      --border: #2f334d;
      --fg: #c0caf5;
      --accent: #7aa2f7;
      --error: #f7768e;
      --success: #9ece6a;

      display: block;
      height: 100vh;
      width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      background: var(--bg-dark);
      color: var(--fg);
      overflow: hidden;
    }

    .app {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-dark);
      margin: 0;
    }

    h1 {
      margin: 0;
      padding: 0.75rem 1.5rem;
      background: #050505;
      font-size: 1.1rem;
      font-weight: 700;
      border-bottom: 1px solid var(--border);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      z-index: 10;
      position: relative;
    }

    h1 a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: inherit;
      text-decoration: none;
      width: fit-content;
    }

    .header-text {
      background: linear-gradient(to right, #7aa2f7, #bb9af7);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 30px rgba(122, 162, 247, 0.3);
    }

    .header-icon {
      font-size: 1em;
      line-height: 1;
    }

    .service-section {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: end;
      padding: 0.75rem 1rem;
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border);
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 200px;
      flex: 1;
    }

    .input-group.url-input {
      flex: 2;
      min-width: 300px;
    }

    .button-group {
      display: flex;
      flex-direction: column;
      min-width: 200px;
      flex: 1;
      justify-content: flex-end;
    }

    label {
      font-size: 0.75rem;
      font-weight: 500;
      color: #787c99;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    input[type="text"],
    input[type="password"] {
      padding: 0.5rem 0.8rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.85rem;
      background: rgba(255, 255, 255, 0.03);
      color: var(--fg);
      font-family: inherit;
      transition: all 0.2s ease;
    }

    input[type="text"]:focus,
    input[type="password"]:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(255, 255, 255, 0.05);
      box-shadow: 0 0 0 2px rgba(122, 162, 247, 0.2);
    }

    /* Prevent white background on Chrome autofill */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px var(--bg-dark) inset !important;
      box-shadow: 0 0 0 30px var(--bg-dark) inset !important;
      -webkit-text-fill-color: var(--fg) !important;
      transition: background-color 5000s ease-in-out 0s; /* Delay the background color change */
      caret-color: var(--fg);
    }

    .method-section {
      padding: 0.5rem 1rem;
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .doc-badge-wrapper {
      position: relative;
      display: inline-flex;
    }

    .doc-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: var(--bg-lighter);
      color: var(--accent);
      border: 1px solid var(--border);
      border-radius: 50%;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: help;
      transition: all 0.2s ease;
    }

    .doc-badge-wrapper:hover .doc-badge {
      background: var(--accent);
      color: var(--bg-dark);
    }

    .doc-badge-wrapper .tooltip {
      visibility: hidden;
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--bg-lighter);
      color: var(--fg);
      border: 1px solid var(--border);
      border-radius: 0;
      font-size: 0.75rem;
      font-weight: 400;
      line-height: 1.3;
      white-space: pre-wrap;
      min-width: 250px;
      max-width: 400px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease, visibility 0.2s ease;
      font-family: inherit;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .doc-badge-wrapper .tooltip::before {
      content: "";
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      height: 0.5rem;
    }

    .doc-badge-wrapper .tooltip::after {
      content: "";
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-bottom-color: var(--border);
    }

    .doc-badge-wrapper:hover .tooltip {
      visibility: visible;
      opacity: 1;
    }

    select {
      padding: 0.5rem 2.5rem 0.5rem 0.8rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.85rem;
      background-color: rgba(255, 255, 255, 0.03);
      color: var(--fg);
      min-width: 200px;
      font-family: inherit;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23c0caf5' d='M6 8.825L1.175 4 2.238 2.938 6 6.7 9.763 2.938 10.825 4z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1em top 50%;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    select:hover {
      background-color: rgba(255, 255, 255, 0.05);
      border-color: #565f89;
    }

    select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(122, 162, 247, 0.2);
    }

    .content-section {
      flex: 1;
      display: flex;
      overflow: hidden;
      background: var(--bg-dark);
    }

    .request-panel,
    .response-panel {
      flex: 0 0 50%;
      max-width: 50%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg-dark);
      border-right: 1px solid var(--border);
      box-sizing: border-box;
    }

    .response-panel {
      border-right: none;
    }

    .panel-header {
      padding: 0.5rem 1rem;
      background: #13141f;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
      color: var(--fg);
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 3rem;
      box-sizing: border-box;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .latency-display {
      font-weight: normal;
      color: #565f89;
      font-size: 0.75rem;
    }

    .panel-content {
      flex: 1;
      overflow: auto;
      min-height: 0;
      background: var(--bg-dark);
    }

    skir-studio-editor {
      height: 100%;
      display: block;
      min-height: 200px;
    }

    button {
      padding: 0.5rem 1.5rem;
      background: var(--bg-lighter);
      color: var(--fg);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
    }

    button:hover {
      background: var(--border);
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    button:active {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .send-button {
      background: rgba(158, 206, 106, 0.1);
      border-color: rgba(158, 206, 106, 0.2);
      color: var(--success);
      padding: 0.35rem 1rem;
      font-size: 0.8rem;
    }

    .send-button:hover {
      background: var(--success);
      color: #000;
      border-color: var(--success);
      box-shadow: 0 0 15px rgba(158, 206, 106, 0.3);
    }

    .error {
      padding: 0.75rem 1rem;
      background: rgba(247, 118, 142, 0.1);
      color: var(--error);
      border-left: 2px solid var(--error);
      margin: 1rem;
      border-radius: 0;
      font-size: 0.8rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
      border-bottom: 1px solid var(--border);
    }

    .panel-content .error {
      margin: 1rem 1.5rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .hidden {
      display: none;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: #565f89;
      font-style: italic;
      font-family: inherit;
    }

    .zero-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      color: #565f89;
      text-align: center;
      font-size: 0.8rem;
      font-family: inherit;
    }

    @media (max-width: 1024px) {
      .content-section {
        flex-direction: column;
      }

      .request-panel,
      .response-panel {
        border-right: none;
        border-bottom: 1px solid var(--border);
      }

      .response-panel {
        border-bottom: none;
      }
    }

    @media (max-width: 768px) {
      .service-section {
        flex-direction: column;
        align-items: stretch;
      }

      .input-group {
        min-width: unset;
      }

      h1 {
        padding: 1rem;
        font-size: 1.5rem;
      }
    }

    /* ------------------------------------------------------------------ */
    /* llms.txt button + panel                                             */
    /* ------------------------------------------------------------------ */

    .llms-txt-button {
      margin-left: auto;
      padding: 0.3rem 0.8rem;
      font-size: 0.75rem;
      background: rgba(122, 162, 247, 0.07);
      border-color: rgba(122, 162, 247, 0.22);
      color: var(--accent);
      font-family: "JetBrains Mono", monospace;
      letter-spacing: 0.02em;
    }

    .llms-txt-button:hover {
      background: rgba(122, 162, 247, 0.15);
      border-color: var(--accent);
      color: white;
      box-shadow: 0 0 12px rgba(122, 162, 247, 0.2);
    }

    .llms-doc-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5, 5, 10, 0.65);
      z-index: 100;
      display: flex;
      align-items: stretch;
      justify-content: flex-end;
    }

    .llms-doc-panel {
      width: 55%;
      min-width: 440px;
      max-width: 880px;
      background: var(--bg-panel);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .llms-doc-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.65rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: #0d0e17;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      font-family: "JetBrains Mono", monospace;
      flex-shrink: 0;
    }

    .llms-close-button {
      padding: 0.1rem 0.45rem;
      font-size: 1.1rem;
      line-height: 1;
      background: transparent;
      border-color: transparent;
      color: #565f89;
      transform: none;
    }

    .llms-close-button:hover {
      background: rgba(247, 118, 142, 0.1);
      border-color: rgba(247, 118, 142, 0.3);
      color: var(--error);
      transform: none;
      box-shadow: none;
    }

    .llms-doc-panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .llms-doc-intro {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.7;
      color: #9aa5ce;
    }

    .llms-doc-intro a {
      color: var(--accent);
      text-decoration: none;
    }

    .llms-doc-intro a:hover {
      text-decoration: underline;
    }

    .llms-doc-auth-reminder {
      padding: 0.75rem 1rem;
      background: rgba(224, 175, 104, 0.07);
      border: 1px solid rgba(224, 175, 104, 0.25);
      border-left: 3px solid #e0af68;
      border-radius: 4px;
      font-size: 0.78rem;
      line-height: 1.7;
      color: #e0af68;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .llms-doc-auth-reminder code {
      font-family: "JetBrains Mono", monospace;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      font-size: 0.85em;
      width: fit-content;
    }

    .llms-doc-actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .llms-doc-actions button {
      padding: 0.35rem 0.9rem;
      font-size: 0.78rem;
    }

    .llms-doc-content {
      margin: 0;
      padding: 1rem;
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-family: "JetBrains Mono", monospace;
      font-size: 0.72rem;
      line-height: 1.6;
      color: var(--fg);
      white-space: pre-wrap;
      word-break: break-all;
      overflow-x: auto;
    }
  `;

  override render(): TemplateResult {
    return html` <div class="app">
      <h1>
        <a href="/">
          <span class="header-icon">⚡</span>
          <span class="header-text">RPC Studio</span>
        </a>
      </h1>
      ${this.renderServiceUrlSelector()} ${this.renderContent()}
      ${this.llmsDocPanelOpen ? this.renderLlmsDocPanel() : ""}
    </div>`;
  }

  private renderContent(): TemplateResult {
    const { methodList, selectedMethod } = this;
    if (methodList.kind === "zero-state") {
      return html`<div class="zero-state">
        Enter a service URL above and click "Get Methods" to get started
      </div>`;
    } else if (methodList.kind === "loading") {
      return html`<div class="loading">Loading methods...</div>`;
    } else if (methodList.kind === "error") {
      return html`<div class="error">${methodList.message}</div>`;
    }
    return html`
      ${this.renderMethodSelector(methodList.methods)}
      <div class="content-section">
        <div class="request-panel">
          <div
            class=${classMap({ "panel-header": true, hidden: !selectedMethod })}
          >
            Request
            <button class="send-button" @click=${() => this.onSend()}>
              Send Request
            </button>
          </div>
          <div
            class=${classMap({
              "panel-content": true,
              hidden: !selectedMethod,
            })}
          >
            <skir-studio-editor id="request-editor"></skir-studio-editor>
          </div>
        </div>
        <div
          class="response-panel ${classMap({
            hidden: !selectedMethod || selectedMethod.response.kind !== "ok",
          })}"
        >
          <div class="panel-header">
            Response
            ${selectedMethod && selectedMethod.response.kind === "ok"
              ? html`<span class="latency-display"
                  >${selectedMethod.response.latencyMillis}ms</span
                >`
              : ""}
          </div>
          <div class="panel-content">
            <skir-studio-editor id="response-editor"></skir-studio-editor>
          </div>
        </div>
        ${selectedMethod && selectedMethod.response.kind === "loading"
          ? html`<div class="response-panel">
              <div class="panel-header">Response</div>
              <div class="loading">Sending request...</div>
            </div>`
          : ""}
        ${selectedMethod && selectedMethod.response.kind === "error"
          ? html`<div class="response-panel">
              <div class="panel-header">Response</div>
              <div class="error">${selectedMethod.response.message}</div>
            </div>`
          : ""}
      </div>
    `;
  }

  private renderServiceUrlSelector(): TemplateResult {
    const onClick = () => {
      let serviceUrl =
        this.renderRoot.querySelector<HTMLInputElement>("#service-url")!.value;
      try {
        const url = new URL(serviceUrl);
        url.search = "";
        url.hash = "";
        serviceUrl = url.toString();
      } catch {}

      const authorizationHeader =
        this.renderRoot.querySelector<HTMLInputElement>(
          "#authorization-header",
        )!.value;

      this.serviceSpec = {
        serviceUrl,
        authorizationHeader,
      };
      this.getMethodList();
    };

    return html`<div class="service-section">
      <div class="input-group url-input">
        <label for="service-url">Service URL</label>
        <input
          type="text"
          id="service-url"
          placeholder="https://api.example.com"
          .value="${this.serviceSpec.serviceUrl}"
        />
      </div>

      <div class="input-group">
        <label for="authorization-header">Authorization Header</label>
        <input
          type="password"
          autocomplete="off"
          placeholder="Bearer your-token-here"
          id="authorization-header"
          .value="${this.serviceSpec.authorizationHeader}"
        />
      </div>

      <div class="button-group">
        <button @click=${onClick}>Get Methods</button>
      </div>
    </div>`;
  }

  private renderMethodSelector(
    methods: readonly MethodBundle[],
  ): TemplateResult {
    const onChange = (event: Event) => {
      const select = event.target as HTMLSelectElement;
      if (select.value === "") {
        // This is he "Choose a method..." option
        this.selectedMethod = undefined;
      } else {
        const index = parseInt(select.value);
        this.selectMethod(methods[index]);
      }
    };
    return html`<div class="method-section">
      <label for="method">Select Method</label>
      <select id="method" @change=${onChange}>
        <option value="" ?selected=${!this.selectedMethod}>
          Choose a method...
        </option>
        ${methods.map(
          (method, index) =>
            html`<option
              value="${index}"
              ?selected=${this.selectedMethod?.method.number ===
              method.method.number}
            >
              ${method.method.method}
            </option>`,
        )}
      </select>
      ${this.selectedMethod?.method.doc
        ? html`<div class="doc-badge-wrapper">
            <div class="doc-badge">?</div>
            <div class="tooltip">${this.selectedMethod.method.doc}</div>
          </div>`
        : ""}
      <button
        class="llms-txt-button"
        @click=${() => {
          this.llmsDocPanelOpen = true;
        }}
      >
        llms.txt
      </button>
    </div>`;
  }

  private renderLlmsDocPanel(): TemplateResult {
    if (this.methodList.kind !== "ok") return html``;

    const { serviceUrl, authorizationHeader } = this.serviceSpec;
    const hasAuth = authorizationHeader.trim() !== "";
    const methodList: MethodList = {
      methods: this.methodList.methods.map((b) => b.method),
    };
    const text = generateLlmsTxt(
      methodList,
      serviceUrl,
      hasAuth ? "auth" : "no-auth",
    );

    const onCopy = async () => {
      await navigator.clipboard.writeText(text);
      this.llmsDocCopied = true;
      setTimeout(() => {
        this.llmsDocCopied = false;
      }, 2000);
    };

    const onDownload = () => {
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "llms.txt";
      a.click();
      URL.revokeObjectURL(url);
    };

    const onClose = () => {
      this.llmsDocPanelOpen = false;
    };

    return html`
      <div
        class="llms-doc-overlay"
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div class="llms-doc-panel">
          <div class="llms-doc-panel-header">
            <span>llms.txt</span>
            <button class="llms-close-button" @click=${onClose}>×</button>
          </div>
          <div class="llms-doc-panel-body">
            <p class="llms-doc-intro">
              Pass this text file to your AI assistant's context to let it
              understand and call this service's API directly.
            </p>
            ${hasAuth
              ? html`<div class="llms-doc-auth-reminder">
                  ⚠&nbsp; This service requires bearer token authentication. The
                  AI agent will need the token set in the shell environment
                  where it runs commands:
                  <code>export MY_API_BEARER_TOKEN="your-token-here"</code>
                </div>`
              : ""}
            <div class="llms-doc-actions">
              <button @click=${onDownload}>⬇ Download</button>
              <button @click=${onCopy}>
                ${this.llmsDocCopied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <pre class="llms-doc-content">${text}</pre>
          </div>
        </div>
      </div>
    `;
  }

  protected override firstUpdated(): void {
    // See if the URL has a "skir-studio" query parameter
    const thisUrl = new URL(document.location.href);
    if (thisUrl.searchParams.has("skir-studio")) {
      this.getMethodList();
    }
  }

  private async getMethodList(): Promise<void> {
    const { serviceUrl, authorizationHeader } = this.serviceSpec;
    if (
      this.methodList.kind === "loading" &&
      this.methodList.serviceUrl === serviceUrl
    ) {
      return;
    }
    const listUrl = new URL(serviceUrl);
    listUrl.search = "list";
    this.methodList = { kind: "loading", serviceUrl };
    try {
      const response = await fetch(listUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();
      const methodList = tryParseMethodList(data);
      if (methodList === null) {
        throw new Error("The URL does not seem to point to a skir service");
      }
      const methods = methodList.methods.map((method) => ({
        method,
        reqEditorState: createReqEditorState(method.request),
        response: { kind: "zero-state" } as ResponseState,
      }));
      methods.sort((a, b) => a.method.method.localeCompare(b.method.method));
      this.methodList = { kind: "ok", methods };
    } catch (error) {
      console.error("Error getting method list: ", error);
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.methodList = { kind: "error", message };
    }
    this.selectedMethod = undefined;
  }

  private selectMethod(method: MethodBundle): void {
    const { requestEditor, responseEditor } = this;
    if (!requestEditor || !responseEditor) {
      console.warn("Editors not found, cannot select method.");
      return;
    }
    const oldMethod = this.selectedMethod;
    if (oldMethod) {
      // Save the editor state for the request and the response. This way we can
      // restore it later if the user switches back to this method.
      oldMethod.reqEditorState = requestEditor.state;
      if (oldMethod.response.kind === "ok") {
        oldMethod.response.editorState = responseEditor.state;
      }
    }
    this.selectedMethod = method;
    requestEditor.state = method.reqEditorState;
    if (method.response.kind === "ok") {
      responseEditor.state = method.response.editorState;
    }
  }

  private async onSend(): Promise<void> {
    const { serviceUrl, authorizationHeader } = this.serviceSpec;
    const { requestEditor, responseEditor } = this;
    if (!requestEditor || !responseEditor) {
      console.warn("Editors not found, cannot send request.");
      return;
    }
    const { selectedMethod } = this;
    if (!selectedMethod || selectedMethod.response.kind === "loading") {
      return;
    }
    const { method } = selectedMethod;
    selectedMethod.response = { kind: "loading" };
    try {
      const jsonState = ensureJsonState(requestEditor.view, method.request);

      const errors = jsonState.parseResult.errors.concat(
        jsonState.validationResult?.errors ?? [],
      );
      if (errors.length > 0) {
        const firstError = errors[0];
        const line = requestEditor.state.doc.lineAt(firstError.segment.start);
        const lineNumber = line.number; // 1-based
        const columnNumber = firstError.segment.start - line.from + 1;
        throw new Error(
          `Line ${lineNumber}, column ${columnNumber}: ${firstError.message}`,
        );
      }

      const reqJson = toJson(jsonState.parseResult.value!);

      let fetchUrl: string;
      let fetchOptions: RequestInit;

      if (this.sendWithGet) {
        const bodyJson = JSON.stringify({
          method: method.method,
          request: reqJson,
        });
        fetchUrl = `${serviceUrl}?${encodeURIComponent(bodyJson)}`;
        fetchOptions = {
          method: "GET",
          headers: {
            Authorization: authorizationHeader,
          },
        };
      } else {
        fetchUrl = serviceUrl;
        fetchOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authorizationHeader,
          },
          body: JSON.stringify(
            {
              method: method.method,
              request: reqJson,
            },
            null,
            2,
          ),
        };
      }

      const t0 = Date.now();
      const response = await fetch(fetchUrl, fetchOptions);
      const latencyMillis = Math.max(Date.now() - t0, 0);

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const responseBody = await response.text();
          if (responseBody) {
            errorMessage += `: ${responseBody}`;
          }
        } catch (bodyError) {
          // If we can't read the body, just use the status
        }
        throw new Error(errorMessage);
      }
      const data = (await response.json()) as Json;
      const respEditorState = createRespEditorState(data, method.response);
      selectedMethod.response = {
        kind: "ok",
        response: data,
        editorState: respEditorState,
        latencyMillis: latencyMillis,
      };
      // Render the response in the response editor
      responseEditor.state = respEditorState;
    } catch (error) {
      console.error("Error sending request: ", error);
      selectedMethod.response = {
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
    this.requestUpdate();
  }

  @state()
  private llmsDocPanelOpen = false;
  @state()
  private llmsDocCopied = false;

  @state()
  private serviceSpec: ServiceSpec = {
    serviceUrl: getDefaultServiceUrl(),
    authorizationHeader: "",
  };
  @state()
  private methodList: MethodListState = { kind: "zero-state" };
  @state()
  private selectedMethod?: MethodBundle;

  // For testing that services work when using GET instead of POST
  @property({ type: Boolean, attribute: "send-with-get" })
  sendWithGet: boolean = false;

  private get requestEditor(): Editor | null {
    return this.renderRoot.querySelector<Editor>("#request-editor");
  }

  private get responseEditor(): Editor | null {
    return this.renderRoot.querySelector<Editor>("#response-editor");
  }
}

interface ServiceSpec {
  serviceUrl: string;
  authorizationHeader: string;
}

type ResponseState =
  | {
      kind: "zero-state";
    }
  | {
      kind: "loading";
    }
  | {
      kind: "ok";
      response: Json;
      editorState: EditorState;
      latencyMillis: number;
    }
  | {
      kind: "error";
      message: string;
    };

interface MethodBundle {
  method: Method;
  reqEditorState: EditorState;
  response: ResponseState;
}

type MethodListState =
  | {
      kind: "zero-state";
    }
  | {
      kind: "loading";
      serviceUrl: string;
    }
  | {
      kind: "ok";
      methods: MethodBundle[];
    }
  | {
      kind: "error";
      message: string;
    };

function tryParseMethodList(jsonCode: string): MethodList | null {
  try {
    const data = JSON.parse(jsonCode);
    if (data && Array.isArray(data.methods)) {
      return data as MethodList;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

function getDefaultServiceUrl(): string {
  const currentUrl = new URL(document.location.href);
  if (currentUrl.searchParams.has("serviceUrl")) {
    return currentUrl.searchParams.get("serviceUrl") || "";
  }
  currentUrl.search = "";
  return currentUrl.toString();
}

declare global {
  interface HTMLElementTagNameMap {
    "skir-studio-app": App;
  }
}
