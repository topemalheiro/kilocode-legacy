import { ModelSelector } from "./chat/ModelSelector"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useSelectedModel } from "../ui/hooks/useSelectedModel"
import { BottomReasoningEffort } from "./BottomReasoningEffort"

export const BottomApiConfig = () => {
	const { currentApiConfigName, apiConfiguration, virtualQuotaActiveModel } = useExtensionState() // kilocode_change: Get virtual quota active model for UI display
	const {
		id: selectedModelId,
		provider: selectedProvider,
		info: selectedModelInfo,
	} = useSelectedModel(apiConfiguration)

	if (!apiConfiguration) {
		return null
	}

	return (
		<div className="flex items-center gap-1 min-w-0">
			<div className="flex-1 min-w-0 overflow-hidden" data-testid="model-selector">
				<ModelSelector
					currentApiConfigName={currentApiConfigName}
					apiConfiguration={apiConfiguration}
					fallbackText={`${selectedProvider}:${selectedModelId}`}
					//kilocode_change: Pass virtual quota active model to ModelSelector
					virtualQuotaActiveModel={
						virtualQuotaActiveModel
							? {
									id: virtualQuotaActiveModel.id,
									name: virtualQuotaActiveModel.id,
									activeProfileNumber: virtualQuotaActiveModel.activeProfileNumber,
								}
							: undefined
					}
				/>
			</div>
			<BottomReasoningEffort
				currentApiConfigName={currentApiConfigName}
				apiConfiguration={apiConfiguration}
				modelInfo={selectedModelInfo}
			/>
		</div>
	)
}
