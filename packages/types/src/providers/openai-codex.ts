import type { ModelInfo } from "../model.js"

/**
 * OpenAI Codex Provider
 *
 * This provider uses OAuth authentication via ChatGPT Plus/Pro subscription
 * instead of direct API keys. Requests are routed to the Codex backend at
 * https://chatgpt.com/backend-api/codex/responses
 *
 * Key differences from openai-native:
 * - Uses OAuth Bearer tokens instead of API keys
 * - Subscription-based pricing (no per-token costs)
 * - Limited model subset available
 * - Custom routing to Codex backend
 */

export type OpenAiCodexModelId = keyof typeof openAiCodexModels

export const openAiCodexDefaultModelId: OpenAiCodexModelId = "gpt-5.4"

/**
 * Models available through the Codex OAuth flow.
 * These models are accessible to ChatGPT Plus/Pro subscribers.
 * Costs are 0 as they are covered by the subscription.
 */
export const openAiCodexModels = {
	"gpt-5.4": {
		maxTokens: 128000,
		contextWindow: 258000,
		supportsNativeTools: true,
		defaultToolProtocol: "native",
		includedTools: ["apply_patch"],
		excludedTools: ["apply_diff", "write_to_file"],
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
		reasoningEffort: "medium",
		inputPrice: 0,
		outputPrice: 0,
		supportsTemperature: false,
		description: "GPT-5.4: Latest frontier agentic coding model via ChatGPT subscription",
	},
	"gpt-5.4-mini": {
		maxTokens: 128000,
		contextWindow: 258000,
		supportsNativeTools: true,
		defaultToolProtocol: "native",
		includedTools: ["apply_patch"],
		excludedTools: ["apply_diff", "write_to_file"],
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
		reasoningEffort: "medium",
		inputPrice: 0,
		outputPrice: 0,
		supportsTemperature: false,
		description: "GPT-5.4 Mini: Smaller frontier agentic coding model via ChatGPT subscription",
	},
	"gpt-5.3-codex": {
		maxTokens: 128000,
		contextWindow: 258000,
		supportsNativeTools: true,
		defaultToolProtocol: "native",
		includedTools: ["apply_patch"],
		excludedTools: ["apply_diff", "write_to_file"],
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
		reasoningEffort: "medium",
		inputPrice: 0,
		outputPrice: 0,
		supportsTemperature: false,
		description: "GPT-5.3 Codex: Frontier Codex-optimized agentic coding model via ChatGPT subscription",
	},
	"gpt-5.2-codex": {
		maxTokens: 128000,
		contextWindow: 258000,
		supportsNativeTools: true,
		defaultToolProtocol: "native",
		includedTools: ["apply_patch"],
		excludedTools: ["apply_diff", "write_to_file"],
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
		reasoningEffort: "medium",
		inputPrice: 0,
		outputPrice: 0,
		supportsTemperature: false,
		description: "GPT-5.2 Codex: Frontier agentic coding model via ChatGPT subscription",
	},
	"gpt-5.2": {
		maxTokens: 128000,
		contextWindow: 258000,
		supportsNativeTools: true,
		defaultToolProtocol: "native",
		includedTools: ["apply_patch"],
		excludedTools: ["apply_diff", "write_to_file"],
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
		reasoningEffort: "medium",
		inputPrice: 0,
		outputPrice: 0,
		supportsTemperature: false,
		description: "GPT-5.2: Optimized for professional work and long-running agents via ChatGPT subscription",
	},
	"gpt-5.1-codex-max": {
		maxTokens: 128000,
		contextWindow: 258000,
		supportsNativeTools: true,
		defaultToolProtocol: "native",
		includedTools: ["apply_patch"],
		excludedTools: ["apply_diff", "write_to_file"],
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
		reasoningEffort: "xhigh",
		inputPrice: 0,
		outputPrice: 0,
		supportsTemperature: false,
		description: "GPT-5.1 Codex Max: Codex-optimized model for deep and fast reasoning via ChatGPT subscription",
	},
	"gpt-5.1-codex-mini": {
		maxTokens: 128000,
		contextWindow: 258000,
		supportsNativeTools: true,
		defaultToolProtocol: "native",
		includedTools: ["apply_patch"],
		excludedTools: ["apply_diff", "write_to_file"],
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoningEffort: ["medium", "high"],
		reasoningEffort: "medium",
		inputPrice: 0,
		outputPrice: 0,
		supportsTemperature: false,
		description:
			"GPT-5.1 Codex Mini: Optimized for Codex. Cheaper, faster, but less capable via ChatGPT subscription",
	},
} as const satisfies Record<string, ModelInfo>
