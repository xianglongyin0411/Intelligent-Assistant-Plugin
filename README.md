# Intelligent Assistant - VS Code 插件

基于 DeepSeek AI 模型的 VS Code 智能助手插件，提供强大的对话和代码辅助功能。

## 功能特性

- 智能问答界面：在 VS Code 中进行 AI 对话
- 流式响应：实时展示 AI 回复内容
- 模型配置管理：支持自定义 API Key、模型等配置
- 清除历史：一键清空聊天记录
- 现代化 UI：适配 VS Code 主题风格

## 项目结构

```
intelligent-assistant-plugin/
├── src/
│   ├── extension.ts       # 插件主入口
│   ├── config/
│   │   └── configManager.ts  # 配置管理模块
│   ├── api/
│   │   └── apiService.ts     # API 服务模块
│   ├── panel/               # React 面板组件（可选）
│   └── webview/             # Webview 相关代码（可选）
├── package.json            # 项目配置和依赖
├── tsconfig.json           # TypeScript 配置
└── README.md              # 说明文档
```

## 技术栈

- **开发语言**: TypeScript
- **框架**: VS Code Extension API
- **UI**: HTML/CSS/JavaScript (Webview)
- **API**: DeepSeek API

## 安装和运行

### 1. 安装依赖



```bash
npm install
```

### 2. 编译项目

```bash
npm run compile
```

### 3. 运行调试

在 VS Code 中按 `F5` 或点击 "Run > Start Debugging" 启动 Extension Development Host。

### 4. 安装到 VS Code

编译完成后，将项目打包：

```bash
npm install -g vsce
vsce package
```

然后安装生成的 `.vsix` 文件：

```bash
code --install-extension intelligent-assistant-plugin-1.0.0.vsix
```

## 使用说明

### 首次使用

1. 安装插件后，点击左侧活动栏的 "AI Assistant" 图标，或使用命令面板（Ctrl+Shift+P）输入 "Open AI Assistant"
2. 点击 "Configure AI Model" 命令配置 API Key
3. 输入你的 DeepSeek API Key（可在 https://platform.deepseek.com 获取）
4. 配置模型名称（默认: deepseek-chat）和 API 基础 URL

### 开始对话

在输入框中输入问题，按 Enter 发送（Shift+Enter 换行）。AI 将以流式方式回复你的问题。

### 功能命令

- **Open AI Assistant**: 打开 AI 助手面板
- **Clear Chat History**: 清空聊天记录
- **Configure AI Model**: 配置 AI 模型参数

## 配置选项

在 VS Code 设置中搜索 "Intelligent Assistant" 可修改以下配置：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `assistant.apiKey` | 空 | DeepSeek API Key |
| `assistant.model` | deepseek-chat | 使用的模型名称 |
| `assistant.baseUrl` | https://api.deepseek.com/v1 | API 基础 URL |
| `assistant.temperature` | 0.7 | 温度参数（0-2） |
| `assistant.maxTokens` | 2048 | 最大 Token 数 |

## 开发说明

### 添加新功能

主要代码在 `src/extension.ts` 中：

1. 注册新命令：`registerCommand`
2. 添加 Webview 交互：在 `webview.onDidReceiveMessage` 中处理消息
3. 更新 UI：修改 `getWebviewContent` 函数

### 调试技巧

- 使用 VS Code 内置的调试功能
- 查看 "Output" > "Extension Host" 日志
- 使用开发者工具：在 Webview 中右键 → "Inspect Element"

## 开发进度

- [x] 基础项目结构搭建
- [x] VS Code 扩展配置
- [x] 配置管理模块
- [x] API 服务模块
- [x] Webview UI 基础
- [x] 流式响应支持
- [ ] Markdown 渲染
- [ ] 代码语法高亮
- [ ] 多模型支持
- [ ] 聊天历史保存
- [ ] 快捷键支持

## 待实现功能（加分项）

- [ ] 支持 Markdown 渲染
- [ ] 代码块语法高亮
- [ ] 多模型支持（OpenAI、Claude、Kimi 等）
- [ ] 聊天记录本地存储
- [ ] 快捷键支持
- [ ] 上下文感知（读取当前文件内容）
- [ ] 代码补全建议

## 常见问题

### API Key 无效？

请确保 API Key 正确，并且账户有足够余额。在 [DeepSeek 平台](https://platform.deepseek.com) 检查 API Key 状态。

### 无法连接到 API？

检查网络连接和 API Base URL 是否正确。

### 界面显示异常？

尝试重新加载窗口（Ctrl+Shift+P → "Developer: Reload Window"）

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系：zhoujie195@midea.com
