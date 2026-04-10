// npx vitest run api/providers/__tests__/openai-codex.spec.ts

import { OpenAiCodexHandler } from "../openai-codex"

describe("OpenAiCodexHandler.getModel", () => {
	it.each([
		["gpt-5.4", "medium"],
		["gpt-5.4-mini", "medium"],
		["gpt-5.3-codex", "medium"],
		["gpt-5.2-codex", "medium"],
		["gpt-5.2", "medium"],
		["gpt-5.1-codex-max", "xhigh"],
		["gpt-5.1-codex-mini", "medium"],
	])("should return specified model when a valid model id is provided: %s", (apiModelId, expectedReasoningEffort) => {
		const handler = new OpenAiCodexHandler({ apiModelId })
		const model = handler.getModel()

		expect(model.id).toBe(apiModelId)
		expect(model.info).toBeDefined()
		expect(model.info.reasoningEffort).toBe(expectedReasoningEffort)
	})

	it("should fall back to default model when an invalid model id is provided", () => {
		const handler = new OpenAiCodexHandler({ apiModelId: "not-a-real-model" })
		const model = handler.getModel()

		expect(model.id).toBe("gpt-5.4")
		expect(model.info).toBeDefined()
	})

	it.each([
		"gpt-5.4",
		"gpt-5.4-mini",
		"gpt-5.3-codex",
		"gpt-5.2-codex",
		"gpt-5.2",
		"gpt-5.1-codex-max",
		"gpt-5.1-codex-mini",
	])("should use a 258k context window for %s", (apiModelId) => {
		const handler = new OpenAiCodexHandler({ apiModelId })
		const model = handler.getModel()

		expect(model.info.contextWindow).toBe(258000)
	})

	it("should expose the requested reasoning levels for gpt-5.4", () => {
		const handler = new OpenAiCodexHandler({ apiModelId: "gpt-5.4" })
		const model = handler.getModel()

		expect(model.id).toBe("gpt-5.4")
		expect(model.info.supportsReasoningEffort).toEqual(["low", "medium", "high", "xhigh"])
	})

	it("should expose only medium and high reasoning for gpt-5.1-codex-mini", () => {
		const handler = new OpenAiCodexHandler({ apiModelId: "gpt-5.1-codex-mini" })
		const model = handler.getModel()

		expect(model.id).toBe("gpt-5.1-codex-mini")
		expect(model.info.supportsReasoningEffort).toEqual(["medium", "high"])
	})
})
