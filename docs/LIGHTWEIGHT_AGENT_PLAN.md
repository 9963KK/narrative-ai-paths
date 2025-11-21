# 轻量级 Agent 架构：小说创作流水线 (Writer's Room)

## 1. 核心理念：像作家一样思考，而不是像游戏引擎一样计算

之前的方案偏向 RPG 游戏（掷骰子、状态检定），确实太重且偏离了“小说生成”的核心。
新的方案将 Agent 定义为 **"不同的创作思维模式"**，通过协作来提升文本质量。

我们模拟一个 **"写作室 (Writer's Room)"**，包含两个核心 Agent：

1.  **Architect (架构师/大纲)**：
    *   **职责**：负责"想"。它不写正文，只负责构思下一章的**剧情大纲 (Outline)**、**冲突点**和**伏笔**。
    *   **优势**：避免 AI 写着写着就流水账，保证剧情有起伏。
2.  **Writer (作家/扩写)**：
    *   **职责**：负责"写"。它根据架构师的大纲，专注于**文笔润色**、**心理描写**和**对话细节**。
    *   **优势**：因为有了大纲，Writer 可以专注于文笔，而不是一边想剧情一边写。

## 2. 为什么这个方案实现难度低？

*   **不需要复杂的工具链**：不需要 `DiceRoller`，不需要复杂的 `WorldState` 数据库。
*   **本质是 Prompt Chaining**：只是将原来的一次 API 调用拆成两次。
    *   Step 1: `Input` -> **Architect** -> `Outline`
    *   Step 2: `Outline` + `Input` -> **Writer** -> `Story Content`
*   **代码改动小**：可以直接集成在现有的 `storyAI` 服务中，不需要重构整个项目。

## 3. 实现逻辑

### 流程对比

**当前流程 (单步生成):**
```mermaid
graph LR
    Input[用户选择] --> LLM[AI生成] --> Output[正文]
```
*缺点：AI 容易顾此失彼，要么逻辑通顺但文笔干瘪，要么文笔华丽但剧情崩坏。*

**Agent 流程 (双步生成):**
```mermaid
graph LR
    Input[用户选择] --> Architect[架构师 Agent]
    Architect -->|生成大纲| Outline[剧情大纲]
    Outline --> Writer[作家 Agent]
    Writer --> Output[正文]
```
*优点：逻辑与文笔分离，质量显著提升。*

## 4. 代码示例 (伪代码)

```typescript
class StoryWriterAgent {
  
  // Step 1: 架构师构思
  async draftOutline(context: StoryContext): Promise<string> {
    const prompt = `
      作为剧情架构师，请根据当前剧情和用户选择，设计下一章的大纲。
      要求：
      1. 设计一个意料之外的转折。
      2. 规划 3 个关键的情节节点。
      不要写正文，只写大纲。
    `;
    return await callLLM(prompt);
  }

  // Step 2: 作家扩写
  async writeChapter(outline: string, context: StoryContext): Promise<string> {
    const prompt = `
      作为畅销书作家，请根据以下大纲扩写成精彩的小说正文。
      大纲：${outline}
      要求：
      1. 多用"展示而非讲述" (Show, Don't Tell) 的手法。
      2. 加强环境渲染和心理描写。
    `;
    return await callLLM(prompt);
  }

  // 主入口
  async generate(context: StoryContext) {
    const outline = await this.draftOutline(context);
    const content = await this.writeChapter(outline, context);
    return content;
  }
}
```

## 5. 后续扩展 (可选)

如果未来想进一步提升，可以加入 **Critic (评论家)**：
*   在 Writer 写完后，Critic 检查一遍：“这段对话太生硬了，改一下。”
*   Writer 根据反馈自动修改一次。

这个方案**不需要**重写整个后端，只需要在 `storyAI.ts` 里增加一个中间步骤即可，非常适合当前项目。
