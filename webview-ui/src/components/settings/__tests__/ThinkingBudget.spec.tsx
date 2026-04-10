// npx vitest src/components/settings/__tests__/ThinkingBudget.spec.tsx

import React from "react"
import { render, screen, fireEvent } from "@/utils/test-utils"

import type { ModelInfo } from "@roo-code/types"

import { ThinkingBudget } from "../ThinkingBudget"

const REASONING_SHORTCUT_KEY = "\u00AB"

vi.mock("@/components/ui", () => ({
	Slider: ({ value, onValueChange, min, max, step }: any) => (
		<input
			type="range"
			data-testid="slider"
			min={min}
			max={max}
			step={step}
			value={value[0]}
			onChange={(e) => onValueChange([parseInt(e.target.value)])}
		/>
	),
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
	SelectTrigger: ({ children, ...props }: any) => {
		const SelectContext = (vi as any).__selectContext as React.Context<any>
		const context = React.useContext(SelectContext) as any

		return (
			<button
				data-testid={props["data-testid"] || "select-trigger"}
				aria-expanded={context?.open}
				onClick={() => context?.onOpenChange?.(!context?.open)}
				{...props}>
				{children}
			</button>
		)
	},
	SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
	SelectContent: ({ children }: any) => {
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
				data-testid="select-content"
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
	SelectItem: ({ children, value }: any) => {
		const SelectContext = (vi as any).__selectContext as React.Context<any>
		const context = React.useContext(SelectContext) as any

		return (
			<div data-testid={`select-item-${value}`} data-value={value} data-selected={context?.value === value}>
				{children}
			</div>
		)
	},
}))

vi.mock("@/components/ui/hooks/useSelectedModel", () => ({
	useSelectedModel: (apiConfiguration: any) => {
		if (apiConfiguration?.apiProvider === "gemini") {
			return {
				id: apiConfiguration?.apiModelId || "gemini-2.0-flash-exp",
				provider: "gemini",
				info: undefined,
			}
		}
		return {
			id: apiConfiguration?.apiModelId || "claude-3-5-sonnet-20241022",
			provider: apiConfiguration?.apiProvider || "anthropic",
			info: undefined,
		}
	},
}))

describe("ThinkingBudget", () => {
	const mockModelInfo: ModelInfo = {
		supportsReasoningBudget: true,
		requiredReasoningBudget: true,
		maxTokens: 16384,
		contextWindow: 200000,
		supportsPromptCache: true,
		supportsImages: true,
	}

	const defaultProps = {
		apiConfiguration: {},
		setApiConfigurationField: vi.fn(),
		modelInfo: mockModelInfo,
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should render nothing when model doesn't support thinking", () => {
		const { container } = render(
			<ThinkingBudget
				{...defaultProps}
				modelInfo={{
					...mockModelInfo,
					maxTokens: 16384,
					contextWindow: 200000,
					supportsPromptCache: true,
					supportsImages: true,
					supportsReasoningBudget: false,
				}}
			/>,
		)

		expect(container.firstChild).toBeNull()
	})

	it("should render simple reasoning toggle when model has supportsReasoningBinary (binary reasoning)", () => {
		render(
			<ThinkingBudget
				{...defaultProps}
				modelInfo={{
					...mockModelInfo,
					supportsReasoningBinary: true,
					supportsReasoningBudget: false,
					supportsReasoningEffort: false,
				}}
			/>,
		)

		expect(screen.getByText("settings:providers.useReasoning")).toBeInTheDocument()
		expect(screen.queryByTestId("reasoning-budget")).not.toBeInTheDocument()
		expect(screen.queryByTestId("reasoning-effort")).not.toBeInTheDocument()
	})

	it("should default binary reasoning toggle to enabled when setting is unset", () => {
		render(
			<ThinkingBudget
				{...defaultProps}
				apiConfiguration={{}}
				modelInfo={{
					...mockModelInfo,
					supportsReasoningBinary: true,
					supportsReasoningBudget: false,
					supportsReasoningEffort: false,
				}}
			/>,
		)

		expect(screen.getByRole("checkbox")).toBeChecked()
	})

	it("should keep binary reasoning toggle disabled when explicitly set to false", () => {
		render(
			<ThinkingBudget
				{...defaultProps}
				apiConfiguration={{ enableReasoningEffort: false }}
				modelInfo={{
					...mockModelInfo,
					supportsReasoningBinary: true,
					supportsReasoningBudget: false,
					supportsReasoningEffort: false,
				}}
			/>,
		)

		expect(screen.getByRole("checkbox")).not.toBeChecked()
	})

	it("should render sliders when model supports thinking", () => {
		render(<ThinkingBudget {...defaultProps} />)

		expect(screen.getAllByTestId("slider")).toHaveLength(2)
	})

	it("should update modelMaxThinkingTokens", () => {
		const setApiConfigurationField = vi.fn()

		render(
			<ThinkingBudget
				{...defaultProps}
				apiConfiguration={{ modelMaxThinkingTokens: 4096 }}
				setApiConfigurationField={setApiConfigurationField}
			/>,
		)

		const sliders = screen.getAllByTestId("slider")
		fireEvent.change(sliders[1], { target: { value: "5000" } })

		expect(setApiConfigurationField).toHaveBeenCalledWith("modelMaxThinkingTokens", 5000)
	})

	it("should cap thinking tokens at 80% of max tokens", () => {
		const setApiConfigurationField = vi.fn()

		render(
			<ThinkingBudget
				{...defaultProps}
				apiConfiguration={{ modelMaxTokens: 10000, modelMaxThinkingTokens: 9000 }}
				setApiConfigurationField={setApiConfigurationField}
			/>,
		)

		expect(setApiConfigurationField).toHaveBeenCalledWith("modelMaxThinkingTokens", 8000, false)
	})

	it("should use default thinking tokens if not provided", () => {
		render(<ThinkingBudget {...defaultProps} apiConfiguration={{ modelMaxTokens: 10000 }} />)

		const sliders = screen.getAllByTestId("slider")
		expect(sliders[1]).toHaveValue("8000")
	})

	it("should use min thinking tokens of 1024 for non-Gemini models", () => {
		render(<ThinkingBudget {...defaultProps} apiConfiguration={{ modelMaxTokens: 1000 }} />)

		const sliders = screen.getAllByTestId("slider")
		expect(sliders[1].getAttribute("min")).toBe("1024")
	})

	it("should use min thinking tokens of 128 for Gemini 2.5 Pro models", () => {
		render(
			<ThinkingBudget
				{...defaultProps}
				apiConfiguration={{
					modelMaxTokens: 10000,
					apiProvider: "gemini",
					apiModelId: "gemini-2.5-pro-002",
				}}
			/>,
		)

		const sliders = screen.getAllByTestId("slider")
		expect(sliders[1].getAttribute("min")).toBe("128")
	})

	it("should use step of 128 for Gemini 2.5 Pro models", () => {
		render(
			<ThinkingBudget
				{...defaultProps}
				apiConfiguration={{
					modelMaxTokens: 10000,
					apiProvider: "gemini",
					apiModelId: "gemini-2.5-pro-002",
				}}
			/>,
		)

		const sliders = screen.getAllByTestId("slider")
		expect(sliders[1].getAttribute("step")).toBe("128")
	})

	it("should use step of 1024 for non-Gemini models", () => {
		render(
			<ThinkingBudget
				{...defaultProps}
				apiConfiguration={{
					modelMaxTokens: 10000,
					apiProvider: "anthropic",
					apiModelId: "claude-3-5-sonnet-20241022",
				}}
			/>,
		)

		const sliders = screen.getAllByTestId("slider")
		expect(sliders[1].getAttribute("step")).toBe("1024")
	})

	it("should update max tokens when slider changes", () => {
		const setApiConfigurationField = vi.fn()

		render(
			<ThinkingBudget
				{...defaultProps}
				apiConfiguration={{ modelMaxTokens: 10000 }}
				setApiConfigurationField={setApiConfigurationField}
			/>,
		)

		const sliders = screen.getAllByTestId("slider")
		fireEvent.change(sliders[0], { target: { value: "12000" } })

		expect(setApiConfigurationField).toHaveBeenCalledWith("modelMaxTokens", 12000)
	})

	describe("reasoning effort dropdown", () => {
		const reasoningEffortModelInfo: ModelInfo = {
			supportsReasoningEffort: true,
			contextWindow: 200000,
			supportsPromptCache: true,
		}

		it("should show 'disable' option when supportsReasoningEffort is boolean true", () => {
			render(<ThinkingBudget {...defaultProps} modelInfo={reasoningEffortModelInfo} />)

			expect(screen.getByTestId("reasoning-effort")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-disable")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-low")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-medium")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-high")).toBeInTheDocument()
		})

		it("should NOT show 'disable' option when supportsReasoningEffort is an explicit array without disable", () => {
			render(
				<ThinkingBudget
					{...defaultProps}
					modelInfo={{
						...reasoningEffortModelInfo,
						supportsReasoningEffort: ["low", "high"],
					}}
				/>,
			)

			expect(screen.getByTestId("reasoning-effort")).toBeInTheDocument()
			expect(screen.queryByTestId("select-item-disable")).not.toBeInTheDocument()
			expect(screen.getByTestId("select-item-low")).toBeInTheDocument()
			expect(screen.queryByTestId("select-item-medium")).not.toBeInTheDocument()
			expect(screen.getByTestId("select-item-high")).toBeInTheDocument()
		})

		it("should show 'disable' option when supportsReasoningEffort array explicitly includes disable", () => {
			render(
				<ThinkingBudget
					{...defaultProps}
					modelInfo={{
						...reasoningEffortModelInfo,
						supportsReasoningEffort: ["disable", "low", "high"],
					}}
				/>,
			)

			expect(screen.getByTestId("reasoning-effort")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-disable")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-low")).toBeInTheDocument()
			expect(screen.queryByTestId("select-item-medium")).not.toBeInTheDocument()
			expect(screen.getByTestId("select-item-high")).toBeInTheDocument()
		})

		it("should show 'none' option when supportsReasoningEffort array includes none", () => {
			render(
				<ThinkingBudget
					{...defaultProps}
					modelInfo={{
						...reasoningEffortModelInfo,
						supportsReasoningEffort: ["none", "low", "medium", "high"],
					}}
				/>,
			)

			expect(screen.getByTestId("reasoning-effort")).toBeInTheDocument()
			expect(screen.queryByTestId("select-item-disable")).not.toBeInTheDocument()
			expect(screen.getByTestId("select-item-none")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-low")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-medium")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-high")).toBeInTheDocument()
		})

		it("should show low through xhigh for gpt-5.4-style models", () => {
			render(
				<ThinkingBudget
					{...defaultProps}
					modelInfo={{
						...reasoningEffortModelInfo,
						supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
					}}
				/>,
			)

			expect(screen.getByTestId("select-item-low")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-medium")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-high")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-xhigh")).toBeInTheDocument()
		})

		it("should show only medium and high for gpt-5.1-codex-mini-style models", () => {
			render(
				<ThinkingBudget
					{...defaultProps}
					modelInfo={{
						...reasoningEffortModelInfo,
						supportsReasoningEffort: ["medium", "high"],
					}}
				/>,
			)

			expect(screen.queryByTestId("select-item-low")).not.toBeInTheDocument()
			expect(screen.getByTestId("select-item-medium")).toBeInTheDocument()
			expect(screen.getByTestId("select-item-high")).toBeInTheDocument()
			expect(screen.queryByTestId("select-item-xhigh")).not.toBeInTheDocument()
		})

		it("should open the reasoning dropdown with Ctrl+\\u00AB and allow arrow selection", () => {
			const setApiConfigurationField = vi.fn()

			render(
				<ThinkingBudget
					{...defaultProps}
					apiConfiguration={{}}
					setApiConfigurationField={setApiConfigurationField}
					modelInfo={{
						...reasoningEffortModelInfo,
						supportsReasoningEffort: ["low", "medium", "high", "xhigh"],
					}}
				/>,
			)

			const selectContent = screen.getByTestId("select-content")
			expect(selectContent).toHaveAttribute("data-state", "closed")

			fireEvent.keyDown(window, { key: REASONING_SHORTCUT_KEY, ctrlKey: true })

			expect(selectContent).toHaveAttribute("data-state", "open")

			fireEvent.keyDown(selectContent, { key: "ArrowDown" })
			fireEvent.keyDown(selectContent, { key: "ArrowDown" })
			fireEvent.keyDown(selectContent, { key: "Enter" })

			expect(setApiConfigurationField).toHaveBeenCalledWith("enableReasoningEffort", true)
			expect(setApiConfigurationField).toHaveBeenCalledWith("reasoningEffort", "high")
		})
	})
})
