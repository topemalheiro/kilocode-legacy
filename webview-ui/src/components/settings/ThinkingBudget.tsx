import { useEffect, useRef, useState } from "react"
import { Checkbox } from "vscrui"

import {
	type ProviderSettings,
	type ModelInfo,
	type ReasoningEffortWithMinimal,
	reasoningEfforts,
} from "@roo-code/types"

import {
	DEFAULT_HYBRID_REASONING_MODEL_MAX_TOKENS,
	DEFAULT_HYBRID_REASONING_MODEL_THINKING_TOKENS,
	GEMINI_25_PRO_MIN_THINKING_TOKENS,
} from "@roo/api"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { Slider, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@src/components/ui"
import { useSelectedModel } from "@src/components/ui/hooks/useSelectedModel"

interface ThinkingBudgetProps {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: <K extends keyof ProviderSettings>(
		field: K,
		value: ProviderSettings[K],
		isUserAction?: boolean,
	) => void
	modelInfo?: ModelInfo
}

const REASONING_SHORTCUT_KEY = "\u00AB"

const isEditableTarget = (target: EventTarget | null) => {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	const tagName = target.tagName.toLowerCase()
	return (
		tagName === "input" ||
		tagName === "textarea" ||
		tagName === "select" ||
		target.isContentEditable ||
		!!target.closest("[contenteditable='true']")
	)
}

export const ThinkingBudget = ({ apiConfiguration, setApiConfigurationField, modelInfo }: ThinkingBudgetProps) => {
	const { t } = useAppTranslation()
	const { id: selectedModelId } = useSelectedModel(apiConfiguration)
	const [isReasoningEffortOpen, setIsReasoningEffortOpen] = useState(false)
	const reasoningEffortContainerRef = useRef<HTMLDivElement>(null)

	const isGemini25Pro = selectedModelId && selectedModelId.includes("gemini-2.5-pro")
	const minThinkingTokens = isGemini25Pro ? GEMINI_25_PRO_MIN_THINKING_TOKENS : 1024

	const isReasoningSupported = !!modelInfo && modelInfo.supportsReasoningBinary
	const isReasoningBudgetSupported = !!modelInfo && modelInfo.supportsReasoningBudget
	const isReasoningBudgetRequired = !!modelInfo && modelInfo.requiredReasoningBudget
	const isReasoningEffortSupported = !!modelInfo && modelInfo.supportsReasoningEffort

	const supports = modelInfo?.supportsReasoningEffort
	const baseAvailableOptions: ReadonlyArray<ReasoningEffortWithMinimal> =
		supports === true
			? (reasoningEfforts as readonly ReasoningEffortWithMinimal[])
			: Array.isArray(supports)
				? (supports as ReadonlyArray<ReasoningEffortWithMinimal>)
				: (reasoningEfforts as readonly ReasoningEffortWithMinimal[])

	type ReasoningEffortOption = ReasoningEffortWithMinimal | "none" | "disable"
	const shouldAutoAddDisable =
		!modelInfo?.requiredReasoningEffort && supports === true && !baseAvailableOptions.includes("disable" as any)
	const availableOptions: ReadonlyArray<ReasoningEffortOption> = shouldAutoAddDisable
		? (["disable", ...baseAvailableOptions] as ReasoningEffortOption[])
		: (baseAvailableOptions as ReadonlyArray<ReasoningEffortOption>)

	const modelDefaultReasoningEffort = modelInfo?.reasoningEffort as ReasoningEffortWithMinimal | undefined
	const defaultReasoningEffort: ReasoningEffortOption = modelInfo?.requiredReasoningEffort
		? modelDefaultReasoningEffort || "medium"
		: "disable"
	const storedReasoningEffort = apiConfiguration.reasoningEffort as ReasoningEffortOption | undefined
	const currentReasoningEffort: ReasoningEffortOption = storedReasoningEffort || defaultReasoningEffort

	useEffect(() => {
		if (isReasoningEffortSupported && !apiConfiguration.reasoningEffort) {
			if (modelInfo?.requiredReasoningEffort && defaultReasoningEffort !== "disable") {
				setApiConfigurationField("reasoningEffort", defaultReasoningEffort as ReasoningEffortWithMinimal, false)
			}
		}
	}, [
		isReasoningEffortSupported,
		apiConfiguration.reasoningEffort,
		defaultReasoningEffort,
		modelInfo?.requiredReasoningEffort,
		setApiConfigurationField,
	])

	useEffect(() => {
		if (!isReasoningEffortSupported) return
		const shouldEnable = modelInfo?.requiredReasoningEffort || currentReasoningEffort !== "disable"
		if (shouldEnable && apiConfiguration.enableReasoningEffort !== true) {
			setApiConfigurationField("enableReasoningEffort", true, false)
		}
	}, [
		isReasoningEffortSupported,
		modelInfo?.requiredReasoningEffort,
		currentReasoningEffort,
		apiConfiguration.enableReasoningEffort,
		setApiConfigurationField,
	])

	useEffect(() => {
		if (!isReasoningEffortSupported || isReasoningSupported || isReasoningBudgetSupported) {
			return
		}

		const handleReasoningShortcut = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey) || event.key !== REASONING_SHORTCUT_KEY || event.defaultPrevented) {
				return
			}

			if (isEditableTarget(event.target)) {
				return
			}

			const trigger = reasoningEffortContainerRef.current?.querySelector<HTMLElement>(
				"[data-testid='reasoning-effort-trigger']",
			)
			if (!trigger) {
				return
			}

			event.preventDefault()
			setIsReasoningEffortOpen(true)
			setTimeout(() => trigger.focus(), 0)
		}

		window.addEventListener("keydown", handleReasoningShortcut)
		return () => window.removeEventListener("keydown", handleReasoningShortcut)
	}, [isReasoningBudgetSupported, isReasoningEffortSupported, isReasoningSupported])

	const enableReasoningEffort = apiConfiguration.enableReasoningEffort
	const enableBinaryReasoningEffort = apiConfiguration.enableReasoningEffort ?? true
	const customMaxOutputTokens = apiConfiguration.modelMaxTokens || DEFAULT_HYBRID_REASONING_MODEL_MAX_TOKENS
	const customMaxThinkingTokens =
		apiConfiguration.modelMaxThinkingTokens || DEFAULT_HYBRID_REASONING_MODEL_THINKING_TOKENS

	const modelMaxThinkingTokens = modelInfo?.maxThinkingTokens
		? Math.min(modelInfo.maxThinkingTokens, Math.floor(0.8 * customMaxOutputTokens))
		: Math.floor(0.8 * customMaxOutputTokens)

	useEffect(() => {
		if (isReasoningBudgetSupported && customMaxThinkingTokens > modelMaxThinkingTokens) {
			setApiConfigurationField("modelMaxThinkingTokens", modelMaxThinkingTokens, false)
		}
	}, [isReasoningBudgetSupported, customMaxThinkingTokens, modelMaxThinkingTokens, setApiConfigurationField])

	useEffect(() => {
		if (isReasoningBudgetSupported && modelInfo?.maxTokens && customMaxOutputTokens > modelInfo.maxTokens) {
			setApiConfigurationField("modelMaxTokens", modelInfo.maxTokens || DEFAULT_HYBRID_REASONING_MODEL_MAX_TOKENS)
		}
	}, [isReasoningBudgetSupported, customMaxOutputTokens, modelInfo?.maxTokens, setApiConfigurationField])

	if (!modelInfo) {
		return null
	}

	if (isReasoningSupported) {
		return (
			<div className="flex flex-col gap-1">
				<Checkbox
					checked={enableBinaryReasoningEffort}
					onChange={(checked: boolean) =>
						setApiConfigurationField("enableReasoningEffort", checked === true)
					}>
					{t("settings:providers.useReasoning")}
				</Checkbox>
			</div>
		)
	}

	return isReasoningBudgetSupported && !!modelInfo.maxTokens ? (
		<>
			{!isReasoningBudgetRequired && apiConfiguration.apiProvider !== "virtual-quota-fallback" && (
				<div className="flex flex-col gap-1">
					<Checkbox
						checked={enableReasoningEffort}
						onChange={(checked: boolean) =>
							setApiConfigurationField("enableReasoningEffort", checked === true)
						}>
						{t("settings:providers.useReasoning")}
					</Checkbox>
				</div>
			)}
			{(isReasoningBudgetRequired || enableReasoningEffort) && (
				<>
					<div className="flex flex-col gap-1">
						<div className="font-medium">{t("settings:thinkingBudget.maxTokens")}</div>
						<div className="flex items-center gap-1">
							<Slider
								min={8192}
								max={Math.max(
									modelInfo.maxTokens || 8192,
									customMaxOutputTokens,
									DEFAULT_HYBRID_REASONING_MODEL_MAX_TOKENS,
								)}
								step={1024}
								value={[customMaxOutputTokens]}
								onValueChange={([value]) => setApiConfigurationField("modelMaxTokens", value)}
							/>
							<div className="w-12 text-sm text-center">{customMaxOutputTokens}</div>
						</div>
					</div>
					<div className="flex flex-col gap-1">
						<div className="font-medium">{t("settings:thinkingBudget.maxThinkingTokens")}</div>
						<div className="flex items-center gap-1" data-testid="reasoning-budget">
							<Slider
								min={minThinkingTokens}
								max={modelMaxThinkingTokens}
								step={minThinkingTokens === 128 ? 128 : 1024}
								value={[customMaxThinkingTokens]}
								onValueChange={([value]) => setApiConfigurationField("modelMaxThinkingTokens", value)}
							/>
							<div className="w-12 text-sm text-center">{customMaxThinkingTokens}</div>
						</div>
					</div>
				</>
			)}
		</>
	) : isReasoningEffortSupported ? (
		<div ref={reasoningEffortContainerRef} className="flex flex-col gap-1" data-testid="reasoning-effort">
			<div className="flex justify-between items-center">
				<label className="block font-medium mb-1">{t("settings:providers.reasoningEffort.label")}</label>
			</div>
			<Select
				open={isReasoningEffortOpen}
				onOpenChange={setIsReasoningEffortOpen}
				value={currentReasoningEffort}
				onValueChange={(value: ReasoningEffortOption) => {
					if (value === "disable") {
						setApiConfigurationField("enableReasoningEffort", false)
						setApiConfigurationField("reasoningEffort", "disable")
					} else {
						setApiConfigurationField("enableReasoningEffort", true)
						setApiConfigurationField("reasoningEffort", value as ReasoningEffortWithMinimal)
					}
					setIsReasoningEffortOpen(false)
				}}>
				<SelectTrigger className="w-full" data-testid="reasoning-effort-trigger">
					<SelectValue
						placeholder={
							currentReasoningEffort
								? currentReasoningEffort === "none" || currentReasoningEffort === "disable"
									? t("settings:providers.reasoningEffort.none")
									: t(`settings:providers.reasoningEffort.${currentReasoningEffort}`)
								: t("settings:common.select")
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{availableOptions.map((value) => (
						<SelectItem key={value} value={value}>
							{value === "none" || value === "disable"
								? t("settings:providers.reasoningEffort.none")
								: t(`settings:providers.reasoningEffort.${value}`)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	) : null
}
