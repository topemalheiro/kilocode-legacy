import React from "react"
import { fireEvent, render, screen } from "@/utils/test-utils"

import type { ModelInfo, ProviderSettings } from "@roo-code/types"

import { BottomReasoningEffort } from "../BottomReasoningEffort"
import { vscode } from "@/utils/vscode"

const REASONING_SHORTCUT_KEY = "\u00AB"

vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("@/components/ui/hooks/useRooPortal", () => ({
	useRooPortal: () => document.body,
}))

vi.mock("@/components/ui", () => ({
	Select: ({ children, value, onValueChange, open = false, onOpenChange }: any) => {
		const SelectContext = ((vi as any).__selectContext as React.Context<any>) || React.createContext<any>(null)
		;(vi as any).__selectContext = SelectContext
		const [activeIndex, setActiveIndex] = React.useState(0)

		return (
			<SelectContext.Provider value={{ value, onValueChange, open, onOpenChange, activeIndex, setActiveIndex }}>
				<div data-testid="select" data-value={value}>
					{children}
				</div>
			</SelectContext.Provider>
		)
	},
	SelectTrigger: React.forwardRef(({ children, ...props }: any, ref: React.ForwardedRef<HTMLButtonElement>) => {
		const SelectContext = (vi as any).__selectContext as React.Context<any>
		const context = React.useContext(SelectContext) as any

		return (
			<button
				ref={ref}
				data-testid={props["data-testid"] || "select-trigger"}
				aria-expanded={context?.open}
				onClick={() => context?.onOpenChange?.(!context?.open)}
				{...props}>
				{children}
			</button>
		)
	}),
	SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
	SelectContent: ({ children, ...props }: any) => {
		const SelectContext = (vi as any).__selectContext as React.Context<any>
		const context = React.useContext(SelectContext) as any
		const itemValues = React.Children.toArray(children)
			.filter(React.isValidElement)
			.map((child: any) => child.props.value)
			.filter(Boolean)

		React.useEffect(() => {
			const selectedIndex = itemValues.indexOf(context?.value)
			context?.setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
		}, [context?.value, itemValues.join("|")])

		return (
			<div
				data-testid={props["data-testid"] || "select-content"}
				data-state={context?.open ? "open" : "closed"}
				tabIndex={0}
				onKeyDown={(event) => {
					if (!context?.open) {
						return
					}

					if (event.key === "ArrowDown") {
						event.preventDefault()
						context.setActiveIndex((index: number) => Math.min(index + 1, itemValues.length - 1))
					}

					if (event.key === "ArrowUp") {
						event.preventDefault()
						context.setActiveIndex((index: number) => Math.max(index - 1, 0))
					}

					if (event.key === "Enter") {
						event.preventDefault()
						const nextValue = itemValues[context.activeIndex] ?? itemValues[0]
						if (nextValue) {
							context.onValueChange?.(nextValue)
							context.onOpenChange?.(false)
						}
					}
				}}>
				{children}
			</div>
		)
	},
	SelectItem: ({ children, value, ...props }: any) => {
		const SelectContext = (vi as any).__selectContext as React.Context<any>
		const context = React.useContext(SelectContext) as any

		return (
			<div
				data-testid={props["data-testid"] || `select-item-${value}`}
				data-value={value}
				data-selected={context?.value === value}>
				{children}
			</div>
		)
	},
}))

describe("BottomReasoningEffort", () => {
	const baseApiConfiguration: ProviderSettings = {
		apiProvider: "openai-codex",
		apiModelId: "gpt-5.4",
	}

	const gpt54ModelInfo: ModelInfo = {
		contextWindow: 258000,
		maxTokens: 128000,
		supportsPromptCache: true,
		supportsImages: true,
		supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
		reasoningEffort: "medium",
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders nothing when the model does not support reasoning effort", () => {
		const { container } = render(
			<BottomReasoningEffort currentApiConfigName="Codex Primary" apiConfiguration={baseApiConfiguration} />,
		)

		expect(container.firstChild).toBeNull()
	})

	it("shows low through xhigh for gpt-5.4-style models", () => {
		render(
			<BottomReasoningEffort
				currentApiConfigName="Codex Primary"
				apiConfiguration={baseApiConfiguration}
				modelInfo={gpt54ModelInfo}
			/>,
		)

		expect(screen.getByTestId("bottom-reasoning-effort-item-low")).toBeInTheDocument()
		expect(screen.getByTestId("bottom-reasoning-effort-item-medium")).toBeInTheDocument()
		expect(screen.getByTestId("bottom-reasoning-effort-item-high")).toBeInTheDocument()
		expect(screen.getByTestId("bottom-reasoning-effort-item-xhigh")).toBeInTheDocument()
	})

	it("shows only medium and high for gpt-5.1-codex-mini-style models", () => {
		render(
			<BottomReasoningEffort
				currentApiConfigName="Codex Primary"
				apiConfiguration={{ ...baseApiConfiguration, apiModelId: "gpt-5.1-codex-mini" }}
				modelInfo={{
					...gpt54ModelInfo,
					supportsReasoningEffort: ["medium", "high"],
				}}
			/>,
		)

		expect(screen.queryByTestId("bottom-reasoning-effort-item-low")).not.toBeInTheDocument()
		expect(screen.getByTestId("bottom-reasoning-effort-item-medium")).toBeInTheDocument()
		expect(screen.getByTestId("bottom-reasoning-effort-item-high")).toBeInTheDocument()
		expect(screen.queryByTestId("bottom-reasoning-effort-item-xhigh")).not.toBeInTheDocument()
	})

	it("opens with Ctrl+\u00AB from the chat textarea and posts the updated reasoning level", () => {
		render(
			<>
				<textarea data-testid="chat-input" />
				<BottomReasoningEffort
					currentApiConfigName="Codex Primary"
					apiConfiguration={baseApiConfiguration}
					modelInfo={gpt54ModelInfo}
				/>
			</>,
		)

		const textarea = screen.getByTestId("chat-input")
		const content = screen.getByTestId("bottom-reasoning-effort-content")

		textarea.focus()
		fireEvent.keyDown(textarea, { key: REASONING_SHORTCUT_KEY, ctrlKey: true })
		fireEvent.keyDown(content, { key: "ArrowDown" })
		fireEvent.keyDown(content, { key: "ArrowDown" })
		fireEvent.keyDown(content, { key: "Enter" })

		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "upsertApiConfiguration",
			text: "Codex Primary",
			apiConfiguration: {
				...baseApiConfiguration,
				enableReasoningEffort: true,
				reasoningEffort: "xhigh",
			},
		})
	})
})
