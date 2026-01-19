import { useState, useEffect } from 'react';

interface CodeBlockProps {
    language: string;
    code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
        }
    };

    return (
        <div style={{
            position: 'relative',
            marginBottom: '12px',
            borderRadius: '6px',
            overflow: 'hidden',
            border: '1px solid var(--vscode-panel-border)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                backgroundColor: 'var(--vscode-editorGroupHeader-tabsBackground)',
                borderBottom: '1px solid var(--vscode-panel-border)'
            }}>
                <span style={{
                    fontSize: '11px',
                    color: 'var(--vscode-descriptionForeground)',
                    fontFamily: 'var(--vscode-editor-font-family)',
                    fontWeight: 500
                }}>
                    {language || 'text'}
                </span>
                <button
                    onClick={handleCopy}
                    style={{
                        backgroundColor: 'transparent',
                        color: 'var(--vscode-foreground)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        fontSize: '11px',
                        borderRadius: '3px',
                        opacity: 0.7
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
                        e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.opacity = '0.7';
                    }}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre style={{
                margin: 0,
                padding: '12px',
                overflow: 'auto',
                backgroundColor: 'var(--vscode-textCodeBlock-background)'
            }}>
                <code
                    style={{
                        fontFamily: 'var(--vscode-editor-font-family)',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: 'var(--vscode-editor-foreground)'
                    }}
                >
                    {code}
                </code>
            </pre>
        </div>
    );
}
