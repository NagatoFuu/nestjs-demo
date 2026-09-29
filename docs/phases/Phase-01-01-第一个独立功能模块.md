# Phase 1 · 第一课：第一个独立功能模块

## 本次目标

我们新增了一个独立的 Greeting 功能：

```text
GET /greetings/hello
→ Hello from GreetingModule!
```

本课重点不是问候语，而是学习 NestJS 如何用 Module 封装功能、用 Controller 暴露 HTTP 接口、用 Provider 承载能力，并通过 IoC 容器完成依赖注入。

## 一、文件结构

```text
src/modules/greeting/
├── greeting.module.ts
├── greeting.controller.ts
├── greeting.controller.spec.ts
├── greeting.service.ts
└── greeting.service.spec.ts
```

这种结构叫“按功能组织”：与 Greeting 相关的实现和测试放在同一个目录。以后 User、Role、Auth 也会形成各自的功能边界。

我们没有提前创建 DTO、Entity 或 Repository，因为当前功能还不需要它们。

## 二、GreetingModule：功能边界

```typescript
@Module({
  controllers: [GreetingController],
  providers: [GreetingService],
})
export class GreetingModule {}
```

`@Module()` 提供元数据：

- `controllers` 告诉 NestJS 当前模块有哪些请求入口。
- `providers` 告诉 NestJS 当前模块有哪些可由 IoC 容器管理的依赖。

模块不是单纯的文件夹。文件夹只整理源码，Module 才是 NestJS 运行时能够理解的装配边界。

## 三、AppModule 为什么需要 imports

```typescript
@Module({
  imports: [GreetingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

NestJS 从根模块 `AppModule` 开始构建模块图。把 `GreetingModule` 放入 `imports` 后，NestJS 才会继续读取它的 Controller 和 Provider。

如果删除这个 import：

- GreetingController 不会被创建。
- `/greetings/hello` 不会被注册。
- 请求该地址会得到 404。

调用关系不是 AppModule 手工调用 GreetingModule，而是 AppModule 声明依赖，由 NestJS 完成装配。

## 四、Controller 与路由拼接

```typescript
@Controller('greetings')
export class GreetingController {
  @Get('hello')
  getHello(): string {}
}
```

路由由两部分拼接：

```text
Controller 前缀：greetings
方法路径：       hello
最终路径：       GET /greetings/hello
```

`@Controller()` 和 `@Get()` 都是装饰器。它们给类和方法附加元数据，NestJS 启动时扫描这些信息并注册路由。

Controller 的职责是 HTTP 适配：接收请求、提取参数、调用业务能力并返回结果。它不负责创建 Service。

## 五、Service 为什么是 Provider

```typescript
@Injectable()
export class GreetingService {
  getHello(): string {
    return 'Hello from GreetingModule!';
  }
}
```

Provider 是一个更宽的 NestJS 概念，Service 是常见的 Provider 角色。

`@Injectable()` 表示该类可以参与依赖注入；`providers: [GreetingService]` 把它注册到当前模块的 IoC 容器上下文中。

可以先这样记：

```text
Service 描述职责
Provider 描述它如何被 NestJS 管理和提供
```

后面会看到并非所有 Provider 都叫 Service，例如配置对象、工厂和数据库客户端也可以成为 Provider。

## 六、构造函数注入

```typescript
constructor(private readonly greetingService: GreetingService) {}
```

这行同时完成三个 TypeScript 动作：

1. 声明构造函数参数。
2. 创建私有只读属性 `greetingService`。
3. 把传入实例保存到该属性。

NestJS 在创建 GreetingController 时读取构造函数的运行时类型元数据，发现它需要 GreetingService，然后在当前模块中查找对应 Provider。

```text
创建 GreetingModule 上下文
→ 发现 GreetingService Provider
→ 创建并保存 GreetingService 实例
→ 准备创建 GreetingController
→ 读取构造参数 GreetingService
→ 从容器取出实例并注入
→ GreetingController 创建完成
```

如果 Controller 声明了 GreetingService，但模块没有在 `providers` 注册它，应用启动时会报告无法解析依赖，而不是等到请求发生后才失败。

## 七、为什么使用 readonly

```typescript
private readonly greetingService: GreetingService
```

- `private`：只允许 GreetingController 内部访问。
- `readonly`：构造完成后不能把属性重新指向另一个实例。

它不代表 GreetingService 对象内部完全不可变，只限制这个属性不能被重新赋值。

依赖通常不应在业务执行过程中被替换，因此 `private readonly` 是常见写法。

## 八、为什么当前没有 exports

GreetingService 只被同一个 GreetingModule 内的 Controller 使用，所以无需导出。

只有其他模块也需要注入 GreetingService 时，才考虑：

```typescript
@Module({
  providers: [GreetingService],
  exports: [GreetingService],
})
```

并且消费方模块还必须 `imports: [GreetingModule]`。

不要为了“以后可能用到”提前导出所有 Provider。模块默认封装内部实现，可以减少不必要的耦合。

## 九、请求完整链路

```text
GET /greetings/hello
→ Nest HTTP 适配器接收请求
→ 匹配 GreetingController.getHello()
→ Controller 调用 greetingService.getHello()
→ Service 返回字符串
→ Controller 返回字符串
→ Nest 转换为 HTTP 响应
```

当前 Controller 很薄，这正是期望的职责分配。业务增长时，复杂逻辑继续留在 Service 或更明确的业务组件中。

## 十、三层测试

### GreetingService 单元测试

直接验证问候能力的结果，失败时最容易定位到 Service。

### GreetingController 单元测试

使用 TestingModule 创建 Controller 和 Provider，验证 Controller 能通过注入的 Service 返回结果。

### E2E 测试

导入 AppModule，模拟访问 `/greetings/hello`，验证模块导入、路由注册、依赖注入和最终响应。

这三层存在少量重复，但它们回答不同问题：

```text
Service 测试：业务能力对吗？
Controller 测试：入口与依赖协作对吗？
E2E 测试：应用装配和 HTTP 行为对吗？
```

## 十一、与 Spring 的对应关系

| NestJS | Spring 中相近概念 |
|---|---|
| `@Module()` | 配置类与组件扫描边界的组合概念 |
| `@Controller()` | `@RestController` |
| `@Injectable()` Service | `@Service` |
| Provider | Bean |
| 构造函数注入 | Spring 构造函数注入 |
| `imports` | 模块配置之间的导入关系 |

它们只是帮助理解的近似对应，不代表实现机制和生命周期规则完全一致。

## 十二、动手实验

### 实验 1：运行新接口

```powershell
Set-Location -LiteralPath 'D:\nagato\nestjs-demo\apps\server'
pnpm start:dev
```

访问：

```text
http://localhost:3000/greetings/hello
```

预期：

```text
Hello from GreetingModule!
```

观察启动日志中的路由映射，然后使用 `Ctrl+C` 停止服务。

### 实验 2：观察模块装配失败

这是一个可恢复实验：

1. 临时删除 `GreetingModule` 中的 `providers: [GreetingService]`。
2. 执行 `pnpm start:dev`。
3. 阅读 NestJS 的依赖解析错误，找到问号位置和建议检查项。
4. 恢复 `providers: [GreetingService]`。
5. 再次启动并确认成功。

不要通过在 Controller 中 `new GreetingService()` 绕过错误。那会破坏依赖注入练习的目的。

### 实验 3：验证全部质量门槛

```powershell
pnpm format:check
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

## 十三、检查题

1. 文件夹和 NestJS Module 的本质区别是什么？
2. 为什么 GreetingModule 必须被 AppModule 导入？
3. `@Controller('greetings')` 和 `@Get('hello')` 如何组成最终路由？
4. Service 和 Provider 是完全相同的概念吗？
5. 创建 GreetingController 时，IoC 容器如何知道它需要 GreetingService？
6. `private readonly` 分别限制了什么？
7. 为什么当前 GreetingModule 不需要导出 GreetingService？
8. 如果删除 `providers: [GreetingService]`，为什么应用通常在启动时就会失败？
9. Service、Controller 和 E2E 三层测试分别回答什么问题？

