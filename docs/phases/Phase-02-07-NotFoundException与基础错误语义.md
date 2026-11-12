# P02-L07：NotFoundException 与基础错误语义

## 1. 目标与阶段位置

前六课已经接通 CRUD 的正常链路。本课使常见错误也具有明确行为：输入不可用返回 400，目标不存在返回 404，未预期的程序错误由框架按 500 处理。课程标签为 `course-p02-l07`。

本课采用小型手写检查，帮助观察运行时错误与静态类型的区别。Phase 3 再将请求校验迁移到 DTO、ValidationPipe 和成熟校验工具。

## 2. 从 unknown 开始看请求体

```typescript
create(@Body() input: unknown): User {
  return this.userService.create(input);
}
```

unknown 表示“还不知道实际结构”。它要求我们先检查才能使用，避免用类型断言假装外部数据一定满足 interface。any 则会绕过大量编译器检查。

CreateUserInput、ReplaceUserInput 和 UpdateUserInput 依然用于描述检查后可以接受的数据形状。当前创建和完整替换具有相同必填字段，可以复用完整字段读取函数；这不是把两个 HTTP 操作合并成同一个业务方法。

## 3. 基础输入规则

| 操作 | 本课规则 |
|---|---|
| POST | 请求体必须为对象，name、email 均为非空字符串 |
| PUT | 必须提供完整的 name、email，目标必须存在 |
| PATCH | 至少提供 name 或 email；提供的字段必须为非空字符串 |

null、数组、数字、纯空白字符串不满足规则。额外字段被忽略，id 和 role 不会成为可编辑字段。只带额外字段而不带任何可编辑字段的 PATCH 返回 400。

email 目前只验证是非空字符串，不验证邮箱语法或唯一性。用 trim 检查是否全为空白，但保留合法字符串的原始内容，不悄悄执行格式归一化。

## 4. 请求体必须为对象

```typescript
if (typeof input !== 'object' || input === null || Array.isArray(input)) {
  throw new BadRequestException('Request body must be an object');
}
```

JavaScript 的 typeof null 为 object，所以必须单独排除 null；数组也是 object，也需要排除。通过对象检查后，仍不能直接认为字段类型正确，必须逐个读取。

## 5. 检查字段并挑选允许输入

`user-input.validation.ts` 中的 readText 检查字符串和 trim 后长度，parseRequiredUserFields 返回经过检查的 name、email，parsePartialUserFields 只返回明确提供的合法字段。

```typescript
if (typeof value !== 'string' || value.trim().length === 0) {
  throw new BadRequestException(`${field} must be a non-empty string`);
}
```

这些函数先完成所有检查，再将结果交给写操作。它们没有创建额外 Provider，因为当前没有独立依赖和替换需求，普通函数即可表达职责。

## 6. 为什么必须先检查再修改

假设 PATCH 提交：

```json
{"name":"Must not persist","email":7}
```

如果先写入 name，再检查 email，最终虽然返回 400，姓名却已经改变。本实现先生成完整的合法 fields，成功后才改动内部用户。创建也先检查，再分配 ID，失败不会消耗计数器。

这属于单次同步内存操作的失败状态保护，不等于已经实现数据库事务或并发控制。

## 7. 404 的统一查找逻辑

Service 提取私有 getStoredUser(id)，统一详情、PUT 和 PATCH 中的查找及缺失异常。删除仍通过 findIndex 取得位置并显式检查 -1。

```typescript
if (!user) {
  throw new NotFoundException(`User ${id} not found`);
}
```

当前更新先确认目标存在，再校验输入，因此未知 ID 即使同时带错误字段也优先得到 404。后续数据库层重构可以调整实现顺序，但必须保持已声明的对外契约。

## 8. 抛异常、返回错误对象和普通 Error

- throw new BadRequestException：进入框架异常链，产生 400。
- throw new NotFoundException：进入框架异常链，产生 404。
- return { statusCode: 404 }：只是普通返回值，不自动改变真实状态。
- throw new Error：表示未预期错误，默认通常输出 500，不能用来替代业务缺失语义。

不应在 Controller 捕获所有异常后返回 200，否则会让客户端和监控误判成功。本课保留 Nest 内置错误结构，没有提前引入全局过滤器或统一错误码系统。

参考 [Nest HTTP 异常处理](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)。

## 9. 请求解析错误与业务错误

JSON 语法本身不合法时，错误可能发生在请求体解析阶段，Controller 尚未执行。业务字段不合法则由本课的 Service 检查发现。二者都可能返回 400，定位位置却不同。

同理，路由不存在与指定用户不存在都可以返回 404。状态码描述结果类别，还需要结合路径、响应说明和日志定位。

## 10. 测试与实验

纯检查函数使用参数化测试覆盖 null、数组、错误类型、缺字段、空白与空 PATCH。Service 测试验证失败不改变用户、不消耗创建 ID。E2E 验证真实状态码、失败后的 GET，以及错误 JSON 语法。

```powershell
$body = @{ name = 'New' } | ConvertTo-Json
Invoke-WebRequest -Method Put -Uri http://localhost:3000/users/1 -ContentType 'application/json' -Body $body
```

该请求缺 email，应返回 400。再查询用户 1，确认姓名保持原值。PowerShell 的非成功响应可能抛出客户端异常，应查看响应状态，而不是误认为请求没有到达服务端。

## 11. Review 与完成标准

提交前执行完整质量检查。Review 重点：所有输入都在写入前检查、错误不会修改部分状态、未知字段不能覆盖 ID、错误状态来自实际异常链、没有伪装成完整邮箱或安全校验。

本课实际结果：格式、Lint、构建通过；单元/边界测试 61/61，E2E 26/26。

完成标准：能解释 unknown、运行时收窄、400/404/500 的边界及失败不变更原则，并完成检查题。

## 12. 检查题

1. 为什么请求体改成 unknown，而不是仅依靠 interface？
2. typeof 检查为什么还需要排除 null 和数组？
3. 不提供字段、传 null、传空字符串分别是什么情况？
4. 为什么 PATCH {} 返回 400？
5. “email 非空字符串”是否证明邮箱合法且唯一？
6. 先写 name 再检查 email 可能造成什么问题？
7. 创建失败为什么不应消耗 ID？
8. 400、404 和 500 分别适合什么情形？
9. malformed JSON 的 400 一定来自 Service 吗？
10. 为什么不能在 Controller 捕获所有异常并返回普通错误对象？

下一课 P02-L08 将存储从 Service 中抽到具体内存仓库，学习数据访问边界。
