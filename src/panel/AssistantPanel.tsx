import { useState, useEffect, useRef } from 'react';
import { ChatContainer } from './ChatContainer';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { ModelManagerDialog } from './ModelManagerDialog';
import type { ChatMessage, ExtensionMessage, WebviewMessage, ModelConfig } from '../webview/types';
import { acquireVsCodeApi } from '../webview/types';

const vscode = acquireVsCodeApi();

export function AssistantPanel() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentResponse, setCurrentResponse] = useState('');
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [currentModelId, setCurrentModelId] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
    const isSendingRef = useRef(false);
    const isInitializedRef = useRef(false);

    const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        try {
            console.log('[DEBUG] Frontend received message from extension:', typeof message === 'object' ? JSON.stringify(message) : String(message));
        } catch (e) {
            console.log('[DEBUG] Frontend received message from extension (unserializable)');
        }

        switch (message.type) {
            case 'initResponse':
                setMessages(message.data.messages || []);
                setModels(message.data.models || []);
                setCurrentModelId(message.data.currentModelId || '');
                break;
            case 'receiveMessage':
                // Add incoming message (could be user, assistant placeholder, or error)
                setMessages((prev) => [...prev, message.data]);
                if (message.data && message.data.role === 'assistant') {
                    setIsStreaming(true);
                }
                break;
            case 'receiveChunk': {
                const content = message.data?.content || '';
                // keep currentResponse for potential other uses
                setCurrentResponse((prev) => prev + content);

                // If there's no assistant placeholder yet, create one; otherwise append to last assistant
                setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (!last || last.role !== 'assistant') {
                        const assistantMsg = {
                            id: `assistant-${Date.now()}`,
                            role: 'assistant',
                            content,
                            timestamp: Date.now()
                        } as any;
                        return [...prev, assistantMsg];
                    }

                    const newPrev = [...prev];
                    newPrev[newPrev.length - 1] = { ...last, content: (last.content || '') + content } as typeof last;
                    return newPrev;
                });
                break;
            }
            case 'streamEnd':
                // Finalize streaming state
                setCurrentResponse('');
                setIsStreaming(false);
                setIsSending(false);
                break;
            case 'error':
                setMessages((prev) => [...prev, {
                    id: `error-${Date.now()}`,
                    role: 'error',
                    content: message.data?.error || String(message.data) || 'Unknown error',
                    timestamp: Date.now()
                }]);
                setIsStreaming(false);
                setIsSending(false);
                break;
            case 'clearChat':
                setMessages([]);
                setCurrentResponse('');
                setIsStreaming(false);
                break;
            case 'modelsUpdated':
                setModels(message.data.models || []);
                setCurrentModelId(message.data.currentModelId || '');
                break;
            case 'switchModel':
                setCurrentModelId(message.data.modelId || '');
                break;
        }
    };

    useEffect(() => {
        // Initialize webview - only run once on mount
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            vscode.postMessage({ type: 'init' });
        }

        // Forward webview console logs and errors to the extension host for debugging
        const originalConsoleLog = console.log;
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;

        const levels: string[] = ['log', 'warn', 'error'];
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const orig = (console as any)[level];
            (console as any)[level] = function(...args: any[]) {
                try {
                    (vscode as any).postMessage({ type: 'webviewLog', data: { level, args } });
                } catch (e) {
                    // ignore
                }
                try {
                    return orig.apply(console, args);
                } catch (e) {
                    return undefined;
                }
            };
        }

        const onError = function(ev: any) {
            try {
                const msg = (ev && ev.message) ? ev.message : String(ev);
                const stack = (ev && ev.error && ev.error.stack) ? ev.error.stack : (ev && ev.stack) ? ev.stack : '';
                (vscode as any).postMessage({ type: 'webviewLog', data: { level: 'error', message: msg, stack } });
            } catch (e) {
                // ignore
            }
        };

        window.addEventListener('error', onError);

        // Listen for messages from extension
        const handler = (event: MessageEvent) => {
            try {
                handleMessage(event);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        };

        window.addEventListener('message', handler);

        return () => {
            if (isInitializedRef.current) {
                window.removeEventListener('message', handler);
                isInitializedRef.current = false;
                // restore console
                (console as any).log = originalConsoleLog;
                (console as any).warn = originalConsoleWarn;
                (console as any).error = originalConsoleError;
                window.removeEventListener('error', onError);
            }
        };
    }, []);

    // Debug: log messages state changes
    useEffect(() => {
        try {
            console.log('[DEBUG] messages state changed, count=', messages.length, 'last=', messages[messages.length - 1]);
        } catch (e) {
            // ignore
        }
    }, [messages]);

    const handleSendMessage = async (messageText: string, modelId?: string) => {
        if (isSending) return;

        setIsSending(true);
        isSendingRef.current = true;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: Date.now()
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsStreaming(true);

        try {
            // Send message to extension for processing
            vscode.postMessage({
                type: 'sendMessage',
                data: { message: messageText, modelId }
            } as WebviewMessage);
    } catch (error) {
        const errorMessage = {
            id: `error-${Date.now()}`,
            role: 'error',
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: Date.now()
        } as ChatMessage;

        setMessages((prev) => [...prev, errorMessage]);
        setIsSending(false);
    } finally {
        isSendingRef.current = false;
    }
    };

    const handleClearChat = () => {
        vscode.postMessage({
            type: 'clearChat'
        } as WebviewMessage);
    };

    const handleModelChange = (modelId: string) => {
        setCurrentModelId(modelId);
        vscode.postMessage({
            type: 'switchModel',
            data: { modelId }
        } as WebviewMessage);
    };

    const handleOpenSettings = () => {
        vscode.postMessage({
            type: 'openSettings'
        } as WebviewMessage);
    };

    const handleSaveModel = (model: ModelConfig) => {
        vscode.postMessage({
            type: 'saveModel',
            data: { model }
        } as WebviewMessage);
    };

    const handleDeleteModel = (modelId: string) => {
        vscode.postMessage({
            type: 'deleteModel',
            data: { modelId }
        } as WebviewMessage);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            backgroundColor: 'var(--vscode-editor-background)'
        }}>
            <div style={{
                padding: '10px 12px',
                backgroundColor: 'var(--vscode-editorGroupHeader-tabsBackground)',
                borderBottom: '1px solid var(--vscode-panel-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h1 style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    margin: 0,
                    color: 'var(--vscode-foreground)'
                }}>
                    AI Assistant
                </h1>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                        onClick={() => setIsModelManagerOpen(true)}
                        style={{
                            backgroundColor: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: 'none',
                            padding: '3px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            opacity: 0.8
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryHoverBackground)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
                        }}
                    >
                        Manage Models
                    </button>
                    <ModelSelector
                        models={models}
                        currentModelId={currentModelId}
                        onModelChange={handleModelChange}
                    />
                    <button
                        onClick={handleClearChat}
                        style={{
                            backgroundColor: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: 'none',
                            padding: '3px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            opacity: 0.8
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryHoverBackground)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>
            <ChatContainer messages={messages} isStreaming={isStreaming} />
            <ChatInput onSendMessage={handleSendMessage} disabled={isSending} />
            <ModelManagerDialog
                isOpen={isModelManagerOpen}
                models={models}
                onClose={() => setIsModelManagerOpen(false)}
                onSave={handleSaveModel}
                onDelete={handleDeleteModel}
            />
        </div>
    );
}
