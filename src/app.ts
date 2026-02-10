import { EditorState } from "@codemirror/state";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { classMap } from "lit/directives/class-map.js";
import {
  createReqEditorState,
  createRespEditorState,
} from "./codemirror/create_editor_state.js";
import "./editor.js";
import { Editor } from "./editor.js";
import { validateOrThrowError } from "./json/schema_validator.js";
import type { Json, TypeDefinition } from "./json/types.js";

@customElement("skir-studio-app")
export class App extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100vh;
      width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      overflow: hidden;
    }

    .app {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      margin: 0;
    }

    h1 {
      margin: 0;
      padding: 1.5rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 1.75rem;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .service-section {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: end;
      padding: 1.5rem 2rem;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 200px;
      flex: 1;
    }

    .input-group.url-input {
      flex: 2;
      min-width: 300px;
    }

    label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.25rem;
    }

    input[type="text"],
    input[type="password"] {
      padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      background: white;
    }

    input[type="text"]:focus,
    input[type="password"]:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .method-section {
      padding: 1rem 2rem;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    select {
      padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      background: white;
      min-width: 200px;
      transition: all 0.2s ease;
    }

    select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .content-section {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .request-panel,
    .response-panel {
      flex: 1 1 50%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      background: white;
      border-right: 1px solid #e2e8f0;
    }

    .response-panel {
      border-right: none;
    }

    .panel-header {
      padding: 1rem 1.5rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
      color: #374151;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-content {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }

    skir-studio-editor {
      height: 100%;
      display: block;
      min-height: 200px;
    }

    button {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
    }

    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }

    button:active {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .send-button {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    }

    .send-button:hover {
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }

    .error {
      padding: 1rem 1.5rem;
      background: #fef2f2;
      color: #dc2626;
      border-left: 4px solid #dc2626;
      margin: 1rem;
      border-radius: 0 0.5rem 0.5rem 0;
      font-size: 0.875rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
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
      color: #6b7280;
      font-style: italic;
    }

    .zero-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      color: #9ca3af;
      text-align: center;
      font-size: 0.875rem;
    }

    @media (max-width: 1024px) {
      .content-section {
        flex-direction: column;
      }

      .request-panel,
      .response-panel {
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
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
  `;

  override render(): TemplateResult {
    return html` <div class="app">
      <h1>Skir Studio</h1>
      ${this.renderServiceUrlSelector()} ${this.renderContent()}
    </div>`;
  }

  private renderContent(): TemplateResult {
    const { methodList, selectedMethod } = this;
    if (methodList.kind === "zero-state") {
      return html`<div class="zero-state">
        Enter a service URL above and click "Fetch Methods" to get started
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
          <div class="panel-header">Response</div>
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
      this.fetchMethodList();
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

      <div class="input-group">
        <button @click=${onClick}>Fetch Methods</button>
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
    </div>`;
  }

  protected override firstUpdated(): void {
    // See if the URL has a "skir-studio" query parameter
    const thisUrl = new URL(document.location.href);
    if (thisUrl.searchParams.has("skir-studio")) {
      this.fetchMethodList();
    }
  }

  private async fetchMethodList(): Promise<void> {
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
      console.error("Error fetching method list: ", error);
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
      const reqJsonCode = requestEditor.state.doc.toString();
      validateOrThrowError(reqJsonCode, method.request);
      const reqJson = JSON.parse(reqJsonCode);

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

      const response = await fetch(fetchUrl, fetchOptions);

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

interface Method {
  method: string;
  number: number;
  request: TypeDefinition;
  response: TypeDefinition;
}

interface MethodList {
  methods: Method[];
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
