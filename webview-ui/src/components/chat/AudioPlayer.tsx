import { useState, useRef, useCallback, memo } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Button } from "@src/components/ui"
import { cn } from "@src/lib/utils"

interface AudioPlayerProps {
	audioData: string // base64 encoded audio or data URL
	format?: "mp3" | "wav" | "ogg" | "webm"
	className?: string
}

const AudioPlayerInternal = ({ audioData, format = "mp3", className }: AudioPlayerProps) => {
	const [isPlaying, setIsPlaying] = useState(false)
	const [isMuted, setIsMuted] = useState(false)
	const [duration, setDuration] = useState<number>(0)
	const [currentTime, setCurrentTime] = useState<number>(0)
	const audioRef = useRef<HTMLAudioElement | null>(null)

	// Convert base64 to blob URL if needed
	const audioSrc = useCallback(() => {
		if (audioData.startsWith("data:") || audioData.startsWith("http")) {
			return audioData
		}
		// Assume base64 encoded audio
		const mimeType = format === "wav" ? "audio/wav" : format === "ogg" ? "audio/ogg" : "audio/mpeg"
		return `data:${mimeType};base64,${audioData}`
	}, [audioData, format])

	const handlePlayPause = useCallback(() => {
		if (!audioRef.current) return

		if (isPlaying) {
			audioRef.current.pause()
		} else {
			audioRef.current.play()
		}
		setIsPlaying(!isPlaying)
	}, [isPlaying])

	const handleTimeUpdate = useCallback(() => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime)
		}
	}, [])

	const handleLoadedMetadata = useCallback(() => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration)
		}
	}, [])

	const handleEnded = useCallback(() => {
		setIsPlaying(false)
		setCurrentTime(0)
		if (audioRef.current) {
			audioRef.current.currentTime = 0
		}
	}, [])

	const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const time = parseFloat(e.target.value)
		if (audioRef.current) {
			audioRef.current.currentTime = time
			setCurrentTime(time)
		}
	}, [])

	const toggleMute = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.muted = !isMuted
			setIsMuted(!isMuted)
		}
	}, [isMuted])

	const formatTime = (time: number): string => {
		if (isNaN(time)) return "0:00"
		const minutes = Math.floor(time / 60)
		const seconds = Math.floor(time % 60)
		return `${minutes}:${seconds.toString().padStart(2, "0")}`
	}

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0

	return (
		<div className={cn("flex flex-col gap-2 p-3 bg-vscode-editor-background rounded-md", className)}>
			<audio
				ref={audioRef}
				src={audioSrc()}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleLoadedMetadata}
				onEnded={handleEnded}
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				preload="metadata"
			/>

			<div className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon"
					onClick={handlePlayPause}
					className="size-10 flex-shrink-0"
					aria-label={isPlaying ? "Pause" : "Play"}>
					{isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
				</Button>

				<div className="flex-1 flex flex-col gap-1">
					<input
						type="range"
						min={0}
						max={duration || 100}
						value={currentTime}
						onChange={handleSeek}
						className="w-full h-2 bg-vscode-progressBackground rounded-full appearance-none cursor-pointer accent-vscode-button-background"
						style={{
							background: `linear-gradient(to right, var(--vscode-button-background) ${progress}%, var(--vscode-progressBackground) ${progress}%)`,
						}}
					/>
					<div className="flex justify-between text-xs text-vscode-descriptionForeground">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>

				<Button
					variant="ghost"
					size="icon"
					onClick={toggleMute}
					className="size-8 flex-shrink-0"
					aria-label={isMuted ? "Unmute" : "Mute"}>
					{isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
				</Button>
			</div>
		</div>
	)
}

export const AudioPlayer = memo(AudioPlayerInternal)

/**
 * Check if a string appears to be base64 encoded audio data
 */
export const isBase64Audio = (str: string): boolean => {
	if (!str || str.length < 100) return false

	// Check for data URL
	if (str.startsWith("data:audio/")) return true

	// Check for common base64 audio patterns (long base64 strings with audio-like characteristics)
	const trimmed = str.trim()
	if (/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
		// Likely base64 - check if it's a reasonable length for audio
		return trimmed.length >= 1000
	}

	return false
}

/**
 * Extract audio data from MCP tool response
 */
export const extractAudioData = (response: string): { isAudio: boolean; data: string; format: string } => {
	const trimmed = response.trim()

	// Check for data URL
	if (trimmed.startsWith("data:audio/")) {
		const match = trimmed.match(/data:audio\/(\w+);base64,(.+)/)
		if (match) {
			return { isAudio: true, data: match[2], format: match[1] as "mp3" | "wav" | "ogg" }
		}
	}

	// Check for JSON with audio data
	try {
		const parsed = JSON.parse(trimmed)
		// Check common audio response fields
		const audioField = parsed.audio || parsed.audio_data || parsed.data || parsed.audio_base64 || parsed.result
		if (audioField && typeof audioField === "string" && isBase64Audio(audioField)) {
			return { isAudio: true, data: audioField, format: "mp3" }
		}
		// Check for nested audio object
		if (parsed.audio && typeof parsed.audio === "object") {
			const nestedAudio = parsed.audio.audio || parsed.audio.data || parsed.audio.base64
			if (nestedAudio && isBase64Audio(nestedAudio)) {
				return { isAudio: true, data: nestedAudio, format: "mp3" }
			}
		}
	} catch {
		// Not JSON, check if it's raw base64
	}

	// Check for raw base64 audio
	if (isBase64Audio(trimmed)) {
		return { isAudio: true, data: trimmed, format: "mp3" }
	}

	return { isAudio: false, data: "", format: "mp3" }
}
