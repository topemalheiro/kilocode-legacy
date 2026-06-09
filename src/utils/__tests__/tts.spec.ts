import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { spawn, type ChildProcess } from "child_process"
import type { EventEmitter } from "events"
import * as tts from "../tts"

vi.mock("child_process", () => ({
	spawn: vi.fn(),
}))

const mockedSpawn = vi.mocked(spawn)

describe("TTS Utils", () => {
	let originalPlatform: PropertyDescriptor | undefined

	beforeEach(() => {
		originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
		mockedSpawn.mockClear()
		tts.stopTts()
	})

	afterEach(() => {
		if (originalPlatform) {
			Object.defineProperty(process, "platform", originalPlatform)
		}
		tts.stopTts()
		vi.clearAllMocks()
	})

	function createFakeProcess() {
		const fakeProcess = Object.assign(Object.create(require("events").EventEmitter.prototype), {
			pid: 12345,
			kill: vi.fn(),
		}) as EventEmitter & { pid: number; kill: ReturnType<typeof vi.fn> }
		return fakeProcess
	}

	describe("Linux", () => {
		beforeEach(() => {
			Object.defineProperty(process, "platform", { value: "linux" })
		})

		it("spawns espeak-ng with correct arguments", async () => {
			tts.setTtsEnabled(true)
			tts.setTtsVoice("male")
			tts.setTtsSpeed(1.5)

			const fake = createFakeProcess()
			mockedSpawn.mockReturnValue(fake as unknown as ChildProcess)

			tts.playTts("hello world")
			await vi.waitFor(() => expect(mockedSpawn).toHaveBeenCalled())

			expect(mockedSpawn).toHaveBeenCalledWith("espeak-ng", ["-v", "en+m1", "-s", "263", "hello world"], {
				detached: false,
			})
		})

		it("uses female voice when configured", async () => {
			tts.setTtsEnabled(true)
			tts.setTtsVoice("female")
			tts.setTtsSpeed(1.0)

			const fake = createFakeProcess()
			mockedSpawn.mockReturnValue(fake as unknown as ChildProcess)

			tts.playTts("test")
			await vi.waitFor(() => expect(mockedSpawn).toHaveBeenCalled())

			expect(mockedSpawn).toHaveBeenCalledWith("espeak-ng", ["-v", "en+f1", "-s", "175", "test"], {
				detached: false,
			})
		})

		it("falls back to espeak when espeak-ng is not found", async () => {
			tts.setTtsEnabled(true)
			tts.setTtsVoice("male")
			tts.setTtsSpeed(1.0)

			const err = new Error("ENOENT") as NodeJS.ErrnoException
			err.code = "ENOENT"

			const espeakNgFake = createFakeProcess()
			const espeakFake = createFakeProcess()

			mockedSpawn.mockImplementation((cmd: string) => {
				if (cmd === "espeak-ng") {
					setImmediate(() => espeakNgFake.emit("error", err))
					return espeakNgFake as unknown as ChildProcess
				}
				if (cmd === "espeak") {
					setImmediate(() => espeakFake.emit("close", 0))
					return espeakFake as unknown as ChildProcess
				}
				const fallback = createFakeProcess()
				setImmediate(() => fallback.emit("close", 0))
				return fallback as unknown as ChildProcess
			})

			tts.playTts("fallback test")
			await vi.waitFor(() => expect(mockedSpawn).toHaveBeenCalledTimes(2))

			expect(mockedSpawn).toHaveBeenNthCalledWith(1, "espeak-ng", expect.any(Array), { detached: false })
			expect(mockedSpawn).toHaveBeenNthCalledWith(2, "espeak", expect.any(Array), { detached: false })
		})

		it("attempts fallback when both espeak-ng and espeak are missing", async () => {
			tts.setTtsEnabled(true)

			const err = new Error("ENOENT") as NodeJS.ErrnoException
			err.code = "ENOENT"

			mockedSpawn.mockImplementation(() => {
				const fake = createFakeProcess()
				setImmediate(() => fake.emit("error", err))
				return fake as unknown as ChildProcess
			})

			// playTts is fire-and-forget; test via side effects.
			tts.playTts("failure")
			await vi.waitFor(() => expect(mockedSpawn).toHaveBeenCalledTimes(2))
			expect(mockedSpawn).toHaveBeenNthCalledWith(1, "espeak-ng", expect.any(Array), { detached: false })
			expect(mockedSpawn).toHaveBeenNthCalledWith(2, "espeak", expect.any(Array), { detached: false })
		})

		it("stops the current Linux process and clears the queue", async () => {
			tts.setTtsEnabled(true)

			const fake = createFakeProcess()
			mockedSpawn.mockReturnValue(fake as unknown as ChildProcess)

			tts.playTts("long message that we will interrupt")
			await vi.waitFor(() => expect(mockedSpawn).toHaveBeenCalled())

			tts.stopTts()
			expect(fake.kill).toHaveBeenCalledWith("SIGTERM")
		})

		it("skips playback when TTS is disabled", async () => {
			tts.setTtsEnabled(false)

			tts.playTts("should not play")
			await new Promise((r) => setTimeout(r, 50))

			expect(mockedSpawn).not.toHaveBeenCalled()
		})

		it("skips empty messages", async () => {
			tts.setTtsEnabled(true)

			tts.playTts("   ")
			await new Promise((r) => setTimeout(r, 50))

			expect(mockedSpawn).not.toHaveBeenCalled()
		})

		it("does not lose process reference when stopTts is called and new playback starts before close event", async () => {
			tts.setTtsEnabled(true)

			const fake1 = createFakeProcess()
			const fake2 = createFakeProcess()

			// First spawn returns fake1
			mockedSpawn.mockReturnValueOnce(fake1 as unknown as ChildProcess)
			// Second spawn returns fake2
			mockedSpawn.mockReturnValueOnce(fake2 as unknown as ChildProcess)

			// Start first playback
			tts.playTts("first message")
			await vi.waitFor(() => expect(mockedSpawn).toHaveBeenCalledTimes(1))

			// Stop TTS (kills fake1)
			tts.stopTts()
			expect(fake1.kill).toHaveBeenCalledWith("SIGTERM")

			// Start second playback BEFORE fake1 emits close
			tts.playTts("second message")
			await vi.waitFor(() => expect(mockedSpawn).toHaveBeenCalledTimes(2))

			// Now fake1 emits close (as if it took a moment to exit)
			fake1.emit("close", 143)

			// Wait a tick for any async handlers
			await new Promise((r) => setImmediate(r))

			// stopTts should still be able to kill fake2
			tts.stopTts()
			expect(fake2.kill).toHaveBeenCalledWith("SIGTERM")
		})
	})
})
