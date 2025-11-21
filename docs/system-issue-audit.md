# 系统隐患排查（流式改造后初步梳理）

> 目的：记录当前代码中的潜在风险，便于后续优化与修复。

## 1) 流式章节生成未携带对话历史，故事连续性可能缺失
- 位置：`src/services/modules/functional/ContentGenerator.ts` → `generateNextChapterStream` 调用 `aiModelService.callAIStream(..., [], undefined, options.onToken)`，明确传入空的 `conversationHistory`。
- 影响：与非流式路径不同，模型无法看到之前的对话/摘要，只基于当前 `state` 构造 prompt，长篇故事的情节衔接会失去上下文；总结/压缩的价值被浪费。
- 建议：复用 `conversationManager.getHistory()` 和摘要 `summaryManager`，在流式调用中同样注入历史；必要时提供开关控制上下文长度。

## 2) 流式调用仅兼容 OpenAI SSE 形态，未做提供商能力检测/回退
- 位置：`src/services/unifiedAIService.ts` → `callAIProviderStream` 按 OpenAI `data: {choices[0].delta.content}` 解析。
- 影响：对不支持 SSE 或格式不同（如 Claude、部分自建/代理模型）的提供商会直接抛错，当前没有降级到非流式或关闭流式的逻辑。
- 建议：按提供商能力开关流式；解析时适配不同字段（如 Anthropic 的 `content_block_delta`）；失败时自动退回非流式调用而不是报错。

## 3) 流式计费/usage 估算粗糙，余额校验与扣费可能失真
- 位置：`src/services/unifiedAIService.ts` → `makeRequestStream` 使用 `maxTokens` 与 `fullText.length/4` 粗略估算，扣费直接调用 `deductCreditsAndLog`。
- 影响：可能出现过度或不足扣费，尤其在输出超长/超短、或模型实际 token 计算方式不同的情况下，账务与 UI 显示不一致。
- 建议：若提供商返回 usage 则解析并使用；否则改为在流结束后基于 tokenizer 估算；或限制流式仅用于体验显示、不计费，改用非流式小 JSON 计费。

## 4) 初始化流式路径提前关闭 loading，可能出现短时“空白页面+生成中”视觉
- 位置：`src/components/StoryManager.tsx` → `initializeStory` 里在收到流式回调前设置 `setIsLoading(false)`，并用占位 `currentStory`。
- 影响：若网络/模型延迟，用户可能看到空内容页面，且流式文本尚未到达；失败时占位故事可能短暂显示。
- 建议：在首个 token 到达或元数据就绪后再结束 loading；或展示明确的“流式生成中”骨架 UI。

## 5) 流式路径缺少成功/失败分支的状态收敛
- 位置：`src/components/StoryManager.tsx` → `generateNextChapterWithRetry` 设置 `setIsStreaming(true)`，但部分异常路径仅在 `finally` 关闭；若上层因未捕获异常提前 return，`isStreaming` 可能保持 true。
- 影响：前端可能误判为仍在流式生成，遮挡后续打字机/选项流程。
- 建议：在所有 return/throw 分支前收敛 `setIsStreaming(false)`，或使用 `try/finally` 包裹流式状态。

---

以上为当前排查到的主要隐患，建议按严重程度：1 > 2 > 3 > 5 > 4 逐步修复和验证。***
