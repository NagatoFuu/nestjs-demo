# Phase 1 · 第三课：Provider 生命周期与作用域

## 1. 本课要解决的问题

IoC 容器知道如何创建 Provider 后，还要决定：

```text
什么时候创建？
创建多少个？
哪些使用方共享同一个实例？
实例可以存活多久？
```

这就是 Provider Scope。NestJS 提供三种主要作用域：

```text
Scope.DEFAULT    默认作用域，通常称 Singleton
Scope.REQUEST    每个请求上下文一个实例
Scope.TRANSIENT  每个消费方获得独立实例
```

作用域选错不会总是立即报错，却可能带来用户数据串线、内存增长或吞吐下降，因此它是企业后台必须理解的基础。

## 2. 生命周期与作用域不是同一个词

作用域描述“实例如何共享”；生命周期描述“实例从创建到销毁经历什么”。两者相关，但不完全相同。

```text
Scope 决定实例边界
Lifecycle Hook 允许在创建完成或销毁阶段执行逻辑
```

本课重点是 Scope。`OnModuleInit`、`OnModuleDestroy`、应用启动和关闭钩子将在基础设施阶段结合数据库与 Redis 学习。

## 3. DEFAULT：默认单例作用域

普通 Provider：

```typescript
@Injectable()
class DefaultScopeProvider {}
```

等价于显式声明：

```typescript
@Injectable({ scope: Scope.DEFAULT })
class DefaultScopeProvider {}
```

在同一个 Nest 应用容器中，请求同一个 Provider Token，通常取得同一个实例：

```text
第一次解析 Token → 创建实例 A
后续解析同一 Token → 复用实例 A
```

### “单例”的边界

它不是整个世界只有一个实例，而是当前 Nest 应用容器内共享：

- 启动两个 Node.js 进程，会有两个实例。
- 测试创建两个 TestingModule，会有两个独立实例。
- 集群和多容器部署中，每个进程都有自己的实例。

所以不能用内存单例代替跨进程共享存储。登录状态等跨实例数据应放进 Redis 或数据库。

### 适合 DEFAULT 的对象

- 无状态业务 Service
- PrismaService、Redis 客户端包装
- 配置服务
- 日志服务
- 可安全复用的第三方客户端

### 单例中的可变状态风险

下面的设计危险：

```typescript
@Injectable()
class UserContextService {
  currentUserId?: string;
}
```

如果它是默认单例，请求 A 写入用户 A，随后请求 B 可能读到用户 A。并发请求会共享字段。

一般规则：

```text
单例 Provider 可以共享无状态能力和线程安全客户端
不要保存属于某一次请求或某一个用户的可变数据
```

JavaScript 是单线程事件循环也不等于没有并发交错；多个异步请求仍会共享同一个对象。

## 4. REQUEST：请求作用域

```typescript
@Injectable({ scope: Scope.REQUEST })
class RequestScopeProvider {}
```

同一个请求上下文中复用，两个不同请求之间隔离：

```text
请求 A → RequestProvider A
  同一请求再次使用 → 仍是 A

请求 B → RequestProvider B
```

典型用途：

- 保存当前请求的租户上下文
- 请求级追踪信息
- 必须绑定当前请求的工作单元

不要因为“当前用户”就立即使用 Request Scope。很多情况下 Guard 解析用户后把它挂到 Request，或使用 AsyncLocalStorage，会比让大量 Provider 请求化更合适。我们会在认证与日志阶段比较。

### 作用域冒泡

如果默认 Service 依赖 Request Scope Provider：

```text
Controller
→ OrderService (DEFAULT)
→ TenantContext (REQUEST)
```

OrderService 无法继续作为跨请求共享的单例，因为它内部依赖每个请求不同的 TenantContext。它的有效作用域会沿依赖链向上传播，Controller 也可能成为请求级实例。

```text
REQUEST 依赖向上冒泡
→ 更多对象每次请求重新创建
→ 增加实例化和垃圾回收成本
```

这就是不能随意使用 Request Scope 的主要原因。

### REQUEST 的限制

- 每个请求创建实例，开销高于默认单例。
- 依赖链可能扩大请求作用域范围。
- 队列任务、定时任务、WebSocket 等不一定具有普通 HTTP 请求上下文。
- 测试需要显式创建 ContextId。

只有真实需要请求隔离时才使用。

## 5. TRANSIENT：瞬态作用域

```typescript
@Injectable({ scope: Scope.TRANSIENT })
class TransientScopeProvider {}
```

Transient Provider 不在不同消费方之间共享：

```text
FirstConsumer  注入 → Transient 实例 A
SecondConsumer 注入 → Transient 实例 B
```

最容易误解的是：

```text
TRANSIENT ≠ 每次调用方法都创建
TRANSIENT = 每个消费方解析依赖时获得自己的实例
```

如果一个 Singleton Consumer 在启动时获得 Transient 实例，它通常会一直持有那个实例；以后反复调用 Consumer 方法，不会自动为每次方法调用重新注入。

适用场景较少，例如：

- 每个消费方需要独立内部状态的辅助对象
- 需要按消费方隔离的构建器或上下文工具

如果对象无状态，通常使用 DEFAULT 更简单高效。

## 6. 三种作用域对比

| Scope | 共享边界 | 创建频率 | 常见用途 | 主要风险 |
|---|---|---:|---|---|
| DEFAULT | 应用容器内共享 | 低 | 无状态 Service、客户端 | 误存请求数据造成串线 |
| REQUEST | 同一请求上下文共享 | 每请求 | 租户、请求上下文 | 性能与作用域冒泡 |
| TRANSIENT | 每个消费方独立 | 每消费方 | 有状态辅助对象 | 实例数量和语义误解 |

选择顺序：

```text
默认先用 DEFAULT
→ 确实需要请求隔离才用 REQUEST
→ 确实需要消费方隔离才用 TRANSIENT
```

## 7. 当前项目中的作用域

我们没有显式设置 Scope，因此这些都是 DEFAULT：

- GreetingService
- GreetingController
- GreetingConfigModule 中 useValue 提供的 greetingOptions

同一应用容器中，GreetingController 持有同一个 GreetingService，GreetingService 持有同一个配置对象。

当前配置对象不被修改，所以共享是安全的。后面可以考虑使用 `Readonly<GreetingOptions>` 表达不可修改意图，但本阶段不为此增加额外复杂度。

## 8. 实验测试结构

本课新增 `provider-scopes.spec.ts`，所有演示类都只存在于测试文件，不进入生产模块、不注册路由。

### DEFAULT 实验

```typescript
const first = module.get(DefaultScopeProvider);
const second = module.get(DefaultScopeProvider);

expect(first).toBe(second);
```

Jest 的 `toBe` 比较对象身份，证明两次取得的是同一个对象，不只是内容相同。

### TRANSIENT 实验

```typescript
const firstConsumer = module.get(FirstConsumer);
const secondConsumer = module.get(SecondConsumer);

expect(firstConsumer.dependency)
  .not.toBe(secondConsumer.dependency);
```

两个消费方注入同一个 Transient Token，却得到不同实例。

### REQUEST 实验

```typescript
const firstContext = ContextIdFactory.create();
const secondContext = ContextIdFactory.create();

const first = await module.resolve(RequestScopeProvider, firstContext);
const firstAgain = await module.resolve(RequestScopeProvider, firstContext);
const second = await module.resolve(RequestScopeProvider, secondContext);
```

断言：

```typescript
expect(first).toBe(firstAgain);
expect(first).not.toBe(second);
```

同一 ContextId 复用，不同 ContextId 隔离。

## 9. module.get 与 module.resolve

```typescript
module.get(Token)
```

适合从静态容器取得 DEFAULT Provider。

```typescript
module.resolve(Token, contextId)
```

用于解析 REQUEST 或 TRANSIENT 等作用域 Provider，可以指定上下文。

对作用域 Provider 随意使用 `get()`，可能得到“不能使用 get 获取 scoped provider”一类错误，因为容器需要知道它属于哪个上下文。

## 10. ContextId 不完全等于 HTTP 请求对象

ContextId 是 NestJS 用来标识依赖解析上下文的内部身份。HTTP 请求到来时，框架会为请求管理上下文；测试里没有真实请求，所以使用：

```typescript
ContextIdFactory.create()
```

手工模拟两个请求边界。

```text
HTTP Request A → ContextId A
HTTP Request B → ContextId B
TestingModule  → 测试手工创建 ContextId
```

## 11. Scope 应该配置在哪里

类声明：

```typescript
@Injectable({ scope: Scope.REQUEST })
class TenantContext {}
```

也可以在自定义 Provider 配置中指定：

```typescript
{
  provide: TOKEN,
  useClass: TenantContext,
  scope: Scope.REQUEST,
}
```

选择原则：

- 类无论在哪里使用都应保持同一作用域，可放在 `@Injectable()`。
- 同一个类按不同 Token 需要不同装配方式，可在 Provider 定义中声明。

## 12. Controller Scope

Controller 也可以设置 Scope：

```typescript
@Controller({
  path: 'example',
  scope: Scope.REQUEST,
})
class ExampleController {}
```

但通常不需要主动这么做。Controller 默认可复用，因为每次请求的参数通过方法参数传入，不应存到 Controller 实例字段中。

同样不要这样写：

```typescript
class ExampleController {
  currentUserId?: string;
}
```

默认 Controller 也是共享实例，实例字段会在并发请求间共享。

## 13. 企业项目中的选择案例

### PrismaService

选择 DEFAULT。数据库连接池应该复用，每个请求创建客户端会浪费连接与资源。

### RedisService

选择 DEFAULT。连接通常需要复用。

### UserService

通常选择 DEFAULT。当前用户通过方法参数传入，不存进字段。

```typescript
findProfile(currentUserId: string) {}
```

### RequestTenantContext

只有确实需要在深层调用链共享当前租户且不适合逐层传参时，才考虑 REQUEST 或 AsyncLocalStorage。

### DTO

DTO 不是 Provider，不由 IoC 容器管理，不讨论 Provider Scope。它通常由请求数据转换和校验流程创建。

## 14. 性能判断

不要把结论简化成“Request Scope 一定很慢”。准确说法是：它比复用 Singleton 产生更多实例化和垃圾回收工作，而且可能通过依赖链放大影响。

判断时考虑：

- 每秒请求数
- 请求级依赖链长度
- 构造函数是否执行重逻辑
- 是否创建外部连接
- 是否有更轻量的上下文传递方案

先使用 DEFAULT；出现真实隔离需求并测量后，再选择 REQUEST。

## 15. 常见错误

### 在 Singleton 中保存当前用户

结果：并发请求可能读到其他用户的数据。

修复：通过方法参数、Request、认证上下文或合适的请求上下文机制传递。

### 认为 Transient 每次方法调用都创建

结果：错误估计状态和实例数量。

修复：记住实例按消费方注入，而不是按方法调用。

### 请求级 Service 创建数据库连接

结果：连接数量和资源开销快速增长。

修复：数据库客户端保持 DEFAULT，事务或请求数据通过方法调用管理。

### 测试用 get 获取 Request Provider

结果：缺少解析上下文。

修复：创建 ContextId，并使用 `module.resolve()`。

## 16. 与 Spring 的近似对照

| NestJS | Spring 中相近概念 |
|---|---|
| Scope.DEFAULT | Singleton Bean |
| Scope.REQUEST | Request Scope Bean |
| Scope.TRANSIENT | Prototype 有相似目的，但解析语义不完全相同 |
| ContextId | 请求/解析上下文身份 |

不要机械等同，尤其 Transient 与 Spring Prototype 的生命周期管理细节可能不同。

## 17. 动手实验

### 实验 A：运行作用域测试

```powershell
Set-Location -LiteralPath 'D:\nagato\nestjs-demo\apps\server'
pnpm test provider-scopes --runInBand
```

逐个把 `toBe` 与 `not.toBe` 互换，观察哪条断言失败，然后恢复。

### 实验 B：观察 Request Context

把 REQUEST 测试中的 `secondContext` 临时替换成 `firstContext`，预测最后一个断言为什么失败，运行验证后恢复。

### 实验 C：观察 Transient 消费方

让两次比较都读取 `FirstConsumer` 的 dependency，预测它们是否相同。注意这不是重新创建消费方。

## 18. Code Review 检查清单

看到一个非默认 Scope 时询问：

1. 它保存了什么状态？
2. 状态必须按请求还是按消费方隔离吗？
3. 能否通过方法参数传递？
4. 是否会导致作用域冒泡？
5. 构造过程中是否创建昂贵资源？
6. 队列、定时任务和测试中是否有对应上下文？
7. 是否有并发和多进程假设？

## 19. 检查题

1. DEFAULT、REQUEST、TRANSIENT 的实例共享边界分别是什么？
2. 为什么 DEFAULT 只是在一个应用容器内单例？
3. 为什么不能在默认 UserService 字段中保存当前用户 ID？
4. Request Scope 的“作用域冒泡”是什么意思？
5. 为什么 Request Scope 可能增加性能开销？
6. Transient 为什么不等于每次调用方法都创建？
7. 两个 Singleton Consumer 注入同一 Transient Provider，会得到相同实例吗？
8. `module.get()` 与 `module.resolve()` 分别适合什么情况？
9. ContextId 在 REQUEST 测试中起什么作用？
10. PrismaService 为什么通常应该使用 DEFAULT？
11. 当前 GreetingService 和 greetingOptions 属于什么 Scope？
12. 如果一个默认 Controller 依赖 Request Scope Service，可能发生什么？
13. 什么情况下优先用方法参数，而不是 Request Scope？

## 20. 完成标准

- 能解释三种 Scope，而不只背诵名称。
- 能预测同一 Token 在不同上下文是否为同一实例。
- 能识别 Singleton 保存请求数据的安全问题。
- 能解释 Request Scope 的传播与成本。
- 能运行并读懂 `provider-scopes.spec.ts`。
- 完成检查题后再进入下一课。

