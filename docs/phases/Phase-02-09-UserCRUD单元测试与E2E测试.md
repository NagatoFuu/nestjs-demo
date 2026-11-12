# P02-L09：User CRUD 单元测试与 E2E 测试

## 1. 本课定位

前面每课都写测试。本课让测试名称、隔离范围与实际目标对应，并验证完整资源生命周期和意外失败。课程起点为 `course-p02-l08`，快照标签为 `course-p02-l09`。

测试应该能发现具体错误，并在失败时帮助判断是哪一层出了问题。更多断言或更高覆盖率并不自动代表质量更高。

## 2. 当前测试地图

| 文件 | 真实组件 | 替换的组件 | 主要目标 |
|---|---|---|---|
| user-input.validation.spec.ts | 输入检查函数 | 无 | 非法值与允许字段 |
| in-memory-user.repository.spec.ts | 仓库 | 无 | 状态、ID、引用隔离 |
| user.service.spec.ts | Service | 仓库 mock | 输入检查、存储委托、错误映射 |
| user.service.integration.spec.ts | Service + 仓库 | 无 | 业务与真实内存状态共同工作 |
| user.controller.spec.ts | Controller | Service mock | 参数委托与异常传播 |
| test/*.e2e-spec.ts | HTTP 应用 | 常规场景不替换 | 路由、状态、JSON 和生命周期 |

原先使用真实仓库的 Service 测试移到 integration.spec.ts，继续保留所有断言。新的 service.spec.ts 使用仓库 mock。

## 3. 用 TestingModule 提供仓库替身

```typescript
providers: [
  UserService,
  { provide: InMemoryUserRepository, useValue: repositoryMock },
]
```

Service 仍通过构造函数注入接收依赖，但取到测试对象。这能隔离存储算法，检查非法输入是否被拒绝、写入参数是否经过挑选、缺失结果是否正确映射成 404。

mock 本身不能证明真实仓库能够读写数据，后者由仓库测试和组件测试验证。

## 4. 返回值断言与调用参数断言

```typescript
expect(service.update('1', { name: 'New', role: 'admin' })).toBe(user);
expect(updateUser).toHaveBeenCalledWith('1', { name: 'New' });
```

第一句检查 Service 返回仓库结果，第二句检查只传递可编辑字段。即使 mock 总返回同一对象，第二句仍能发现 Service 错误传递 role 的问题。

仅检查调用次数也不能证明参数或结果正确。断言要对应职责，而不是逐行照抄实现。

## 5. 验证失败时没有写入

非法创建除了应抛出 BadRequestException，还必须确保 createUser 没有被调用。这样可以防止先保存再报错。

真实仓库组件测试进一步验证原数据与 ID 没变。mock 与真实仓库测试观察的是不同边界，不互相完全替代。

## 6. 公共 E2E 应用工厂

test/helpers/create-test-app.ts 加载真实 AppModule、compile、创建应用、init，并返回供 Supertest 使用的实例。

每个测试创建独立应用，结束时 close。测试不使用固定 3000 端口，也不要求先运行 pnpm start:dev。当前重新创建容器即可得到新的仓库和计数器，无需添加生产环境的“测试重置接口”。

## 7. 完整资源生命周期

```text
POST /users → 201，新 ID '3'
GET /users/3 → 200
PATCH /users/3 → 200，保留邮箱
PUT /users/3 → 200，完整替换可编辑字段
DELETE /users/3 → 204，空响应体
GET /users/3 → 404
GET /users → 200，两条初始记录
```

单端点测试定位更精确，组合场景发现跨步骤一致性问题。不能因为单个 POST 和 GET 各自通过，就假定它们操作同一份存储。

## 8. 两个应用的数据隔离

第一个应用创建 Carol，第二个应用仍查不到其 ID '3'。第二个创建 Dan 也得到自己的 ID '3'，不会覆盖第一个应用的 Carol。

这证明默认单例的边界是容器中的注册实例，不是“整个电脑只有一个”。额外创建的应用使用 finally 确保关闭。

## 9. 构造可控的 500 场景

user-errors.e2e-spec.ts 使用 overrideProvider 替换仓库，让 findAll 抛出普通 Error。真实 HTTP 响应应是 500 和通用说明，不出现内部敏感字符串。

这是有替身参与的 HTTP 集成测试，不验证真实数据库故障。仅这个测试关闭预期错误日志，生产日志策略没有改变。

## 10. 正确使用覆盖率

```powershell
pnpm exec jest --coverage --runInBand
pnpm exec jest --config ./test/jest-e2e.json --runInBand
```

覆盖率帮助寻找未执行的分支，但不证明断言质量。默认单元覆盖率不会自动合并 E2E，也不代表生产启动入口已经验证。

可手动把删除不存在的判断改错，或临时去掉返回副本，确认相应测试失败，再恢复实现。不要降低断言标准来迁就错误实现。

## 11. Review 与验证

提交前执行格式、Lint、单元覆盖率、E2E 和构建。Review：实例是否隔离、资源是否关闭、mock 是否替换了当前不关心的层、状态码和内容是否都有断言、失败是否保持数据不变。

本课实际结果：格式、Lint、构建通过；11 个单元/组件测试套件，77/77 通过；3 个 E2E 套件，29/29 通过。单元报告全项目行覆盖 96.52%，User 模块行覆盖 100%、分支覆盖 92.68%。main.ts 未在单元测试中执行，报告不代表生产入口已经验收。

参考 [Nest 测试与 Provider 替换](https://docs.nestjs.com/fundamentals/testing)。Supertest 的 HTTP 测试不要求外网或真实数据库。

## 12. 检查题

1. 隔离 Service 测试和 Service+Repository 组件测试有何区别？
2. useValue 与 overrideProvider 如何用于测试？
3. mock 总返回正确对象时，为何仍检查调用参数？
4. 非法输入为何要验证仓库没有被调用？
5. 完整 CRUD 场景能发现哪些跨步骤问题？
6. E2E 为何不要求预先启动 3000 端口？
7. 为什么每个测试创建新应用，结束还要 close？
8. 两个容器都创建出 ID '3' 是否违反当前设计？
9. 故障注入的 500 测试是否验证了真实存储故障？
10. 覆盖率 100% 是否证明业务正确？如何判断一个断言有用？

下一课 P02-L10 完成阶段 Review、接口验收和学习检查。
