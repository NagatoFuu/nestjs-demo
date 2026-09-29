# NestJS 企业后台学习项目

这是一个以实际项目驱动学习的前后端分离后台管理系统。

- 后端主线：NestJS + TypeScript + Prisma + PostgreSQL
- 前端配套：Vben Admin（Element Plus 版本）
- 基础设施：Redis + BullMQ + MinIO + Docker
- 学习方式：先理解，再设计，再编码，再测试，最后复盘

完整路线、阶段目标和执行规范见 [学习指南](docs/NestJS企业后台学习指南.md)。

Phase 0～21 的全部下级课程名称见 [完整课程目录](docs/完整课程目录.md)。

学习进度和阶段复盘记录在 [学习进度](docs/学习进度.md)。

## 工作区规划

```text
nestjs-demo/
├── apps/
│   ├── server/             # NestJS 后端，Phase 0 初始化
│   └── web/                # Vben Admin Element Plus 前端，Phase 6 初始化
├── packages/
│   └── contracts/          # 后续按需放置生成的 API 类型或共享契约
├── infra/
│   ├── docker/             # Docker 编排及服务配置
│   └── nginx/              # 前端静态资源与反向代理配置
├── docs/
│   ├── NestJS企业后台学习指南.md
│   ├── 学习进度.md
│   ├── decisions/          # 重要技术决策记录
│   └── phases/             # 各阶段的详细讲义和复盘
└── README.md
```

目录只表达稳定边界。具体源码目录将在对应阶段出现时创建，避免为了结构而提前制造空模块。
