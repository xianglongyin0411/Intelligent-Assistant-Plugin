import type { ChatMessage as ChatMessageType } from '../webview/types';
import { parseMarkdown } from '../utils/markdown';

interface ChatMessageProps {
    message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isError = message.role === 'error';

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderContent = () => {
        if (isError) {
            const div = document.createElement('div');
            div.textContent = message.content;
            return div.innerHTML;
        }
        // Use Markdown rendering for assistant messages
        return isUser ? escapeHtml(message.content) : parseMarkdown(message.content);
    };

    const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    return (
        <div
            style={{
                marginBottom: '12px',
                padding: '8px 10px',
                borderRadius: '6px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                animation: 'fadeIn 0.3s ease-in',
                backgroundColor: isError
                    ? 'var(--vscode-errorBackground)'
                    : isUser
                    ? 'var(--vscode-input-background)'
                    : 'var(--vscode-editor-inactiveSelectionBackground)',
                borderLeft: isError
                    ? '3px solid var(--vscode-errorForeground)'
                    : isUser
                    ? '3px solid var(--vscode-textLink-foreground)'
                    : 'none'
            }}
        >
            <div
                style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isError
                        ? 'var(--vscode-errorForeground)'
                        : isUser
                        ? 'var(--vscode-button-background)'
                        : 'var(--vscode-textLink-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '14px',
                    color: '#fff'
                }}
            >
                {isError ? '!' : isUser ? 'U' : 'AI'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: isError
                        ? 'var(--vscode-errorForeground)'
                        : 'var(--vscode-descriptionForeground)'
                }}>
                    <span>{isError ? 'Error' : isUser ? 'You' : 'Assistant'}</span>
                    {message.model && <span style={{ opacity: 0.7 }}>• {message.model}</span>}
                    <span style={{ opacity: 0.5 }}>{formatTime(message.timestamp)}</span>
                </div>
                <div
                    style={{
                        lineHeight: 1.5,
                        fontSize: 'var(--vscode-font-size)',
                        wordWrap: 'break-word'
                    }}
                    dangerouslySetInnerHTML={{ __html: renderContent() }}
                />
            </div>
        </div>
    );
}
