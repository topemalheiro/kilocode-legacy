import { spawn, type ChildProcess } from "child_process"
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

// kilocode_change - new file

const PIPER_VOICES_BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high"

export const PIPER_DEFAULT_VOICE = "en_US-ryan-high"

export interface PiperVoice {
	id: string
	name: string
	onnxUrl: string
	jsonUrl: string
	onnxFilename: string
	jsonFilename: string
}

export const PIPER_VOICES: PiperVoice[] = [
	{
		id: "en_US-ryan-high",
		name: "Ryan (Piper) — US English Male",
		onnxUrl: `${PIPER_VOICES_BASE_URL}/en_US-ryan-high.onnx`,
		jsonUrl: `${PIPER_VOICES_BASE_URL}/en_US-ryan-high.onnx.json`,
		onnxFilename: "en_US-ryan-high.onnx",
		jsonFilename: "en_US-ryan-high.onnx.json",
	},
]

let piperBinaryPath: string | undefined = undefined

export const setPiperBinaryPath = (path: string | undefined) => {
	piperBinaryPath = path
}

let piperModelDir: string | undefined = undefined

export const setPiperModelDir = (dir: string | undefined) => {
	piperModelDir = dir
}

let currentPiperProcess: ChildProcess | undefined = undefined

/**
 * Find the piper executable. Checks the configured path first, then PATH.
 */
export const findPiperBinary = async (): Promise<string | undefined> => {
	if (piperBinaryPath) {
		try {
			await fs.access(piperBinaryPath)
			return piperBinaryPath
		} catch {
			// fallthrough
		}
	}

	// Try to find piper in PATH
	const platform = process.platform
	const binaryName = platform === "win32" ? "piper.exe" : "piper"

	const pathEnv = process.env.PATH || ""
	const pathDirs = pathEnv.split(platform === "win32" ? ";" : ":")

	for (const dir of pathDirs) {
		const fullPath = path.join(dir, binaryName)
		try {
			await fs.access(fullPath)
			return fullPath
		} catch {
			// continue searching
		}
	}

	return undefined
}

/**
 * Check if a Piper voice model is downloaded (both .onnx and .json files exist).
 */
export const isVoiceDownloaded = async (voiceId: string): Promise<boolean> => {
	const voice = PIPER_VOICES.find((v) => v.id === voiceId)
	if (!voice || !piperModelDir) {
		return false
	}

	try {
		await fs.access(path.join(piperModelDir, voice.onnxFilename))
		await fs.access(path.join(piperModelDir, voice.jsonFilename))
		return true
	} catch {
		return false
	}
}

/**
 * Download a Piper voice model from Hugging Face to the model directory.
 */
export const downloadPiperVoice = async (
	voiceId: string,
	onProgress?: (downloaded: number, total: number) => void,
): Promise<void> => {
	const voice = PIPER_VOICES.find((v) => v.id === voiceId)
	if (!voice) {
		throw new Error(`Unknown Piper voice: ${voiceId}`)
	}
	if (!piperModelDir) {
		throw new Error("Piper model directory not set")
	}

	await fs.mkdir(piperModelDir, { recursive: true })

	// Download both .onnx and .json files
	await downloadFile(voice.onnxUrl, path.join(piperModelDir, voice.onnxFilename), onProgress)
	await downloadFile(voice.jsonUrl, path.join(piperModelDir, voice.jsonFilename))
}

const downloadFile = async (
	url: string,
	destPath: string,
	onProgress?: (downloaded: number, total: number) => void,
): Promise<void> => {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
	}

	const total = parseInt(response.headers.get("content-length") || "0")
	const fileHandle = await fs.open(destPath, "w")

	try {
		if (!response.body) {
			throw new Error("No response body")
		}

		const reader = response.body.getReader()
		let downloaded = 0

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			if (value) {
				await fileHandle.write(value)
				downloaded += value.length
				onProgress?.(downloaded, total)
			}
		}
	} finally {
		await fileHandle.close()
	}
}

/**
 * Get the full path to a voice model's .onnx file.
 */
export const getVoiceModelPath = (voiceId: string): string | undefined => {
	const voice = PIPER_VOICES.find((v) => v.id === voiceId)
	if (!voice || !piperModelDir) {
		return undefined
	}
	return path.join(piperModelDir, voice.onnxFilename)
}

/**
 * Play TTS using Piper. Generates a WAV file and plays it with sound-play.
 */
export const playTtsPiper = async (message: string, voiceId: string): Promise<void> => {
	const piperPath = await findPiperBinary()
	if (!piperPath) {
		throw new Error(
			"Piper binary not found. Please install Piper (https://github.com/rhasspy/piper) and ensure it is in your PATH, or set the path in settings.",
		)
	}

	const modelPath = getVoiceModelPath(voiceId)
	if (!modelPath) {
		throw new Error(`Piper model path not set for voice: ${voiceId}`)
	}

	try {
		await fs.access(modelPath)
	} catch {
		throw new Error(`Piper model not found: ${modelPath}. Please download the voice model in settings.`)
	}

	const tempDir = os.tmpdir()
	const tempWav = path.join(tempDir, `kilo-code-piper-${Date.now()}.wav`)

	return new Promise<void>((resolve, reject) => {
		const piperProcess = spawn(piperPath, ["--model", modelPath, "--output_file", tempWav], {
			detached: false,
		})

		currentPiperProcess = piperProcess
		const thisProcess = piperProcess

		// Write the message to stdin
		piperProcess.stdin?.write(message)
		piperProcess.stdin?.end()

		piperProcess.on("error", (err) => {
			if (currentPiperProcess === thisProcess) {
				currentPiperProcess = undefined
			}
			reject(new Error(`Piper process error: ${err.message}`))
		})

		piperProcess.on("close", async (code) => {
			if (currentPiperProcess === thisProcess) {
				currentPiperProcess = undefined
			}

			if (code !== 0 && code !== null) {
				reject(new Error(`Piper exited with code ${code}`))
				return
			}

			// Play the generated WAV file
			try {
				const soundPlay = require("sound-play")
				await soundPlay.play(tempWav)
				resolve()
			} catch (playErr) {
				console.error("[TTS] Failed to play WAV:", playErr)
				reject(new Error(`Failed to play audio: ${playErr}`))
			} finally {
				// Clean up temp file
				try {
					await fs.unlink(tempWav)
				} catch {
					// ignore cleanup errors
				}
			}
		})
	})
}

/**
 * Stop the current Piper TTS playback.
 */
export const stopPiperTts = () => {
	if (currentPiperProcess) {
		try {
			currentPiperProcess.kill("SIGTERM")
		} catch {
			// ignore
		}
		currentPiperProcess = undefined
	}
}
