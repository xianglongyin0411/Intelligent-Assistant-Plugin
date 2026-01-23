// Webview message types

export type MessageRole = 'user' | 'assistant' | 'system' | 'error';

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
    model?: string;
}

export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    maxTokens?: number;
    temperature?: number;
}

// Messages from Extension to Webview
export type ExtensionMessage =
    | { type: 'initResponse'; data: { models: ModelConfig[]; currentModelId: string; messages: ChatMessage[] } }
    | { type: 'receiveMessage'; data: ChatMessage }
    | { type: 'receiveChunk'; data: { content: string } }
    | { type: 'streamEnd' }
    | { type: 'error'; data: { error: string } }
    | { type: 'chatCleared' }
    | { type: 'modelsUpdated'; data: { models: ModelConfig[]; currentModelId: string } }
    | { type: 'modelManagementResponse'; data: { models: ModelConfig[]; currentModelId: string } };

// Messages from Webview to Extension
export type WebviewMessage =
    | { type: 'init' }
    | { type: 'sendMessage'; data: { message: string; modelId?: string } }
    | { type: 'switchModel'; data: { modelId: string } }
    | { type: 'clearChat' }
    | { type: 'openSettings' }
    | { type: 'modelManagement'; data: { action: 'init' | 'add' | 'update' | 'delete'; model?: ModelConfig } };

// VS Code API for webview
declare const vscode: {
    postMessage: (message: WebviewMessage) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
};

let cachedVsCodeApi: typeof vscode | null = null;

export const acquireVsCodeApi = (): typeof vscode => {
    if (!cachedVsCodeApi) {
        cachedVsCodeApi = (globalThis as any).acquireVsCodeApi();
    }
    return cachedVsCodeApi!;
};
