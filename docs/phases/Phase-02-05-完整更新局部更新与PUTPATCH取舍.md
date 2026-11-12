# P02-L05：完整更新、局部更新与 PUT/PATCH 取舍

## 1. 目标与课程快照

从 `course-p02-l04` 出发，新增 `PUT /users/:id` 和 `PATCH /users/:id`，课程标签为 `course-p02-l05`。两者成功都返回 200 和修改后的用户；目标不存在时返回 404。

本项目 PUT 只更新已有用户，不提供 upsert。这是接口契约选择；HTTP PUT 在其他设计中也可以创建资源。

## 2. 完整信息与局部信息

```http
PUT /users/1
Content-Type: application/json

{"name":"New","email":"new@example.com"}
```

PUT 提交完整可编辑字段。ID 是服务端管理字段，不要求客户端作为更新内容重传。

```http
PATCH /users/1
Content-Type: application/json

{"name":"Renamed"}
```

PATCH 修改姓名，保留邮箱。这是本项目的字段更新约定，不声称实现 JSON Patch 或 JSON Merge Patch。

## 3. 两个输入类型

```typescript
export interface ReplaceUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}
```

问号表示该属性可以不提供，不表示它可以随意为 null、数字或其他值。这些 interface 都只提供编译期检查。本课先实现合法输入；P02-L07 将处理实际缺字段、null、错误类型等情况。

输入类型分别命名，便于将来创建和替换的要求出现差异时独立演进。当前少量字段重复比提前建立复杂泛型更容易学习。

## 4. Controller 的两个输入来源

```typescript
@Put(':id')
replace(@Param('id') id: string, @Body() input: ReplaceUserInput): User {
  return this.userService.replace(id, input);
}

@Patch(':id')
update(@Param('id') id: string, @Body() input: UpdateUserInput): User {
  return this.userService.update(id, input);
}
```

路径 ID 决定修改谁，Body 决定修改什么。不要信任请求体里的 id 覆盖路径 ID；本实现只写入 name 和 email。

## 5. Service 的替换逻辑

先在数组里查找对象，不存在抛 NotFoundException，存在则对两个可编辑字段重新赋值并返回副本。

```typescript
user.name = input.name;
user.email = input.email;
return { ...user };
```

本课的类型约束要求两个字段都存在，但并未完成运行时强制检查。不要将这个中间教学快照作为已经完成输入校验的 API。完整检查会在后续快照加入。

## 6. 部分更新为何判断 undefined

```typescript
if (input.name !== undefined) {
  user.name = input.name;
}
if (input.email !== undefined) {
  user.email = input.email;
}
```

缺少某个属性时通常读取到 undefined，因此保留原值。不要使用 `if (input.name)` 判断字段是否提供：空字符串也是假值，它与“没有提供”并不是一回事。空字符串是否合法，需要独立校验规则。

也不要直接 Object.assign(user, input)，否则容易把未授权字段写入内部对象。先明确允许编辑的字段，再逐一处理。

## 7. ID、引用与请求重试

两种更新都保留原来的 ID，并返回副本。只修改返回结果，不应继续改变内部用户。

相同 PUT 应表达将资源设置成相同状态。当前 PATCH 是将字段设置为指定值，也可以表现为幂等；“计数加一”一类 PATCH 则未必幂等。不能仅因为方法名为 PATCH 就假设它一定能安全重试。

## 8. 测试如何固定语义

Service 测试覆盖完整替换、局部保留、两个方法的未知 ID 和对象隔离。Controller 测试验证 id、input 被正确交给 Service。E2E 验证 PUT 后 GET 一致、PATCH 保留邮箱、额外字段不改变身份，以及不存在时不创建新用户。

检查返回字符串或对象不能替代检查状态码；E2E 才会实际经过 HTTP 路由。

## 9. 动手实验

```powershell
$body = @{ name = 'Renamed' } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/users/1 -ContentType 'application/json' -Body $body
Invoke-RestMethod http://localhost:3000/users/1
```

然后发送包含 name、email 的 PUT，比较两种操作对邮箱的影响。每次实验前确认应用实例是否重启，以及前面实验是否已经修改了数据。

## 10. 验证、Review 与知识边界

提交前执行格式、Lint、单元测试、E2E 和构建。Review 重点：路由 ID 是否唯一决定目标、允许字段是否明确、PATCH 是否保留未提供字段、更新结果是否为副本、未知 ID 是否返回 404。

本课实际结果：格式、Lint、构建通过；单元/边界测试 34/34，E2E 14/14。

HTTP PUT 与 PATCH 语义参考 [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.4) 和 [RFC 5789](https://www.rfc-editor.org/rfc/rfc5789.html#section-2)。Spring 与 Nest 都需要在业务代码中落实这些协议约定，装饰器本身不会替你实现“完整替换”。

## 11. 检查题

1. PUT 和 PATCH 在本项目分别接受哪些字段？
2. 完整更新为什么不要求客户端提交 id？
3. Body 中的 id 和路径 id 冲突时，应如何处理？
4. 可选属性与允许 null 是同一件事吗？
5. 为什么判断 undefined，而不是使用字段的真假值？
6. 直接 Object.assign(user, input) 可能带来什么问题？
7. 相同 PATCH 一定幂等吗？请举两个不同例子。
8. 为什么更新不存在用户不直接创建一个？
9. interface 能保证 PUT 的真实请求一定包含完整字段吗？
10. 应如何测试 PATCH 不会意外清除邮箱？

完成检查后进入 P02-L06：删除用户、幂等性与状态码。
