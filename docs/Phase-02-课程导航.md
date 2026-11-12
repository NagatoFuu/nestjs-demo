# Phase 2：内存版 User CRUD 课程导航

> 本页区分“教材与代码已经准备好”和“学习者已经通过检查”。当前学习停留在 P02-L03，后续内容按要求提前生成。Git 标签表示课程快照，不表示学习者已掌握。

| 课程 | 讲义 | Git 标签 | 学习状态 |
|---|---|---|---|
| P02-L01 | [REST 资源、HTTP 方法与状态码](phases/Phase-02-01-REST资源HTTP方法与状态码.md) | course-p02-l01 | 已通过 |
| P02-L02 | [UserModule 与内存数据模型](phases/Phase-02-02-UserModule的职责与内存数据模型.md) | course-p02-l02 | 已通过 |
| P02-L03 | [用户列表与详情查询](phases/Phase-02-03-用户列表与详情查询.md) | course-p02-l03 | 检查题待完成 |
| P02-L04 | [创建用户与请求 Body](phases/Phase-02-04-创建用户与请求Body.md) | course-p02-l04 | 已预生成，待学习 |
| P02-L05 | [完整与局部更新](phases/Phase-02-05-完整更新局部更新与PUTPATCH取舍.md) | course-p02-l05 | 已预生成，待学习 |
| P02-L06 | [删除、幂等与状态码](phases/Phase-02-06-删除用户幂等性与状态码.md) | course-p02-l06 | 已预生成，待学习 |
| P02-L07 | [基础错误语义](phases/Phase-02-07-NotFoundException与基础错误语义.md) | course-p02-l07 | 已预生成，待学习 |
| P02-L08 | [Controller、Service 与仓库边界](phases/Phase-02-08-ControllerService与内存仓库边界.md) | course-p02-l08 | 已预生成，待学习 |
| P02-L09 | [单元测试与 E2E](phases/Phase-02-09-UserCRUD单元测试与E2E测试.md) | course-p02-l09 | 已预生成，待学习 |
| P02-L10 | [阶段项目、Review 与检查点](phases/Phase-02-10-阶段项目CodeReview与检查点.md) | course-p02-l10 | 已预生成，待学习 |

## 查看课程快照

```powershell
git show course-p02-l04:apps/server/src/modules/user/user.service.ts
git diff course-p02-l07 course-p02-l08 -- apps/server/src/modules/user
git log --oneline --decorate -10
```

L04～L06 保留正常 CRUD 的教学中间状态，基础运行时检查从 L07 加入，数据所有权从 L08 转移到仓库，L09 将真实仓库 Service 测试明确标记为组件测试。阅读历史讲义时，以相应标签的实现为准。

## 最终代码入口

- HTTP：apps/server/src/modules/user/user.controller.ts。
- 业务：apps/server/src/modules/user/user.service.ts。
- 存储：apps/server/src/modules/user/in-memory-user.repository.ts。
- 基础输入检查：apps/server/src/modules/user/user-input.validation.ts。
- 完整场景：apps/server/test/user-crud.e2e-spec.ts。
- 生产入口验收：apps/server/scripts/smoke-phase2.ps1。

学习通过情况以 [学习进度](学习进度.md) 为准。后续答题后再同步本页状态。
