# P01-L07：阶段项目——完善 Greeting 模块

## 1. 项目目标

本课把 Phase 1 前六课的知识组合成一个可以运行、替换依赖并分层测试的小功能。

最终接口：

| 请求 | 响应 |
|---|---|
| `GET /greetings/hello` | `Hello, learner!` |
| `GET /greetings/hello/Nest` | `Hello, Nest!` |

这不是完整业务 CRUD，因此暂不引入 DTO、ValidationPipe、数据库和异常过滤器。

## 2. 需求拆解

功能需求：

1. 无姓名时问候默认学习者。
2. 路由中提供姓名时问候该姓名。
3. 称呼、默认姓名和标点由配置控制。
4. 字符串格式化策略可替换。
5. 两个接口都保留学习元数据。

工程要求：

1. GreetingService 不直接硬编码最终字符串。
2. interface 只参与类型检查，运行时使用 Symbol Token。
3. GreetingService 仍保持 GreetingModule 内部可见。
4. Formatter、Service、Controller 和 HTTP 链路分层验证。
5. 格式、Lint、测试和构建全部通过。

## 3. 为什么要抽出 Formatter

如果 Service 直接拼字符串：

```typescript
return `Hello, ${name}!`;
```

代码很短，但配置、业务流程和显示格式混在了一起。本项目将职责拆成：

```text
GreetingController  提取 HTTP 参数
GreetingService     决定使用默认姓名还是指定姓名
GreetingFormatter   定义格式化能力契约
DefaultFormatter    实现默认拼装规则
GreetingOptions     保存可配置内容
```

这次拆分主要用于综合练习 Provider Token，并不意味着所有字符串都必须抽象成独立 Provider。真实项目应在存在替换需求或明确职责时再增加抽象。

## 4. 最终目录

```text
src/modules/greeting/
├─ default-greeting.formatter.ts
├─ default-greeting.formatter.spec.ts
├─ greeting-config.module.ts
├─ greeting-formatter.interface.ts
├─ greeting-options.interface.ts
├─ greeting.constants.ts
├─ greeting.controller.ts
├─ greeting.controller.spec.ts
├─ greeting.module.ts
├─ greeting.service.ts
├─ greeting.service.spec.ts
├─ learning-note.decorator.ts
├─ module-boundaries.spec.ts
└─ provider-scopes.spec.ts
```

文件仍按 Greeting 业务能力聚合，没有建立横向的全局 `controllers`、`services` 目录。

## 5. 两个运行时 Token

```typescript
export const GREETING_OPTIONS = Symbol('GREETING_OPTIONS');
export const GREETING_FORMATTER = Symbol('GREETING_FORMATTER');
```

它们分别回答：

```text
GREETING_OPTIONS    到容器中查找问候配置
GREETING_FORMATTER  到容器中查找格式化能力
```

Symbol 的描述文字方便调试，但匹配依据是 Symbol 实例本身，因此所有提供方和消费方都必须从同一个文件导入 Token。

## 6. 配置接口

```typescript
export interface GreetingOptions {
  salutation: string;
  defaultName: string;
  punctuation: string;
}
```

配置值：

```typescript
const greetingOptions: GreetingOptions = {
  salutation: 'Hello',
  defaultName: 'learner',
  punctuation: '!',
};
```

`GreetingOptions` 在 TypeScript 编译阶段检查字段；运行时由 `GREETING_OPTIONS` 定位对象实例。

## 7. Formatter 接口与实现

能力契约：

```typescript
export interface GreetingFormatter {
  format(name: string, options: GreetingOptions): string;
}
```

默认实现：

```typescript
@Injectable()
export class DefaultGreetingFormatter implements GreetingFormatter {
  format(name: string, options: GreetingOptions): string {
    return `${options.salutation}, ${name}${options.punctuation}`;
  }
}
```

`implements` 只让 TypeScript 检查类是否满足接口；它不会自动将类注册到 Nest 容器。

## 8. 使用 `useClass` 注册实现

```typescript
providers: [
  GreetingService,
  {
    provide: GREETING_FORMATTER,
    useClass: DefaultGreetingFormatter,
  },
]
```

完整含义：

```text
消费方请求 GREETING_FORMATTER
→ IoC 容器找到 Provider 定义
→ 容器创建 DefaultGreetingFormatter 实例
→ 将实例注入消费方
```

消费方依赖能力 Token，不依赖具体类。以后可以把 `useClass` 换成其他实现而不修改 GreetingService。

## 9. GreetingService 的职责

```typescript
constructor(
  @Inject(GREETING_OPTIONS)
  private readonly options: GreetingOptions,
  @Inject(GREETING_FORMATTER)
  private readonly formatter: GreetingFormatter,
) {}
```

默认问候：

```typescript
getHello(): string {
  return this.getHelloTo(this.options.defaultName);
}
```

指定姓名：

```typescript
getHelloTo(name: string): string {
  return this.formatter.format(name, this.options);
}
```

`getHello()` 复用 `getHelloTo()`，避免产生两套字符串拼装规则。

## 10. Controller 路由参数

```typescript
@Get('hello/:name')
@LearningNote('Returns a greeting for the route name')
getHelloTo(@Param('name') name: string): string {
  return this.greetingService.getHelloTo(name);
}
```

组合后的路由为：

```text
@Controller('greetings')
+ @Get('hello/:name')
= GET /greetings/hello/:name
```

`:name` 是动态路径段，`@Param('name')` 从当前请求中读取它。

## 11. TypeScript 类型不是输入校验

`name: string` 只描述 Controller 代码内部的静态类型，不会在 HTTP 边界自动执行长度、字符或安全校验。

本阶段只观察路由参数传递。Phase 3 会加入 DTO、转换和运行时校验。在此之前，不应把该演示接口当作已经完成输入安全设计的生产接口。

## 12. 完整依赖图

```text
AppModule
└─ imports GreetingModule
   ├─ imports GreetingConfigModule
   │  └─ exports GREETING_OPTIONS → options value
   ├─ controllers GreetingController
   │  └─ injects GreetingService
   └─ providers
      ├─ GreetingService
      │  ├─ injects GREETING_OPTIONS
      │  └─ injects GREETING_FORMATTER
      └─ GREETING_FORMATTER → DefaultGreetingFormatter
```

所有箭头保持单向，没有 Module 或 Provider 循环。

## 13. HTTP 请求链路

指定姓名时：

```text
浏览器 GET /greetings/hello/Nest
→ HTTP 服务器匹配 GreetingController.getHelloTo
→ @Param 取得 "Nest"
→ Controller 调用 GreetingService.getHelloTo("Nest")
→ Service 调用注入的 Formatter
→ Formatter 读取 options 组合字符串
→ Controller 返回 "Hello, Nest!"
→ HTTP 200 响应
```

默认问候与此相同，只是 Service 从配置中取得 `defaultName`。

## 14. 为什么 GreetingService 仍不 exports

AppModule 只需导入 GreetingModule 来加载问候路由，没有直接调用 GreetingService 的业务需求。因此 GreetingModule 继续保持最小公开面：

```text
外部可访问 HTTP 路由
外部不可直接注入内部 GreetingService
```

阶段项目增加 Formatter 并不构成扩大 exports 的理由。

## 15. Formatter 单元测试

```typescript
const formatter = new DefaultGreetingFormatter();

expect(formatter.format('Nest', options)).toBe('Hello, Nest!');
```

Formatter 没有容器依赖，可以直接 `new`。该测试只回答：“默认格式化算法是否正确？”

## 16. Service 单元测试

Service 测试提供：

```text
GREETING_OPTIONS   测试配置
GREETING_FORMATTER mock 格式化能力
```

它验证：

1. 无参数时是否把配置中的默认姓名交给 Formatter。
2. 指定姓名时是否原样传给 Formatter。
3. Service 是否返回 Formatter 的结果。

由于 Formatter 已被替换，该测试不重复验证默认 Formatter 的内部算法。

## 17. Controller 单元测试

Controller 测试替换 GreetingService，验证：

1. 默认路由调用 `getHello()`。
2. 姓名路由把参数传给 `getHelloTo(name)`。
3. Service 的结果是否原样成为 Controller 返回值。
4. 类和两个方法的 `LearningNote` 元数据是否存在。

Controller 测试没有发送真实 HTTP 请求，也没有使用真实 Formatter。

## 18. E2E 测试

E2E 使用真实 AppModule 装配：

```typescript
request(app.getHttpServer())
  .get('/greetings/hello/Nest')
  .expect(200)
  .expect('Hello, Nest!');
```

它共同覆盖路由匹配、参数提取、Controller、Service、两个自定义 Provider Token 和默认 Formatter。

## 19. 为什么需要四个测试层次

| 测试 | 主要回答的问题 |
|---|---|
| Formatter 单元测试 | 字符串算法正确吗 |
| Service 单元测试 | 默认值选择和依赖委托正确吗 |
| Controller 单元测试 | HTTP 参数是否正确交给 Service |
| E2E | 真实 Nest 装配和网络入口是否连通 |

层次越高，覆盖链路越广；层次越低，失败定位越精确。它们不是重复关系。

## 20. 本课错误定位实例

第一次 Lint 发现 Service 测试直接断言 `formatter.format`，触发 `unbound-method`：方法脱离对象时可能丢失 `this`。

最小修复是保留独立函数引用：

```typescript
let formatGreeting: jest.MockedFunction<GreetingFormatter['format']>;

formatGreeting = jest.fn(...);
formatter = { format: formatGreeting };
```

随后断言 `formatGreeting`。这既保留类型约束，也明确测试对象是独立 mock 函数。

## 21. 验证结果

```text
Prettier          通过
ESLint            通过
单元/边界测试     6 个 Suite，12/12 通过
E2E               3/3 通过
生产构建          通过
真实 HTTP 请求    两个接口均返回 200
```

真实响应：

```text
GET /greetings/hello       → Hello, learner!
GET /greetings/hello/Nest  → Hello, Nest!
```

真实启动验证时发现 3000 端口已有服务，新的生产进程收到 `EADDRINUSE`。为避免终止学习者正在运行的服务，直接请求该端口并确认其已热更新到本课结果。

## 22. Code Review 清单

1. Controller 是否只处理 HTTP 输入输出和调用编排？
2. Service 是否避免重复实现相同规则？
3. interface 是否通过 `import type` 引入？
4. interface 注入是否使用运行时 Token？
5. Provider Token 是否从同一常量文件导入？
6. `useClass` 实现是否满足接口？
7. GreetingModule 是否保持最小 exports？
8. 测试替身是否只替换当前测试不关心的层？
9. E2E 是否覆盖默认和动态路由？
10. 路由参数是否被误认为已经运行时校验？

## 23. 本课检查题

1. 本阶段项目为什么引入 GreetingFormatter？是否所有格式化都应抽成 Provider？
2. `GreetingFormatter` 和 `GREETING_FORMATTER` 分别在哪个阶段发挥作用？
3. `implements GreetingFormatter` 为什么不会自动注册 Provider？
4. `useClass: DefaultGreetingFormatter` 由谁创建实例？
5. `getHello()` 为什么复用 `getHelloTo()`？
6. `@Controller('greetings')` 与 `@Get('hello/:name')` 组成什么路由？
7. `@Param('name')` 在请求链路中负责什么？
8. 为什么 `name: string` 不能证明 HTTP 输入安全？
9. 为什么 GreetingModule 仍不导出 GreetingService？
10. Formatter、Service、Controller、E2E 测试各自验证什么？
11. Service 测试为什么替换 Formatter，而 E2E 使用真实 Formatter？
12. 当前依赖图中有哪些 Token 和实例对应关系？
13. 本课 `unbound-method` 是如何定位和修复的？
14. 如果将 GREETING_FORMATTER 的提供方和消费方改成两个同名 Symbol，会发生什么？
15. 请完整复述 `/greetings/hello/Nest` 的请求链路。

## 24. 完成标准

- 能从需求画出 Controller、Service、Formatter 和配置的职责边界。
- 能解释两个 Symbol Token 的解析过程。
- 能说清四个测试层次为何不重复。
- 能运行并解释两个问候接口。
- 能完成检查题并订正薄弱点。

