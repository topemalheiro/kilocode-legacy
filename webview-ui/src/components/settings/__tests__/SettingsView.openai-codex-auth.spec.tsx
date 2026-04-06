import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { vi, describe, it, expect, beforeEach } from "vitest"

import SettingsView from "../SettingsView"
import { useExtensionState } from "@src/context/ExtensionStateContext"

const { mockPostMessage } = vi.hoisted(() => ({
	mockPostMessage: vi.fn(),
}))

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: mockPostMessage,
	},
}))

vi.mock("@src/context/ExtensionStateContext", () => ({
	ExtensionStateContext: React.createContext<any>(undefined),
	ExtensionStateContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useExtensionState: vi.fn(),
}))

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("@src/components/ui", () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
	Tooltip: ({ children }: any) => <>{children}</>,
	TooltipProvider: ({ children }: any) => <>{children}</>,
	TooltipTrigger: ({ children }: any) => <>{children}</>,
	TooltipContent: ({ children }: any) => <div>{children}</div>,
	StandardTooltip: ({ children }: any) => <>{children}</>,
	AlertDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
	AlertDialogContent: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
	AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
	AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
}))

vi.mock("../common/Tab", () => ({
	Tab: ({ children }: any) => <div>{children}</div>,
	TabContent: React.forwardRef<HTMLDivElement, any>(({ children }, ref) => <div ref={ref}>{children}</div>),
	TabHeader: ({ children }: any) => <div>{children}</div>,
	TabList: ({ children }: any) => <div>{children}</div>,
	TabTrigger: React.forwardRef<HTMLButtonElement, any>(({ children }, ref) => <button ref={ref}>{children}</button>),
}))

vi.mock("../ApiConfigManager", () => ({
	default: () => <div data-testid="api-config-manager" />,
}))

vi.mock("../ApiOptions", () => ({
	__esModule: true,
	default: ({ currentApiConfigName, currentApiConfigId, openAiCodexIsAuthenticatedOverride }: any) => (
		<div data-testid="api-options-props">
			<div>name:{currentApiConfigName}</div>
			<div>id:{currentApiConfigId ?? ""}</div>
			<div>auth:{String(openAiCodexIsAuthenticatedOverride)}</div>
		</div>
	),
}))

vi.mock("../AutoApproveSettings", () => ({
	AutoApproveSettings: () => null,
}))
vi.mock("../BrowserSettings", () => ({
	BrowserSettings: () => null,
}))
vi.mock("../CheckpointSettings", () => ({
	CheckpointSettings: () => null,
}))
vi.mock("../NotificationSettings", () => ({
	NotificationSettings: () => null,
}))
vi.mock("../ContextManagementSettings", () => ({
	ContextManagementSettings: () => null,
}))
vi.mock("../TerminalSettings", () => ({
	TerminalSettings: () => null,
}))
vi.mock("../ExperimentalSettings", () => ({
	ExperimentalSettings: () => null,
}))
vi.mock("../LanguageSettings", () => ({
	LanguageSettings: () => null,
}))
vi.mock("../About", () => ({
	About: () => null,
}))
vi.mock("../PromptsSettings", () => ({
	default: () => null,
}))
vi.mock("../SlashCommandsSettings", () => ({
	SlashCommandsSettings: () => null,
}))
vi.mock("../UISettings", () => ({
	UISettings: () => null,
}))
vi.mock("../SettingsSearch", () => ({
	SettingsSearch: () => null,
}))
vi.mock("../SectionHeader", () => ({
	SectionHeader: ({ children }: any) => <div>{children}</div>,
}))
vi.mock("../Section", () => ({
	Section: ({ children }: any) => <div>{children}</div>,
}))
vi.mock("@src/components/modes/ModesView", () => ({
	default: () => null,
}))
vi.mock("@src/components/mcp/McpView", () => ({
	default: () => null,
}))
vi.mock("@src/utils/fixPointerEvents", () => ({
	ensureBodyPointerEventsRestored: vi.fn(),
}))

describe("SettingsView - OpenAI Codex profile auth state", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useExtensionState).mockReturnValue({
			currentApiConfigName: "Codex Primary",
			listApiConfigMeta: [
				{ id: "profile-123", name: "Codex Primary" },
				{ id: "profile-456", name: "Codex Secondary" },
			],
			uriScheme: "vscode",
			apiConfiguration: {
				apiProvider: "openai-codex",
				apiModelId: "gpt-5.4",
			},
			openAiCodexIsAuthenticated: false,
		} as any)
	})

	it("uses the edited profile auth state instead of the active profile auth state", async () => {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		})

		render(
			<QueryClientProvider client={queryClient}>
				<SettingsView onDone={vi.fn()} editingProfile="Codex Secondary" />
			</QueryClientProvider>,
		)

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "getProfileConfigurationForEditing",
			text: "Codex Secondary",
		})

		window.dispatchEvent(
			new MessageEvent("message", {
				data: {
					type: "profileConfigurationForEditing",
					text: "Codex Secondary",
					profileId: "profile-456",
					openAiCodexIsAuthenticated: true,
					apiConfiguration: {
						id: "profile-456",
						apiProvider: "openai-codex",
						apiModelId: "gpt-5.4",
					},
				},
			}),
		)

		await waitFor(() => {
			expect(screen.getByText("name:Codex Secondary")).toBeInTheDocument()
			expect(screen.getByText("id:profile-456")).toBeInTheDocument()
			expect(screen.getByText("auth:true")).toBeInTheDocument()
		})
	})
})
