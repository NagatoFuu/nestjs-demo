# P01-L08：Code Review、学习总结与检查点

## 1. 本课定位

本课是 Phase 1 的收尾课。不新增业务功能，而是对现有 Greeting 模块进行 Code Review，把 Module、Controller、Provider、依赖注入、作用域、装饰器、模块边界和测试连成一个完整模型。

本课完成后，才决定是否进入 Phase 2 内存版 User CRUD。

## 2. Phase 1 学到了什么

Phase 1 不只是学会写一个接口，而是建立了五个核心认知：

1. Module 是装配和可见性边界。
2. Controller 适配 HTTP，Service 承载业务流程。
3. Provider 由 IoC 容器根据 Token 创建、查找和注入。
4. TypeScript 类型与 JavaScript 运行时不是同一层。
5. 测试要按职责分层，不同层回答不同问题。

## 3. 从请求入口看整体结构

```text
main.ts
└─ NestFactory.create(AppModule)
   └─ AppModule imports GreetingModule
      ├─ GreetingController
      │  └─ injects GreetingService
      ├─ GreetingService
      │  ├─ injects GREETING_OPTIONS
      │  └─ injects GREETING_FORMATTER
      ├─ GREETING_FORMATTER → DefaultGreetingFormatter
      └─ GreetingConfigModule
         └─ GREETING_OPTIONS → greetingOptions
```

`AppModule` 不需要知道 Greeting 内部有哪些 Provider，只需要导入 `GreetingModule`。

## 4. Module 元数据的职责

| 字段 | 职责 |
|---|---|
| `imports` | 导入其他模块公开的能力 |
| `controllers` | 声明当前模块的 HTTP 入口 |
| `providers` | 在当前模块注册 Provider |
| `exports` | 将 Provider 公开给导入当前模块的其他模块 |

`imports` 不会自动公开被导入模块的全部 Provider；只能看见对方明确 `exports` 的能力。

## 5. Provider 的三个概念

```text
Token       容器中的查找键
Provider    Token 如何获得值的注册规则
Instance    容器最终交给消费方的对象
```

例如：

```typescript
{
  provide: GREETING_FORMATTER,
  useClass: DefaultGreetingFormatter,
}
```

- Token：`GREETING_FORMATTER`
- Provider 规则：`useClass`
- Instance：容器创建的 `DefaultGreetingFormatter` 对象

## 6. 编译期与运行时

```text
GreetingFormatter interface  编译期检查结构
GREETING_FORMATTER Symbol     运行时定位 Provider
```

`implements` 不会注册 Provider，`import type` 也明确表示某个导入不应出现在运行时 JavaScript 中。

## 7. 依赖注入的完整过程

```text
1. Nest 读取 Module 元数据
2. 容器注册 Token 与 Provider 规则
3. 容器分析 GreetingService 的构造函数依赖
4. @Inject() 指明自定义 Token
5. 容器在当前模块可见范围内查找 Token
6. 按 useValue 或 useClass 规则获得实例
7. 创建 GreetingService 时传入依赖
```

`@Inject()` 只声明“要找哪个 Token”，实际查找和创建由容器完成。

## 8. Provider 作用域回顾

| 作用域 | 共享边界 |
|---|---|
| DEFAULT | 通常在容器中复用同一实例 |
| TRANSIENT | 不同消费方获得不同实例 |
| REQUEST | 同一请求上下文内复用，不同请求隔离 |

默认优先使用 DEFAULT。REQUEST 和 TRANSIENT 会增加实例创建与依赖传播成本，应由真实状态隔离需求驱动。

## 9. 装饰器与元数据

`@LearningNote()` 在类或方法上声明元数据，`Reflector` 负责读取。装饰器本身不会实现权限判断等业务行为。

后续 RBAC 中会使用同样的协作模式：

```text
@Permissions() 声明权限元数据
→ Guard 通过 Reflector 读取
→ Guard 执行真正的访问判断
```

## 10. 模块边界与循环依赖

GreetingModule 不导出 GreetingService，是因为当前没有外部消费需求。模块边界应由业务协作驱动，而不是“以后可能用到”。

出现循环时应先检查职责是否混乱，优先通过抽取共同能力或引入更高层编排者解除循环。`forwardRef()` 只延迟引用解析，不会消除设计耦合。

## 11. 分层测试回顾

| 测试层 | 真实对象 | 替换的依赖 | 主要目标 |
|---|---|---|---|
| Formatter | Formatter | 无 | 验证格式化算法 |
| Service | Service | Options、Formatter | 验证业务选择和委托 |
| Controller | Controller | Service | 验证参数传递和返回值 |
| E2E | AppModule 真实装配 | 当前无 | 验证 HTTP 入口与整体连通 |

单元测试中直接调用 Controller 方法，不能证明真实 HTTP 路由一定正确；这一点由 E2E 补足。

## 12. Code Review 结果

当前实现符合 Phase 1 的设计目标：

- Controller 保持轻量，只提取参数并调用 Service。
- Service 复用 `getHelloTo()`，没有重复拼接规则。
- Formatter 通过 interface 表达编译期契约，通过 Symbol 完成运行时注入。
- GreetingConfigModule 只导出外部确实需要的 Options Token。
- GreetingModule 保持最小公开面。
- 测试覆盖算法、委托、控制层、边界、作用域和 E2E。
- 没有为后续阶段提前引入 DTO、数据库或复杂架构。

已知限制：

- `name` 尚未运行时校验，将在 Phase 3 处理。
- 当前配置是源码内的固定值，尚未引入环境配置系统。
- Greeting 是教学功能，不代表完整业务建模。

## 13. 与 Java Spring 的类比

| NestJS | Spring 中的近似概念 |
|---|---|
| `@Module()` | Java Config / 组件扫描边界，但不完全等同 |
| `@Controller()` | `@RestController` |
| `@Injectable()` Provider | Spring Bean / `@Service` |
| Nest IoC Container | Spring IoC Container |
| Token | Bean 的类型或 Qualifier/Bean Name |
| `Scope.REQUEST` | Request Scope |

重要差异是 TypeScript interface 编译后会被擦除，所以 Nest 中的接口注入通常需要额外的运行时 Token。

## 14. 进入 Phase 2 前的最终检查题

1. `AppModule` 导入 `GreetingModule` 后，为什么能加载 Greeting 路由，却不能在严格上下文中获取 `GreetingService`？
2. 请用 Token、Provider 定义、Instance 三个概念解释 `GREETING_FORMATTER` 的注入过程。
3. `GreetingFormatter` 为什么不能直接作为当前代码的运行时注入 Token？
4. `imports`、`providers`、`controllers`、`exports` 各自控制什么？
5. DEFAULT、TRANSIENT、REQUEST 三种作用域的实例共享边界有何不同？
6. `@LearningNote()` 只写入元数据，为什么它自己不会实现业务行为？
7. Controller 单元测试通过，为什么仍然可能存在 HTTP 404？
8. 如果 `GreetingService` 未在 `providers` 中注册，Nest 在装配 `GreetingController` 时会发生什么？
9. 面对 Module A 和 Module B 互相依赖，为什么不应立即使用 `forwardRef()`？
10. 请从应用启动、模块装配、依赖注入、路由匹配一直复述到 `GET /greetings/hello/Nest` 响应返回的完整过程。

## 15. Phase 1 完成标准

- 能解释 Module 四个核心元数据字段。
- 能区分 Provider、Token 和 Instance。
- 能解释 TypeScript interface 与运行时 Token 的边界。
- 能追踪 Controller 到 Service 再到 Formatter 的调用链。
- 能说明 Provider 作用域的选择原则。
- 能说明模块可见性和最小 `exports`。
- 能区分单元测试、边界测试和 E2E 的职责。
- 格式、Lint、测试和构建全部通过。
- 完成最终检查题并订正薄弱点。

## 16. 下一步

先回答本课 10 道最终检查题。通过后将 Phase 1 标记为完成，然后进入 P02-L01：REST 资源、HTTP 方法与状态码。
