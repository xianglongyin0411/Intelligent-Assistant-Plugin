import type { ModelConfig } from '../webview/types';

interface ModelSelectorProps {
    models: ModelConfig[];
    currentModelId: string;
    onModelChange: (modelId: string) => void;
}

export function ModelSelector({ models, currentModelId, onModelChange }: ModelSelectorProps) {
    const currentModel = models.find(m => m.id === currentModelId);

    const handleOpenSettings = () => {
        // Notify extension to open settings
        const vscode = (globalThis as any).acquireVsCodeApi();
        vscode.postMessage({ type: 'openSettings' });
    };

    if (models.length === 0) {
        return (
            <button
                onClick={handleOpenSettings}
                style={{
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryHoverBackground)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
                }}
            >
                <span>Configure Model</span>
            </button>
        );
    }

    return (
        <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <select
                value={currentModelId || ''}
                onChange={(e) => onModelChange(e.target.value)}
                style={{
                    backgroundColor: 'var(--vscode-dropdown-background)',
                    color: 'var(--vscode-foreground)',
                    border: '1px solid var(--vscode-dropdown-border)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '150px'
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'var(--vscode-focusBorder)';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'var(--vscode-dropdown-border)';
                }}
            >
                {models.map((model) => (
                    <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                    </option>
                ))}
            </select>
        </div>
    );
}
