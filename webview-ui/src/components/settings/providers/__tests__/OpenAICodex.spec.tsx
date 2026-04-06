import { fireEvent, render, screen } from "@/utils/test-utils"

import { OpenAICodex } from "../OpenAICodex"

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (_key: string, options?: Record<string, any>) => options?.defaultValue ?? _key,
	}),
}))

const { postMessageMock } = vi.hoisted(() => ({
	postMessageMock: vi.fn(),
}))

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: postMessageMock,
	},
}))

vi.mock("../../ModelPicker", () => ({
	ModelPicker: () => <div data-testid="model-picker" />,
}))

vi.mock("../OpenAICodexRateLimitDashboard", () => ({
	OpenAICodexRateLimitDashboard: () => <div data-testid="rate-limit-dashboard" />,
}))

describe("OpenAICodex", () => {
	beforeEach(() => {
		postMessageMock.mockClear()
	})

	it("posts a profile-scoped sign in request", () => {
		render(
			<OpenAICodex
				apiConfiguration={{ apiProvider: "openai-codex" }}
				setApiConfigurationField={vi.fn()}
				openAiCodexIsAuthenticated={false}
				profileId="profile-456"
				profileName="Codex Secondary"
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Sign in to OpenAI Codex" }))

		expect(postMessageMock).toHaveBeenCalledWith({
			type: "openAiCodexSignIn",
			values: {
				profileId: "profile-456",
				profileName: "Codex Secondary",
			},
		})
	})

	it("posts a profile-scoped sign out request", () => {
		render(
			<OpenAICodex
				apiConfiguration={{ apiProvider: "openai-codex" }}
				setApiConfigurationField={vi.fn()}
				openAiCodexIsAuthenticated={true}
				profileId="profile-456"
				profileName="Codex Secondary"
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Sign Out" }))

		expect(postMessageMock).toHaveBeenCalledWith({
			type: "openAiCodexSignOut",
			values: {
				profileId: "profile-456",
				profileName: "Codex Secondary",
			},
		})
	})
})
