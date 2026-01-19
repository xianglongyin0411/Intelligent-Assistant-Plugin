import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ChatInput({ onSendMessage, disabled = false, placeholder = 'Ask me anything...' }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [message]);

    const handleSubmit = () => {
        const trimmed = message.trim();
        if (trimmed && !disabled) {
            onSendMessage(trimmed);
            setMessage('');
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = '50px';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div style={{
            padding: '12px',
            borderTop: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            gap: '8px'
        }}>
            <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                style={{
                    flex: 1,
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    border: '1px solid var(--vscode-input-border)',
                    borderRadius: '4px',
                    padding: '8px 10px',
                    fontFamily: 'inherit',
                    fontSize: 'var(--vscode-font-size)',
                    resize: 'none',
                    minHeight: '50px',
                    maxHeight: '120px',
                    outline: 'none'
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'var(--vscode-focusBorder)';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'var(--vscode-input-border)';
                }}
            />
            <button
                onClick={handleSubmit}
                disabled={disabled || !message.trim()}
                style={{
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: disabled || !message.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    minWidth: '60px',
                    fontSize: 'var(--vscode-font-size)',
                    opacity: disabled || !message.trim() ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                    if (!disabled && message.trim()) {
                        e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                }}
            >
                Send
            </button>
        </div>
    );
}
