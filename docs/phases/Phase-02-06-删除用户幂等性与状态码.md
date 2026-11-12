# P02-L06：删除用户、幂等性与状态码

## 1. 目标与快照

从 `course-p02-l05` 出发，实现 DELETE /users/:id。课程标签为 `course-p02-l06`。删除成功返回 204 且无响应体，目标不存在返回 404。完成后，内存版 User CRUD 的正常操作链路已经齐备。

## 2. 先固定删除契约

```text
DELETE /users/1   → 204，无响应体
GET /users/1      → 404，已不存在
DELETE /users/1   → 404，重复删除
GET /users       → 200，返回剩余用户
```

重复删除可以设计成 204，也可以像本项目这样返回 404。重点是明确一致的契约，并让客户端知道哪些结果意味着目标已不存在。

## 3. 为什么用 findIndex

```typescript
remove(id: string): void {
  const index = this.users.findIndex((user) => user.id === id);
  if (index === -1) {
    throw new NotFoundException(`User ${id} not found`);
  }

  this.users.splice(index, 1);
}
```

findIndex 返回位置，找不到时为 -1；find 返回元素或 undefined。删除时需要位置，所以使用 findIndex。

不能写 `if (!index)`：第一个元素的位置是 0，0 是假值，而 -1 却是真值。这会把存在的首个用户误判为不存在。

## 4. 为什么必须先检查 -1

`splice(index, 1)` 在原数组中删除一个元素。若 index 是 -1，splice 会从末尾计算位置，可能删除最后一个无关用户。

因此“不存在时不影响其他用户”是本课的重要测试，而不只是检查抛了某个异常。任何写操作都应同时考虑失败时是否保留原状态。

readonly 字段限制数组引用重新赋值，但允许数组内部执行 splice。这个实现再次验证上一课对引用与内容的区分。

## 5. Controller 设置 204

```typescript
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
remove(@Param('id') id: string): void {
  this.userService.remove(id);
}
```

相关装饰器与 HttpStatus 来自 @nestjs/common。Nest 的 DELETE 正常返回默认是 200，本项目显式设置 204。void 表示方法不返回有意义的数据，但仅写 void 并不会自动配置 HTTP 状态码。

204 不能携带 JSON 或“删除成功”字符串。若 API 希望返回删除结果，可以选择 200 并定义响应体。

## 6. 幂等为什么不要求响应相同

第一次删除后，目标不存在；第二次重复删除后，目标仍不存在。多次相同请求的预期效果，与执行一次相同，所以仍符合幂等语义。

幂等不承诺日志条数一样，也不承诺响应的状态码和内容一样。重试策略应关注操作效果和明确的 API 契约，而不是只比较响应文本。

参阅 [HTTP 幂等方法](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2) 和 [204 定义](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.5)。

## 7. 删除与 ID 分配的关系

删除用户 2 后，当前数组长度为 1，但创建新用户仍应分配 ID '3'。计数器不随删除回退，也不依赖当前数组长度。

这避免新用户复用刚删除用户的地址。内存计数器依旧仅适用于当前示例进程，不能保证应用重启后的全球唯一性。

## 8. 空集合不是错误

删除所有用户后，`GET /users` 仍表示成功查询集合，应返回 200 和 []。详情地址找不到指定用户，才返回 404。

当前可以通过真正的删除接口构造空集合，因此本课新增了这条 E2E，补齐前面只有理论契约的情况。

## 9. 测试设计与动手实验

Service 测试覆盖：只删除目标、未知 ID 不误删、删除后不复用 ID。Controller 测试覆盖：ID 委托与无返回值。E2E 覆盖：空 204、删除后读取失败、重复删除不会伤及其他用户、清空列表和后续创建。

```powershell
curl.exe -i -X DELETE http://localhost:3000/users/1
curl.exe -i http://localhost:3000/users/1
curl.exe -i -X DELETE http://localhost:3000/users/1
```

观察响应头与空响应体。确认操作对象属于当前练习实例，因为删除会改变其内存状态。

## 10. Review 与验证

提交前执行格式、Lint、单元测试、E2E 和构建。检查点：-1 是否显式处理、是否正确区分位置 0、是否保护其他用户、204 是否无响应体、删除后是否保留 ID 计数器的单调性。

本课实际结果：格式、Lint、构建通过；单元/边界测试 38/38，E2E 18/18。

当前直接物理删除数组项。软删除、关联引用和事务约束属于后续真实业务建模，不因本课删除成功就自动成立。

## 11. 检查题

1. find 与 findIndex 的返回值分别是什么？
2. 为什么 `if (!index)` 判断会出错？
3. splice(-1, 1) 会发生什么，如何避免？
4. readonly 为什么仍允许 splice？
5. void 和 @HttpCode(204) 分别控制哪一层？
6. 返回 204 后还能返回“删除成功”JSON 吗？
7. 第一次 204、第二次 404 为什么仍然幂等？
8. 删除用户后为什么不把 nextId 减一？
9. 删除所有用户后列表和详情查询分别应如何响应？
10. 怎样测试删除失败没有误伤其他数据？

下一课 P02-L07 集中处理基础输入错误与用户不存在的语义。
