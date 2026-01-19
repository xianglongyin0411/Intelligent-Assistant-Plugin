# 项目文件索引（按文件）

本文件按文件列出仓库中主要源文件的简要功能说明，便于审阅与注释。若需更细粒度（函数/类级别），我可以继续展开。

---

## 顶层文件

- **File:** [package.json](package.json) : 项目元信息、VS Code 扩展声明、配置选项与构建脚本（`compile`、`bundle`、`watch` 等）。
- **File:** [README.md](README.md) : 插件说明、安装/运行/配置指南与开发提示。
- **File:** [tsconfig.json](tsconfig.json) : TypeScript 编译配置。
- **File:** [webpack.config.js](webpack.config.js) : 打包 webview 前端资源的 webpack 配置。

## 扩展主逻辑

- **File:** [src/extension.ts](src/extension.ts) : 扩展入口，注册命令（打开面板、清除聊天、配置模型等），提供侧边栏 Webview（`AssistantWebviewProvider`），处理来自 Webview 的消息（`init`、`sendMessage`、`switchModel`、`clearChat`），执行到模型 API 的流式请求并将流回的片段推回 Webview。

## API 与配置

- **File:** [src/api/apiService.ts](src/api/apiService.ts) : 封装与模型 API 的交互，支持同步与流式响应；主要方法 `sendChat(messages, onChunk?)`。
- **File:** [src/config/configManager.ts](src/config/configManager.ts) : 管理 `assistant` 配置命名空间，读取/更新 API Key、模型名、baseUrl、temperature、maxTokens 等。
- **File:** [src/config/modelConfig.ts](src/config/modelConfig.ts) : `ModelManager` 单例，管理多模型配置（增删改查、设置当前模型、基于旧配置创建默认 DeepSeek 模型），并对外暴露 `modelManager`。

## Webview 类型与协议

- **File:** [src/webview/types.ts](src/webview/types.ts) : Webview 与 Extension 消息类型定义（`ChatMessage`、`ModelConfig`、`ExtensionMessage`、`WebviewMessage`）和 `acquireVsCodeApi` 封装。

## 前端（React Webview）

- **File:** [src/panel/index.tsx](src/panel/index.tsx) : Webview 前端入口，挂载 React 应用并注入全局样式与小动画。
- **File:** [src/panel/AssistantPanel.tsx](src/panel/AssistantPanel.tsx) : 顶层组件，管理消息状态、模型列表、流式状态，负责与 Extension 通信（`postMessage`），分发到子组件并处理前端的日志/错误转发。
- **File:** [src/panel/ChatContainer.tsx](src/panel/ChatContainer.tsx) : 消息列表容器，处理滚动、空状态与流式占位显示。
- **File:** [src/panel/ChatInput.tsx](src/panel/ChatInput.tsx) : 输入组件，处理回车发送（Enter 发送、Shift+Enter 换行）、动态高度、自适应禁用状态。
- **File:** [src/panel/ChatMessage.tsx](src/panel/ChatMessage.tsx) : 单条消息渲染，区分 `user`/`assistant`/`error`；对 assistant 消息使用 Markdown 渲染并显示时间与模型标签。
- **File:** [src/panel/CodeBlock.tsx](src/panel/CodeBlock.tsx) : 代码块渲染组件，带复制按钮与样式包装。
- **File:** [src/panel/ModelSelector.tsx](src/panel/ModelSelector.tsx) : 模型下拉选择器，或在无模型时显示“Configure Model”按钮，向 Extension 请求打开设置或切换模型。

## 前端样式

- **File:** [src/panel/styles/global.css](src/panel/styles/global.css) : 全局样式（主题变量、滚动条、按钮、输入样式等）。
- **File:** [src/panel/styles/chat.css](src/panel/styles/chat.css) : 聊天相关样式（消息动画、打字指示、空状态等）。
- **File:** [src/panel/styles/markdown.css](src/panel/styles/markdown.css) : Markdown 内容样式（标题、列表、表格、代码块、blockquote 等）。

## 工具函数

- **File:** [src/utils/markdown.ts](src/utils/markdown.ts) : Markdown 渲染与安全化（`marked` + `highlight.js` + `DOMPurify`），并提供 `extractCodeBlocks` 与 `containsMarkdown` 等工具。

---

## 建议的下一步（可选）

- 展开文件中关键函数/方法的逐行说明并标注行号，便于代码审阅。  
- 添加一个 ISSUE/TODO 列表，记录缺失的功能（如聊天历史本地存储、快捷键、多模型测试等）。  
- 可生成一个带有链接和可跳转锚点的 HTML 预览，便于非开发人员浏览。

---

如果需要，我可以：
- 将每个文件展开为函数/类级别的详细说明（并在文档中加入文件内关键函数签名与行号链接）；或
- 提交一个包含该文档的 commit（或创建 PR 草稿）。
