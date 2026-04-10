import { useEffect, useMemo, useRef, useState } from "react"

import {
	type ModelInfo,
	type ProviderSettings,
	type ReasoningEffortWithMinimal,
	reasoningEfforts,
} from "@roo-code/types"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"
import { useRooPortal } from "@/components/ui/hooks/useRooPortal"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { vscode } from "@/utils/vscode"

interface BottomReasoningEffortProps {
	currentApiConfigName?: string
	apiConfiguration: ProviderSettings
	modelInfo?: ModelInfo
}

type ReasoningEffortOption = ReasoningEffortWithMinimal | "none" | "disable"

const REASONING_SHORTCUT_KEY = "\u00AB"

const getAvailableOptions = (modelInfo?: ModelInfo): ReadonlyArray<ReasoningEffortOption> => {
	const supports = modelInfo?.supportsReasoningEffort

	if (!supports) {
		return []
	}

	const baseOptions: ReadonlyArray<ReasoningEffortWithMinimal> =
		supports === true
			? (reasoningEfforts as readonly ReasoningEffortWithMinimal[])
			: Array.isArray(supports)
				? (supports as ReadonlyArray<ReasoningEffortWithMinimal>)
				: (reasoningEfforts as readonly ReasoningEffortWithMinimal[])

	const shouldAutoAddDisable = !modelInfo?.requiredReasoningEffort && supports === true

	return shouldAutoAddDisable
		? (["disable", ...baseOptions] as ReasoningEffortOption[])
		: (baseOptions as ReadonlyArray<ReasoningEffortOption>)
}

const getDefaultReasoningEffort = (modelInfo?: ModelInfo): ReasoningEffortOption => {
	const modelDefaultReasoningEffort = modelInfo?.reasoningEffort as ReasoningEffortWithMinimal | undefined

	if (modelDefaultReasoningEffort) {
		return modelDefaultReasoningEffort
	}

	return modelInfo?.requiredReasoningEffort ? "medium" : "disable"
}

export const BottomReasoningEffort = ({
	currentApiConfigName,
	apiConfiguration,
	modelInfo,
}: BottomReasoningEffortProps) => {
	const { t } = useAppTranslation()
	const portalContainer = useRooPortal("roo-portal")
	const triggerRef = useRef<HTMLButtonElement>(null)
	const [isOpen, setIsOpen] = useState(false)

	const availableOptions = useMemo(() => getAvailableOptions(modelInfo), [modelInfo])
	const shouldRender =
		!!modelInfo?.supportsReasoningEffort &&
		!modelInfo.supportsReasoningBinary &&
		!modelInfo.supportsReasoningBudget &&
		availableOptions.length > 0

	const configuredReasoningEffort = apiConfiguration.reasoningEffort as ReasoningEffortOption | undefined
	const currentReasoningEffort = configuredReasoningEffort || getDefaultReasoningEffort(modelInfo)
	const selectedReasoningEffort = availableOptions.includes(currentReasoningEffort)
		? currentReasoningEffort
		: availableOptions[0]

	useEffect(() => {
		if (!shouldRender) {
			return
		}

		const handleReasoningShortcut = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey) || event.key !== REASONING_SHORTCUT_KEY || event.defaultPrevented) {
				return
			}

			event.preventDefault()
			setIsOpen(true)
			setTimeout(() => triggerRef.current?.focus(), 0)
		}

		window.addEventListener("keydown", handleReasoningShortcut)
		return () => window.removeEventListener("keydown", handleReasoningShortcut)
	}, [shouldRender])

	if (!shouldRender || !selectedReasoningEffort) {
		return null
	}

	const getLabel = (value: ReasoningEffortOption) =>
		value === "none" || value === "disable"
			? t("settings:providers.reasoningEffort.none")
			: t(`settings:providers.reasoningEffort.${value}`)

	return (
		<div className="shrink-0" data-testid="bottom-reasoning-effort">
			<Select
				open={isOpen}
				onOpenChange={setIsOpen}
				value={selectedReasoningEffort}
				onValueChange={(value) => {
					if (!currentApiConfigName) {
						setIsOpen(false)
						return
					}

					const nextValue = value as ReasoningEffortOption

					vscode.postMessage({
						type: "upsertApiConfiguration",
						text: currentApiConfigName,
						apiConfiguration: {
							...apiConfiguration,
							enableReasoningEffort: nextValue !== "disable" && nextValue !== "none",
							reasoningEffort: nextValue,
						},
					})
					setIsOpen(false)
				}}>
				<SelectTrigger
					ref={triggerRef}
					data-testid="bottom-reasoning-effort-trigger"
					aria-label={t("settings:providers.reasoningEffort.label")}
					className="h-auto w-auto max-w-[8rem] gap-1.5 border-transparent bg-transparent px-1.5 py-1 text-xs hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.03)] [&_svg:not([class*='size-'])]:size-3">
					<SelectValue placeholder={getLabel(selectedReasoningEffort)} />
				</SelectTrigger>
				<SelectContent container={portalContainer} align="end" data-testid="bottom-reasoning-effort-content">
					{availableOptions.map((value) => (
						<SelectItem key={value} value={value} data-testid={`bottom-reasoning-effort-item-${value}`}>
							{getLabel(value)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
