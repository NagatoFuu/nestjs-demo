# P02-L04：创建用户与请求 Body

## 1. 目标和课前状态

从 `course-p02-l03` 出发，已有列表和详情查询。本课实现 `POST /users`：客户端提交姓名与邮箱，服务端分配 ID、保存到内存，并返回 201 和新用户。

本课课程快照为 `course-p02-l04`。提前生成仅表示实现和讲义已准备好，不表示学习检查已经通过。

## 2. 请求契约

```http
POST /users
Content-Type: application/json

{"name":"Carol","email":"carol@example.com"}
```

在一个刚启动的应用中，已有 ID '1'、'2'，因此本次响应为：

```json
{"id":"3","name":"Carol","email":"carol@example.com"}
```

返回对象是本项目的选择，201 本身不强制要求返回 JSON。ID 由服务端决定。当前邮箱不具有唯一性约束，相同姓名和邮箱的再次提交可以创建另一个用户。

## 3. 区分输入与存储模型

新增 `create-user.input.ts`：

```typescript
export interface CreateUserInput {
  name: string;
  email: string;
}
```

User 含有 id，创建输入不包含 id。输入类型描述调用者应该提供什么，User 描述已经存在的用户具有什么字段。不要直接把创建参数声明成 User，然后要求客户端伪造 ID。

CreateUserInput 依然只是编译期 interface。它不会自动检查真实 HTTP 输入，也不会禁止运行时传入额外字段。本课先聚焦正常创建流程；P02-L07 增加基础运行时检查，Phase 3 再系统引入 DTO 和 ValidationPipe。

## 4. Controller 的请求体入口

```typescript
@Post()
create(@Body() input: CreateUserInput): User {
  return this.userService.create(input);
}
```

Body 和 Post 从 `@nestjs/common` 导入，输入 interface 使用 import type。Nest 的默认 JSON 请求体解析让 @Body() 取得对象；Content-Type、请求体语法和实际请求内容仍然影响解析结果。

@Body() 读取整个请求体；@Param('id') 读取路径中资源标识，两者来源不同。Controller 只负责转交输入，不在这里操作用户数组。

## 5. Service 如何创建对象

```typescript
private nextId = 3;

create(input: CreateUserInput): User {
  const user: User = {
    id: String(this.nextId++),
    name: input.name,
    email: input.email,
  };

  this.users.push(user);
  return { ...user };
}
```

后缀 ++ 先使用当前值，再递增；String() 将数字计数器转换成字符串 ID。不要用 `users.length + 1` 分配 ID：删除记录后数组长度减少，可能产生重复标识。独立计数器也只是当前单进程示例的分配方案，不能代替分布式 ID 设计。

显式挑选 name、email，而不是把整个 input 展开到用户对象。这样即使请求里带 id 或 role，也不会把它们存进去。但字段挑选不等于完整输入校验。

## 6. 状态生命周期与返回副本

保存操作修改当前 Service 实例的内存数组，后续 GET 能查询到新用户。实例重建后，数据和计数器都会重新初始化。

返回 `{ ...user }`，防止进程内调用方通过创建结果直接改动已保存的对象。HTTP JSON 序列化与进程内引用隔离是两个不同边界。

POST 通常不保证幂等。重复提交当前请求会分配不同 ID。避免重复创建需要另外设计去重或幂等机制，不能仅靠 HTTP 方法名实现。

## 7. 文件与设计变化

- 新增 CreateUserInput。
- UserService 增加 nextId 和 create。
- UserController 增加 POST 与 Body 参数。
- Service 测试覆盖保存、连续 ID 和返回副本。
- Controller 测试覆盖请求体委托。
- E2E 覆盖 201、创建后可读、额外字段不入库和连续创建。

UserModule 的注册方式保持不变，UserService 继续留在模块内部。当前同步内存操作不需要额外添加 async。

## 8. 动手实验

在 apps/server 执行 pnpm start:dev。可在 PowerShell 使用：

```powershell
$body = @{ name = 'Carol'; email = 'carol@example.com' } | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri http://localhost:3000/users -ContentType 'application/json' -Body $body
Invoke-RestMethod http://localhost:3000/users/3
```

再次发送 POST，观察不同 ID；重启后观察内存数据恢复。若已有创建操作，不要假定下一个 ID 始终是 3。

## 9. 验证与 Review

执行 pnpm format:check、pnpm lint、pnpm exec jest --runInBand、pnpm exec jest --config ./test/jest-e2e.json --runInBand、pnpm build。本课提交前须全部通过。

本课实际结果：格式、Lint、构建通过；单元/边界测试 26/26，E2E 10/10。

Review 检查：输入与 User 是否分开、ID 是否由服务端分配、是否只存预期字段、结果是否为副本、是否错误地把 interface 当成运行时校验。

与 Spring 的 @RequestBody 类似，@Body() 是输入绑定入口；真实校验规则仍需要单独实现。参考 [Nest 请求体说明](https://docs.nestjs.com/controllers#request-payloads)。

## 10. 检查题

1. CreateUserInput 为什么不包含 id？
2. @Body() 和 @Param() 分别从哪里取值？
3. interface 能阻止真实请求提交额外字段吗？
4. 本课为什么显式写出 name、email，而不展开整个请求体？
5. `String(this.nextId++)` 的执行结果和顺序是什么？
6. 为什么不能简单使用数组长度加一生成 ID？
7. 创建后 GET 为什么能查询到用户？重启后又会怎样？
8. 相同 POST 执行两次是否必然只创建一个用户？
9. 创建结果为什么返回副本？
10. 分别说明 Service、Controller 和 E2E 测试的目标。

完成标准：能解释创建链路、ID 分配和类型校验边界，运行测试并完成检查题。下一课 P02-L05 学习 PUT/PATCH。
