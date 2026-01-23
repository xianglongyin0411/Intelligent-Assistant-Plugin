import * as vscode from 'vscode';
import * as path from 'path';
import { modelManager, ModelConfig } from './config/modelConfig';

interface ModelQuickPickItem extends vscode.QuickPickItem {
    model?: ModelConfig;
}

let globalWebviewView: vscode.WebviewView | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Intelligent Assistant is now active!');

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
        await showModelQuickPick();
    });

    const manageModelsCommand = vscode.commands.registerCommand('assistant.manageModels', async () => {
        await showModelQuickPick();
    });

    async function showModelQuickPick() {
        console.log('[DEBUG] showModelQuickPick called');
        let models = modelManager.getModels();
        let currentModelId = modelManager.getCurrentModelId();

        console.log('[DEBUG] Initial models count:', models.length, 'currentModelId:', currentModelId);

        // Clean up stale data: if currentModelId exists but no matching model, clear it
        if (currentModelId && !models.find(m => m.id === currentModelId)) {
            console.log('[DEBUG] Clearing stale currentModelId:', currentModelId);
            await modelManager.setCurrentModel('');
            currentModelId = '';
        }

        // Loop to allow user to keep managing models
        while (true) {
            const items: ModelQuickPickItem[] = [
                {
                    label: '$(plus) 添加新模型',
                    description: '配置一个新的 AI 模型'
                },
                ...models.map(model => ({
                    label: `$(${model.id === currentModelId ? 'check' : 'circle-outline'}) ${model.name} (${model.provider})`,
                    description: model.id,
                    model
                }))
            ];

            console.log('[DEBUG] QuickPick items count:', items.length);

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: '选择或添加模型',
                title: '模型配置管理'
            });

            console.log('[DEBUG] QuickPick selected:', selected);

            // Update models and currentModelId after any operation
            models = modelManager.getModels();
            currentModelId = modelManager.getCurrentModelId();

            if (!selected) {
                // User pressed Escape, exit
                break;
            }

            if (selected.label.includes('添加新模型')) {
                console.log('[DEBUG] Calling addNewModel');
                await addNewModel();
                // Continue to show updated list
            } else if (selected.model) {
                const model = selected.model;
                const actions = await vscode.window.showQuickPick([
                    { label: '设为当前模型', description: '切换到此模型' },
                    { label: '编辑模型', description: '修改模型配置' },
                    { label: '删除模型', description: '移除此模型配置' }
                ], { placeHolder: `操作: ${model.name}` });

                if (!actions) {
                    // User pressed Escape, continue showing QuickPick
                    continue;
                }

                switch (actions.label) {
                    case '设为当前模型':
                        console.log('[DEBUG] Setting current model:', model.id);
                        await modelManager.setCurrentModel(model.id);
                        vscode.window.showInformationMessage(`已切换到 ${model.name}`);

                        // Notify webview of model update
                        const models = modelManager.getModels();
                        const currentModelId = modelManager.getCurrentModelId();
                        if (globalWebviewView) {
                            globalWebviewView.webview.postMessage({
                                type: 'modelsUpdated',
                                data: { models, currentModelId }
                            });
                        }
                        // Continue to show updated QuickPick
                        break;
                    case '编辑模型':
                        console.log('[DEBUG] Calling editModel for:', model.id);
                        await editModel(model);
                        // Continue to show updated QuickPick
                        break;
                    case '删除模型':
                        const confirm = await vscode.window.showWarningMessage(
                            `确定要删除模型 "${model.name}" 吗？`,
                            { modal: true },
                            '删除',
                            '取消'
                        );
                        if (confirm === '删除') {
                            console.log('[DEBUG] Deleting model:', model.id);
                            await modelManager.deleteModel(model.id);
                            vscode.window.showInformationMessage('模型已删除');

                            // Notify webview of model update
                            const models = modelManager.getModels();
                            const currentModelId = modelManager.getCurrentModelId();
                            if (globalWebviewView) {
                                globalWebviewView.webview.postMessage({
                                    type: 'modelsUpdated',
                                    data: { models, currentModelId }
                                });
                            }
                            // Continue to show updated QuickPick
                        } else {
                            // User cancelled delete, continue showing QuickPick
                            continue;
                        }
                        break;
                }
            }
        }
    }

    async function addNewModel() {
        const name = await vscode.window.showInputBox({
            prompt: '模型名称',
            placeHolder: '例如: gpt-4, deepseek-chat'
        });
        if (!name) return;

        const provider = await vscode.window.showInputBox({
            prompt: '提供商',
            placeHolder: '例如: OpenAI, DeepSeek',
            value: 'DeepSeek'
        });
        if (!provider) return;

        const baseUrl = await vscode.window.showInputBox({
            prompt: 'API Base URL',
            placeHolder: 'https://api.openai.com/v1',
            value: 'https://api.deepseek.com/v1'
        });
        if (!baseUrl) return;

        const apiKey = await vscode.window.showInputBox({
            prompt: 'API Key',
            password: true,
            placeHolder: 'sk-...'
        });
        if (!apiKey) return;

        const maxTokensInput = await vscode.window.showInputBox({
            prompt: '最大 Tokens',
            value: '2048',
            validateInput: (value) => {
                const num = parseInt(value);
                return isNaN(num) || num < 1 ? '请输入有效的数字' : undefined;
            }
        });
        const maxTokens = maxTokensInput ? parseInt(maxTokensInput) : 2048;

        const temperatureInput = await vscode.window.showInputBox({
            prompt: '温度 (0-2)',
            value: '0.7',
            validateInput: (value) => {
                const num = parseFloat(value);
                return isNaN(num) || num < 0 || num > 2 ? '请输入 0-2 之间的数字' : undefined;
            }
        });
        const temperature = temperatureInput ? parseFloat(temperatureInput) : 0.7;

        const newModel: ModelConfig = {
            id: `model-${Date.now()}`,
            name,
            provider,
            baseUrl,
            apiKey,
            maxTokens,
            temperature
        };

        // Get current models count before adding
        const currentModels = modelManager.getModels();
        const isEmpty = currentModels.length === 0;

        await modelManager.addModel(newModel);
        vscode.window.showInformationMessage('模型添加成功！');

        // If this was the first model, set it as current
        if (isEmpty) {
            await modelManager.setCurrentModel(newModel.id);
        }

        // Notify webview of model update
        const models = modelManager.getModels();
        const currentModelId = modelManager.getCurrentModelId();
        if (globalWebviewView) {
            globalWebviewView.webview.postMessage({
                type: 'modelsUpdated',
                data: { models, currentModelId }
            });
        }
    }

    async function editModel(model: ModelConfig) {
        const name = await vscode.window.showInputBox({
            prompt: '模型名称',
            value: model.name
        });
        if (name === undefined) return;
        if (!name) return;

        const provider = await vscode.window.showInputBox({
            prompt: '提供商',
            value: model.provider
        });
        if (provider === undefined) return;
        if (!provider) return;

        const baseUrl = await vscode.window.showInputBox({
            prompt: 'API Base URL',
            value: model.baseUrl
        });
        if (baseUrl === undefined) return;
        if (!baseUrl) return;

        const apiKey = await vscode.window.showInputBox({
            prompt: 'API Key',
            password: true,
            value: model.apiKey,
            placeHolder: 'sk-...'
        });
        if (apiKey === undefined) return;
        if (!apiKey) return;

        const maxTokensInput = await vscode.window.showInputBox({
            prompt: '最大 Tokens',
            value: String(model.maxTokens || 2048),
            validateInput: (value) => {
                const num = parseInt(value);
                return isNaN(num) || num < 1 ? '请输入有效的数字' : undefined;
            }
        });
        if (maxTokensInput === undefined) return;
        const maxTokens = parseInt(maxTokensInput);

        const temperatureInput = await vscode.window.showInputBox({
            prompt: '温度 (0-2)',
            value: String(model.temperature || 0.7),
            validateInput: (value) => {
                const num = parseFloat(value);
                return isNaN(num) || num < 0 || num > 2 ? '请输入 0-2 之间的数字' : undefined;
            }
        });
        if (temperatureInput === undefined) return;
        const temperature = parseFloat(temperatureInput);

        await modelManager.updateModel(model.id, {
            name,
            provider,
            baseUrl,
            apiKey,
            maxTokens,
            temperature
        });
        vscode.window.showInformationMessage('模型更新成功！');

        // Notify webview of model update
        const models = modelManager.getModels();
        const currentModelId = modelManager.getCurrentModelId();
        if (globalWebviewView) {
            globalWebviewView.webview.postMessage({
                type: 'modelsUpdated',
                data: { models, currentModelId }
            });
        }
    }

    context.subscriptions.push(
        viewProvider,
        clearChatCommand,
        configureCommand,
        manageModelsCommand
    );
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
                    case 'clearChat':
                        this.messages = [];
                        break;
                    case 'openSettings':
                        await this.handleOpenSettings();
                        break;
                    case 'modelManagement':
                        await this.handleModelManagement(webviewView, message.data);
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

    private async handleOpenSettings() {
        // Open model management webview
        try {
            console.log('[DEBUG] Opening model management...');
            await vscode.commands.executeCommand('assistant.manageModels');
            console.log('[DEBUG] Model management command executed');
        } catch (error) {
            console.error('[ERROR] Failed to open model management:', error);
            vscode.window.showErrorMessage(`打开模型管理失败: ${error}`);
        }
    }

    private async handleModelManagement(
        webviewView: vscode.WebviewView,
        data: { action: 'init' | 'add' | 'update' | 'delete'; model?: ModelConfig }
    ) {
        switch (data.action) {
            case 'add':
                if (data.model) {
                    await modelManager.addModel(data.model);
                }
                break;
            case 'update':
                if (data.model) {
                    await modelManager.updateModel(data.model.id, data.model);
                }
                break;
            case 'delete':
                if (data.model) {
                    await modelManager.deleteModel(data.model.id);
                }
                break;
        }

        // Send updated model list back to webview
        const models = modelManager.getModels();
        const currentModelId = modelManager.getCurrentModelId();

        webviewView.webview.postMessage({
            type: 'modelManagementResponse',
            data: { models, currentModelId }
        });

        // Also notify main assistant panel of model changes
        if (globalWebviewView && globalWebviewView !== webviewView) {
            globalWebviewView.webview.postMessage({
                type: 'modelsUpdated',
                data: { models, currentModelId }
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
