import { StoryState } from '@/services/storyAI';

/**
 * Agent 的基本观察结果
 */
export interface Observation {
    source: string;
    content: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

/**
 * Agent 的思考过程
 */
export interface Thought {
    reasoning: string;
    plan: string[];
    criticism?: string;
}

/**
 * Agent 的行动
 */
export interface Action {
    type: string;
    payload: any;
    toolCall?: {
        name: string;
        arguments: any;
    };
}

/**
 * 工具接口
 */
export interface Tool {
    name: string;
    description: string;
    execute(args: any): Promise<any>;
}

/**
 * 基础 Agent 类
 */
export abstract class BaseAgent {
    protected id: string;
    protected name: string;
    protected role: string;
    protected tools: Map<string, Tool>;

    constructor(id: string, name: string, role: string) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.tools = new Map();
    }

    /**
     * 注册工具
     */
    registerTool(tool: Tool) {
        this.tools.set(tool.name, tool);
    }

    /**
     * 感知环境
     */
    abstract perceive(context: any): Promise<Observation>;

    /**
     * 思考下一步
     */
    abstract think(observation: Observation): Promise<Thought>;

    /**
     * 执行行动
     */
    abstract act(thought: Thought): Promise<Action>;

    /**
     * 运行一个完整的 Agent 循环
     */
    async runLoop(context: any): Promise<Action> {
        const observation = await this.perceive(context);
        const thought = await this.think(observation);
        const action = await this.act(thought);

        // 如果行动包含工具调用，自动执行
        if (action.toolCall) {
            const tool = this.tools.get(action.toolCall.name);
            if (tool) {
                console.log(`[Agent ${this.name}] Executing tool: ${tool.name}`);
                const result = await tool.execute(action.toolCall.arguments);
                // 工具执行的结果可能需要反馈给 Agent，这里简化处理
                console.log(`[Agent ${this.name}] Tool result:`, result);
            } else {
                console.warn(`[Agent ${this.name}] Tool not found: ${action.toolCall.name}`);
            }
        }

        return action;
    }
}
