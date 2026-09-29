# Phase 1 · 第四课：装饰器与元数据

## 1. 本课要解决的问题

NestJS 中充满 `@Module()`、`@Controller()`、`@Get()`、`@Injectable()` 和 `@Inject()`。准确的理解是：

```text
装饰器声明信息
→ 元数据被保存
→ NestJS 在合适阶段读取
→ 框架装配模块、路由和依赖
```

本课新增 `@LearningNote()`。它只保存说明文字，不改变接口响应。测试使用 Reflector 读取信息，展示完整闭环。

## 2. 装饰器是什么

装饰器是作用于代码声明位置的函数机制，可以作用于 class、method、property、accessor 或 parameter。

当前例子：

```typescript
@Module(...)       // class decorator
@Controller(...)   // class decorator
@Injectable(...)   // class decorator
@Get(...)          // method decorator
@Inject(...)       // parameter decorator
```

它可以类比 Java Annotation 的使用目的，但语言机制和运行时保留方式并不相同。

## 3. 装饰器工厂

```typescript
@Controller('greetings')
```

可以分两步理解：

```text
Controller('greetings') → 调用装饰器工厂
返回的函数             → 应用到 GreetingController
```

括号内的参数让同一种装饰器携带不同配置。

## 4. 装饰器何时执行

装饰器通常在类定义和模块加载时应用，不是每次 HTTP 请求到来时重新执行。

```text
应用加载阶段：应用装饰器，保存和扫描元数据
请求处理阶段：使用已经构建好的路由表调用 Controller
```

因此不要把请求级数据或昂贵业务操作放进装饰器工厂。

## 5. 元数据是什么

元数据是“描述代码的数据”，例如：

```text
GreetingController 的路由前缀是 greetings
getHello 对应 GET hello
GreetingService 可以参与依赖注入
构造函数参数按 GREETING_OPTIONS Token 注入
```

它不是业务结果，而是框架组织和执行代码的依据。

## 6. 五个现有装饰器的职责

### @Module()

声明 imports、controllers、providers、exports 等模块装配信息。

### @Controller()

声明类是 HTTP Controller，并设置公共路由前缀。

### @Get()

声明方法处理某个路径的 GET 请求，与 Controller 前缀组合成最终路由。

### @Injectable()

声明类可参与依赖注入，使容器可以处理其构造函数依赖。

### @Inject()

在参数位置显式指定运行时 Token，常用于 Symbol、string 或无法自动推断的依赖。

## 7. 两类元数据

### 自定义或框架元数据

由路由装饰器、Reflector 装饰器等写入，例如路由、角色、权限或本课的说明文字。

### TypeScript 设计类型元数据

启用 `emitDecoratorMetadata` 后，TypeScript 可以为被装饰声明生成部分类型信息，例如 `design:paramtypes`。

它只能表达运行时存在的部分类型。interface 和泛型参数仍会被擦除，不能依赖它进行完整运行时校验。

## 8. 自定义 LearningNote

```typescript
import { Reflector } from '@nestjs/core';

export const LearningNote = Reflector.createDecorator<string>();
```

它创建一个类型安全、可反射的装饰器：

- 使用时只接受 string。
- 自身可作为 Reflector 读取时的键。
- 不需要维护容易冲突的字符串 key。

应用到类：

```typescript
@LearningNote('Greeting HTTP entry points')
@Controller('greetings')
export class GreetingController {}
```

应用到方法：

```typescript
@Get('hello')
@LearningNote('Returns the configured greeting message')
getHello(): string {}
```

## 9. 元数据不会自动产生行为

`@LearningNote()` 不会自动打印日志、修改响应或拒绝请求。必须有消费者读取并使用它：

```text
Decorator → 写入元数据
Reflector → 读取元数据
Guard/Interceptor/框架扫描器 → 根据元数据执行逻辑
```

未来 RBAC 使用相同模式：`@Permissions()` 声明权限，Guard 使用 Reflector 读取并校验。

## 10. Reflector 如何读取

类元数据：

```typescript
reflector.get(LearningNote, GreetingController)
```

方法元数据：

```typescript
reflector.get(LearningNote, routeHandler)
```

元数据附着在哪个目标，就必须使用同一个目标读取。类和方法是两个不同对象，类元数据不会自动等于方法元数据。

权限阶段会学习 `getAllAndOverride()` 和 `getAllAndMerge()`，用于组合类级与方法级规则。本课只做精确读取。

## 11. 多个装饰器的顺序

同一声明可以有多个装饰器。TypeScript 对表达式求值和函数调用有既定顺序。

当前 `@Get()` 和 `@LearningNote()` 写入不同元数据，互不覆盖，不依赖排列顺序。工程中应避免多个装饰器隐式修改同一状态；组合装饰器需要测试最终行为。

## 12. 装饰器不是 IoC 容器

常见误解是“`@Injectable()` 创建了 Service”。实际过程：

```text
@Injectable() 提供元数据
Module.providers 注册 Provider
IoC 容器读取信息
IoC 容器创建并注入实例
```

同样，`@Controller()` 不会自己监听端口；NestJS 扫描它以后，由路由系统完成注册。

## 13. 测试如何证明元数据存在

测试分别读取类和方法：

```typescript
expect(reflector.get(LearningNote, GreetingController)).toBe(
  'Greeting HTTP entry points',
);

expect(reflector.get(LearningNote, routeHandler)).toBe(
  'Returns the configured greeting message',
);
```

这验证的是元数据声明，不是 HTTP 行为。HTTP 行为仍由 E2E 测试验证。

## 14. 为什么使用属性描述符取得方法

直接取 `GreetingController.prototype.getHello` 时，ESLint 报 `unbound-method`：方法脱离对象后若被调用，可能丢失 `this`。

本测试只需要函数对象作为元数据目标，不调用它，因此使用：

```typescript
Object.getOwnPropertyDescriptor(
  GreetingController.prototype,
  'getHello',
)?.value
```

这明确表达“读取函数对象”的意图。最小修复后 Lint 通过。

## 15. 类型、元数据与运行时校验

三者边界不同：

```text
TypeScript 类型    编译期检查开发代码
Decorator 元数据   给框架提供运行时描述
ValidationPipe     运行时检查外部输入
```

即使 DTO 写了 TypeScript 类型，客户端仍可发送任意 JSON。Phase 3 会使用 class-validator 和 ValidationPipe 做运行时验证。

## 16. 与 Spring 的近似对照

| NestJS | Spring 中相近概念 |
|---|---|
| `@Controller()` | `@RestController` |
| `@Get()` | `@GetMapping` |
| `@Injectable()` | `@Service`/`@Component` 的部分职责 |
| `@Inject()` | `@Autowired`/`@Qualifier` 的部分思路 |
| Reflector | 反射读取 Annotation |

重要差异：TypeScript interface 编译后消失；Java interface 在 JVM 运行时仍有类型信息。

## 17. 常见误区

### 认为装饰器每次请求都执行

路由方法每次请求执行，路由装饰器通常在加载阶段应用。

### 认为写入元数据就会产生功能

没有消费者读取，元数据只是被保存的信息。

### 认为 emitDecoratorMetadata 保留所有类型

interface、泛型细节等仍会丢失。

### 认为装饰器可以替代输入校验

只有实际执行校验逻辑的 Pipe 等消费者才能拒绝非法输入。

## 18. 动手实验

### 实验 A：证明元数据不改变响应

修改 `@LearningNote()` 文字，运行 E2E。接口响应应保持不变。

### 实验 B：观察元数据测试失败

只修改装饰器文字，不修改测试期望，执行：

```powershell
pnpm test greeting.controller --runInBand
```

阅读 expected/received 后恢复一致。

### 实验 C：移除消费者

临时注释元数据测试并启动应用。元数据仍会写入，但没有消费者读取，业务响应不变。实验后恢复测试。

## 19. 验证结果

- 格式检查通过
- Lint 通过
- 单元测试 7/7 通过
- E2E 2/2 通过
- 构建通过

## 20. 检查题

1. 装饰器、装饰器工厂和元数据分别是什么？
2. `@Controller()` 与 `@Get()` 分别作用于什么位置？
3. 装饰器通常在每次 HTTP 请求时执行吗？
4. `@Injectable()` 是否负责创建 Service 实例？完整过程是什么？
5. `@Inject()` 为什么属于参数装饰器？
6. `emitDecoratorMetadata` 能否保留 interface 和全部泛型信息？
7. `@LearningNote()` 为什么不会自动改变 HTTP 响应？
8. 类元数据和方法元数据为什么要用不同目标读取？
9. Reflector 在自定义装饰器模式中负责什么？
10. 为什么 DTO 有 TypeScript 类型仍不能代替运行时校验？
11. `unbound-method` 警告什么风险？
12. 未来 `@Permissions()` 与 Guard 可以如何协作？

## 21. 完成标准

- 能区分声明元数据与消费元数据。
- 能识别类、方法和参数装饰器。
- 能解释 Injectable、Module 和 IoC 容器的分工。
- 能创建并用 Reflector 读取简单装饰器。
- 能说明 TypeScript 类型、元数据和运行时校验的边界。

