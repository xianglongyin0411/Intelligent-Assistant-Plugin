import * as vscode from 'vscode';

export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    maxTokens?: number;
    temperature?: number;
}

/**
 * ModelManager - Singleton class for managing AI model configurations
 */
export class ModelManager {
    private static instance: ModelManager;
    private readonly configKey = 'assistant.models';
    private readonly currentModelKey = 'assistant.currentModelId';

    private constructor() {}

    static getInstance(): ModelManager {
        if (!ModelManager.instance) {
            ModelManager.instance = new ModelManager();
        }
        return ModelManager.instance;
    }

    /**
     * Get all configured models
     */
    getModels(): ModelConfig[] {
        const config = vscode.workspace.getConfiguration(this.configKey);
        const models = config.get<ModelConfig[]>('models', []);
        return models;
    }

    /**
     * Get a model by ID
     */
    getModel(id: string): ModelConfig | undefined {
        const models = this.getModels();
        return models.find(m => m.id === id);
    }

    /**
     * Get the currently selected model ID
     */
    getCurrentModelId(): string {
        const config = vscode.workspace.getConfiguration();
        const modelId = config.get<string>(this.currentModelKey, '');
        return modelId;
    }

    /**
     * Get the currently selected model config
     */
    getCurrentModel(): ModelConfig | undefined {
        const currentId = this.getCurrentModelId();
        return currentId ? this.getModel(currentId) : undefined;
    }

    /**
     * Set the current model ID
     */
    async setCurrentModel(modelId: string): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        await config.update(this.currentModelKey, modelId, vscode.ConfigurationTarget.Global);
    }

    /**
     * Add a new model
     */
    async addModel(model: ModelConfig): Promise<void> {
        const models = this.getModels();
        models.push(model);
        await this.saveModels(models);
    }

    /**
     * Update an existing model
     */
    async updateModel(modelId: string, updates: Partial<ModelConfig>): Promise<void> {
        const models = this.getModels();
        const index = models.findIndex(m => m.id === modelId);
        if (index !== -1) {
            models[index] = { ...models[index], ...updates };
            await this.saveModels(models);
        }
    }

    /**
     * Delete a model
     */
    async deleteModel(modelId: string): Promise<void> {
        const models = this.getModels();
        const filtered = models.filter(m => m.id !== modelId);
        await this.saveModels(filtered);

        // If the deleted model was current, clear current model
        if (this.getCurrentModelId() === modelId) {
            await this.setCurrentModel('');
        }
    }

    /**
     * Save models to configuration
     */
    private async saveModels(models: ModelConfig[]): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        await config.update('assistant.models', models, vscode.ConfigurationTarget.Global);
    }

    /**
     * Create a default DeepSeek model from existing config
     */
    async createDefaultModel(): Promise<void> {
        const config = vscode.workspace.getConfiguration('assistant');
        const apiKey = config.get<string>('apiKey', '');
        const model = config.get<string>('model', 'deepseek-chat');
        const baseUrl = config.get<string>('baseUrl', 'https://api.deepseek.com/v1');
        const maxTokens = config.get<number>('maxTokens', 2048);
        const temperature = config.get<number>('temperature', 0.7);

        const defaultModel: ModelConfig = {
            id: 'default-deepseek',
            name: model,
            provider: 'DeepSeek',
            baseUrl,
            apiKey,
            maxTokens,
            temperature
        };

        const models = this.getModels();
        const existing = models.find(m => m.id === 'default-deepseek');
        if (!existing) {
            await this.addModel(defaultModel);
            await this.setCurrentModel('default-deepseek');
        }
    }
}

export const modelManager = ModelManager.getInstance();
