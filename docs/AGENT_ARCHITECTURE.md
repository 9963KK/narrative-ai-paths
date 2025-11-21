# 织梦师 (Weaver of Dreams) - Agent 化改造架构文档

## 1. 当前架构分析 vs Agent 架构

### 当前架构 (Traditional LLM App)
目前的项目是一个典型的 **"Prompt-Response"** 循环系统：
1. **输入**: 用户选择 + 历史摘要 + 当前状态。
2. **处理**: 拼接成一个巨大的 Prompt。
3. **输出**: LLM 生成下一段剧情和选项。
4. **状态**: 简单的 JSON 对象更新。

**局限性**:
- **被动性**: 系统完全依赖用户点击推动，缺乏自主性（如 NPC 不会在后台自行活动）。
- **幻觉**: 所有的逻辑（如战斗胜负、物品获得）都由 LLM "编造"，缺乏规则约束。
- **单一视角**: 所有的内容都由一个 "上帝视角" 生成，缺乏不同角色的个性化深度。

### Agent Base 架构 (目标)
Agent 架构的核心在于 **"感知 (Perceive) -> 思考 (Think) -> 行动 (Act)"** 的循环，以及 **工具使用 (Tool Use)**。

我们计划引入 **Multi-Agent (多智能体)** 系统：

1.  **Director Agent (导演/DM)**:
    - 负责掌控全局节奏、氛围、突发事件。
    - **工具**: `DiceRoller` (检定), `WorldState` (修改世界), `ImageGen` (生图)。
    - **职责**: 像跑团的 DM 一样，根据玩家和 NPC 的行动，裁定结果并描述场景。

2.  **NPC Agent (角色)**:
    - 每个主要 NPC 拥有独立的 Agent 实例。
    - **记忆**: 拥有独立的长期记忆（向量数据库）和短期记忆。
    - **性格**: 基于 Persona 定义行为逻辑。
    - **职责**: 在 Director 描述场景后，自主决定如何反应，而不是由 Director "代笔"。

3.  **Player Agent (玩家辅助)**:
    - 分析玩家意图，辅助玩家通过复杂的检定或解谜。

## 2. 核心模块设计

### 2.1 BaseAgent (基类)
所有 Agent 的基类，定义标准接口。

```typescript
interface Agent {
  id: string;
  role: string;
  memory: MemorySystem;
  tools: Tool[];
  
  perceive(environment: WorldState): Promise<Observation>;
  think(observation: Observation): Promise<Plan>;
  act(plan: Plan): Promise<Action>;
}
```

### 2.2 Tool System (工具系统)
Agent 不再只是生成文本，而是通过调用工具来改变状态。

- **DiceRoller**: `roll(expression: string) -> number` (e.g., "1d20+5")
- **KnowledgeBase**: `query(topic: string) -> string` (RAG 检索设定集)
- **StateManager**: `update(key: string, value: any)` (修改剧情状态)

### 2.3 Memory System (记忆系统)
从简单的 `summary` 升级为分层记忆：
- **Short-term**: 当前场景的对话流。
- **Long-term (Episodic)**: 经历过的关键事件（向量检索）。
- **Semantic**: 世界观知识和人物关系。

## 3. 改造路线图

### 第一阶段：引入 Director Agent (当前重点)
将 `StoryAI` 的核心逻辑剥离，创建一个 `DirectorAgent`。
- 它不再直接生成小说文本，而是先进行 **"思考"**：
    - "玩家想攻击这个怪物，我需要检查他的力量属性。"
    - "检定失败，玩家应该受伤。"
- 然后调用 **"工具"** 更新状态。
- 最后生成 **"描述"** 反馈给用户。

### 第二阶段：工具集成
- 实现 `DiceRoller` 工具，让战斗和检定具有随机性和规则感。
- 实现 `WikiSearch` 工具，让 AI 能查阅预设的世界观文档，减少幻觉。

### 第三阶段：NPC 自主化
- 将主要 NPC 独立为 Agent。
- 在生成剧情前，先询问 NPC Agent: "发生了这件事，你会怎么做？"
- 将 NPC 的反应融入剧情。

## 4. 目录结构规划

```
src/
  agents/
    core/
      BaseAgent.ts       # Agent 基类
      AgentMemory.ts     # 记忆系统
    roles/
      DirectorAgent.ts   # 导演 Agent
      NPCAgent.ts        # NPC Agent
    tools/
      Tool.ts            # 工具接口
      DiceRoller.ts      # 骰子工具
      WorldKnowledge.ts  # 设定集检索
```
