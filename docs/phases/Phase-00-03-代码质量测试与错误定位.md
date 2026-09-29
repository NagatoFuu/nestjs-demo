# Phase 0 · 第三课：代码质量、测试与错误定位

## 本次目标

这一课解决四个问题：

1. ESLint 和 Prettier 为什么不能互相替代？
2. 单元测试、E2E 测试和覆盖率分别告诉我们什么？
3. 开发服务器和测试怎样进入调试模式？
4. 遇到错误时，怎样避免无依据地大范围修改？

## 一、四类质量检查

```text
Prettier    统一代码外观
ESLint      发现可疑或不安全的代码模式
TypeScript  检查类型并完成编译
Jest        验证程序行为是否符合预期
```

下面的代码格式和类型都正确，但业务逻辑依然可能写错：

```typescript
function add(a: number, b: number): number {
  return a - b;
}
```

Prettier 不会发现减号错误，TypeScript 也认为输入和输出都是 `number`。这类问题需要测试或人工审查发现。

## 二、Prettier：只负责格式

配置文件 `.prettierrc` 规定单引号、尾随逗号等格式。

```powershell
pnpm format:check
pnpm format
```

- `format:check` 只检查，不修改文件，适合 CI。
- `format` 自动重写格式，适合开发时主动修复。

格式化应该只改变表达形式，不改变程序含义。

## 三、ESLint：检查代码规则

ESLint 配置位于 `eslint.config.mjs`。它结合 TypeScript 类型信息检查未处理的 Promise、危险参数和其他可疑写法。

```powershell
pnpm lint
pnpm lint:fix
```

- `lint` 只检查。
- `lint:fix` 尝试修复能够安全自动修复的问题。
- 无法自动修复的问题仍需理解后手工处理。

本课把脚手架默认的 `lint --fix` 拆成两个命令。检查命令不应悄悄改动源码，这对 CI 和 Code Review 更清晰。

### Error 与 Warning

- Error：当前规则要求必须解决，通常使命令失败。
- Warning：值得关注，但当前配置允许命令继续成功。

Warning 不是“可以永久忽略”，需要理解原因后再决定修复还是调整规则。

## 四、TypeScript 与构建

```powershell
pnpm build
```

构建负责验证类型并生成 `dist`。类型检查通过只说明类型关系成立，不代表业务逻辑正确，也不证明 HTTP 接口一定能正常工作。

## 五、单元测试

当前单元测试位于 `src/app.controller.spec.ts`：

```typescript
expect(appController.getHello()).toBe('Hello World!');
```

它通过 TestingModule 创建 Controller 和 Service，然后直接调用 Controller 方法，没有真正监听端口。

```powershell
pnpm test
```

单元测试适合验证 Service 业务规则、数据转换、局部委托关系和异常分支。它执行快、定位精确，但不能证明完整应用装配正确。

## 六、E2E 测试

当前 E2E 测试位于 `test/app.e2e-spec.ts`：

```text
创建 AppModule
→ 创建 NestApplication
→ 模拟 GET /
→ 验证 HTTP 200
→ 验证响应 Hello World!
```

```powershell
pnpm test:e2e
```

E2E 更接近真实使用，能验证模块装配和路由，但执行更慢，失败时涉及的层次更多。接入数据库后，还要处理测试数据隔离和清理。

## 七、覆盖率

```powershell
pnpm test:cov
```

常见指标：

- Statements：语句覆盖率
- Branches：分支覆盖率
- Functions：函数覆盖率
- Lines：行覆盖率

覆盖率只能说明哪些代码被执行过，不能证明断言正确，也不能证明需求完整。

```text
高覆盖率 ≠ 高质量
低覆盖率通常意味着风险区域缺少保护
```

本项目优先覆盖认证、权限和关键业务规则，不追求没有意义的 100%。

## 八、Watch 与 Debug

### 测试监听

```powershell
pnpm test:watch
```

相关文件变化后自动重跑测试，适合开发时快速反馈。

### 应用调试

```powershell
pnpm start:debug
```

它启动 Node.js 调试端口并监听源码变化。IDE 可以连接调试端口，在 TypeScript 源码设置断点。

### 测试调试

```powershell
pnpm test:debug
```

`--inspect-brk` 表示启动后先暂停并等待调试器连接；`--runInBand` 让测试在单进程中运行，使断点行为更容易理解。

## 九、最小错误定位流程

```text
现象 → 原因假设 → 定位证据 → 最小修改 → 重新验证
```

### 1. 记录现象

保留命令、退出码、错误文本、输入和预期结果，不要只描述为“运行不了”。

### 2. 判断错误层次

```text
安装失败？  看 pnpm 和 Node.js 版本
编译失败？  看 TypeScript 文件、行号和错误码
Lint 失败？ 看规则名
测试失败？  看 expected 与 received
启动失败？  看端口、环境变量和日志
请求失败？  看状态码、路由和响应
```

### 3. 用最窄命令复现

一个单元测试失败，就先运行相关测试，不立即重装依赖、删除锁文件或重构模块。

### 4. 做最小修改

只修改与证据直接相关的位置，保留其他已通过的行为。

### 5. 分层验证

先重跑最窄检查，再按影响范围运行 lint、测试和构建。

## 十、动手实验

在 `apps/server` 中依次执行：

```powershell
pnpm format:check
pnpm lint
pnpm test
pnpm test:e2e
pnpm test:cov
pnpm build
```

观察每条命令回答的是哪一类质量问题。

然后进行一个可恢复的失败实验：

1. 把 `src/app.controller.spec.ts` 中的期望值临时改成 `Hello NestJS!`。
2. 执行 `pnpm test`，阅读 expected 和 received。
3. 判断是实现错误，还是测试预期被故意写错。
4. 把期望值改回 `Hello World!`。
5. 再次执行 `pnpm test`，确认恢复通过。

不要为这个测试失败删除 `node_modules`、删除锁文件或大范围修改源码。

## 十一、检查题

1. Prettier、ESLint、TypeScript 和 Jest 各自负责什么？
2. 为什么把 `lint` 和 `lint:fix` 分成两个命令？
3. TypeScript 构建通过，为什么程序仍可能存在业务错误？
4. 当前单元测试是否真正发送了 HTTP 请求？为什么？
5. E2E 测试相比单元测试多验证了哪些内容？
6. 100% 覆盖率为什么不能证明程序完全正确？
7. `--watch` 和 `--inspect-brk` 分别解决什么问题？
8. 测试失败时，为什么不应该第一步就删除 `node_modules`？
9. 请用自己的话复述“现象 → 原因 → 定位 → 最小修改 → 验证”。

