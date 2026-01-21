import { useState, useEffect } from 'react';
import './styles/ModelManagerDialog.css';
import type { ModelConfig } from '../webview/types';

interface ModelManagerDialogProps {
    isOpen: boolean;
    models: ModelConfig[];
    onClose: () => void;
    onSave: (model: ModelConfig) => void;
    onDelete: (modelId: string) => void;
}

interface FormData {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    maxTokens: string;
    temperature: string;
}

export function ModelManagerDialog({ isOpen, models, onClose, onSave, onDelete }: ModelManagerDialogProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
    const [formData, setFormData] = useState<FormData>({
        id: '',
        name: '',
        provider: '',
        baseUrl: '',
        apiKey: '',
        maxTokens: '2048',
        temperature: '0.7'
    });

    const resetForm = () => {
        setFormData({
            id: '',
            name: '',
            provider: '',
            baseUrl: '',
            apiKey: '',
            maxTokens: '2048',
            temperature: '0.7'
        });
        setIsAdding(false);
        setEditingModel(null);
    };

    const handleAdd = () => {
        setIsAdding(true);
        setEditingModel(null);
        setFormData({
            id: `model-${Date.now()}`,
            name: '',
            provider: '',
            baseUrl: '',
            apiKey: '',
            maxTokens: '2048',
            temperature: '0.7'
        });
    };

    const handleEdit = (model: ModelConfig) => {
        setIsAdding(false);
        setEditingModel(model);
        setFormData({
            id: model.id,
            name: model.name,
            provider: model.provider,
            baseUrl: model.baseUrl,
            apiKey: model.apiKey,
            maxTokens: String(model.maxTokens || 2048),
            temperature: String(model.temperature || 0.7)
        });
    };

    const handleDelete = (modelId: string) => {
        if (confirm('Are you sure you want to delete this model?')) {
            onDelete(modelId);
            if (editingModel?.id === modelId) {
                resetForm();
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const model: ModelConfig = {
            id: formData.id,
            name: formData.name,
            provider: formData.provider,
            baseUrl: formData.baseUrl,
            apiKey: formData.apiKey,
            maxTokens: parseInt(formData.maxTokens) || 2048,
            temperature: parseFloat(formData.temperature) || 0.7
        };

        onSave(model);
        resetForm();
    };

    const handleCancel = () => {
        resetForm();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Model Management</h2>
                    <button className="close-button" onClick={onClose}>✕</button>
                </div>

                <div className="modal-content">
                    <div className="model-list">
                        <div className="model-list-header">
                            <h3>Configured Models</h3>
                            <button className="add-model-button" onClick={handleAdd}>+ Add Model</button>
                        </div>
                        <div className="model-list-content">
                            {models.length === 0 ? (
                                <div className="empty-models">
                                    <p>No models configured yet</p>
                                    <button className="add-first-model-button" onClick={handleAdd}>
                                        Add Your First Model
                                    </button>
                                </div>
                            ) : (
                                models.map((model) => (
                                    <div key={model.id} className="model-item">
                                        <div className="model-info">
                                            <div className="model-name">{model.name}</div>
                                            <div className="model-provider">{model.provider}</div>
                                            <div className="model-url">{model.baseUrl}</div>
                                        </div>
                                        <div className="model-actions">
                                            <button
                                                className="action-button edit-button"
                                                onClick={() => handleEdit(model)}
                                                disabled={editingModel?.id === model.id}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="action-button delete-button"
                                                onClick={() => handleDelete(model.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {(isAdding || editingModel) && (
                        <div className="model-form">
                            <h3>{isAdding ? 'Add New Model' : 'Edit Model'}</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="name">Model Name *</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="e.g., deepseek-chat"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="provider">Provider *</label>
                                    <input
                                        id="provider"
                                        type="text"
                                        value={formData.provider}
                                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                        required
                                        placeholder="e.g., DeepSeek, OpenAI"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="baseUrl">Base URL *</label>
                                    <input
                                        id="baseUrl"
                                        type="text"
                                        value={formData.baseUrl}
                                        onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                        required
                                        placeholder="e.g., https://api.deepseek.com/v1"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="apiKey">API Key *</label>
                                    <input
                                        id="apiKey"
                                        type="password"
                                        value={formData.apiKey}
                                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                        required
                                        placeholder="Enter your API key"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="maxTokens">Max Tokens</label>
                                        <input
                                            id="maxTokens"
                                            type="number"
                                            value={formData.maxTokens}
                                            onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
                                            min="1"
                                            max="32000"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="temperature">Temperature</label>
                                        <input
                                            id="temperature"
                                            type="number"
                                            value={formData.temperature}
                                            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                                            min="0"
                                            max="2"
                                            step="0.1"
                                        />
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="cancel-button" onClick={handleCancel}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="save-button">
                                        {isAdding ? 'Add Model' : 'Update Model'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
