import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Parse Markdown text to safe HTML with syntax highlighting
 */
export function parseMarkdown(markdown: string): string {
    if (!markdown) return '';

    try {
        // Configure marked with highlight.js
        const renderer = new marked.Renderer();

        renderer.code = function({ text: code, lang: language, escaped }: any) {
            let highlightedCode = code;

            if (language && typeof (window as any).hljs !== 'undefined') {
                try {
                    const hljs = (window as any).hljs;
                    const languageLower = language.toLowerCase();

                    // Try to get language from hljs
                    if (hljs.getLanguage(languageLower)) {
                        highlightedCode = hljs.highlight(code, { language: languageLower }).value;
                    } else {
                        highlightedCode = hljs.highlightAuto(code).value;
                    }
                } catch (error) {
                    console.warn('Highlighting failed for language:', language, error);
                    highlightedCode = code;
                }
            }

            return `<pre class="hljs"><code class="language-${language || 'plaintext'}">${highlightedCode}</code></pre>`;
        };

        const html = marked.parse(markdown, {
            gfm: true, // GitHub Flavored Markdown
            breaks: true, // Convert \n to <br>
            renderer
        });

        // Allow more attributes for highlight.js classes
        return DOMPurify.sanitize(html as string, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li',
                'blockquote',
                'a', 'img',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'hr', 'div', 'span', 'td', 'th'
            ],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'data-language', 'style'],
            ALLOW_DATA_ATTR: true,
            ADD_TAGS: ['pre', 'code'],
            ADD_ATTR: ['class'],
            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
        });
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return markdown; // Return original text if parsing fails
    }
}

/**
 * Extract code blocks from markdown for syntax highlighting
 */
export function extractCodeBlocks(markdown: string): Array<{ language: string; code: string }> {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks: Array<{ language: string; code: string }> = [];

    let match;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
        blocks.push({
            language: match[1] || 'text',
            code: match[2]
        });
    }

    return blocks;
}

/**
 * Check if text contains markdown
 */
export function containsMarkdown(text: string): boolean {
    const markdownPatterns = [
        /^#{1,6}\s/m,           // Headers
        /\*\*.*?\*\*/g,         // Bold
        /\*.*?\*/g,             // Italic
        /`.*?`/g,               // Inline code
        /```[\s\S]*?```/g,      // Code blocks
        /\[.*?\]\(.*?\)/g,      // Links
        /^[\-\*]\s/gm,          // Unordered lists
        /^\d+\.\s/gm            // Ordered lists
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
}
