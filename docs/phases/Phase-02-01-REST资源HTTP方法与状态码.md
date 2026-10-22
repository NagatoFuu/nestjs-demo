# P02-L01：REST 资源、HTTP 方法与状态码

## 1. 本课目标与阶段位置

Phase 1 解决了“如何用 Nest 组织和装配一个功能”。Phase 2 开始解决“如何设计并实现一组真正的数据操作接口”。本阶段先用内存保存用户，在框架分层稳定后再接数据库。

本课先设计 User API 契约：路径是什么、用什么 HTTP 方法、参数放在哪里、成功和失败如何表达。UserModule 和数据模型从 P02-L02 开始创建，列表与详情在 P02-L03 实现。

本课完成后应能：

1. 区分资源集合与单个资源。
2. 为查询、创建、完整更新、局部更新和删除选择 HTTP 方法。
3. 区分路径参数、查询参数与请求体。
4. 选择常见成功和错误状态码。
5. 理解安全性与幂等性的基本含义。

## 2. 从 Greeting 过渡到 User

当前接口：

```http
GET /greetings/hello/Nest
```

它接收姓名并生成问候语。接下来的用户功能需要处理一批有身份的数据，例如：

```json
{
  "id": "1",
  "name": "Nest",
  "email": "nest@example.com"
}
```

本课中的字段和字符串 ID 用于解释契约，最终内存数据模型由下一课确定。用户资源不是某个 TypeScript 类，也不必与数据库表一一对应，而是 API 对外表达的业务对象。

CRUD 分别表示 Create、Read、Update、Delete，也就是创建、读取、更新、删除。

## 3. 集合与单个资源

```text
/users       用户集合
/users/1     ID 为 1 的用户
/users/2     ID 为 2 的用户
```

`/users/:id` 是服务端路由模板。客户端请求时应使用真实标识，例如 `/users/1`，而不是把 `:id` 原样发送出去。

本项目约定路径使用复数名词：`users`。这是命名约定，不是 Nest 的强制规则。

完整 REST 架构还包含无状态、缓存、统一接口等约束。本课聚焦资源和 HTTP 语义，不能仅凭路径使用名词就判断一个系统完全符合 REST。

## 4. HTTP 方法和路径共同表达操作

本阶段计划采用以下接口契约，具体实现按课次逐步加入：

| 业务需求 | HTTP 方法与路径 | 正常成功响应 |
|---|---|---|
| 查询用户列表 | `GET /users` | `200`，返回数组 |
| 查询用户详情 | `GET /users/:id` | `200`，返回用户对象 |
| 创建用户 | `POST /users` | `201`，返回新用户对象 |
| 完整替换可编辑信息 | `PUT /users/:id` | `200`，返回更新后的用户 |
| 局部修改可编辑信息 | `PATCH /users/:id` | `200`，返回更新后的用户 |
| 删除用户 | `DELETE /users/:id` | `204`，无响应体 |

同一个路径可以配合不同方法：

```http
GET /users/1
DELETE /users/1
```

前者读取用户，后者删除用户。URL 一样不代表操作一样。

HTTP 方法的含义应由服务端实现遵守。仅仅写了 `@Get()`，Nest 不会阻止方法内部错误地删除数据。[HTTP 方法语义](https://www.rfc-editor.org/rfc/rfc9110.html#section-9)提供了这些约定的依据。

## 5. 为什么通常不用 /getUsers 和 /deleteUser

对于普通用户 CRUD，本项目选择：

```http
GET /users
DELETE /users/1
```

路径标识资源，方法表达操作。这样读取、更新和删除可以共享同一资源标识，减少各自命名动作的歧义。

如果使用 `GET /deleteUser/1`，浏览器预取、链接访问或重试就可能触发删除，这违背 GET 的读取语义。

真实业务也有登录、审批等动作型接口，不需要机械地把所有操作改成数据库式 CRUD。当前先掌握用户资源的标准操作。

## 6. 路径参数、查询参数和请求体

| 输入位置 | 常见用途 | 示例 | Nest 装饰器 |
|---|---|---|---|
| 路径参数 | 标识具体资源 | `/users/1` 的 `1` | `@Param('id')` |
| 查询参数 | 筛选、分页、排序 | `/users?name=Nest` | `@Query('name')` |
| 请求体 | 携带创建或修改内容 | JSON 中的姓名和邮箱 | `@Body()` |

例如：

```http
PATCH /users/1
Content-Type: application/json

{
  "name": "Alice"
}
```

`1` 回答“修改谁”，请求体回答“修改什么”。查询参数的解析和筛选逻辑也需要服务端实现，不会因为 URL 出现 `?name=Nest` 就自动筛选。

类型声明同样不会自动执行校验或转换。路径中拿到的 `"1"` 不会仅因声明为 `number` 就自动成为数字；转换和 DTO 校验后续展开。

## 7. GET：读取资源

列表接口：

```http
GET /users
```

未来的成功响应示例：

```http
HTTP/1.1 200 OK
Content-Type: application/json

[
  { "id": "1", "name": "Nest", "email": "nest@example.com" }
]
```

如果用户集合存在，但里面还没有用户：

```http
HTTP/1.1 200 OK
Content-Type: application/json

[]
```

查询成功与结果为空可以同时成立。

详情接口 `GET /users/999` 如果找不到用户，应返回 `404`。列表为空与指定资源不存在，表达的是不同情况。

## 8. POST：向集合创建资源

```http
POST /users
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

本项目计划由服务端分配 ID，创建成功返回 `201 Created` 和新用户对象。响应还可以通过 `Location: /users/2` 标识新资源。

POST 的通用含义是要求目标资源处理提交的内容，不只用于创建。这里将它用于向用户集合新增用户。

相同的创建请求重复提交，可能创建多条数据；POST 本身没有幂等保证。后续如需避免重复创建，应另行设计业务约束或去重机制。

## 9. PUT 与 PATCH 的区别

假设可编辑字段是姓名和邮箱：

```json
{ "name": "Alice", "email": "alice@example.com" }
```

本项目对 PUT 的约定是提交完整的可编辑字段：

```http
PUT /users/1
Content-Type: application/json

{ "name": "Bob", "email": "bob@example.com" }
```

客户端需要提供这两个字段。ID 等服务端管理字段不要求客户端重传。缺字段时不应悄悄当成局部更新，具体检查会在更新课程和 Phase 3 完善。

PATCH 表达局部修改，本项目计划支持明确列出的可编辑字段：

```http
PATCH /users/1
Content-Type: application/json

{ "name": "Bob" }
```

此时只修改姓名，邮箱保留。

PATCH 的修改文档由 API 契约和媒体类型定义。这里是项目自定义的字段更新约定，并不声称实现了 JSON Patch 或 JSON Merge Patch。PUT 与 PATCH 的语义差异可参阅 [RFC 5789](https://www.rfc-editor.org/rfc/rfc5789.html#section-2)。

HTTP 的 PUT 也允许在条件满足时创建目标资源；本阶段为简化业务，约定 PUT/PATCH 只更新已有用户，不存在时返回 `404`。

## 10. DELETE 与 204

```http
DELETE /users/1
```

本项目计划成功删除时返回：

```http
HTTP/1.1 204 No Content
```

204 表示处理成功且没有响应体，因此不再返回用户对象、`"删除成功"` 或 `{ "success": true }`。如果希望返回这些内容，可以设计为 `200`，需要保持契约一致。

删除不存在的用户，本阶段约定返回 `404`。这不是 HTTP 唯一允许的设计，项目需要明确选择并通过测试固定行为。

## 11. 常用状态码

| 状态码 | 含义 | 本项目示例或后续场景 |
|---|---|---|
| `200 OK` | 请求成功 | 查询成功，或更新后返回对象 |
| `201 Created` | 创建成功 | POST 创建用户 |
| `204 No Content` | 成功且无响应体 | 删除用户成功 |
| `400 Bad Request` | 请求存在格式或参数等问题 | 参数校验不通过，后续实现 |
| `401 Unauthorized` | 缺少有效认证凭据 | 未登录，认证阶段实现 |
| `403 Forbidden` | 服务端拒绝执行 | 常见于已登录但权限不足 |
| `404 Not Found` | 目标不存在或未找到路由 | 指定用户不存在，或路径拼错 |
| `409 Conflict` | 请求与资源当前状态冲突 | 未来可用于邮箱唯一性冲突 |
| `500 Internal Server Error` | 服务端遇到未预期错误 | 未处理的程序异常 |

不要用同一个 `200` 配合响应体里的 `"statusCode": 404` 代替真实错误状态。客户端、代理和监控会读取实际 HTTP 状态码。

更多定义见 [HTTP 状态码规范](https://www.rfc-editor.org/rfc/rfc9110.html#section-15)。本课学习含义，不表示表内所有错误处理已经实现。

## 12. “安全”和“幂等”分别描述什么

HTTP 中的安全方法，指客户端没有要求改变业务状态，例如 GET 查询用户。记录访问日志等附带行为不违反这种语义。“安全”在此不表示已经实现权限认证或输入校验。

幂等指相同请求执行多次，预期对服务端产生的效果与执行一次相同。[HTTP 幂等性定义](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)强调的是效果，而非响应完全相同。

例如对同一个用户重复删除：

```text
第一次 DELETE /users/1 → 204，用户被删除
第二次 DELETE /users/1 → 404，用户已经不存在
最终业务状态          → 用户不存在
```

响应不同不影响这里的幂等性。

| 方法 | 安全 | 幂等 |
|---|---|---|
| GET | 是 | 是 |
| POST | 否 | 不保证 |
| PUT | 否 | 是 |
| PATCH | 否 | 不保证，取决于操作设计 |
| DELETE | 否 | 是 |

PATCH 将姓名设置为固定值，通常可以设计为幂等；PATCH 要求“计数加一”，重复执行则会继续增加，因此不幂等。详细重试与删除设计在 P02-L06 展开。

## 13. 映射到 Nest 装饰器

以下只是后续 UserController 的路由设计草图：

| Controller 前缀 | 方法装饰器 | 对外路由 |
|---|---|---|
| `@Controller('users')` | `@Get()` | `GET /users` |
| 同上 | `@Get(':id')` | `GET /users/:id` |
| 同上 | `@Post()` | `POST /users` |
| 同上 | `@Put(':id')` | `PUT /users/:id` |
| 同上 | `@Patch(':id')` | `PATCH /users/:id` |
| 同上 | `@Delete(':id')` | `DELETE /users/:id` |

在 Nest 标准响应处理方式下，正常返回默认使用 `200`，POST 默认使用 `201`。异常处理和显式配置可以改变状态码。DELETE 不会自动变成 `204`，需要在相应处理方法上声明：

```typescript
@HttpCode(HttpStatus.NO_CONTENT)
```

`HttpCode` 和 `HttpStatus` 均从 `@nestjs/common` 导入。后续删除方法也应遵守无响应体的契约。

这一行为已对照当前安装的 `@nestjs/core/router/router-response-controller.js` 中 `getStatusByMethod()` 和 [Nest Controller 官方文档](https://docs.nestjs.com/controllers#status-code)核对。

## 14. 动手练习：把业务需求翻译成 HTTP 契约

先不看第 4 节的表，分别给出以下需求的方法、路径、输入位置和成功状态码：

1. 查询 ID 为 7 的用户。
2. 创建姓名为 Alice、邮箱为 alice@example.com 的用户。
3. 只把 ID 为 7 的用户姓名改成 Bob。
4. 删除 ID 为 7 的用户。
5. 查询全部用户，当前没有任何用户。

写完后，再考虑“用户 7 不存在”时，详情、更新和删除各自如何响应。

## 15. 验证范围和 Code Review

本课新增本讲义并更新学习进度；User API 表格是设计契约，当前源码仍只有根路由和 Greeting 路由。

本课验证以核对课程编号、相对文档链接、现有 Controller 和框架默认状态码实现为主。文档变更不需要重跑整个应用的构建与测试。

后续实现时将用 E2E 固定表中的响应码、响应体和错误行为。Controller 方法内部直接调用测试，无法验证真实 HTTP 状态码。

接口设计 Review：

1. 方法是否符合业务操作，GET 是否保持读取语义？
2. 集合路径和详情路径是否区分？
3. 资源 ID、筛选条件和修改内容是否放在清晰的位置？
4. 空列表是否与详情不存在区分？
5. PUT/PATCH 是否有明确的字段处理约定？
6. 204 是否真正无响应体？
7. 错误是否通过真实 HTTP 状态表达？

## 16. 与前一阶段和 Spring 的联系

Phase 1 的 Controller/Service 分工继续适用：Controller 处理 HTTP 输入输出，Service 处理用户查询、创建等业务。新增 HTTP 方法并不改变 Provider 的装配原则。

Spring 中的 `@GetMapping`、`@PostMapping` 与 Nest 中的 `@Get()`、`@Post()` 用途相近；方法语义和 HTTP 状态码属于协议层规则，不因使用的框架不同而改变。

## 17. 本课检查题

1. `/users` 与 `/users/7` 分别表示什么？`:id` 是实际请求值还是路由模板？
2. 查询用户 7 和删除用户 7，为什么可以使用同一个路径？请写出两个完整操作。
3. 创建用户时，姓名和邮箱通常放在哪里？对应哪个 Nest 装饰器？
4. 只修改用户 7 的姓名应选 PUT 还是 PATCH？为什么？
5. `GET /users` 查到空列表，与 `GET /users/999` 找不到用户，各应返回什么状态和内容？
6. 创建成功为什么计划使用 201？删除成功采用 204 时能否再返回 JSON？
7. DELETE 第一次返回 204、第二次返回 404，为什么仍然可以是幂等的？
8. Nest 的 POST 默认成功状态码是什么？DELETE 默认是否为 204，如何显式设置？
9. 如果请求返回真实 HTTP 200，但 JSON 写着 `"statusCode": 404`，这等同于 HTTP 404 吗？
10. 如果 UserController 单元测试通过，但项目没有导入 UserModule，客户端请求 `/users` 可能怎样？这个问题应该通过什么测试发现？

## 18. 完成标准与下一步

- 能独立写出本阶段 User CRUD 的方法与路径。
- 能区分 Path、Query 和 Body 的用途。
- 能解释 200、201、204、400、404 的基本含义。
- 能解释幂等性为什么不要求每次响应相同。
- 完成本课检查题，并订正需要巩固的部分。

通过后进入 P02-L02：UserModule 的职责与内存数据模型，开始创建用户模块和内存数据结构。
