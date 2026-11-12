# P02-L03：用户列表与详情查询

## 1. 本课目标

上一课建立了 UserModule、UserService、User interface 和内存数组。本课将已有的 Service 能力接到 HTTP 入口，并增加按 ID 查询单个用户。

本课实现：

| 请求 | 预期结果 |
|---|---|
| `GET /users` | 200，返回用户数组 |
| `GET /users/1` | 200，返回 Alice |
| `GET /users/2` | 200，返回 Bob |
| `GET /users/999` | 404，返回用户不存在的错误说明 |
| `GET /users/01` | 404，字符串 ID '01' 不等于 '1' |

本课只增加读取能力。创建用户在 P02-L04 实现，参数转换和 DTO 校验将在后续阶段展开。

## 2. 职责设计与文件规划

```text
客户端 GET 请求
→ UserController：接收请求、提取路径参数
→ UserService：执行用户查询、判断是否找到
→ 内存 users 数组
→ 返回数据副本，或抛出异常
→ Nest 输出 HTTP 响应
```

| 文件 | 变化 | 职责 |
|---|---|---|
| `apps/server/src/modules/user/user.controller.ts` | 新增 | 列表与详情 HTTP 入口 |
| `apps/server/src/modules/user/user.controller.spec.ts` | 新增 | Controller 委托和异常传播测试 |
| `apps/server/src/modules/user/user.service.ts` | 修改 | 增加 findOne(id) |
| `apps/server/src/modules/user/user.service.spec.ts` | 修改 | 详情查询、精确 ID 匹配和数据隔离测试 |
| `apps/server/src/modules/user/user.module.ts` | 修改 | 注册 UserController |
| `apps/server/test/app.e2e-spec.ts` | 修改 | 验证真实 HTTP 成功与失败路径 |

User interface 沿用上一课的结构。AppModule 已经导入 UserModule，本课无需再次注册 UserService 或修改根模块。

## 3. UserController 的完整代码

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import type { User } from './user.interface';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(): User[] {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): User {
    return this.userService.findOne(id);
  }
}
```

Controller 不直接持有 users 数组，也不在方法里重复编写查询算法。它负责将 HTTP 输入交给 Service，再将结果交还给 Nest。

User 只用于类型检查，所以使用 `import type`。UserService 作为构造函数依赖，需要保留运行时类引用，供 Nest 解析依赖。

## 4. 路由如何拼接

```text
@Controller('users') + @Get()      → GET /users
@Controller('users') + @Get(':id') → GET /users/:id
```

`findAll`、`findOne` 是 TypeScript 方法名。路由由 Controller 前缀和方法装饰器决定，不会自动变成 `/users/findAll` 或 `/users/findOne`。

这里的 `:id` 是一个动态路径段，不会匹配任意多级子路径。请求 `/users/2` 时匹配详情方法；请求 `/users` 时匹配列表方法。

## 5. @Param('id') 如何传递输入

```typescript
findOne(@Param('id') id: string): User {
  return this.userService.findOne(id);
}
```

当请求是 `GET /users/2`：

1. 路由匹配 `users/:id`。
2. Nest 从路径参数中读取键为 id 的值 `'2'`。
3. 将这个值传入方法参数。
4. Controller 调用 `userService.findOne('2')`。

`@Param('id')` 中的键名应与路由模板里的 `:id` 对应。仅写 `id: string` 不会替代参数提取，也不会执行输入校验。

本课使用字符串 ID，所以没有添加 ParseIntPipe 或手动数值转换。`'01'` 与 `'1'` 保持不同身份。

路由参数用法可参阅 [Nest Controller 官方文档](https://docs.nestjs.com/controllers#route-parameters)。

## 6. 列表读取复用上一课实现

UserService 的列表方法保持：

```typescript
findAll(): User[] {
  return this.users.map((user) => ({ ...user }));
}
```

它返回数组以及每个用户对象的副本。当前数据模型是扁平的字符串字段，所以这层复制可以隔离现有用户数据。

Controller 直接返回这个数组，Nest 在标准响应方式下将其序列化为 JSON；GET 正常返回默认为 200。

```json
[
  { "id": "1", "name": "Alice", "email": "alice@example.com" },
  { "id": "2", "name": "Bob", "email": "bob@example.com" }
]
```

如果内部数组为空，map 的结果也是 `[]`，列表契约仍是 200 和空数组。当前运行时包含两条初始数据，尚无删除或清空接口；本课不提供通过请求清空数组的实验。

## 7. 详情查询的完整实现

UserService 新增：

```typescript
findOne(id: string): User {
  const user = this.users.find((user) => user.id === id);

  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }

  return { ...user };
}
```

NotFoundException 从 `@nestjs/common` 导入。

这段代码分别负责三个步骤：

1. 查找：按 ID 精确寻找匹配用户。
2. 判断：不存在时中断当前正常流程。
3. 返回：存在时交付用户对象副本。

## 8. Array.find() 与 ===

```typescript
const user = this.users.find((user) => user.id === id);
```

Array.find 会按顺序寻找第一个使回调返回 true 的元素。如果没有匹配项，返回 undefined。它不会像 map 一样返回一个数组。

这里使用严格相等 `===`，并保留字符串 ID，不把 ID 当作数字比较：

```typescript
'1' === '1'; // true
'01' === '1'; // false
```

当用户数量为 n 时，最坏需要遍历 n 个元素。当前数据量小，直接数组查找足够；数据库与索引留在相应阶段学习。

## 9. 找不到时为什么 throw

如果 findOne 直接返回 find 的结果，其类型就是 `User | undefined`。声明返回类型为 User，并不能让实际查找必然成功。

本课明确处理 undefined：

```typescript
if (!user) {
  throw new NotFoundException(`User ${id} not found`);
}
```

throw 会中断当前方法，异常沿调用链传播。经过这个分支之后，TypeScript 可以将后续的 user 收窄为 User，因此正常返回分支能够返回用户对象。

`throw new NotFoundException(...)` 与 `return new NotFoundException(...)` 行为不同。前者进入异常处理链，后者只是返回了一个对象，并不等价于产生 404。

同样，返回 `{ statusCode: 404 }` 也不会自动让真实 HTTP 状态变成 404。

## 10. Nest 如何输出 404

对于当前标准响应方式，Nest 的内置异常处理会把 NotFoundException 转成 404 响应。Controller 不需要为这个预期错误额外写 try/catch。

例如请求 `GET /users/999`：

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "message": "User 999 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

这一结果已由本课 E2E 验证。不要用普通 Error 替代该异常来表达用户不存在，否则默认处理通常会将其视为未预期的服务端错误。

本课先使用 Nest 内置异常完成接口契约；P02-L07 会集中讨论 NotFoundException 和更完整的错误语义。当前在 Service 中使用 HTTP 异常是这个小型 Nest 应用的设计取舍；后续若需要独立业务层，可再评估领域错误到 HTTP 的映射。

参阅 [Nest 内置 HTTP 异常说明](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)。

## 11. 两种 404 要分清

```text
GET /users/999
→ 路由已匹配
→ Controller 和 Service 已执行
→ 用户不存在，业务查询产生 404

GET /unknown/path
→ 没有匹配到相应路由
→ 用户查询未执行
→ 路由层产生 404
```

HTTP 状态都是 404，但定位方向不同。排错时要同时观察请求方法、路径、响应说明、路由注册和业务查询，不能只看状态码。

## 12. 详情也必须返回副本

```typescript
return { ...user };
```

这个规则与上一课一致。如果直接返回数组里找到的原对象，调用方就可能通过详情查询结果修改内部数据。

新增测试执行：

```typescript
const user = service.findOne('1');
user.email = 'changed@example.com';

expect(service.findOne('1').email).toBe('alice@example.com');
```

这验证的是 Service 调用边界。HTTP 客户端收到的是序列化后的数据，本来就不直接持有 Node 进程里的对象引用；副本保护主要防止进程内调用方修改内部状态。

## 13. 在 UserModule 注册 Controller

```typescript
@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

只创建 Controller 文件还不够，需要注册在模块的 controllers 中。AppModule 已导入 UserModule，所以 Nest 能从根模块加载到这些路由。

UserService 与 UserController 位于同一模块中，无需为了内部注入而 exports UserService。

当前注册与调用关系：

```text
AppModule
└─ imports UserModule
   ├─ controllers UserController
   │  └─ injects UserService
   └─ providers UserService
      └─ users 数组
```

## 14. 分层测试分别验证什么

| 测试层 | 本课新增验证 | 是否实际经过 HTTP 路由 |
|---|---|---|
| Service | 查到指定用户、未知 ID 抛异常、字符串精确匹配、详情副本隔离 | 否 |
| Controller | 列表委托、ID 传递、返回 Service 结果、异常传播 | 否 |
| E2E | 列表和详情的 200、未知 ID 的 404、路径 ID 保留字符串语义 | 是 |

Service 测试继续直接 new UserService，因为当前没有构造函数依赖。Controller 测试通过 TestingModule 提供 useValue mock，隔离用户数组和实际查找算法。

mock 函数保留独立引用，例如 findOne，再通过 `expect(findOne).toHaveBeenCalledWith('user-42')` 检查参数，延续前面避免 unbound-method 的做法。

E2E 使用真实 AppModule、UserController 和 UserService，既检查状态码，也检查响应内容。仅测试 `controller.findOne('2')` 的返回值，不能证明路由和异常到 HTTP 的转换正确。

## 15. 动手运行与观察

在 `apps/server` 执行：

```powershell
pnpm start:dev
```

默认端口 3000。使用浏览器或另一个 PowerShell 终端查询：

```powershell
curl.exe -i http://localhost:3000/users
curl.exe -i http://localhost:3000/users/1
curl.exe -i http://localhost:3000/users/2
curl.exe -i http://localhost:3000/users/999
curl.exe -i http://localhost:3000/users/01
```

`-i` 会同时显示响应头，便于观察真实状态码。若设置了 PORT，替换 URL 中的端口。

观察重点：列表是数组，详情是对象；404 响应可以带错误 JSON；`/users/01` 不会匹配到 ID '1'。当前接口尚未实现分页或筛选，不要把 `?name=Alice` 误认为已经具备筛选能力。

推荐阅读顺序：UserController → UserService.findOne → UserModule → 三层测试。

## 16. 验证命令与实际结果

```powershell
pnpm format:check
pnpm lint
pnpm exec jest --runInBand
pnpm exec jest --config ./test/jest-e2e.json --runInBand
pnpm build
```

本课实际运行结果：

| 检查 | 结果 |
|---|---|
| Prettier | 通过 |
| ESLint | 通过 |
| 单元/边界测试 | 8 个套件，22/22 通过 |
| E2E | 1 个套件，7/7 通过 |
| 构建 | 通过 |

相较上一课增加 4 项 Service 测试、3 项 Controller 测试、4 项 E2E。原有根路由和 Greeting 接口继续通过。

当前普通沙箱终端及备用读取进程均因辅助进程初始化错误无法启动，本次通过受审核的本地终端完成读取与验证。该环境问题未要求修改项目依赖或业务代码。

## 17. Code Review 与学习总结

- Controller 保持协议入口职责，用户查找在 Service 中完成。
- 列表和详情返回与契约一致的数据形状。
- 详情缺失时明确抛出内置异常，避免未处理的 undefined 或伪错误响应。
- ID 使用字符串严格匹配，避免隐式数字转换改变资源身份。
- 详情返回副本，与列表的数据封装保持一致。
- UserService 保持模块内部可见，没有扩大 exports。
- 查询同步读取内存，当前无需添加 async。
- 当前 HTTP GET 路由没有运行时输入校验；字符串声明不能替代后续验证。

与 Spring 类比，`@Get(':id')` 和 `@Param('id')` 的职责接近 `@GetMapping("/{id}")` 与 `@PathVariable`。本课同时演示了框架异常处理如何把方法中抛出的异常转换为 HTTP 响应。

## 18. 本课检查题

1. `@Controller('users')` 与 `@Get()`、`@Get(':id')` 分别组成什么路由？方法名 findOne 会成为 URL 的一部分吗？
2. 请求 `/users/2` 时，`@Param('id')` 取得什么值、什么类型？为什么本课不转成数字？
3. Array.find 与 Array.map 的返回结果有什么区别？find 找不到时返回什么？
4. 为什么 findOne 的返回类型可以写成 User，而不是 User | undefined？
5. `throw new NotFoundException(...)` 与 `return { statusCode: 404 }` 对 HTTP 响应有什么区别？
6. 用户不存在的 404 与路由未匹配的 404，发生位置有什么不同？
7. 为什么详情查询仍然要返回 `{ ...user }`？它主要保护哪一层调用边界？
8. UserService 没有 exports，UserController 为什么仍可以注入它？只创建 Controller 文件但不注册会怎样？
9. Controller 测试为什么替换 UserService？E2E 又为什么使用真实 Service？
10. 请完整复述 `GET /users/2` 返回成功，以及 `GET /users/999` 返回 404 的两条请求链路。

## 19. 完成标准与下一步

- 能解释列表与详情路由的注册和参数提取。
- 能解释 find 查找、undefined 分支和 throw 的作用。
- 能区分返回对象与实际 HTTP 状态。
- 能解释查询结果副本与内存封装边界。
- 能通过浏览器或 curl 观察成功与失败响应。
- 相关测试、格式、Lint 和构建通过。
- 完成本课检查题并订正薄弱点。

通过后进入 P02-L04：创建用户与请求 Body，实现 `POST /users`，学习请求体、输入类型与新用户 ID 分配。
