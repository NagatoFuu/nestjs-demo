# P01-L05：模块边界、封装与循环依赖

## 1. 本课要解决的问题

随着 User、Role、Auth 等模块增加，需要回答：模块负责什么、公开什么、两个模块互相依赖怎么办。

本课不制造生产循环依赖，而是验证当前 GreetingModule 的封装，并学习如何识别和拆解循环。

## 2. 文件夹与 Module

文件夹只组织源码；`@Module()` 才是 NestJS 运行时装配边界：

```typescript
@Module({
  imports: [GreetingConfigModule],
  controllers: [GreetingController],
  providers: [GreetingService],
})
export class GreetingModule {}
```

模块包含自己拥有的 Controller、Provider、模块依赖，以及主动公开的能力。

## 3. 模块是一份能力契约

```text
GreetingModule
├─ 内部：GreetingController
├─ 内部：GreetingService
├─ 依赖：GreetingConfigModule
└─ 对外：当前没有导出 Provider
```

其他模块应该依赖公开能力，而不是内部实现。

## 4. providers、exports、imports

```text
providers  在当前模块注册 Provider，默认只对本模块可见
exports    将指定 Provider 纳入模块公开 API
imports    引入另一个 Module 公开的 Provider
```

跨模块注入公式：

```text
提供方 providers 注册
+ 提供方 exports 暴露
+ 使用方 imports 建立关系
= 使用方可以注入
```

`imports` 接收 Module，不接收 Service。

## 5. 为什么不要导出全部 Provider

全部公开会导致：

- 其他模块依赖内部实现。
- 内部重构影响全局。
- 模块职责逐渐消失。
- 循环依赖更容易出现。
- 测试需要装配更大的依赖图。

模块应公开稳定、必要的能力，而不是公开全部文件。

## 6. GreetingService 为什么不导出

GreetingService 只服务 GreetingController，没有跨模块需求。AppModule 导入 GreetingModule 是为了装配整个问候功能和路由，不是为了直接调用其内部 Service。

```text
AppModule 可以加载 GreetingModule 的路由
AppModule 内部不能直接注入 GreetingService
```

## 7. 边界测试

本课新增 `module-boundaries.spec.ts`。

AppModule 严格查找：

```typescript
const appModuleContext = module.select(AppModule);

expect(() =>
  appModuleContext.get(GreetingService, { strict: true }),
).toThrow();
```

GreetingModule 内部查找：

```typescript
const greetingModuleContext = module.select(GreetingModule);

expect(
  greetingModuleContext.get(GreetingService, { strict: true }),
).toBeInstanceOf(GreetingService);
```

`module.select()` 选定模块上下文；`strict: true` 将查找限制在该上下文，避免跨模块搜索掩盖边界。

## 8. 如何划分业务模块

优先按业务能力：

```text
UserModule        用户生命周期
DepartmentModule  组织树和部门关系
RoleModule        角色及分配
AuthModule        登录、Token 和身份
```

不要把所有 Controller 放一个目录、所有 Service 放另一个目录。这会拆散业务能力，让边界难以识别。

## 9. 跨模块调用原则

模块 A 需要模块 B 的能力时，依赖 B 的公开 Provider：

```text
AuthModule
→ imports UserModule
→ 注入 UserQueryService
→ 查询登录用户
```

AuthModule 不应绕过 UserModule 的公开能力直接访问内部实现。

## 10. 循环依赖

理想依赖大体单向：

```text
AuthModule → UserModule
```

循环依赖：

```text
AuthModule → UserModule
     ↑           ↓
     └───────────┘
```

双方都等待对方定义或实例，加载和装配顺序变得不稳定。

## 11. 三种循环要区分

### 文件导入循环

```text
a.ts imports b.ts
b.ts imports a.ts
```

属于 JavaScript/TypeScript 模块加载问题，可能出现尚未初始化的导入值。`index.ts` barrel 文件容易隐藏它。

### Module 循环

```text
AuthModule imports UserModule
UserModule imports AuthModule
```

属于 Nest 模块图的双向关系。

### Provider 循环

```text
AuthService → UserService
UserService → AuthService
```

属于构造函数依赖图的循环。三类循环可能同时存在，也可能只出现一种。

## 12. 循环通常暴露什么

- 模块职责划分不当。
- 一段跨模块流程缺少更高层协调者。
- 共享能力没有提取到更低层。
- Service 同时承担查询、写入和编排等过多职责。
- 内部 Provider 导出过多。

循环依赖首先是设计信号，不只是语法问题。

## 13. 解决方案一：纠正依赖方向

如果 UserService 与 AuthService 互相调用，先问 UserModule 是否真的应该依赖 AuthModule。通常是：

```text
AuthModule → UserModule
```

用户模块管理用户数据，认证模块使用用户查询能力。删除不必要的反向依赖优于添加 `forwardRef()`。

## 14. 解决方案二：提取共同能力

```text
A ↔ B
```

若双方只是共同需要同一能力，可变为：

```text
A → C ← B
```

例如 AuthModule 和 UserModule 都需要密码哈希，可共同依赖职责明确的 PasswordModule。

不要把一切放入 CommonModule；没有清晰职责的公共模块会成为新的耦合中心。

## 15. 解决方案三：增加编排者

若两个模块共同参与一个流程，可由更高层协调：

```text
UserModule      RoleModule
      ↑          ↑
      └─ AccountAdministrationModule
```

编排模块依赖双方，双方不互相依赖。

## 16. 解决方案四：依赖抽象 Token

高层依赖窄接口 Token，由装配层提供实现：

```text
业务模块 → USER_LOOKUP Token
装配层   → UserQueryService 实现
```

这能减少对具体类的依赖，但“增加 interface”不会自动修复错误的职责方向。

## 17. forwardRef()

无法立即重构时，可以延迟解析 Module：

```typescript
@Module({
  imports: [forwardRef(() => UserModule)],
})
export class AuthModule {}
```

另一侧通常也需要使用 `forwardRef()`。Provider 构造函数循环还可能需要：

```typescript
constructor(
  @Inject(forwardRef(() => UserService))
  private readonly userService: UserService,
) {}
```

它解决“何时取得引用”的问题，没有消除双向耦合。

## 18. 为什么 forwardRef 是最后手段

- 依赖方向更难阅读。
- 初始化顺序不能成为业务假设。
- 测试装配更复杂。
- 循环容易继续扩散。
- 后续拆分服务成本更高。

使用前应记录为何不能通过职责重构解决。

## 19. Global Module 的风险

`@Global()` 让导出的 Provider 无需到处 imports，但也隐藏依赖来源。普通业务模块不应只为少写 imports 就全局化。

配置、日志等少数基础能力可能适合全局共享，仍需谨慎控制公开面。

## 20. 错误定位顺序

遇到 `Nest can't resolve dependencies` 或 undefined import：

```text
1. 判断是 Module 还是 Provider 错误
2. 检查 Token 是否注册
3. 检查提供方 exports
4. 检查使用方 imports
5. 检查 import 路径和 barrel 文件
6. 画 Module 依赖箭头
7. 画 Provider 构造函数依赖箭头
8. 找双向箭头
9. 优先重构，最后考虑 forwardRef
```

## 21. Code Review 清单

1. 模块能否用一句话描述职责？
2. Provider 是否都属于该职责？
3. exports 是否只有必要的稳定能力？
4. 其他模块是否绕过公开 Service？
5. 依赖箭头是否大体单向？
6. 是否存在互相 imports 或互相注入？
7. `forwardRef()` 是否有理由和重构计划？
8. 是否滥用 Global Module？

## 22. 与 Spring 的近似对照

| NestJS | Spring 中相近概念 |
|---|---|
| Module providers | 配置中的 Bean 集合 |
| exports/imports | 显式模块公开与依赖关系 |
| Provider 循环 | 循环 Bean 依赖 |
| `forwardRef()` | 延迟解析引用的思路 |

Spring 的组件扫描和 Bean 可见性模型与 Nest Module 不完全相同。

## 23. 动手实验

### 实验 A：运行边界测试

```powershell
pnpm test module-boundaries --runInBand
```

解释为什么 AppModule 查找失败、GreetingModule 查找成功。

### 实验 B：观察公开面

临时给 GreetingModule 添加 `exports: [GreetingService]`，画出公开面发生的变化，然后恢复。不要因为能导出就永久扩大 API。

### 实验 C：画依赖图

```text
AppModule → GreetingModule → GreetingConfigModule
GreetingController → GreetingService → GREETING_OPTIONS
```

确认当前没有返回箭头。

## 24. 验证结果

- 边界测试 2/2 通过
- Lint 通过
- 构建通过
- 未修改生产模块公开面

## 25. 检查题

1. 文件夹与 Nest Module 边界有什么不同？
2. 为什么 Provider 默认不应向所有模块公开？
3. `providers`、`exports`、`imports` 如何完成跨模块注入？
4. AppModule 导入 GreetingModule 后，为什么不能直接注入 GreetingService？
5. `module.select()` 和 `strict: true` 分别表达什么？
6. 文件、Module、Provider 循环分别是什么？
7. 循环依赖通常暴露哪些设计问题？
8. 消除循环有哪些优先方案？
9. `forwardRef()` 解决了什么、没有解决什么？
10. 为什么普通业务模块不应轻易标记为 Global？
11. AuthModule 与 UserModule 互相依赖时，你会如何分析？
12. 为什么把所有共享代码放进 CommonModule 可能产生新问题？

## 26. 完成标准

- 能从 Module 元数据说出公开面和依赖面。
- 能区分三种循环依赖。
- 能先提出重构方案，再考虑 `forwardRef()`。
- 能运行并解释边界测试。
- 能画出当前项目单向依赖图。

