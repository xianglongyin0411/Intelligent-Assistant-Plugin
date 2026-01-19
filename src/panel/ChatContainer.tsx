import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../webview/types';

interface ChatContainerProps {
    messages: ChatMessageType[];
    isStreaming?: boolean;
}

export function ChatContainer({ messages, isStreaming }: ChatContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages, isStreaming]);

    if (messages.length === 0) {
        return (
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--vscode-descriptionForeground)',
                fontSize: '14px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '8px' }}>No messages yet</p>
                    <p style={{ fontSize: '13px' }}>Start a conversation by typing a message below</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px'
            }}
        >
            {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
            ))}
            {isStreaming && (
                <div style={{
                    marginBottom: '12px',
                    padding: '8px 10px',
                    backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                    borderRadius: '6px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start'
                }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--vscode-textLink-foreground)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '14px',
                        color: '#fff'
                    }}>
                        AI
                    </div>
                    <div style={{
                        opacity: 0.6,
                        animation: 'blink 1.5s infinite'
                    }}>
                        Thinking...
                    </div>
                </div>
            )}
        </div>
    );
}
