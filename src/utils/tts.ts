import { spawn, type ChildProcess } from "child_process"

// kilocode_change start
import {
	playTtsPiper,
	stopPiperTts,
	setPiperBinaryPath,
	setPiperModelDir,
	PIPER_VOICES,
	PIPER_DEFAULT_VOICE,
} from "./piper-tts"
// kilocode_change end

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

// Speed variable - used by TTS
let speed = 1.5 // Default to 1.5x for faster speech

export const setTtsSpeed = (newSpeed: number) => {
	console.log("[TTS] setTtsSpeed called, speed:", newSpeed)
	speed = newSpeed
}

// Separate playback speed for TTS (used by UI) - sync with actual speed
let playbackSpeed = 1.5

export const setTtsPlaybackSpeed = (newSpeed: number) => {
	console.log("[TTS] setTtsPlaybackSpeed called, speed:", newSpeed)
	playbackSpeed = newSpeed
	// Also update the actual TTS speed
	speed = newSpeed
}

let voice = "male" // Default to male voice

// kilocode_change start
let ttsProvider: "system" | "piper" = "system"

export const setTtsProvider = (provider: "system" | "piper") => {
	console.log("[TTS] setTtsProvider called, provider:", provider)
	ttsProvider = provider
}

export const setTtsPiperBinaryPath = (path: string | undefined) => {
	setPiperBinaryPath(path)
}

export const setTtsPiperModelDir = (dir: string | undefined) => {
	setPiperModelDir(dir)
}
// kilocode_change end

// Map UI voice names to actual Windows SAPI voice names
// Note: Mark/George are OneCore voices (not available in SAPI), David is available in SAPI
const getWindowsVoiceName = (voiceName: string): string => {
	// Microsoft David Desktop is the male voice in SAPI
	// Microsoft Zira Desktop is the female voice in SAPI
	if (voiceName === "male") {
		return "Microsoft David Desktop"
	} else if (voiceName === "female") {
		return "Microsoft Zira Desktop"
	}
	// Chinese voices
	if (voiceName === "male_cn" || voiceName === "female_cn") {
		return voiceName === "male_cn" ? "Microsoft David Desktop" : "Microsoft Zira Desktop"
	}
	// Default to male voice (David - the only male in SAPI)
	return "Microsoft David Desktop"
}

// Map UI voice names to espeak-ng voices
const getLinuxVoiceName = (voiceName: string): string => {
	if (voiceName === "male") {
		return "en+m1"
	} else if (voiceName === "female") {
		return "en+f1"
	}
	if (voiceName === "male_cn") {
		return "zh"
	} else if (voiceName === "female_cn") {
		return "zh+f2"
	}
	return "en+m1"
}

// Convert speed multiplier to espeak words-per-minute
// espeak default is ~175 WPM; we treat 1.0x as 175 WPM
const getLinuxSpeedWpm = (speedMultiplier: number): number => {
	return Math.max(80, Math.min(500, Math.round(175 * speedMultiplier)))
}

// Escape special characters for PowerShell to prevent parsing errors
const escapeForPowerShell = (text: string): string => {
	// Replace problematic characters that break PowerShell's Speak command
	return text
		.replace(/'/g, "") // Remove single quotes
		.replace(/"/g, '"') // Escape double quotes
		.replace(/`/g, "``") // Escape backticks
		.replace(/\$/g, "`$") // Escape dollar signs
}

export const setTtsVoice = (newVoice: string) => {
	console.log("[TTS] setTtsVoice called, voice:", newVoice)
	voice = newVoice
}

// Track current speak operation for cleanup
let currentResolve: (() => void) | undefined = undefined
let currentSayInstance: Say | undefined = undefined
let currentLinuxProcess: ChildProcess | undefined = undefined
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

const playTtsLinux = async (message: string): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		const linuxVoice = getLinuxVoiceName(voice)
		const wpm = getLinuxSpeedWpm(speed)

		// Try espeak-ng first, fallback to espeak
		let espeakProcess: ChildProcess
		const trySpawn = (cmd: string) => {
			return spawn(cmd, ["-v", linuxVoice, "-s", String(wpm), message], {
				detached: false,
			})
		}

		espeakProcess = trySpawn("espeak-ng")
		const thisProcess = espeakProcess

		espeakProcess.on("error", (err) => {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				// espeak-ng not found, try espeak
				const fallback = trySpawn("espeak")
				const thisFallback = fallback
				fallback.on("error", (err2) => {
					console.error("[TTS] Failed to spawn espeak:", err2)
					if (currentLinuxProcess === thisFallback) {
						currentLinuxProcess = undefined
						isCurrentlyPlaying = false
					}
					reject(new Error(`Failed to spawn espeak/espeak-ng: ${err2.message}`))
				})
				fallback.on("close", (code) => {
					if (currentLinuxProcess === thisFallback) {
						currentLinuxProcess = undefined
						isCurrentlyPlaying = false
					}
					if (code === 0 || code === null) {
						resolve()
					} else {
						reject(new Error(`espeak exited with code ${code}`))
					}
				})
				currentLinuxProcess = fallback
			} else {
				console.error("[TTS] espeak-ng spawn error:", err)
				if (currentLinuxProcess === thisProcess) {
					currentLinuxProcess = undefined
					isCurrentlyPlaying = false
				}
				reject(new Error(`espeak-ng error: ${err.message}`))
			}
		})

		espeakProcess.on("close", (code) => {
			if (currentLinuxProcess === thisProcess) {
				currentLinuxProcess = undefined
				isCurrentlyPlaying = false
			}
			if (code === 0 || code === null) {
				resolve()
			} else {
				reject(new Error(`espeak-ng exited with code ${code}`))
			}
		})

		currentLinuxProcess = espeakProcess
	})
}

const playTtsInternal = async (message: string): Promise<void> => {
	// kilocode_change start
	if (ttsProvider === "piper") {
		return playTtsPiper(message, voice === PIPER_DEFAULT_VOICE ? PIPER_DEFAULT_VOICE : voice)
	}
	// kilocode_change end

	const platform = process.platform

	if (platform === "linux") {
		return playTtsLinux(message)
	}

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
		const thisResolve = resolve

		// Convert "male"/"female" to actual Windows voice names
		const windowsVoice = getWindowsVoiceName(voice)
		// Escape the message text for PowerShell (Windows only)
		const escapedMessage = platform === "win32" ? escapeForPowerShell(message) : message
		console.log("[TTS] Starting playback, voice:", voice, "-> windowsVoice:", windowsVoice, "speed:", speed)

		try {
			say.speak(escapedMessage, windowsVoice, speed, (err) => {
				console.log("[TTS] Speak finished, err:", err)

				// Only clear state if this is still the active playback
				// (guards against race conditions after stopTts or new playTts)
				if (currentResolve === thisResolve) {
					currentSayInstance = undefined
					currentResolve = undefined
					isCurrentlyPlaying = false
				}

				if (err) {
					console.error("[TTS] Speak error:", err)
					reject(new Error(err))
				} else {
					resolve()
				}
			})
		} catch (speakErr) {
			console.error("[TTS] Speak threw exception:", speakErr)
			if (currentResolve === thisResolve) {
				currentSayInstance = undefined
				currentResolve = undefined
				isCurrentlyPlaying = false
			}
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

	// kilocode_change start
	// Stop Piper if active
	stopPiperTts()
	// kilocode_change end

	// Stop the current Linux process if any
	if (currentLinuxProcess) {
		try {
			currentLinuxProcess.kill("SIGTERM")
			console.log("[TTS] Killed Linux espeak process")
		} catch (e) {
			// Ignore errors when stopping
		}
		currentLinuxProcess = undefined
	}

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
		try {
			currentResolve()
		} catch (e) {
			// Ignore errors when resolving
		}
		currentResolve = undefined
	}

	isCurrentlyPlaying = false
	console.log("[TTS] stopTts completed, isCurrentlyPlaying:", isCurrentlyPlaying)
}

// kilocode_change start
export { PIPER_VOICES, PIPER_DEFAULT_VOICE }
// kilocode_change end
