# Phase 0 · 第二课：包管理、编译与运行模式

## 本次目标

学完本课后，你应该能够解释：

- `package.json`、`pnpm-lock.yaml`、`node_modules` 分别负责什么
- dependencies 和 devDependencies 的区别
- `pnpm start:dev`、`pnpm build`、`pnpm start:prod` 的差异
- TypeScript 源码如何变成 Node.js 能执行的 JavaScript
- `tsconfig.json`、`tsconfig.build.json`、`nest-cli.json` 如何协作

## 一、从一条命令开始

执行：

```powershell
pnpm start:dev
```

pnpm 会读取 `package.json`：

```json
{
  "scripts": {
    "start:dev": "nest start --watch"
  }
}
```

执行链路是：

```text
pnpm start:dev
→ 找到 scripts.start:dev
→ 执行项目本地的 nest start --watch
→ Nest CLI 编译并启动应用
→ 监听源码变化，变化后自动重新构建和启动
```

这里使用的是项目安装的 Nest CLI，不要求每台机器都全局安装相同版本。

## 二、package.json 的职责

`package.json` 是 Node.js 项目的清单，主要描述：

- 项目身份：name、version、private
- 环境要求：engines、packageManager
- 可执行命令：scripts
- 运行依赖：dependencies
- 开发依赖：devDependencies

### scripts

| 命令 | 底层命令 | 用途 |
|---|---|---|
| `pnpm start` | `nest start` | 启动一次开发应用 |
| `pnpm start:dev` | `nest start --watch` | 监听源码变化并重启 |
| `pnpm build` | `nest build` | 生成 `dist` |
| `pnpm start:prod` | `node dist/main` | 执行已构建的 JavaScript |
| `pnpm lint` | `eslint ...` | 静态检查代码 |
| `pnpm test` | `jest` | 执行单元测试 |
| `pnpm test:e2e` | `jest --config ...` | 执行 E2E 测试 |

scripts 不只是缩短命令，它还为开发者和 CI 提供统一入口。

## 三、dependencies 与 devDependencies

### dependencies

应用运行时需要的包：

- `@nestjs/core`：NestJS 核心和 IoC 容器
- `@nestjs/common`：Controller、Module、Injectable 等公共 API
- `@nestjs/platform-express`：默认 HTTP 平台适配器
- `reflect-metadata`：装饰器元数据支持
- `rxjs`：NestJS 部分能力使用的响应式编程基础

### devDependencies

开发、构建或测试时使用的工具：

- TypeScript、Nest CLI
- ESLint、Prettier
- Jest、ts-jest、Supertest
- 类型声明包 `@types/*`

判断标准不是“这个包重要不重要”，而是生产环境直接执行构建结果时是否仍然需要。具体部署时可能先安装全部依赖完成构建，再通过多阶段镜像只保留运行依赖。

## 四、三份依赖信息

```text
package.json
  声明允许的依赖范围，例如 ^11.0.1

pnpm-lock.yaml
  记录解析出的精确版本和依赖树

node_modules
  当前机器上实际安装、供程序加载的依赖
```

`^11.0.1` 通常允许兼容的 11.x 新版本，所以当前实际安装的 NestJS 是 11.2.3。锁文件使其他环境可以重现同一套依赖树。

一般提交 `package.json` 和锁文件，但不提交 `node_modules`。

## 五、TypeScript 如何变成 JavaScript

执行 `pnpm build`：

```text
src/main.ts
→ dist/main.js
→ dist/main.js.map
→ dist/main.d.ts
```

- `.js`：Node.js 实际执行的 JavaScript
- `.js.map`：把运行位置映射回 TypeScript 源码，方便调试
- `.d.ts`：类型声明，描述模块导出的类型信息

完整构建链路：

```text
TypeScript 源码
→ Nest CLI 读取 nest-cli.json
→ 使用 TypeScript 编译配置
→ 类型检查与转换
→ JavaScript 写入 dist
→ Node.js 执行 dist/main.js
```

## 六、三份配置如何协作

### tsconfig.json

这是基础 TypeScript 配置。本阶段先记住：

- `target: ES2023`：输出面向的 JavaScript 标准
- `outDir: ./dist`：输出目录
- `sourceMap: true`：生成源码映射
- `declaration: true`：生成类型声明
- `noImplicitAny: true`：禁止隐式 `any`
- `strictNullChecks: true`：严格检查空值
- `experimentalDecorators: true`：支持装饰器语法
- `emitDecoratorMetadata: true`：生成 NestJS 依赖注入使用的类型元数据

### tsconfig.build.json

它继承基础配置，但排除测试和生成目录：

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

因此生产构建不会把测试源码作为应用代码输出。

### nest-cli.json

它告诉 Nest CLI：源码根目录是 `src`、使用 Nest 官方 schematics，并在构建前清理旧的 `dist`。

## 七、开发模式与生产模式

### 开发模式

```powershell
pnpm start:dev
```

- 监听文件变化
- 修改后自动重新编译和启动
- 适合开发，使用 `Ctrl+C` 停止

### 构建

```powershell
pnpm build
```

- 检查并转换 TypeScript
- 生成 `dist`
- 不负责长期运行 HTTP 服务

### 生产运行

```powershell
pnpm start:prod
```

- 直接执行 `dist/main.js`
- 不监听源码变化
- 运行前必须先构建
- 修改 `src` 后必须重新构建才能生效

## 八、本次动手实验

### 实验 1：观察构建产物

```powershell
Set-Location -LiteralPath 'D:\nagato\nestjs-demo\apps\server'
pnpm build
Get-ChildItem -LiteralPath '.\dist'
Get-Content -LiteralPath '.\dist\main.js'
```

观察 TypeScript 的 import 和语法如何出现在 JavaScript 构建结果中。

### 实验 2：开发模式热更新

```powershell
pnpm start:dev
```

保持进程运行，把 `src/app.service.ts` 中的 `Hello World!` 临时改成 `Hello NestJS!`，观察自动重启并刷新浏览器。实验结束后改回原内容。

### 实验 3：生产模式

```powershell
pnpm build
pnpm start:prod
```

访问 `http://localhost:3000/`，确认返回 `Hello World!`，然后使用 `Ctrl+C` 停止。

可以修改 `src/app.service.ts` 的字符串并改回，但不要手工修改 `dist/main.js`；它会在下次构建时被覆盖。

## 九、第二课检查题

请按自己的理解回答：

1. 执行 `pnpm start:dev` 时，pnpm 如何知道实际应该运行什么？
2. dependencies 和 devDependencies 的判断标准是什么？
3. `package.json` 已经有版本范围，为什么还需要 `pnpm-lock.yaml`？
4. `pnpm build` 和 `pnpm start:prod` 的职责有什么不同？
5. 为什么修改 `src` 后，已经运行的生产构建不会自动变化？
6. `.js`、`.js.map` 和 `.d.ts` 分别有什么作用？
7. `tsconfig.build.json` 为什么排除测试文件？
8. `emitDecoratorMetadata` 对 NestJS 有什么意义？

完成实验并回答后，我们会进行本课检查。
