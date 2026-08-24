# Code-OSS 集成方案

BiiiG 桌面端采用双层架构：

1. **Electron 外壳**：负责窗口管理、系统级集成、AI 面板渲染
2. **Code-OSS 内核**：负责代码编辑、文件管理、终端、Git 集成、VS Code 插件生态

## 集成方式

### 方案 A：VS Code 插件（推荐 MVP）

将 BiiiG 的核心 AI 能力封装为 VS Code 扩展：

- 侧边栏 Webview 面板：Chat / Agent / 模板库
- 命令面板：打开 BiiiG
- 编辑器内联：AI Edit、代码补全
- 通过 VS Code API 读写文件、执行终端命令

优点：
- 100% 兼容 VS Code 生态
- 开发成本低
- 用户零迁移成本

实现路径：
```bash
# 1. 基于 VS Code 插件 API 开发 extension
apps/vscode-extension/

# 2. 打包为 .vsix 文件
pnpm build:extension

# 3. 用户安装后即可在 VS Code 中使用 BiiiG
```

### 方案 B：Code-OSS 二次开发

基于微软开源的 Code-OSS 仓库二次开发：

```bash
git clone https://github.com/microsoft/vscode.git biiig-ide
cd biiig-ide
git checkout 1.90.0
```

修改点：
- 替换品牌标识
- 注入 AI 面板到 workbench
- 集成 BiiiG 后端服务
- 打包为独立 Electron 应用

优点：
- 完全可控的 IDE 体验
- 可深度定制 UI/UX

缺点：
- 构建和维护成本高
- 需要跟进上游版本更新

## 当前 MVP 架构

当前 `apps/desktop` 是一个可独立运行的 Electron + React AI 面板：

- 适合快速验证产品形态
- 通过后端 API 与模型、Agent、模板交互
- 文件操作通过 Electron 主进程或后端代理执行

后续可演化为：
1. 先发布 VS Code 插件获取用户
2. 再基于 Code-OSS 打造独立 IDE
