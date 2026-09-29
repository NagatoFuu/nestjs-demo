# Phase 0 · 第一课：初始化与启动链路

## 本次目标

建立一个可以启动、构建和测试的 NestJS 11 后端，并读懂脚手架生成的最小应用。

这一课不接数据库、不创建用户模块，也不修改默认 Hello 功能。我们先理解一棵树的根，再开始长枝叶。

## 一、四个工具分别负责什么

### Node.js

Node.js 是 JavaScript 的服务端运行时。TypeScript 最终仍需转换为 JavaScript，再交给 Node.js 执行。

本项目当前使用 Node.js 24.20.0。

### pnpm

pnpm 是包管理器，负责读取 `package.json`、解析并安装依赖、生成锁文件，以及执行 scripts。它不是 NestJS 的一部分。

常用命令：

```powershell
pnpm install
pnpm start:dev
pnpm build
pnpm test
```

### TypeScript

TypeScript 在 JavaScript 之上增加静态类型。它帮助我们在运行前发现错误，但浏览器和 Node.js 通常不直接执行 TypeScript 源码。

`tsconfig.json` 描述编译规则。本项目启用了严格空值检查和禁止隐式 `any`，并启用了 NestJS 装饰器所需的配置。

### Nest CLI

Nest CLI 是开发工具，负责创建项目、生成模块、启动开发服务和调用构建器。应用运行时真正依赖的是 `@nestjs/core`、`@nestjs/common` 等包，而不是全局安装的 CLI。

## 二、默认目录

```text
apps/server/
├── src/
│   ├── main.ts                 # 应用入口
│   ├── app.module.ts           # 根模块
│   ├── app.controller.ts       # HTTP 入口
│   ├── app.service.ts          # 业务能力提供者
│   └── app.controller.spec.ts  # 单元测试
├── test/
│   └── app.e2e-spec.ts         # 端到端测试
├── package.json                # 依赖与命令
├── tsconfig.json               # TypeScript 配置
├── nest-cli.json               # Nest CLI 配置
└── pnpm-lock.yaml              # 精确依赖解析结果
```

`node_modules` 和 `dist` 是生成目录：前者由包管理器安装，后者由构建产生，都不应手工编辑。

## 三、启动链路

```text
Node.js 执行 main.ts
        ↓
NestFactory.create(AppModule)
        ↓
读取 AppModule 的 @Module 元数据
        ↓
创建 AppService
        ↓
创建 AppController，并注入 AppService
        ↓
注册 GET /
        ↓
监听 3000 端口
```

### `main.ts`

`bootstrap()` 是启动函数。`NestFactory.create(AppModule)` 创建 Nest 应用和依赖注入容器，`listen()` 才真正开始监听 HTTP 请求。

入口使用 `void bootstrap()`，表示我们明确知道它返回 Promise，并有意不在顶层等待。后续会在全局错误处理章节讨论启动失败的完整处理方式。

### `app.module.ts`

`@Module()` 告诉 NestJS 如何组装这一部分应用：

- `imports`：当前模块依赖的其他模块
- `controllers`：负责接收请求的控制器
- `providers`：由依赖注入容器管理的服务
- `exports`：允许其他模块使用的 Provider

当前根模块注册了 `AppController` 和 `AppService`。

### `app.controller.ts`

`@Controller()` 把类声明为控制器，`@Get()` 把方法映射到 `GET /`。Controller 负责接收 HTTP 请求并返回结果，但把具体内容委托给 AppService。

### `app.service.ts`

`@Injectable()` 表示这个类可由 NestJS 依赖注入容器管理。Controller 构造函数中的 `AppService` 不需要手工 `new`，容器会根据模块配置创建并注入它。

## 四、为什么要分 Controller 和 Service

第一层：Controller 处理 HTTP，Service 提供业务能力。

第二层：NestJS 用依赖注入把“使用能力”和“创建能力”分开，使对象生命周期、替换和测试可以由框架统一管理。

第三层：真实项目中，同一业务能力可能被 HTTP Controller、队列 Worker 或定时任务共同调用。若逻辑全部放在 Controller，就很难复用和独立测试。

默认 Hello 很简单，看起来分层略显多余；它的价值是先展示以后复杂模块会遵循的结构。

## 五、两类测试的区别

### 单元测试

`app.controller.spec.ts` 创建一个小型 TestingModule，直接调用 Controller 方法，主要验证局部行为，速度快。

### E2E 测试

`app.e2e-spec.ts` 创建真实 Nest 应用，通过模拟 HTTP 请求访问 `GET /`，可以同时验证路由、模块装配和响应。

## 六、亲自运行

在 PowerShell 中执行：

```powershell
Set-Location -LiteralPath 'D:\nagato\nestjs-demo\apps\server'
pnpm start:dev
```

看到应用启动后访问：

```text
http://localhost:3000/
```

预期响应：

```text
Hello World!
```

使用 `Ctrl+C` 停止开发服务。

## 七、第一课检查题

请先不用搜索，按自己的理解回答：

1. Node.js、pnpm 和 Nest CLI 分别负责什么？
2. `main.ts` 中是哪一行真正让应用开始监听 HTTP 请求？
3. `AppModule` 为什么需要在 `controllers` 中注册 `AppController`？
4. `AppController` 为什么不用自己执行 `new AppService()`？
5. Controller 和 Service 的职责有什么区别？
6. 单元测试和 E2E 测试在本项目中分别验证什么？
7. `node_modules` 和 `dist` 为什么不应该手工修改？

回答后，我们会逐题纠正并完成 Phase 0 的下一小节。
