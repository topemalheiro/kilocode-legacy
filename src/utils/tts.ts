interface Say {
	speak: (text: string, voice?: string, speed?: number, callback?: (err?: string) => void) => void
	stop: () => void
}

type PlayTtsOptions = {
	onStart?: () => void
	onStop?: () => void
}

let isTtsEnabled = false

export const setTtsEnabled = (enabled: boolean) => {
	console.log("[TTS] setTtsEnabled called, enabled:", enabled)
	isTtsEnabled = enabled
}

let speed = 1.0

export const setTtsSpeed = (newSpeed: number) => {
	console.log("[TTS] setTtsSpeed called, speed:", newSpeed)
	speed = newSpeed
}

// Separate playback speed for TTS (used by UI)
let playbackSpeed = 1.5

export const setTtsPlaybackSpeed = (newSpeed: number) => {
	console.log("[TTS] setTtsPlaybackSpeed called, speed:", newSpeed)
	playbackSpeed = newSpeed
}

let voice = "male" // Default to male voice

export const setTtsVoice = (newVoice: string) => {
	console.log("[TTS] setTtsVoice called, voice:", newVoice)
	voice = newVoice
}

// Track current speak operation for cleanup
let currentResolve: (() => void) | undefined = undefined
let currentSayInstance: Say | undefined = undefined
let isCurrentlyPlaying = false

// Queue for TTS messages
const ttsQueue: string[] = []
let isProcessingQueue = false

const processQueue = async () => {
	if (isProcessingQueue || ttsQueue.length === 0) {
		return
	}

	isProcessingQueue = true
	console.log("[TTS] Processing queue, items:", ttsQueue.length)

	while (ttsQueue.length > 0) {
		const message = ttsQueue.shift()
		if (message) {
			console.log("[TTS] Playing from queue, remaining:", ttsQueue.length)
			await playTtsInternal(message)
		}
	}

	isProcessingQueue = false
	console.log("[TTS] Queue processing complete")
}

const playTtsInternal = async (message: string): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		let say: Say
		try {
			say = require("say")
		} catch (err) {
			console.error("[TTS] Failed to load 'say' package:", err)
			reject(new Error(`Failed to load say package: ${err}`))
			return
		}

		currentSayInstance = say
		currentResolve = resolve

		console.log("[TTS] Starting playback, voice:", voice, "speed:", speed)

		try {
			say.speak(message, voice, speed, (err) => {
				console.log("[TTS] Speak finished, err:", err)

				currentSayInstance = undefined
				currentResolve = undefined
				isCurrentlyPlaying = false

				if (err) {
					console.error("[TTS] Speak error:", err)
					reject(new Error(err))
				} else {
					resolve()
				}
			})
		} catch (speakErr) {
			console.error("[TTS] Speak threw exception:", speakErr)
			currentSayInstance = undefined
			currentResolve = undefined
			isCurrentlyPlaying = false
			reject(new Error(`Speak failed: ${speakErr}`))
		}
	})
}

export const playTts = async (message: string, options: PlayTtsOptions = {}) => {
	console.log(
		"[TTS] playTts called, message length:",
		message?.length,
		"isTtsEnabled:",
		isTtsEnabled,
		"voice:",
		voice,
		"speed:",
		speed,
	)

	if (!isTtsEnabled) {
		console.log("[TTS] TTS not enabled, skipping. isTtsEnabled =", isTtsEnabled)
		return
	}

	// Ensure we have a valid message
	if (!message || message.trim() === "") {
		console.log("[TTS] Empty message, skipping")
		return
	}

	// Add to queue
	ttsQueue.push(message)
	console.log("[TTS] Added to queue, total items:", ttsQueue.length)

	// Process the queue if not already processing
	if (!isCurrentlyPlaying && !isProcessingQueue) {
		// Start processing
		isCurrentlyPlaying = true
		options.onStart?.()

		processQueue()
			.then(() => {
				console.log("[TTS] All queued messages processed")
				options.onStop?.()
			})
			.catch((error) => {
				console.error("[TTS] Queue processing error:", error)
				options.onStop?.()
			})
	}
}

export const stopTts = () => {
	console.log("[TTS] stopTts called, isCurrentlyPlaying:", isCurrentlyPlaying)

	// Clear the queue
	ttsQueue.length = 0
	isProcessingQueue = false
	console.log("[TTS] Cleared TTS queue")

	// Stop the current say instance if any
	if (currentSayInstance) {
		try {
			currentSayInstance.stop()
			console.log("[TTS] Stopped say instance")
		} catch (e) {
			// Ignore errors when stopping
		}
		currentSayInstance = undefined
	}

	// Resolve any pending promise to prevent hanging
	if (currentResolve) {
		currentResolve()
		currentResolve = undefined
	}

	isCurrentlyPlaying = false
	console.log("[TTS] stopTts completed, isCurrentlyPlaying:", isCurrentlyPlaying)
}

// Export function to check if TTS is currently playing
export const isTtsPlaying = () => isCurrentlyPlaying
