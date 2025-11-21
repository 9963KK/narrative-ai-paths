import { StoryState } from '@/services/storyAI';
import { aiModelService } from '@/services/modules/core/aiModelService';

/**
 * 轻量级 Agent 实现：双步生成模式
 * 
 * 这种模式不需要复杂的 Agent 类结构，而是通过功能分离来实现 Agent 的"思维链"。
 */
export class StoryWriterAgent {

    /**
     * 核心入口：生成下一章
     * 协调 Architect 和 Writer 两个角色的工作
     */
    async generateNextChapter(
        currentState: StoryState,
        userChoice: string
    ): Promise<{ content: string, outline: string }> {

        console.log('🤖 [Agent] Architect 正在构思大纲...');
        // 1. 架构师构思大纲
        const outline = await this.architectDraft(currentState, userChoice);

        console.log('✍️ [Agent] Writer 正在基于大纲写作...');
        console.log('📝 大纲内容:', outline);

        // 2. 作家基于大纲写作
        const content = await this.writerCompose(currentState, userChoice, outline);

        return { content, outline };
    }

    /**
     * 角色 1: Architect (架构师)
     * 职责：规划剧情走向，确保逻辑连贯和戏剧冲突
     */
    private async architectDraft(state: StoryState, choice: string): Promise<string> {
        const prompt = `
      你是一个资深的小说剧情架构师。
      
      【当前情况】
      场景：${state.current_scene.substring(state.current_scene.length - 500)}
      用户选择：${choice}
      当前氛围：${state.mood}
      
      【任务】
      请为下一段剧情设计一个简短的大纲（Outline）。
      
      【要求】
      1. 不要写正文，只列出 3-4 个关键的情节节点。
      2. 必须包含一个小的冲突或转折。
      3. 思考这个选择带来的直接后果和潜在后果。
      4. 保持与前文逻辑的一致性。
      
      请直接输出大纲内容，不要包含其他废话。
    `;

        // 这里复用现有的 AI 服务调用
        // 注意：实际代码中需要适配 aiModelService 的接口
        const response = await aiModelService.generateContent({
            systemPrompt: "你是一个剧情架构师。",
            userPrompt: prompt,
            temperature: 0.7 // 架构师需要一定的逻辑性，温度稍低
        });

        return response.content || "大纲生成失败，将直接进行写作。";
    }

    /**
     * 角色 2: Writer (作家)
     * 职责：将枯燥的大纲转化为生动的小说文本
     */
    private async writerCompose(state: StoryState, choice: string, outline: string): Promise<string> {
        const prompt = `
      你是一个文笔细腻的畅销书作家。
      
      【任务】
      根据提供的【剧情大纲】，扩写成一段精彩的小说正文。
      
      【剧情大纲】
      ${outline}
      
      【上下文】
      前情提要：${state.current_scene.substring(state.current_scene.length - 300)}
      用户刚刚做了选择：${choice}
      
      【写作要求】
      1. 严格遵循大纲的剧情走向。
      2. 使用"展示而非讲述" (Show, Don't Tell) 的技巧。
      3. 加强感官描写（视觉、听觉、触觉）。
      4. 深入刻画角色的心理活动。
      5. 字数控制在 300-500 字之间。
      
      请直接输出小说正文。
    `;

        const response = await aiModelService.generateContent({
            systemPrompt: "你是一个文笔细腻的小说家。",
            userPrompt: prompt,
            temperature: 0.9 // 作家需要更高的创造力
        });

        return response.content || "写作失败。";
    }
}

export const storyWriterAgent = new StoryWriterAgent();
