import * as vscode from 'vscode';
import * as path from 'path';
import { modelManager, ModelConfig } from './config/modelConfig';

let globalWebviewView: vscode.WebviewView | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Intelligent Assistant is now active!');

    // Create default model if it doesn't exist
    modelManager.createDefaultModel();

    // Register webview view provider for sidebar
    const provider = new AssistantWebviewProvider(context);

    const viewProvider = vscode.window.registerWebviewViewProvider(
        'assistantPanel',
        provider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );

    // Register commands
    const clearChatCommand = vscode.commands.registerCommand('assistant.clearChat', () => {
        if (globalWebviewView) {
            globalWebviewView.webview.postMessage({ type: 'clearChat' });
            vscode.window.showInformationMessage('Chat history cleared');
        }
    });

    const configureCommand = vscode.commands.registerCommand('assistant.configure', async () => {
        const config = vscode.workspace.getConfiguration('assistant');

        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your DeepSeek API Key',
            password: true,
            value: config.get<string>('apiKey', '')
        });

        if (apiKey !== undefined) {
            config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('API Key saved successfully!');
        }

        const model = await vscode.window.showInputBox({
            prompt: 'Enter model name',
            value: config.get<string>('model', 'deepseek-chat')
        });

        if (model !== undefined) {
            config.update('model', model, vscode.ConfigurationTarget.Global);
        }

        const baseUrl = await vscode.window.showInputBox({
            prompt: 'Enter API base URL',
            value: config.get<string>('baseUrl', 'https://api.deepseek.com/v1')
        });

        if (baseUrl !== undefined) {
            config.update('baseUrl', baseUrl, vscode.ConfigurationTarget.Global);
        }
    });

    context.subscriptions.push(viewProvider, clearChatCommand, configureCommand);
}

class AssistantWebviewProvider implements vscode.WebviewViewProvider {
    private messages: any[] = [];
    private webview: vscode.Webview | undefined = undefined;

    constructor(private context: vscode.ExtensionContext) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        globalWebviewView = webviewView;
        this.webview = webviewView.webview;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'out'),
                vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview')
            ]
        };

        webviewView.webview.html = this.getWebviewContent();

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                console.log('[DEBUG] Received message from webview:', message);
                switch (message.type) {
                    case 'webviewLog':
                        try {
                            console.log('[WEBVIEW]', message.data.level, message.data.args ?? message.data.message ?? '');
                        } catch (e) {
                            console.log('[WEBVIEW] log error', e);
                        }
                        break;
                    case 'init':
                        this.handleInit(webviewView);
                        break;
                    case 'sendMessage':
                        await this.handleSendMessage(webviewView, message.data);
                        break;
                    case 'switchModel':
                        await this.handleSwitchModel(message.data.modelId);
                        break;
                    case 'saveModel':
                        await this.handleSaveModel(message.data.model);
                        break;
                    case 'deleteModel':
                        await this.handleDeleteModel(message.data.modelId);
                        break;
                    case 'clearChat':
                        this.messages = [];
                        break;
                }
            }
        );
    }

    private handleInit(webviewView: vscode.WebviewView) {
        const models = modelManager.getModels();
        const currentModelId = modelManager.getCurrentModelId();

        // Send initial data to webview
        webviewView.webview.postMessage({
            type: 'initResponse',
            data: {
                models,
                currentModelId,
                messages: this.messages
            }
        });
    }

    private async handleSwitchModel(modelId: string) {
        await modelManager.setCurrentModel(modelId);

        // Notify webview of model update
        if (globalWebviewView) {
            globalWebviewView.webview.postMessage({
                type: 'modelsUpdated',
                data: {
                    models: modelManager.getModels(),
                    currentModelId: modelId
                }
            });
        }
    }

    private async handleSaveModel(model: ModelConfig) {
        const existing = modelManager.getModel(model.id);

        if (existing) {
            // Update existing model
            await modelManager.updateModel(model.id, model);
            vscode.window.showInformationMessage('Model updated successfully!');
        } else {
            // Add new model
            await modelManager.addModel(model);
            vscode.window.showInformationMessage('Model added successfully!');

            // Set as current model if it's the first one
            if (modelManager.getModels().length === 1) {
                await modelManager.setCurrentModel(model.id);
            }
        }

        // Notify webview of model update
        if (globalWebviewView) {
            globalWebviewView.webview.postMessage({
                type: 'modelsUpdated',
                data: {
                    models: modelManager.getModels(),
                    currentModelId: modelManager.getCurrentModelId()
                }
            });
        }
    }

    private async handleDeleteModel(modelId: string) {
        await modelManager.deleteModel(modelId);
        vscode.window.showInformationMessage('Model deleted successfully!');

        // Notify webview of model update
        if (globalWebviewView) {
            globalWebviewView.webview.postMessage({
                type: 'modelsUpdated',
                data: {
                    models: modelManager.getModels(),
                    currentModelId: modelManager.getCurrentModelId()
                }
            });
        }
    }

    private async handleSendMessage(webviewView: vscode.WebviewView, data: { message: string; modelId?: string }) {
        console.log('[DEBUG] handleSendMessage called with message:', data.message);
        if (!globalWebviewView) {
            console.log('[DEBUG] globalWebviewView is undefined!');
            return;
        }

        // Get model configuration
        const modelId = data.modelId || modelManager.getCurrentModelId();
        let modelConfig: ModelConfig | undefined;

        if (modelId) {
            modelConfig = modelManager.getModel(modelId);
        }

        // Fall back to legacy config if no model config found
        if (!modelConfig) {
            const config = vscode.workspace.getConfiguration('assistant');
            const apiKey = config.get<string>('apiKey', '');
            const model = data.modelId || config.get<string>('model', 'deepseek-chat');
            const baseUrl = config.get<string>('baseUrl', 'https://api.deepseek.com/v1');
            const maxTokens = config.get<number>('maxTokens', 2048);
            const temperature = config.get<number>('temperature', 0.7);

            if (!apiKey) {
                const errorMessage = {
                    id: `error-${Date.now()}`,
                    role: 'error',
                    content: 'Please configure your API Key first. Use Command Palette (Ctrl+Shift+P) > Configure AI Model',
                    timestamp: Date.now()
                };

                this.messages.push(errorMessage);

                globalWebviewView.webview.postMessage({
                    type: 'receiveMessage',
                    data: errorMessage
                });
                return;
            }

            // Build model config from legacy settings
            modelConfig = {
                id: model,
                name: model,
                provider: 'Custom',
                baseUrl,
                apiKey,
                maxTokens,
                temperature
            };
        }

        if (!modelConfig || !modelConfig.apiKey) {
            const errorMessage = {
                id: `error-${Date.now()}`,
                role: 'error',
                content: 'Please configure your API Key first. Use Command Palette (Ctrl+Shift+P) > Configure AI Model',
                timestamp: Date.now()
            };

            this.messages.push(errorMessage);

            globalWebviewView.webview.postMessage({
                type: 'receiveMessage',
                data: errorMessage
            });
            return;
        }

        // Record user message in history (do not re-send to webview to avoid duplicate local echo)
        const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: data.message,
            timestamp: Date.now()
        };

        this.messages.push(userMessage);

        try {
            // Convert messages to API format (filter out error messages and prepare for API)
            const apiMessages = this.messages
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

            const response = await fetch(`${modelConfig.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${modelConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: modelConfig.name,
                    messages: apiMessages,
                    stream: true,
                    max_tokens: modelConfig.maxTokens,
                    temperature: modelConfig.temperature
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Failed to read response');

            const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                model: modelConfig.name
            };

            this.messages.push(assistantMessage);

            // Send assistant placeholder message to webview so UI can render streaming placeholder
            globalWebviewView.webview.postMessage({
                type: 'receiveMessage',
                data: assistantMessage
            });

            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) continue;
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                fullContent += content;
                                globalWebviewView.webview.postMessage({
                                    type: 'receiveChunk',
                                    data: { content }
                                });
                            }
                        } catch (e) {
                            // Ignore parse errors for incomplete chunks
                        }
                    }
                }
            }

            // Update assistant message with full content
            assistantMessage.content = fullContent;
            globalWebviewView.webview.postMessage({
                type: 'streamEnd'
            });

        } catch (error) {
            const errorMessage = {
                id: `error-${Date.now()}`,
                role: 'error',
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: Date.now()
            };

            this.messages.push(errorMessage);

            globalWebviewView.webview.postMessage({
                type: 'error',
                data: { error: errorMessage.content }
            });
        }
    }

    private getWebviewContent(): string {
        const scriptUri = vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'bundle.js');
        const scriptWebviewUri = this.webview ? this.webview.asWebviewUri(scriptUri) : scriptUri;

        // Load highlight.js scripts
        const highlightCoreUri = vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'highlightjs', 'core.js');
        const highlightUri = vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'highlightjs', 'highlight.js');

        const highlightCoreWebviewUri = this.webview ? this.webview.asWebviewUri(highlightCoreUri) : highlightCoreUri;
        const highlightWebviewUri = this.webview ? this.webview.asWebviewUri(highlightUri) : highlightUri;

        console.log('[DEBUG] Script URI:', scriptWebviewUri.toString());

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Assistant</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            overflow: hidden;
        }

        #root {
            height: 100%;
            width: 100%;
        }

        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        ::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-hoverBackground);
            border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-activeBackground);
        }

        /* Base highlight.js styles */
        .hljs {
            display: block;
            overflow-x: auto;
            padding: 12px;
            background: var(--vscode-textCodeBlock-background);
            color: var(--vscode-editor-foreground);
        }

        .hljs-keyword, .hljs-selector-tag, .hljs-subst {
            color: #c678dd;
        }

        .hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable, .hljs-tag .hljs-attr {
            color: #d19a66;
        }

        .hljs-string, .hljs-doctag {
            color: #98c379;
        }

        .hljs-title, .hljs-section, .hljs-selector-id {
            color: #61afef;
        }

        .hljs-type, .hljs-class .hljs-title {
            color: #e5c07b;
        }

        .hljs-tag, .hljs-name, .hljs-attribute {
            color: #e06c75;
            font-weight: normal;
        }

        .hljs-regexp, .hljs-link {
            color: #56b6c2;
        }

        .hljs-symbol, .hljs-bullet {
            color: #61afef;
        }

        .hljs-built_in, .hljs-builtin-name {
            color: #e6c07b;
        }

        .hljs-meta {
            color: var(--vscode-descriptionForeground);
        }

        .hljs-deletion {
            background: #fdd;
        }

        .hljs-addition {
            background: #dfd;
        }

        .hljs-emphasis {
            font-style: italic;
        }

        .hljs-strong {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div id="root">Loading...</div>
    <!-- Load highlight.js before the main bundle -->
    <script src="${highlightCoreWebviewUri.toString()}"></script>
    <script src="${highlightWebviewUri.toString()}"></script>
    <script src="${scriptWebviewUri.toString()}"></script>
    <script>
        // Debug: check if libraries loaded
        window.addEventListener('DOMContentLoaded', function() {
            console.log('[DEBUG] DOM Content Loaded');
            console.log('[DEBUG] hljs available:', typeof window.hljs !== 'undefined');
            setTimeout(function() {
                console.log('[DEBUG] Root element:', document.getElementById('root'));
                console.log('[DEBUG] Root HTML:', document.getElementById('root').innerHTML);
            }, 1000);
        });
    </script>
</body>
</html>`;
    }
}

export function deactivate() {
    // WebviewView is automatically disposed by VS Code
}
