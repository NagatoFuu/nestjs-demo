# Phase 1 · 第二课：Provider 令牌、模块共享与依赖替换

## 1. 本课为什么存在

上一课把消息直接写在 Service 中：

```typescript
getHello(): string {
  return 'Hello from GreetingModule!';
}
```

它可以运行，但消息内容与 Service 紧密绑定。测试环境、中文环境或不同租户需要不同消息时，只能修改业务类。

本课把职责调整为：

```text
GreetingService 负责“返回问候”的行为
GreetingOptions 负责描述问候配置的类型
GreetingConfigModule 负责提供实际配置
IoC 容器负责连接使用方和提供方
```

接口 `GET /greetings/hello` 及其响应保持不变。对外行为不变、内部依赖方式变化，是一次可验证的小重构。

## 2. 学习目标

- 区分 Service、Provider、Token 和 Instance
- 理解 class 可以作为 Token、interface 不可以的原因
- 掌握 `useValue`、`useClass`、`useFactory`、`useExisting`
- 掌握模块的 `providers`、`exports`、`imports`
- 理解 `@Inject()` 和 `import type`
- 学会在测试中替换依赖

## 3. 四个核心概念

### Service

Service 是职责名称，通常承载业务能力。它注册到模块后也是一种 Provider。

### Provider

Provider 是容器的依赖定义，回答：

```text
有人请求某个 Token 时，容器应该提供什么？
```

### Token

Token 是容器查找依赖的键，可以是 class、string 或 symbol。

### Instance / Value

这是 Token 对应的实际实例或值。

```text
Token                Provider 定义                  实际值
GreetingService  →   useClass GreetingService  →   GreetingService 实例
GREETING_OPTIONS →   useValue greetingOptions  →   { message: '...' }
```

IoC 容器才是管理者，Provider 只是注册定义。

## 4. 类 Provider 的完整写法

```typescript
providers: [GreetingService]
```

是以下配置的简写：

```typescript
providers: [
  {
    provide: GreetingService,
    useClass: GreetingService,
  },
]
```

class 编译成 JavaScript 后仍然存在，因此可以同时充当运行时 Token 和需要实例化的类。

## 5. interface 为什么不能作为 Token

```typescript
export interface GreetingOptions {
  message: string;
}
```

interface 只服务于 TypeScript 编译期，生成 JavaScript 时会被完全删除。因此 NestJS 运行时找不到 `GreetingOptions`，不能用它作为容器的查找键。

必须拆开两个职责：

```text
GreetingOptions   编译期检查对象形状
GREETING_OPTIONS  运行时作为容器查找键
```

## 6. 为什么使用 Symbol

```typescript
export const GREETING_OPTIONS = Symbol('GREETING_OPTIONS');
```

Symbol 是运行时存在且身份唯一的值：

```typescript
Symbol('A') === Symbol('A'); // false
```

所以提供方和使用方必须从同一个文件导入 `GREETING_OPTIONS`，不能分别创建同名 Symbol。

字符串也能作为 Token，但容易拼写错误或命名冲突；共享 Symbol 常量更安全。

## 7. useValue 注册配置

```typescript
const greetingOptions: GreetingOptions = {
  message: 'Hello from GreetingModule!',
};

{
  provide: GREETING_OPTIONS,
  useValue: greetingOptions,
}
```

- `provide`：依赖以什么 Token 被查找。
- `useValue`：查到 Token 后返回什么值。

useValue 适合静态配置、测试 mock、已有对象和第三方客户端。容器不会实例化该对象，只保存并提供它。

## 8. 四种自定义 Provider

### useValue

```typescript
{ provide: TOKEN, useValue: existingObject }
```

提供一个已经存在的值。

### useClass

```typescript
{ provide: TOKEN, useClass: SystemClock }
```

容器创建指定类，适合把抽象 Token 绑定到具体实现。

### useFactory

```typescript
{
  provide: TOKEN,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    url: config.get('API_URL'),
  }),
}
```

工厂可以依赖其他 Provider，并根据运行时配置计算或异步创建结果。

### useExisting

```typescript
{ provide: ABSTRACT_LOGGER, useExisting: AppLogger }
```

给已有 Provider 创建别名，两个 Token 指向同一个实例。`useClass` 可能创建新实例，`useExisting` 复用已有实例。

本课代码只使用 useValue，其他写法先理解用途，不提前增加实现。

## 9. 模块为什么默认封装

配置模块：

```typescript
@Module({
  providers: [
    {
      provide: GREETING_OPTIONS,
      useValue: greetingOptions,
    },
  ],
  exports: [GREETING_OPTIONS],
})
export class GreetingConfigModule {}
```

消费模块：

```typescript
@Module({
  imports: [GreetingConfigModule],
  controllers: [GreetingController],
  providers: [GreetingService],
})
export class GreetingModule {}
```

三项职责：

```text
providers  当前模块拥有哪些 Provider
exports    哪些 Provider 允许其他模块使用
imports    当前模块依赖哪些其他模块的公开 Provider
```

共享必须两端配合：提供方 exports，使用方 imports。缺少 exports，Provider 仍是配置模块内部实现；缺少 imports，两个模块之间没有依赖关系。

AppModule 导入 GreetingModule，也不等于自动获得 GreetingModule 的所有 Provider。每一层都只暴露自己明确 exports 的能力。

## 10. 当前模块可见性图

```text
AppModule
└─ imports GreetingModule
   ├─ imports GreetingConfigModule
   │  ├─ providers GREETING_OPTIONS
   │  └─ exports GREETING_OPTIONS ───────┐
   │                                     │
   ├─ providers GreetingService ◀────────┘
   │  └─ @Inject(GREETING_OPTIONS)
   │
   └─ controllers GreetingController
      └─ 注入 GreetingService
```

## 11. @Inject() 的运行过程

```typescript
constructor(
  @Inject(GREETING_OPTIONS)
  private readonly options: GreetingOptions,
) {}
```

这里有两套信息：

- `@Inject(GREETING_OPTIONS)` 给 NestJS 运行时使用。
- `: GreetingOptions` 给 TypeScript 编译期使用。

创建 GreetingService 时：

```text
读取 @Inject(GREETING_OPTIONS)
→ 在 GreetingModule 可见范围查找 Token
→ 沿 imports 找到 GreetingConfigModule
→ 确认 Token 已被 exports
→ 取得 greetingOptions
→ 传入 GreetingService 构造函数
```

class 类型通常能通过装饰器元数据自动推断 Token；Symbol、string 不能从 TypeScript 类型自动推断，所以需要 `@Inject()`。

## 12. import type 与真实构建错误

正确导入：

```typescript
import type { GreetingOptions } from './greeting-options.interface';
```

`import type` 明确告诉编译器：它只用于类型检查，不应成为运行时 import。

项目启用了 `isolatedModules` 和 `emitDecoratorMetadata`。最初在被装饰的构造函数签名中使用普通 import，生产构建报 TS1272。原因是 interface 没有运行时值，而装饰器签名可能生成运行时元数据。

修复后的职责很明确：

```text
import type GreetingOptions  → 静态类型
@Inject(GREETING_OPTIONS)    → 运行时 Token
```

这也证明 Jest 转译通过不能替代正式 `pnpm build`。

## 13. 容器从启动到注入的完整过程

```text
1. 从 AppModule 构建模块图
2. 进入 GreetingModule
3. 加载 GreetingConfigModule
4. 注册 GREETING_OPTIONS → greetingOptions
5. 导出 GREETING_OPTIONS
6. 注册 GreetingService
7. 读取 GreetingService 的 @Inject Token
8. 从可见模块中取得配置
9. 创建 GreetingService
10. 创建 GreetingController 并注入 GreetingService
11. 注册 GET /greetings/hello
```

缺失依赖通常会让应用启动失败，而不是请求到来后才出现 `undefined`。这种尽早失败更容易定位。

## 14. Service 测试如何替换配置

测试不导入真实配置模块，而是注册相同 Token：

```typescript
providers: [
  GreetingService,
  {
    provide: GREETING_OPTIONS,
    useValue: { message: 'Test greeting' },
  },
]
```

GreetingService 只依赖 Token，不关心值来自生产模块还是测试模块。因此测试可以控制输入并断言：

```typescript
expect(greetingService.getHello()).toBe('Test greeting');
```

如果消息仍硬编码在 Service 内，这种替换无法生效。

## 15. Controller 测试如何替换 Service

```typescript
const greetingService = {
  getHello: jest.fn().mockReturnValue('Controller test greeting'),
};

{
  provide: GreetingService,
  useValue: greetingService,
}
```

Token 仍然是 GreetingService class，实际值变成测试对象。测试验证：

```typescript
expect(greetingController.getHello()).toBe('Controller test greeting');
expect(greetingService.getHello).toHaveBeenCalledTimes(1);
```

这说明 Controller 正确调用并转交 Service 结果，而不是重复测试真实 Service 的业务规则。

简单区分测试替身：

- Stub：提供预设结果。
- Mock：还验证调用次数或参数。
- Fake：提供简化实现，例如内存仓库。

当前 `jest.fn()` 主要作为 mock 使用。

## 16. 常见错误与定位顺序

### 无法解析 GREETING_OPTIONS

按顺序检查：

1. `@Inject()` 使用的是否是共享常量。
2. Token 是否在某个模块的 providers 注册。
3. 提供模块是否 exports 同一个 Token。
4. 消费模块是否 imports 提供模块。
5. 是否误创建了另一个同名 Symbol。

### 测试无法创建 GreetingService

检查 TestingModule 是否也提供 GREETING_OPTIONS。生产模块中的依赖不会自动出现在独立单元测试容器里。

### 测试通过、构建失败

运行 `pnpm build` 阅读 TypeScript 错误码和文件位置。本课的 TS1272 就属于这种情况。

## 17. 与 Spring 的近似对照

| NestJS | Spring 中相近概念 |
|---|---|
| Provider | Bean 定义 |
| class Token | 按类型查找 Bean |
| Symbol + `@Inject()` | `@Qualifier` 或命名 Bean 思路 |
| useValue | 注册已有实例或配置 Bean |
| useClass | 抽象绑定具体实现 |
| useFactory | `@Bean` 工厂方法 |
| exports/imports | 配置边界和显式共享关系 |

这只是帮助迁移认知，并不表示两个框架实现完全一致。

## 18. 动手错误实验

每次只做一个实验，观察错误后立即恢复。

### 实验 A：删除 exports

1. 临时删除 GreetingConfigModule 的 `exports`。
2. 执行 `pnpm start:dev`。
3. 在错误中寻找 GreetingService 和 GREETING_OPTIONS。
4. 恢复 exports，再次启动。

目标：理解“在另一个模块注册”不等于“当前模块可见”。

### 实验 B：制造不同 Symbol

1. 在 GreetingService 中临时创建新的 `Symbol('GREETING_OPTIONS')`。
2. 用它替换导入的 Token。
3. 启动并观察错误。
4. 恢复为从 constants 文件导入的常量。

目标：理解 Symbol 按身份匹配，不按描述文字匹配。

### 实验 C：替换测试配置

1. 修改 Service 测试中的消息和对应期望。
2. 执行 `pnpm test greeting.service`。
3. 确认生产配置与 E2E 测试无需改变。

目标：理解单元测试拥有独立容器上下文。

## 19. 验证命令

```powershell
Set-Location -LiteralPath 'D:\nagato\nestjs-demo\apps\server'
pnpm format:check
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

当前基线：单元测试 3/3、E2E 2/2、格式、Lint 和构建全部通过。

## 20. 检查题

### 基础题

1. Service、Provider、Token、Instance 分别是什么？
2. `providers: [GreetingService]` 是什么完整配置的简写？
3. 为什么 class 可以作为 Token，而 interface 不可以？
4. `GreetingOptions` 和 `GREETING_OPTIONS` 分别在哪个阶段生效？
5. `provide` 和 `useValue` 分别回答什么问题？

### 模块题

6. `providers`、`exports`、`imports` 分别控制什么？
7. 为什么提供方 exports 后，消费方仍需 imports？
8. AppModule 导入 GreetingModule 后，能否自动注入 GreetingService？为什么？

### 注入与测试题

9. 为什么 GreetingService 需要 `@Inject(GREETING_OPTIONS)`？
10. `import type` 在本例中解决什么问题？
11. Service 测试为什么不必导入真实 GreetingConfigModule？
12. Controller 测试替换 GreetingService 后验证什么？
13. 四种自定义 Provider 各适合什么情况？
14. 为什么单元测试通过后仍需运行生产构建？

### 场景题

15. Nest 无法解析 GREETING_OPTIONS 时，你按什么顺序检查？
16. 两处分别创建 `Symbol('CONFIG')`，能否匹配同一 Provider？
17. 配置创建过程依赖 ConfigService 时，优先考虑哪种 Provider？

## 21. 完成标准

- 能画出两个 Greeting 模块的依赖图。
- 能区分静态类型和运行时 Token。
- 能解释 exports/imports 缺一不可。
- 能写出 useValue 测试替身。
- 能根据依赖解析错误定位缺失 Provider。
- 完成检查题后再进入下一课。

