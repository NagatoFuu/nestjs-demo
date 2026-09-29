# NestJS 企业后台学习指南

> 文档状态：持续完善  
> 后端主线：NestJS  
> 前端配套：Vben Admin Element Plus 版本

## 写在前面

这不是一本要求一次读完的理论教材，而是一份随项目共同成长的学习指南。我们的目标不是让 AI 一次生成完整系统，而是在实现一个可持续演进的企业后台时，真正理解 NestJS、TypeScript、数据库、认证授权、测试和工程化。

每个阶段都遵循同一条学习闭环：

```text
需求分析 → 架构设计 → 文件规划 → 编码 → 测试 → Code Review → 学习总结 → 检查题
```

后端约占学习投入的 70%，前端约占 30%。前端用于验证后端设计并学习真实联调，不会喧宾夺主。

完整的 Phase 下级课程名称和固定编号见 [完整课程目录](完整课程目录.md)。后续每节详细讲义都以该目录为索引持续完善。

---

# 第一篇：学习方法与项目约定

## 第 1 章 学习目标

完成一个前后端分离的企业后台管理系统，核心能力包括：

- 用户、部门、角色、菜单和权限管理
- 登录、登出、Token 刷新和 RBAC
- 字典、参数配置和数据权限
- Redis 缓存和登录状态
- BullMQ 异步任务
- 文件上传、MinIO/S3 和 Excel 导入导出
- Swagger、自动化测试、Docker 和健康检查
- Vben Admin 动态菜单、表格、表单和权限控制

完成项目后，应当能够独立回答三个层次的问题：代码在做什么、框架为什么这样设计、真实项目中何时应该或不应该这样使用。

## 第 2 章 技术栈

### 后端

- Node.js、TypeScript、NestJS
- Prisma、PostgreSQL
- Passport、JWT
- class-validator、class-transformer
- Redis、BullMQ
- Swagger、Jest
- MinIO 或兼容 S3 的对象存储

### 前端

- Vben Admin 的 Element Plus 版本
- Vue 3、Vite、TypeScript
- Pinia、Vue Router
- Element Plus
- 项目内置请求、表格和表单能力优先

### 工程化

- pnpm workspace（在初始化项目时确认）
- Docker Compose
- ESLint、Prettier
- 环境变量分层
- OpenAPI，以及后续按需生成前端 API 类型

具体版本在真正初始化时依据官方兼容矩阵确定并锁定，不在规划阶段猜测版本号。

## 第 3 章 开发原则

1. 每次只完成一个边界明确的任务。
2. 编码前说明目标、知识点、文件变化和设计理由。
3. 理论随功能出现，做到哪里学到哪里。
4. Controller 负责协议适配，Service 负责业务逻辑，数据访问保持明确边界。
5. 使用 TypeScript 严格模式，不滥用 `any`。
6. 重要逻辑适量注释，不逐行解释显而易见的代码。
7. 不为了架构漂亮提前引入 DDD、CQRS 或无业务价值的抽象。
8. 错误处理遵循“现象 → 原因 → 定位 → 最小修改 → 验证”。
9. 每个阶段完成后进行复盘和 5～10 道检查题。
10. 前端隐藏按钮不等于安全，最终权限必须由后端校验。

## 第 4 章 工作区与目录边界

```text
apps/server       NestJS 应用
apps/web          Vben Admin Element Plus 应用
packages/contracts 可选的前后端共享类型或生成产物
infra             Docker、Nginx 等部署配置
docs              本指南、阶段讲义、复盘和技术决策
```

NestJS 内部目录将在业务出现后逐步形成：

```text
apps/server/src/
├── common/       # 跨业务的 Guard、Filter、Interceptor 等
├── config/       # 配置加载与校验
├── database/     # Prisma 等数据库基础设施
├── modules/      # auth、user、role 等业务模块
├── shared/       # 确有共享价值的 Provider
├── app.module.ts
└── main.ts
```

Vben 内部遵循其 Element Plus 版本的实际结构，不预先发明另一套框架。普通业务不得通过修改框架核心代码实现。

---

# 第二篇：基础与第一个 API

## Phase 0 环境、工具与项目认知

### 学习目标

- 理解 Node.js、pnpm、TypeScript 和 Nest CLI 的关系
- 理解 HTTP、REST 和前后端分离
- 学会读懂 `package.json`、`tsconfig.json` 和环境变量
- 初始化 NestJS 应用并掌握启动、构建和测试命令

### 阶段项目

- 初始化 `apps/server`
- 接通 PostgreSQL 的开发环境
- 确认启动、构建和测试基线
- 记录首个技术决策和环境说明

### 完成标准

- 能解释 NestJS 从入口到模块加载的基本过程
- 项目可启动、可构建、默认测试可运行
- 不提交密钥和本机专属配置

## Phase 1 NestJS 核心基础

### 学习目标

- Module、Controller、Service、Provider
- Dependency Injection 和 Decorator
- NestJS 应用启动与模块装配

### 阶段项目

- 实现 Hello API
- 建立第一个独立业务模块
- 通过浏览器或 API 工具验证响应

### 核心问题

- Controller 为什么不承载复杂业务逻辑？
- Provider 如何被容器创建和复用？
- Module 的 imports、controllers、providers、exports 各自解决什么问题？

---

# 第三篇：REST API 与数据校验

## Phase 2 内存版 User CRUD

学习 REST 路由、HTTP 状态码、`@Param()`、`@Query()`、`@Body()` 和异步编程，实现：

```text
GET    /users
GET    /users/:id
POST   /users
PUT    /users/:id
DELETE /users/:id
```

先用内存数据聚焦 NestJS 分层，不让数据库知识干扰框架基础学习。

## Phase 3 DTO 与参数校验

学习 DTO、ValidationPipe、class-validator、class-transformer、白名单过滤、类型转换和分页查询，实现：

- CreateUserDto
- UpdateUserDto
- QueryUserDto
- 全局 ValidationPipe
- 可理解的校验错误响应

重点理解：TypeScript 类型只存在于编译期，不能代替运行时输入校验。

---

# 第四篇：数据库与领域关系

## Phase 4 Prisma 与 PostgreSQL

学习 Schema、Migration、Seed、Relation、Index、Transaction 和 Prisma Client。

首批模型：

```text
Department 1 ── N User
User       N ── N Role
Role       N ── N Permission
Role       N ── N Menu
```

把内存版 User CRUD 替换成真实数据库实现，并讨论 DTO、领域数据和持久化模型的边界。

## Phase 5 核心业务模块

依次建立：

- 用户管理
- 部门管理
- 角色管理
- 菜单管理
- 权限管理

同时学习唯一性约束、软删除、分页、排序、筛选、树形数据和事务边界。

---

# 第五篇：Vben Admin 前端入门

## Phase 6 Vben Admin Element Plus 基础

### 学习目标

- Vue 3 Composition API 和 `<script setup>`
- Vite 环境变量
- Vue Router 和 Pinia
- Element Plus
- Vben 的布局、路由、菜单、请求、表格和表单约定

### 阶段项目

- 初始化 `apps/web`
- 配置开发环境 API 地址
- 调用 Hello API 和用户列表接口
- 理解 Vben 的框架层与业务层边界

## Phase 7 第一个前后端 CRUD

完成用户管理页面：查询、分页、新增、编辑、删除和状态切换。

```text
Vben 页面 → API 模块 → NestJS Controller → Service → Prisma → PostgreSQL
```

重点学习前后端类型对应、表单校验、错误反馈和列表状态刷新。

---

# 第六篇：认证与权限

## Phase 8 NestJS 登录与 JWT

学习密码哈希、Passport、Strategy、Guard、Access Token、Refresh Token 和当前用户上下文，实现：

```text
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/profile
```

安全底线包括：不保存明文密码、不记录 Token、Refresh Token 可撤销、区分未认证和无权限。

## Phase 9 Vben 登录接入

学习登录状态、请求/响应拦截、自动携带 Token、并发刷新、路由守卫和退出清理，完成真实前后端登录闭环。

## Phase 10 NestJS RBAC

学习 Custom Decorator、Guard、Reflector 和 Metadata，实现：

```typescript
@Public()
@Roles()
@Permissions()
@CurrentUser()
```

## Phase 11 Vben 动态菜单与按钮权限

从后端获取菜单并生成动态路由，根据权限码控制操作入口。始终区分：菜单是入口、路由是页面、权限是操作；后端 Guard 才是最终安全边界。

---

# 第七篇：请求生命周期与接口规范

## Phase 12 NestJS 请求生命周期

围绕真实需求理解：

```text
Middleware → Guard → Interceptor → Pipe → Controller → Service → Exception Filter
```

实现请求 ID、请求日志、参数转换、权限校验、统一响应和统一异常。

## Phase 13 Swagger 与 API 契约

完善 API 分类、DTO 文档、Bearer Token、请求示例、返回模型和错误响应，使 Swagger 能直接测试核心接口。

在接口稳定后评估从 OpenAPI 生成前端 TypeScript 类型，避免手工维护两份契约。

---

# 第八篇：缓存与完整后台模块

## Phase 14 Redis

学习数据结构、TTL、Key 设计、缓存一致性、Token 状态和限流思想，实现登录状态、验证码和热点数据缓存。

## Phase 15 完整系统管理

按“模型 → 后端 → 文档 → 测试 → 页面 → 联调 → 复盘”依次完善：

1. 用户管理
2. 部门管理
3. 角色管理
4. 菜单管理
5. 权限管理
6. 字典管理
7. 参数配置

前端在此阶段学习树形表格、树选择、权限树、动态表单、字典渲染和批量操作。

---

# 第九篇：任务、文件与 Excel

## Phase 16 BullMQ 异步任务

学习 Queue、Job、Worker、Retry、Backoff、幂等性和失败处理，实现邮件、报表或文件处理任务以及前端进度展示。

## Phase 17 文件与对象存储

学习 Multipart、Multer、Stream、MIME、MinIO/S3 和授权下载，实现上传、下载、删除、文件信息及用户头像。

必须验证文件大小、真实类型、文件名和访问权限，防止路径穿越和恶意上传。

## Phase 18 Excel 导入导出

实现导入模板、批量校验、错误行报告、条件导出和大数据异步导出。避免在 HTTP 请求中同步处理超大文件。

---

# 第十篇：质量与交付

## Phase 19 自动化测试

学习 Jest、Mock、TestingModule、Unit Test、Integration Test 和 E2E Test。测试优先级：Auth、Permission、User、Token 刷新、数据权限和关键业务规则。

前端按收益选择 Vitest 和 Vue Test Utils，不为覆盖率数字编写低价值测试。

## Phase 20 Docker 与生产部署

学习 Dockerfile、Compose、多阶段构建、环境变量、迁移、健康检查和日志，最终编排：

```text
Vben Admin / Nginx
NestJS API
PostgreSQL
Redis
MinIO
BullMQ Worker
```

## Phase 21 高级架构

仅当现有复杂度产生真实痛点时再学习 Repository Pattern、CQRS、Domain Event、Clean Architecture、DDD 或微服务。

触发条件包括：Service 明显过大、业务规则严重重复、模块耦合、难以测试或跨系统协作复杂。

---

# 第十一篇：每次任务的固定模板

## 1. 任务理解

简要说明这次要实现什么，以及明确不做什么。

## 2. 学习目标

只列出与当前任务直接相关的 NestJS、TypeScript、数据库或前端知识。

## 3. 设计方案

说明模块职责、调用关系、数据流、主要方案、备选方案以及选择理由。

## 4. 文件规划

列出新增、修改和删除的文件，并解释它们所属的职责边界。

## 5. 实现

直接修改项目文件，小步完成，不一次引入无关功能。

## 6. 测试方法

给出命令、URL、请求参数、预期结果，并实际执行适当的检查。

## 7. Code Review

检查 NestJS 规范、职责、严格类型、重复、安全、错误处理、测试和是否过度抽象。

## 8. 学习总结

总结今天学会的内容、NestJS 核心概念、与 Java Spring 的异同、遗留问题和下一步。

## 9. 学习检查

每个 Phase 结束后给出 5～10 道题；回答错误时解释原因，再进入下一阶段。

---

# 第十二篇：近期执行路线

先完成以下七个里程碑：

1. 初始化 NestJS 并理解目录和启动过程
2. 实现 Hello API
3. 实现内存版 User CRUD
4. 加入 DTO 和参数校验
5. 接入 PostgreSQL 与 Prisma
6. 完成数据库版 User CRUD
7. 初始化 Vben Admin Element Plus 并接入用户列表

每个里程碑只在上一阶段验收并完成学习检查后继续。

---

# 附录 A：文档的持续完善规则

- 本指南保存稳定的学习路线、原则和最终知识体系。
- `docs/phases/` 保存每阶段展开后的讲义、代码导读、检查题和复盘。
- `docs/decisions/` 保存会长期影响项目的技术选择，避免只记录结论、不记录理由。
- `docs/学习进度.md` 只记录进度、证据、问题和下一步，不复制整篇指南。
- 技术版本、命令和目录以项目实际状态为准，变更后同步修订相关章节。
- 新需求先判断属于现有 Phase 还是需要新增章节，避免路线不断碎片化。

# 附录 B：阶段完成定义

一个 Phase 只有同时满足以下条件才算完成：

- 目标功能可以运行
- 相关构建或测试通过
- 关键错误路径得到验证
- 完成 Code Review
- 文档与实际实现一致
- 完成学习总结
- 完成阶段检查题
