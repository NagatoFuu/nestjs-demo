# P02-L08：Controller、Service 与内存仓库边界

## 1. 从实际复杂度出发

到上一课，Service 同时负责输入检查、错误语义、数组存取、ID 分配和对象复制。现在已有完整 CRUD，可以用具体代码观察存储逻辑与业务规则的分界。

本课从 `course-p02-l07` 出发，抽取 InMemoryUserRepository，课程标签为 `course-p02-l08`。HTTP 方法、路径、成功结果及 400/404 语义保持一致，不增加新的业务端点。

## 2. 三层分工

```text
UserController
  HTTP 路由、Param、Body、成功状态码
        ↓
UserService
  输入检查、业务编排、缺失记录到 HTTP 异常的转换
        ↓
InMemoryUserRepository
  用户数组、ID 计数器、查找、增删改、返回副本
```

User interface 是数据形状，不是执行这些职责的第四个服务。

## 3. 仓库返回值契约

| 仓库方法 | 正常结果 | 找不到时 |
|---|---|---|
| findAll | User[] | 空数组 |
| findOne | User | undefined |
| create | 新 User | 当前内存实现不涉及目标缺失 |
| replace / update | 修改后的 User | undefined |
| remove | true | false |

仓库不抛 BadRequestException 或 NotFoundException。它描述存储结果，由 Service 决定本项目如何将结果表达为业务失败。

## 4. 仓库持有真正的状态

原来的 users 数组和 nextId 迁到仓库实例。Service 不再同时保存另一份用户数据，否则两份状态可能出现分歧。

仓库按原有规则分配字符串 ID，显式挑选字段，查询和写入结果都返回副本。数据隔离责任现在位于真正拥有数据的组件，而不是让每个调用方自行猜测是否要复制。

仓库假设调用者提供符合输入类型的值；对外 unknown 的检查仍由 Service 执行。普通 TypeScript interface 不会让仓库成为独立的运行时安全边界。

## 5. Service 的构造函数注入

```typescript
constructor(private readonly repository: InMemoryUserRepository) {}
```

这里使用具体类作为运行时 Token，不另建 Symbol 和通用仓库接口。当前只有一个实现，尚无必要建立通用 Repository 基类或泛型 CRUD 框架。

未来数据库实现不一定与内存仓库逐行替换：异步返回、事务、约束和错误映射都需要重新考虑，不能宣称本次拆分已经消除迁移成本。

## 6. 一条详情查询的职责传递

```typescript
findOne(id: string): User {
  return this.requireUser(this.repository.findOne(id), id);
}
```

仓库给出 User 或 undefined；Service 的 requireUser 在没有结果时抛出 NotFoundException。Controller 保持原来的委托方式，最终仍是 200 或 404。

## 7. 创建、更新与错误顺序

创建先检查完整字段，再调用仓库 create，失败不会消耗仓库 ID。

更新先通过 Service.findOne 确认资源存在，再检查输入，最后交给仓库变更。这保留上一课“缺失资源优先 404”的顺序。仓库仍可能返回 undefined，Service 再次检查结果，避免直接把缺失结果当成正常响应。

当前同步内存流程可能有重复查找，可接受。将来引入异步数据库时，检查后再写入不自动构成原子事务，仍需针对竞争条件设计。

## 8. 模块注册与实例边界

```typescript
@Module({
  controllers: [UserController],
  providers: [UserService, InMemoryUserRepository],
})
export class UserModule {}
```

Service 与仓库都没有 exports。内部 Controller 可以消费 Service，Service 可以消费仓库。不要在 Controller 中自行 new 仓库，也不要在另一个模块重复注册仓库来共享数据，那通常会产生独立状态。

默认作用域仍由容器复用同一注册实例；独立应用容器或 Node 进程不会自动共享该内存仓库。

## 9. 测试随边界变化

仓库测试独立验证引用隔离、创建输入输出、更新与替换、未知 ID 不修改数据、ID 不复用和不同实例隔离。

原有 UserService 测试改为 `new UserService(new InMemoryUserRepository())`，继续验证业务和真实仓库共同工作。它们现在属于组件集成性质，不应再声称隔离了存储算法。下一课会补充严格隔离的 Service 单元测试。

Controller mock 和 E2E 保持原来的目标，现有 E2E 是对外行为没有回归的重要证据。

## 10. 文件变化与阅读顺序

新增 in-memory-user.repository.ts 和对应测试；Service 删除数组和计数器，改为注入仓库；UserModule 增加仓库 Provider；调整 Service 测试构造方式。

建议按 Controller → Service → Repository → Module → 测试顺序阅读，并自己画出数据所有权箭头。对比两个标签，可以直接使用：

```powershell
git diff course-p02-l07 course-p02-l08 -- apps/server/src/modules/user
```

这是只读比较，不会改变当前工作区。

## 11. 验证与 Review

提交前运行格式、Lint、单元测试、E2E 和构建。Review 重点：是否只有仓库持有数组、是否在仓库抛 HTTP 异常、复制边界是否一致、是否错误地扩大 exports、是否无需求引入通用抽象。

本课实际结果：格式、Lint、构建通过；单元/组件测试 67/67，E2E 26/26。

本课的仓库是普通 Nest Provider，不是 ORM 自动生成的 Repository；与 Spring Data Repository 的自动实现机制并不等同。参考 [Nest Provider 注册](https://docs.nestjs.com/providers#provider-registration)。

## 12. 检查题

1. Controller、Service、Repository 各自承担哪些职责？
2. 为什么用户数组和 ID 计数器一起迁到仓库？
3. 仓库找不到用户为什么返回 undefined，而 Service 抛出异常？
4. 数据副本应该由真正的数据所有者还是每个调用者负责？
5. 为什么当前不创建通用 Repository 基类？
6. 类 Token 与 interface 有什么运行时差异？
7. 原有 Service 测试为什么现在具有集成测试性质？
8. 先查后改是否自动等同于数据库事务？
9. 两个模块各注册一个仓库能自动共享状态吗？
10. 如何证明本次内部重构没有改变 HTTP 行为？

下一课 P02-L09 将明确测试层次，补充独立 Service 单元测试、完整 CRUD 场景和失败测试。
