import { BaseAgent, Observation, Thought, Action, Tool } from '../core/BaseAgent';
import { StoryState } from '@/services/storyAI';

/**
 * 简单的骰子工具
 */
export class DiceRollerTool implements Tool {
    name = 'dice_roller';
    description = 'Roll dice to determine outcomes. Format: "XdY+Z" (e.g., "1d20+5")';

    async execute(args: { expression: string }): Promise<{ result: number, details: string }> {
        // 简单的实现，实际可以使用更复杂的解析库
        const { expression } = args;
        // 这里简化处理，只支持 d20
        const roll = Math.floor(Math.random() * 20) + 1;
        return {
            result: roll,
            details: `Rolled ${expression}: ${roll}`
        };
    }
}

/**
 * 导演 Agent
 * 负责控制故事节奏、判定检定、生成场景
 */
export class DirectorAgent extends BaseAgent {

    constructor() {
        super('director_001', 'Director', 'Dungeon Master');
        this.registerTool(new DiceRollerTool());
    }

    async perceive(context: { storyState: StoryState, userAction: string }): Promise<Observation> {
        return {
            source: 'game_system',
            content: `Current Scene: ${context.storyState.current_scene}\nUser Action: ${context.userAction}`,
            timestamp: Date.now()
        };
    }

    async think(observation: Observation): Promise<Thought> {
        // 在实际应用中，这里会调用 LLM 进行推理
        // Prompt: "作为导演，分析玩家的行为。如果涉及风险，决定是否需要检定..."

        // 模拟思考过程
        const needsCheck = observation.content.includes('攻击') || observation.content.includes('尝试');

        if (needsCheck) {
            return {
                reasoning: "玩家试图进行危险动作，需要进行敏捷检定。",
                plan: ["使用骰子工具进行检定", "根据结果生成描述"]
            };
        }

        return {
            reasoning: "玩家进行了普通对话或观察，无需检定。",
            plan: ["直接生成回应"]
        };
    }

    async act(thought: Thought): Promise<Action> {
        // 如果计划中包含检定
        if (thought.plan.some(p => p.includes('骰子'))) {
            return {
                type: 'tool_use',
                payload: { tool: 'dice_roller' },
                toolCall: {
                    name: 'dice_roller',
                    arguments: { expression: '1d20' }
                }
            };
        }

        return {
            type: 'generate_content',
            payload: { prompt: 'Generate narrative based on user action...' }
        };
    }
}
