import { memo, useState, useCallback } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@src/components/ui"
import { StandardTooltip } from "@src/components/ui"
import { Popover, PopoverContent } from "@src/components/ui"
import { vscode } from "@src/utils/vscode"

interface TtsToggleProps {
	className?: string
}

const TtsToggle = ({ className }: TtsToggleProps) => {
	const [ttsEnabled, setTtsEnabled] = useState(true)
	const [showSettings, setShowSettings] = useState(false)
	const [playbackSpeed, setPlaybackSpeed] = useState(1.5) // Default 150%
	const [selectedVoice, setSelectedVoice] = useState("female") // Default female

	// MiniMax TTS voices - you can expand this list
	const voices = [
		{ id: "male", name: "Male (English)" },
		{ id: "female", name: "Female (English)" },
		{ id: "male_cn", name: "Male (Chinese)" },
		{ id: "female_cn", name: "Female (Chinese)" },
	]

	const toggleTts = useCallback(() => {
		const newValue = !ttsEnabled
		setTtsEnabled(newValue)
		vscode.postMessage({ type: "updateSettings", updatedSettings: { ttsEnabled: newValue } })
	}, [ttsEnabled])

	const handleSpeedChange = useCallback((speed: number) => {
		setPlaybackSpeed(speed)
		vscode.postMessage({ type: "updateSettings", updatedSettings: { ttsPlaybackSpeed: speed } })
	}, [])

	const handleVoiceChange = useCallback((voice: string) => {
		setSelectedVoice(voice)
		vscode.postMessage({ type: "updateSettings", updatedSettings: { ttsVoice: voice } })
	}, [])

	return (
		<Popover open={showSettings} onOpenChange={setShowSettings}>
			<StandardTooltip content={ttsEnabled ? "TTS Enabled - Click to disable" : "TTS Disabled - Click to enable"}>
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleTts}
					className={className}
					aria-label={ttsEnabled ? "Disable TTS" : "Enable TTS"}>
					{ttsEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
				</Button>
			</StandardTooltip>
			<PopoverContent className="w-56 p-3 bg-vscode-editor-background border-vscode-input-border">
				<div className="flex flex-col gap-3">
					<div className="text-sm font-medium text-vscode-editor-foreground">TTS Settings</div>

					{/* Playback Speed */}
					<div className="flex flex-col gap-1">
						<label className="text-xs text-vscode-descriptionForeground">
							Speed: {Math.round(playbackSpeed * 100)}%
						</label>
						<input
							type="range"
							min={0.5}
							max={3}
							step={0.25}
							value={playbackSpeed}
							onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
							className="w-full h-2 bg-vscode-progressBackground rounded-full appearance-none cursor-pointer accent-vscode-button-background"
						/>
						<div className="flex justify-between text-xs text-vscode-descriptionForeground">
							<span>50%</span>
							<span>300%</span>
						</div>
					</div>

					{/* Voice Selection */}
					<div className="flex flex-col gap-1">
						<label className="text-xs text-vscode-descriptionForeground">Voice</label>
						<select
							value={selectedVoice}
							onChange={(e) => handleVoiceChange(e.target.value)}
							className="w-full px-2 py-1 text-sm bg-vscode-input-background text-vscode-editor-foreground border border-vscode-input-border rounded">
							{voices.map((voice) => (
								<option key={voice.id} value={voice.id}>
									{voice.name}
								</option>
							))}
						</select>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}

export default memo(TtsToggle)
