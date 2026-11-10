# P02-L02：UserModule 的职责与内存数据模型

## 1. 任务理解

上一课确定了 User CRUD 的 HTTP 契约。本课开始落实用户模块，先明确用户的数据结构、数据归属和读取边界。

本课建立：

- `User`：描述用户数据的 TypeScript interface。
- `UserService`：在实例内部保存用户数组，提供返回副本的 `findAll()`。
- `UserModule`：注册 UserService，并由 AppModule 导入。
- Service 单元测试：验证初始数据，以及调用方无法通过返回值直接修改内部数据。

本课尚未创建 UserController，因此还没有 `GET /users` 路由。P02-L03 将在这个基础上接入列表与详情查询。

## 2. 为什么先确定数据模型

写用户接口前，至少要回答：

1. 一个用户有哪些字段？
2. 哪个字段标识用户身份？
3. 多个用户以什么形式保存在内存中？
4. 谁可以直接操作这些数据？
5. 返回的数据是否与内部存储共享引用？

这些问题不依赖数据库。先用内存数组可以集中观察 Controller、Service 与状态之间的关系。后续接入数据库时，存储方式改变，但职责边界仍然有用。

## 3. 本阶段的 User 数据模型

文件：`apps/server/src/modules/user/user.interface.ts`。

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
}
```

| 字段 | 类型 | 作用 |
|---|---|---|
| id | string | 唯一标识用户 |
| name | string | 用户姓名 |
| email | string | 用户邮箱 |

本阶段使用字符串 ID，例如 `'1'`、`'2'`。ID 是标识符，不需要参与算术运算，字符串也便于之后使用其他 ID 形式。这是当前项目选择，不代表所有系统的 ID 都必须为字符串。

邮箱的格式、唯一性等规则不会因为写了 `email: string` 就自动成立。创建、更新和参数校验课程会逐步完善这些规则。

## 4. interface 在这里做什么

`User` 用于编译期检查数据结构：

```typescript
const user: User = {
  id: '1',
  name: 'Alice',
  email: 'alice@example.com',
};
```

遗漏必填字段、把字符串字段赋成数字等使用错误，可以被 TypeScript 检查出来。

interface 不是数据库表，不会自动分配 ID、创建对象、写入数据或校验 HTTP 输入。编译后的 JavaScript 中也没有可供 `new User()` 调用的构造函数。

Service 因此使用：

```typescript
import type { User } from './user.interface';
```

这里没有“注入 User interface”的需求。未来 Controller 注入的是 UserService 类；该类在运行时存在，可以直接作为 Token。

## 5. 内存数据放在 UserService 实例中

文件：`apps/server/src/modules/user/user.service.ts`。

```typescript
import { Injectable } from '@nestjs/common';
import type { User } from './user.interface';

@Injectable()
export class UserService {
  private readonly users: User[] = [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ];

  findAll(): User[] {
    // Keep callers from mutating the in-memory store through returned references.
    return this.users.map((user) => ({ ...user }));
  }
}
```

这两条数据是示例初始数据，不是已经保存到数据库中的记录。每次重新创建该 Service 实例，字段初始化代码都会重新创建这份数组。

`findAll()` 在本课提供一个最小读取入口，目的是建立数据访问边界。下一课将把它接到 HTTP 列表路由，并增加详情查找。

## 6. private、readonly 和 User[] 分别表示什么

```typescript
private readonly users: User[] = [...];
```

- `private`：在 TypeScript 类型检查下，限制其他类直接访问这个字段。
- `readonly`：在初始化之后，限制重新给这个字段赋另一个数组引用。
- `User[]`：这是一个元素符合 User 结构的数组。

注意下面两类操作不同：

```typescript
// 写在 UserService 内部：readonly 会阻止重新赋值。
this.users = [];

// 写在 UserService 内部：readonly 不会阻止这些内容修改。
this.users.push({ id: '3', name: 'Carol', email: 'carol@example.com' });
this.users[0].name = 'Updated';
```

上面的示例用于理解语义，不要把故意报错的赋值直接加入生产代码。`readonly` 不会冻结数组和其中对象；普通 TypeScript `private` 也不等同于 JavaScript `#private` 的运行时机制。

有关 readonly 仅限制属性赋值、不会自动使对象内容不可变的说明，可参阅 [TypeScript 对象类型文档](https://www.typescriptlang.org/docs/handbook/2/objects.html#readonly-properties)。

## 7. 为什么不能直接 return this.users

如果写成：

```typescript
findAll(): User[] {
  return this.users;
}
```

调用方和 Service 会持有同一个数组：

```typescript
const users = service.findAll();
users.pop();
```

调用方只是想处理查询结果，却直接删除了内部数据中的最后一个用户。这样未来 Controller 或其他调用方就可以绕过 Service 的业务方法修改数据。

`private` 只能限制直接访问字段，无法阻止已经返回出去的引用被修改。

## 8. 为什么仅复制数组仍然不够

下面的写法会创建新数组：

```typescript
return [...this.users];
```

但是新数组中的用户对象仍是原来的对象。调用方依然可以这样修改内部用户：

```typescript
const users = service.findAll();
users[0].name = 'Changed outside the service';
```

因此本课同时创建新数组和新用户对象：

```typescript
return this.users.map((user) => ({ ...user }));
```

`map()` 遍历每个用户并生成新数组；`({ ...user })` 复制该用户的字段到新对象，外层括号表示箭头函数直接返回对象字面量。

```text
Service 内部数组         返回给调用方的新数组
  ├─ 用户对象 A            ├─ 用户对象 A 的副本
  └─ 用户对象 B            └─ 用户对象 B 的副本
```

当前 User 的字段全是字符串，这种浅拷贝足以隔离现有字段。以后如果增加嵌套对象、数组等字段，展开运算符仍会共享那些嵌套引用，需要重新评估复制策略。

## 9. 为什么这个方法暂时是同步的

当前 `findAll()` 只读取本进程内存并复制数组，不涉及数据库或远程请求，因此直接返回 `User[]`。

将来访问数据库可能返回 `Promise<User[]>`，那时再学习异步链路。方法是否声明 async 应与实际调用需求一致。

返回副本也有 O(n) 的遍历与分配成本。本阶段数据量小，可以接受；未来的大数据查询会结合数据库、分页和返回模型重新设计。

## 10. UserModule 的装配职责

文件：`apps/server/src/modules/user/user.module.ts`。

```typescript
import { Module } from '@nestjs/common';
import { UserService } from './user.service';

@Module({
  providers: [UserService],
})
export class UserModule {}
```

这里用类本身作为 Token 注册 Provider。Nest 容器负责创建和管理 Service；本课不需要额外定义 Symbol。Provider 机制可对照 [Nest 官方说明](https://docs.nestjs.com/providers)。

本课没有 HTTP 处理方法，所以暂不创建空的 UserController。一个 Module 可以只包含 Provider；下一课再在 `controllers` 中注册真正承载路由的 UserController。

目前其他业务模块没有注入 UserService 的需求，因此不声明 `exports`。后续真正产生跨模块消费需求时，再明确公开哪些能力。

## 11. AppModule 导入 UserModule

```typescript
@Module({
  imports: [GreetingModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

AppModule 负责接入用户模块，用户模块负责管理 UserService。不要同时在两个模块的 `providers` 中重复注册 UserService，否则可能得到各自独立的实例和数据。

当前数据归属关系：

```text
AppModule
└─ imports UserModule
   └─ providers UserService
      └─ 实例字段 users
```

## 12. 内存数据的生命周期

默认作用域下，同一注册 Provider 的实例通常在当前应用容器中复用。因此将来不同请求会访问这个 Service 实例持有的数据，而不是每次请求都重新创建初始数组。

但它仍然只属于该实例所在的进程：

- 应用重启或开发进程重新启动，数据会恢复成初始化状态。
- 两个独立 Node 进程通常有各自的内存，不会自动同步用户数组。
- 手动创建两个 UserService 实例，会分别执行字段初始化。
- 数据库阶段将提供真正的持久化能力。

本阶段练习的是业务与 HTTP 分层。该存储方式不能替代后续的数据库设计。

## 13. 测试设计

文件：`apps/server/src/modules/user/user.service.spec.ts`。

UserService 当前没有构造函数依赖，因此单元测试可以直接 `new UserService()`。生产运行仍由 Nest 容器创建实例；直接 new 是这里的隔离测试方式。

每个测试通过 beforeEach 创建新实例，避免测试间共享状态。本课新增三个测试：

1. `findAll()` 返回约定的两条初始用户。
2. 对返回数组执行 `pop()`，内部数据仍然有两个用户。
3. 修改返回对象的姓名，再次读取时内部姓名仍为 Alice。

第三个测试的核心代码：

```typescript
const users = service.findAll();
users[0].name = 'Changed outside the service';

expect(service.findAll()[0].name).toBe('Alice');
```

这验证的是数据封装行为，不要求测试知道生产实现究竟用 map、循环还是其他复制方法。

原有 E2E 继续使用真实 AppModule 初始化应用，因此也会装配新增的 UserModule。已有 Greeting 接口应继续通过。

## 14. 本课文件变化

```text
apps/server/src/
├─ app.module.ts                     修改：导入 UserModule
└─ modules/user/
   ├─ user.interface.ts              新增：用户数据结构
   ├─ user.service.ts                新增：内部数组与副本读取
   ├─ user.service.spec.ts           新增：数据封装测试
   └─ user.module.ts                 新增：用户模块装配
```

另外修改 `apps/server/tsconfig.json`：移除与当前安装的 TypeScript 5.9.3 不兼容的 `ignoreDeprecations: "6.0"`。预检原本报 `TS5103: Invalid value for '--ignoreDeprecations'`，移除后完成构建验证。

课程文档新增本讲义，并更新 `docs/学习进度.md`。

## 15. 动手实验与验证命令

在 `apps/server` 执行：

```powershell
pnpm exec jest user.service.spec.ts --runInBand
pnpm format:check
pnpm lint
pnpm exec jest --runInBand
pnpm exec jest --config ./test/jest-e2e.json --runInBand
pnpm build
```

可选实验：临时将 `findAll()` 改成直接返回内部数组，运行 UserService 测试，观察两个隔离测试失败；改成 `[...this.users]` 后，对象隔离测试仍应失败；最后恢复当前实现再运行测试。

这些实验由学习者自行进行，不应把错误版本作为后续课程基线。

本课实际验证结果：

| 检查 | 结果 |
|---|---|
| Prettier | 通过 |
| ESLint | 通过 |
| 单元/边界测试 | 7 个套件，15/15 通过 |
| E2E | 1 个套件，3/3 通过 |
| 构建 | 通过 |

当前访问 `/users` 仍不会获得用户列表，因为本课没有注册该路由。列表和详情 HTTP 行为将在下一课实现并通过 E2E 验证。

## 16. Code Review 与学习总结

- 用户字段集中定义在 User interface 中，避免各处自行猜测结构。
- 数据属于 UserService 实例，Controller 不直接管理数组。
- 返回值隔离数组和当前扁平对象的引用，避免调用方绕过业务入口修改状态。
- UserModule 保持最小公开面，AppModule 只负责导入。
- 目前没有引入独立 Repository；P02-L08 会结合 CRUD 的实际复杂度讨论数据访问边界。
- 当前没有创建和更新入口，字段类型检查不能替代未来 HTTP 运行时校验。

与 Spring 类比：UserService 是容器管理的服务，User 接口在此只描述数据结构。它不是 JPA Entity，也不会触发 ORM 行为。

## 17. 本课检查题

1. UserModule、UserService、User interface 各负责什么？
2. 为什么本课使用字符串 ID？字符串类型能自动保证 ID 唯一吗？
3. `private readonly users: User[]` 中，private、readonly 和 User[] 分别表示什么？
4. readonly 能阻止 `users.push(...)` 或修改用户姓名吗？为什么？
5. 为什么直接返回 `this.users` 会破坏数据封装？
6. 为什么 `[...this.users]` 只能解决一部分问题？当前的 map 与对象展开分别复制了什么？
7. 当前复制方式遇到嵌套对象还足够吗？为什么？
8. 为什么应用重启会丢失后续对数组的修改？启动两个进程，它们的数组会自动同步吗？
9. 为什么导入 UserModule 后，目前访问 `/users` 仍然不能获取列表？
10. 为什么单元测试可以 new UserService，而生产运行仍应由容器管理？本课的两个副本隔离测试分别防止什么问题？

## 18. 完成标准与下一步

- 能解释用户模型和数据所有权。
- 能区分 readonly 引用与不可变内容。
- 能解释数组复制、对象复制及浅拷贝的边界。
- 能区分模块加载与 HTTP 路由注册。
- 理解内存存储与持久化的区别。
- 测试、Lint、格式检查和构建通过。
- 完成本课检查题并订正薄弱点。

通过后进入 P02-L03：用户列表与详情查询，新增 UserController，将 Service 能力接到 `GET /users` 与 `GET /users/:id`。
