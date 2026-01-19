import { AssistantConfig } from '../config/configManager';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    choices: Array<{
        message?: {
            content: string;
            role: string;
        };
        delta?: {
            content?: string;
            role?: string;
        };
        finish_reason: string;
    }>;
}

export class ApiService {
    private config: AssistantConfig;

    constructor(config: AssistantConfig) {
        this.config = config;
    }

    updateConfig(config: AssistantConfig): void {
        this.config = config;
    }

    async sendChat(messages: ChatMessage[], onChunk?: (content: string) => void): Promise<string> {
        if (!this.config.apiKey) {
            throw new Error('API Key is not configured');
        }

        const endpoint = `${this.config.baseUrl}/chat/completions`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages,
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens,
                    stream: !!onChunk
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed (${response.status}): ${errorText}`);
            }

            // Stream response
            if (onChunk) {
                return this.handleStreamResponse(response, onChunk);
            }

            // Non-stream response
            const data = await response.json() as ChatResponse;
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            throw new Error(`Failed to send chat request: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async handleStreamResponse(
        response: Response,
        onChunk: (content: string) => void
    ): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Failed to read response stream');
        }

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.trim()) continue;
                if (line === 'data: [DONE]') continue;

                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            fullContent += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // Ignore parse errors for incomplete chunks
                    }
                }
            }
        }

        return fullContent;
    }
}
