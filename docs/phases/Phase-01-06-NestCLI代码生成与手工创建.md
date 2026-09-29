# P01-L06：Nest CLI 代码生成与手工创建的取舍

## 1. 本课要解决的问题

前几课我们手工创建了 GreetingModule、Controller、Service 和测试。本课换一个角度：Nest CLI 能替我们生成哪些内容，生成后还需要人负责什么。

这不是一场“CLI 和手工创建谁更好”的比赛。真正目标是建立一套可控流程：

```text
明确设计 → 预演生成 → 检查变更 → 填写业务逻辑 → 运行验证
```

本课只使用 `--dry-run` 预演，不向生产代码加入临时的 `cli-preview` 功能。

## 2. Nest CLI 的角色

Nest CLI 是项目工具和代码生成入口，常见职责包括：

- 创建 Nest 应用。
- 启动、构建应用。
- 调用 Schematics 生成结构化代码。
- 在 monorepo 中定位项目。

它能生成符合约定的骨架，但不能替你决定业务边界、依赖方向、接口语义和安全规则。

## 3. 为什么使用 `pnpm exec nest`

本项目执行：

```powershell
pnpm exec nest generate --help
```

解析过程是：

```text
pnpm exec
→ 在当前项目依赖中查找 nest 可执行程序
→ 执行 package.json 锁定的 @nestjs/cli 版本
```

相比直接运行全局安装的 `nest`，本地 CLI 更容易保证团队成员和 CI 使用同一版本。`pnpm run build` 等脚本也会自动将本地 `node_modules/.bin` 加入命令查找路径。

## 4. generate 命令结构

```text
nest generate <schematic> <name> [path] [options]
nest g        <schematic> <name> [path] [options]
```

例如：

```powershell
pnpm exec nest g module modules/order
pnpm exec nest g controller modules/order
pnpm exec nest g service modules/order
```

`g` 是 `generate` 的别名。常见 Schematic 及别名：

| 类型 | 别名 | 典型产物 |
|---|---:|---|
| `module` | `mo` | `*.module.ts` |
| `controller` | `co` | Controller 和默认测试 |
| `service` | `s` | Service 和默认测试 |
| `guard` | `gu` | Guard 和默认测试 |
| `pipe` | `pi` | Pipe 和默认测试 |
| `resource` | `res` | 一套 CRUD 骨架 |

命令别名只是少打几个字符，不改变生成结果。学习阶段优先写完整名称，便于阅读命令历史。

## 5. Schematic 是什么

Schematic 可以理解为“带规则的代码模板和变更程序”。它不只是复制文件，还可以：

1. 解析命令参数。
2. 根据命名规则计算路径和类名。
3. 创建源码及测试文件。
4. 查找合适的 Module。
5. 修改 Module 的 `imports`、`controllers` 或 `providers`。

因此，代码生成不是纯文本模板操作；它可能修改已有文件。

## 6. `--dry-run`：先看计划，不落盘

```powershell
pnpm exec nest g module modules/cli-preview --dry-run
```

本项目实际预演结果：

```text
CREATE src/modules/cli-preview/cli-preview.module.ts
UPDATE src/app.module.ts
Dry run enabled. No files written to disk.
```

`--dry-run` 会计算生成操作并显示 `CREATE`、`UPDATE` 等动作，但不写文件。它适合检查：

- 当前工作目录是否正确。
- 名称是否会产生预期的文件名和类名。
- 文件是否落入预期目录。
- CLI 打算修改哪个 Module。
- 是否会生成过多文件。

## 7. Module 生成预演

命令：

```powershell
pnpm exec nest g module modules/cli-preview --dry-run
```

CLI 准备创建 `CliPreviewModule`，并更新 `AppModule` 的 `imports`。这说明它不仅创建文件，还尝试把新模块接入应用模块图。

但“成功自动注册”不代表模块边界设计正确。你仍需判断：

- 该模块是否真属于 AppModule 直接依赖。
- 名称是否表达业务能力。
- 是否应该由另一个聚合模块导入。

## 8. Controller 生成预演

命令：

```powershell
pnpm exec nest g controller modules/cli-preview --dry-run
```

实际计划：

```text
CREATE cli-preview.controller.ts
CREATE cli-preview.controller.spec.ts
UPDATE app.module.ts
```

由于 `cli-preview.module.ts` 并未真的落盘，CLI 在本次独立预演中找不到它，于是计划将 Controller 注册到已有的 AppModule。这揭示了一条重要规则：CLI 根据当前磁盘上已经存在的结构推断注册位置，不会记住上一次 `--dry-run` 的虚拟结果。

如果先真实生成 Module，再生成同目录 Controller，CLI 通常会找到更近的功能模块；仍必须查看变更确认。

## 9. Service 生成预演

命令：

```powershell
pnpm exec nest g service modules/cli-preview --dry-run
```

实际计划：

```text
CREATE cli-preview.service.ts
CREATE cli-preview.service.spec.ts
UPDATE app.module.ts
```

Service 会默认生成测试骨架，并注册为 Provider。测试骨架只验证实例能创建，不等于业务行为已经获得有效测试。

## 10. 默认测试文件与 `--no-spec`

Controller、Service、Guard 等生成器默认创建 `*.spec.ts`。若明确不需要，可使用：

```powershell
pnpm exec nest g controller modules/cli-preview --no-spec
```

判断标准不是“测试文件麻烦不麻烦”，而是：

- 这个类是否有值得独立验证的行为。
- 测试应是单元测试、集成测试还是 E2E。
- 默认骨架是否应被改写为有价值的断言。

不要把 `--no-spec` 当作项目统一省事选项。

## 11. 自动注册与 `--skip-import`

```powershell
pnpm exec nest g controller modules/cli-preview --dry-run --no-spec --skip-import
```

本项目预演只显示：

```text
CREATE src/modules/cli-preview/cli-preview.controller.ts
```

`--skip-import` 阻止 CLI 修改 Module。适用场景：

- 目标模块尚未创建。
- 你准备手工控制装配位置。
- 生成的类暂时不应注册。
- CLI 推断出的 Module 不正确。

代价是你必须自己完成并验证注册，否则文件存在但 Nest 不会装配它。

## 12. `--flat` 与目录结构

`--flat` 强制将文件直接放在指定路径；`--no-flat` 强制建立元素目录。路径和名称组合会影响最终位置，因此生成前应先 dry-run。

目录是否嵌套没有绝对答案。本项目按业务模块组织：

```text
src/modules/greeting/
├─ greeting.module.ts
├─ greeting.controller.ts
├─ greeting.service.ts
└─ ...
```

重点是同一业务能力聚合在一起，而不是盲目追求目录层级最少。

## 13. `resource` 为什么要谨慎使用

本项目执行了：

```powershell
pnpm exec nest g resource modules/cli-preview --dry-run --type rest --crud true --no-spec
```

预演准备创建：

```text
Controller
Service
Module
Create DTO
Update DTO
Entity
```

并准备更新：

```text
package.json
AppModule
```

`resource` 适合快速搭建熟悉的 CRUD 骨架，但一次引入的概念很多。我们会在 Phase 2 先理解 REST 和 User CRUD，在 Phase 3 再学习 DTO 校验；现在不把这套预览代码写入项目。

## 14. 为什么 resource 可能更新 package.json

某些生成产物依赖额外包，例如更新 DTO 可能使用 mapped types。Schematic 会检查并计划补充依赖，所以生成资源不是“只增加 src 文件”。

生成后必须检查 `package.json` 和锁文件，理解新增依赖的用途，不能看到 CLI 自动修改就默认接受。

## 15. CLI 自动做得好的事情

- 统一 kebab-case 文件名和 PascalCase 类名。
- 添加常用装饰器和 import。
- 创建基础测试文件。
- 将 Controller、Provider、Module 注册到元数据。
- 降低重复样板代码的拼写错误。
- 提升团队日常创建标准元素的速度。

这些优势建立在“生成目标清晰且目录符合约定”的前提上。

## 16. CLI 不会替你完成的事情

- 判断模块是否应该存在。
- 定义业务规则和数据一致性。
- 决定 Provider 是否应 exports。
- 选择正确的依赖方向。
- 设计 DTO 字段和安全校验。
- 写出有业务价值的测试断言。
- 保证路由命名和 HTTP 状态码合理。
- 避免所有循环依赖。

CLI 能生成语法结构，架构仍由开发者负责。

## 17. 什么时候优先使用 CLI

以下情况通常适合：

- 新建标准 Module、Controller、Service、Guard 或 Pipe。
- 团队已建立稳定目录和命名约定。
- 希望减少模块元数据漏注册。
- 希望快速获得测试骨架。
- 生成前可以 dry-run，生成后可以审查变更。

## 18. 什么时候优先手工创建

以下情况手工创建更清晰：

- 只需要一个非常小或非标准的文件。
- 目标类不应自动注册到最近的 Module。
- 正在重构，现有结构不能让 CLI 正确推断。
- 需要精确控制 import、Token 和 Provider 配置。
- 学习阶段需要亲手理解每一行的职责。

手工创建并不意味着随意；仍应遵守命名、目录、测试和模块边界规范。

## 19. 推荐的生成工作流

```text
1. 先用一句话说明业务职责
2. 选择目标 Module 和目录
3. 从项目根或 Nest 应用根运行本地 CLI
4. 加 --dry-run 检查 CREATE/UPDATE
5. 确认后去掉 --dry-run 执行
6. 查看所有新增和修改文件
7. 删除无意义模板，补上业务实现与测试
8. 运行 format、lint、test、build
```

当前目录不是 Git 仓库，不能依赖 `git diff` 兜底，因此生成前预演和生成后逐文件核对尤其重要。

## 20. 错误生成后的处理

若路径或名称错了，不要只删除新文件。还要检查：

- 哪个 Module 的数组被修改。
- 是否新增了 import 语句。
- `package.json` 是否新增依赖。
- `pnpm-lock.yaml` 是否变化。
- 测试配置或 CLI 配置是否变化。

有 Git 时可通过差异精确撤销本次改动，但不要用会丢弃其他工作区修改的破坏性命令。无 Git 时应按生成输出逐项反向检查。

## 21. 常见错误与定位

### 生成到了错误目录

检查运行命令时的当前目录、`nest-cli.json` 的 `sourceRoot`、命令中的 name/path，以及 `--flat` 设置。

### 注册到了 AppModule 而不是功能模块

检查目标功能模块是否已经真实存在、文件名能否被 Schematic 识别、生成路径是否位于该模块附近。必要时使用 `--skip-import` 后手工注册。

### 文件存在但路由不生效

检查 Controller 是否进入某个已加载 Module 的 `controllers`，该 Module 是否最终被 AppModule 导入。

### 文件存在但依赖无法注入

检查 Provider 是否进入 `providers`，跨模块时再检查 `exports` 和 `imports`。CLI 生成不会改变上一课的可见性规则。

## 22. CLI 与手工创建对照

| 维度 | CLI 生成 | 手工创建 |
|---|---|---|
| 标准骨架速度 | 快 | 较慢 |
| 命名一致性 | 按模板稳定 | 依赖开发者 |
| 自动注册 | 通常会尝试 | 完全手工 |
| 精确控制 | 需通过参数和修改 | 高 |
| 非标准结构 | 容易推断错误 | 更合适 |
| 学习透明度 | 容易跳过原理 | 有助理解装配 |
| 风险控制 | dry-run + 审查 | 逐项创建 + 审查 |

最佳实践通常是组合使用，而不是固定选择一边。

## 23. 与 Spring 的近似对照

Nest Schematic 类似 IDE 模板、Spring Initializr 和代码生成插件的一部分作用：它们降低初始化成本，但生成结果仍需开发者理解和维护。

两者共同原则是：生成器负责重复结构，人负责领域设计和变更审查。

## 24. 本课动手实验

### 实验 A：查看可用生成器

```powershell
cd D:\nagato\nestjs-demo\apps\server
pnpm exec nest generate --help
```

找出 module、controller、service、resource 的别名。

### 实验 B：预演三个基础元素

```powershell
pnpm exec nest g module modules/cli-preview --dry-run
pnpm exec nest g controller modules/cli-preview --dry-run
pnpm exec nest g service modules/cli-preview --dry-run
```

分别记录 CREATE 和 UPDATE。解释为什么三次独立 dry-run 都可能计划更新 AppModule。

### 实验 C：关闭两个默认行为

```powershell
pnpm exec nest g controller modules/cli-preview --dry-run --no-spec --skip-import
```

确认只剩一个 CREATE。

### 实验 D：观察 resource 的影响范围

```powershell
pnpm exec nest g resource modules/cli-preview --dry-run --type rest --crud true --no-spec
```

只观察，不去掉 `--dry-run`。按“源码创建、依赖修改、模块注册”对输出分类。

## 25. Code Review 清单

1. 命令是否使用项目本地 CLI？
2. 生成前是否确认当前目录和目标路径？
3. 是否先使用 `--dry-run`？
4. CLI 修改的是预期 Module 吗？
5. 是否生成了不需要的 spec 或目录？
6. 自动生成的 imports/providers/controllers 是否合理？
7. 新 Provider 是否真的应当 exports？
8. 默认测试是否已经变成有效业务测试？
9. package.json 的变化是否理解并接受？
10. format、lint、test、build 是否通过？

## 26. 本课检查题

1. 为什么本项目优先执行 `pnpm exec nest`，而不是依赖全局 `nest`？
2. Schematic 与普通复制模板有什么区别？
3. `nest generate` 命令的 schematic、name 和 options 分别控制什么？
4. `--dry-run` 能验证什么，又不能验证什么？
5. 为什么三次独立 dry-run 不会继承前一次预演创建的 Module？
6. Controller 和 Service 默认为什么会生成 spec 文件？
7. `--no-spec` 和 `--skip-import` 分别关闭什么行为？
8. CLI 为什么可能把 Controller 注册到错误的 Module？
9. `resource` 通常会一次生成哪些层？为什么当前不真实生成？
10. CLI 生成之后为什么仍要检查 package.json？
11. 哪些场景优先使用 CLI，哪些场景适合手工创建？
12. 如果误生成了一个功能，为什么不能只删除新建目录？
13. CLI 能否保证模块边界和业务设计正确？为什么？
14. 请复述一遍安全、完整的代码生成工作流。

## 27. 完成标准

- 能解释 CLI、Schematic 与 IoC 装配之间的边界。
- 能安全使用 `generate`、`--dry-run`、`--no-spec`、`--skip-import`。
- 能读懂 CREATE/UPDATE 输出并判断自动注册位置。
- 能说明 CLI 和手工创建各自适用场景。
- 不写入预览代码的前提下完成四组实验。
