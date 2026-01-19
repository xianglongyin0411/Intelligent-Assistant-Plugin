import * as vscode from 'vscode';

export interface AssistantConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
    temperature: number;
    maxTokens: number;
}

export class ConfigManager {
    private static instance: ConfigManager;

    private constructor() {}

    static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    getConfig(): AssistantConfig {
        const config = vscode.workspace.getConfiguration('assistant');
        return {
            apiKey: config.get<string>('apiKey', ''),
            model: config.get<string>('model', 'deepseek-chat'),
            baseUrl: config.get<string>('baseUrl', 'https://api.deepseek.com/v1'),
            temperature: config.get<number>('temperature', 0.7),
            maxTokens: config.get<number>('maxTokens', 2048)
        };
    }

    async updateConfig(key: keyof AssistantConfig, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration('assistant');
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    isConfigured(): boolean {
        const config = this.getConfig();
        return !!config.apiKey;
    }
}
