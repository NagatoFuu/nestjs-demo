# P02-L10：阶段项目、Code Review 与检查点

## 1. 阶段项目目标

从 `course-p02-l09` 出发，对内存版 User CRUD 做完整交付验收。课程快照为 `course-p02-l10`。本课不继续添加业务端点，而是验证既有契约、生产构建入口、模块边界和文档一致性。

代码和讲义可以提前生成；学习完成仍要求学习者逐课阅读、实验、回答检查题并订正。本次不将 Phase 2 标记为学习完成，也不自动进入 Phase 3。

## 2. 最终接口契约

| 方法与路径 | 输入 | 成功 | 关键失败 |
|---|---|---|---|
| GET /users | 无 | 200 + 数组 | 未预期故障 500 |
| GET /users/:id | 字符串 ID | 200 + 用户 | 不存在 404 |
| POST /users | name、email | 201 + 新用户 | 输入非法 400 |
| PUT /users/:id | 完整 name、email | 200 + 用户 | 不存在 404；输入非法 400 |
| PATCH /users/:id | 至少一个可编辑字段 | 200 + 用户 | 不存在 404；输入非法 400 |
| DELETE /users/:id | 字符串 ID | 204 + 空体 | 不存在 404 |

创建和更新只保存允许字段，忽略额外字段。字符串 ID 精确匹配。email 当前只检查非空字符串，不验证邮箱语法或唯一性。PUT/PATCH 对未知 ID 优先返回 404。

## 3. 最终结构

```text
AppModule
└─ UserModule
   ├─ UserController → HTTP 路由与输入
   ├─ UserService → 检查、编排与错误映射
   ├─ InMemoryUserRepository → 数组、计数器、存取与副本
   ├─ user-input.validation → 基础运行时检查
   └─ User 与输入 interfaces → 编译期结构
```

Provider 均保持默认作用域，Service 和仓库不向外部模块 exports。没有全局可变数组，没有 Controller 自行 new 仓库，也没有同一组件多处重复注册来假装共享状态。

## 4. 用测试证明模块公开面

新增 user.module.spec.ts。第一类测试在另一个导入 UserModule 的模块中声明消费方，尝试注入内部 Service 或仓库，应出现依赖解析失败。这直接验证未 exports 的边界，不混淆 strict 查找语义。

第二类测试从真实 AppModule 选择 UserModule 上下文，取得内部 Service 和仓库，通过 Service 创建数据，再从仓库读取，确认 Service 使用的确实是模块注册的同一个仓库实例。

这些测试固定架构约束。如果以后产生合理的跨模块消费需求，应更新公开 API 与测试，不能只为了让测试通过而随意 exports 全部组件。

## 5. 真实生产入口冒烟测试

E2E 通过 TestingModule 初始化应用；它没有执行 Node 的 dist/main.js 入口。本课提供 scripts/smoke-phase2.ps1，补上这条验证链：

```powershell
# 在 apps/server 下
pnpm build
powershell -NoProfile -File scripts/smoke-phase2.ps1
```

脚本选择临时端口，隐藏启动本次自己的 Node 子进程，实际执行 dist/main.js，通过 HTTP 检查列表、创建、PATCH、PUT、失败不变更、删除、404 与空 204。结束后只停止自己创建的进程，不占用或终止现有开发服务。

脚本改变的仅是它自己启动的应用内存，不会删除源码或现有服务的数据。临时端口探测与启动之间仍可能被其他程序抢占，此时测试会明确失败，可重新执行。

## 6. Code Review 结果

1. 路由前缀与方法组成资源操作，Controller 没有直接操作存储。
2. User 和输入形状分开，HTTP unknown 经实际检查后使用。
3. 失败输入先完整检查，之后才写入和分配 ID。
4. GET 返回副本，更新不暴露内部对象，不允许改变 ID。
5. DELETE 检查未知位置，避免 splice(-1, 1) 误伤其他用户。
6. 400/404 通过异常表达，未预期 500 不泄露内部消息。
7. 测试分层、隔离容器并关闭资源，覆盖完整 CRUD 场景。
8. 抽取具体内存仓库，但没有提前引入复杂领域架构。

## 7. 当前实现的明确边界

- 数据随应用实例重启而丢失，多个进程不会自动共享。
- 计数器是进程内的示例方案，不保证跨进程或重启后的唯一性。
- 不提供认证、授权、数据库、分页、排序、筛选和邮箱唯一约束。
- 运行时检查只是基础版本，不能替代 Phase 3 的完整 DTO 设计。
- 内存同步失败保护不是数据库事务，未来异步并发需要重新评估。
- 当前 User 是扁平字段，浅拷贝不自动隔离未来嵌套对象。

识别这些边界是阶段复盘的一部分，不应把教学实现描述为已完成企业生产要求。

## 8. 按标签学习

所有课程入口见 [Phase 2 课程导航](../Phase-02-课程导航.md)。每个标签都指向该课当时可构建、可测试的快照，后面的快照可能已经迁移了前面介绍的文件位置或方法职责。

```powershell
git show course-p02-l04:apps/server/src/modules/user/user.service.ts
git diff course-p02-l07 course-p02-l08 -- apps/server/src/modules/user
```

这两个命令只读展示，不改变工作区。不要因为当前 main 已到 L10，就误以为 L04 当时已经具备 L07 的输入检查。

## 9. 最终验收命令

```powershell
pnpm format:check
pnpm lint
pnpm exec jest --runInBand
pnpm exec jest --config ./test/jest-e2e.json --runInBand
pnpm build
powershell -NoProfile -File scripts/smoke-phase2.ps1
```

逐项确认 HTTP 契约、模块边界和生产入口。单元覆盖率报告属于 L09 测试快照，不能代替本课新增架构约束的执行结果。

本课实际结果：格式、Lint、构建全部通过；12 个单元/组件套件 80/80、3 个 E2E 套件 29/29 通过。生产冒烟脚本使用临时端口 59211 成功执行真实入口、CRUD、400、404 与空 204，并关闭自身进程。

## 10. 阶段总结与下一阶段连接

现在应能从客户端请求追到 Controller、Service、仓库，再解释正常返回或异常响应；能区分静态类型、运行时输入检查和数据存储规则；能说明测试替身和真实应用各能证明什么。

Phase 3 将围绕 DTO、ValidationPipe、类型转换、白名单和输入错误结构继续完善现有功能，而不是一次性换成陌生架构。数据库仍在 Phase 4。

## 11. Phase 2 最终检查题

1. 用方法、路径、输入位置和状态码完整描述六个 CRUD 接口。
2. 为什么 User、CreateUserInput 和 UpdateUserInput 不应混为一个类型？
3. interface 与 unknown 加运行时检查分别提供什么保证？
4. 解释 POST ID 分配、删除后不复用和重启后的限制。
5. PUT 与 PATCH 如何保留 ID，并区别处理未提供字段？
6. 为什么 204 无响应体，而重复 DELETE 返回 404 仍可幂等？
7. 描述失败输入不能造成部分变更的实现与测试证据。
8. Controller、Service、Repository、错误处理的职责分别是什么？
9. 列出当前各层测试能证明和不能证明的内容，说明生产入口冒烟测试补充了什么。
10. 指出当前实现至少五项边界，并解释下一阶段为什么先学习 DTO。

## 12. 学习完成定义

内容生成、代码验证和标签推送只是教材准备完成。学习者仍需完成 P02-L03～P02-L10 检查题、动手复现关键行为并订正薄弱点，才将 Phase 2 学习状态标记完成。
