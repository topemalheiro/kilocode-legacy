import { useCallback, useRef } from "react"
import { ImageAttachment, MAX_IMAGES_PER_MESSAGE } from "../state/atoms/sessions"

const ACCEPTED_IMAGE_TYPES = ["png", "jpeg", "webp", "gif"]
const ACCEPTED_MIME_TYPES = ACCEPTED_IMAGE_TYPES.map((t) => `image/${t}`).join(",")

interface UseImagePasteOptions {
	selectedImages: ImageAttachment[]
	setSelectedImages: React.Dispatch<React.SetStateAction<ImageAttachment[]>>
	disabled?: boolean
}

/**
 * Extracts file path from a File object.
 * VS Code webviews may provide the path via the 'path' property.
 */
function extractFilePath(file: File): string | undefined {
	// VS Code provides the full path in webview context
	const vsCodePath = (file as any).path
	if (vsCodePath) {
		return vsCodePath
	}

	// Fallback: use webkitRelativePath if available
	if (file.webkitRelativePath) {
		return file.webkitRelativePath
	}

	// Fallback: just use the filename
	return file.name
}

/**
 * Attempts to find a recent screenshot path.
 * This sends a message to the VS Code extension to check the Screenshots folder.
 * Returns the path if a recent screenshot is found, undefined otherwise.
 */
async function findRecentScreenshotPath(): Promise<string | undefined> {
	return new Promise((resolve) => {
		// Check if vscode is available (running in VS Code webview)
		if (typeof window !== "undefined" && (window as any).vscode) {
			// Send message to extension to find recent screenshot
			const messageHandler = (event: MessageEvent) => {
				const data = event.data
				if (data.type === "agentManager.recentScreenshot") {
					window.removeEventListener("message", messageHandler)
					resolve(data.path || undefined)
				}
			}
			window.addEventListener("message", messageHandler)

			// Request the extension to find recent screenshot
			try {
				;(window as any).vscode.postMessage({ type: "agentManager.findRecentScreenshot" })
			} catch {
				// Fallback if postMessage fails
			}

			// Timeout after 2 seconds
			setTimeout(() => {
				window.removeEventListener("message", messageHandler)
				resolve(undefined)
			}, 2000)
		} else {
			resolve(undefined)
		}
	})
}

/**
 * Hook for handling image selection from files, paste from clipboard, and drag/drop.
 * Returns handlers for file input, paste events, drag/drop, and image management.
 * Now preserves file paths for MCP tool access.
 */
export function useImagePaste({ selectedImages, setSelectedImages, disabled = false }: UseImagePasteOptions) {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const canAddMore = selectedImages.length < MAX_IMAGES_PER_MESSAGE && !disabled

	/**
	 * Convert a blob to data URL
	 */
	const blobToDataUrl = (blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				if (reader.error) {
					reject(reader.error)
				} else {
					resolve(typeof reader.result === "string" ? reader.result : "")
				}
			}
			reader.readAsDataURL(blob)
		})
	}

	/**
	 * Handle paste from clipboard.
	 * Tries to detect if it's a screenshot and find the path.
	 */
	const handlePaste = useCallback(
		async (e: React.ClipboardEvent) => {
			if (!canAddMore) return

			const items = e.clipboardData.items

			const imageItems = Array.from(items).filter((item) => {
				const [type, subtype] = item.type.split("/")
				return type === "image" && ACCEPTED_IMAGE_TYPES.includes(subtype)
			})

			if (imageItems.length === 0) return

			e.preventDefault()

			// Try to find recent screenshot path for pasted images
			const screenshotPath = await findRecentScreenshotPath()
			const source: ImageAttachment["source"] = screenshotPath ? "snipping-tool" : "clipboard"

			const remainingSlots = MAX_IMAGES_PER_MESSAGE - selectedImages.length
			const imagesToProcess = imageItems.slice(0, remainingSlots)

			const imagePromises = imagesToProcess.map(async (item) => {
				const blob = item.getAsFile()
				if (!blob) return null

				try {
					const dataUrl = await blobToDataUrl(blob)
					const attachment: ImageAttachment = {
						dataUrl,
						source,
						timestamp: Date.now(),
						// Try to get screenshot path, otherwise undefined for clipboard
						filePath: screenshotPath,
					}
					return attachment
				} catch (error) {
					console.error("Error reading pasted image:", error)
					return null
				}
			})

			const imageAttachments = await Promise.all(imagePromises)
			const validAttachments = imageAttachments.filter(
				(attachment): attachment is ImageAttachment => attachment !== null,
			)

			if (validAttachments.length > 0) {
				setSelectedImages((prevImages) => [...prevImages, ...validAttachments].slice(0, MAX_IMAGES_PER_MESSAGE))
			}
		},
		[canAddMore, setSelectedImages, selectedImages.length],
	)

	/**
	 * Handle drag and drop of files.
	 * VS Code provides file paths in the webview context.
	 */
	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			if (!canAddMore) return

			e.preventDefault()

			const files = Array.from(e.dataTransfer.files)

			if (files.length === 0) return

			const remainingSlots = MAX_IMAGES_PER_MESSAGE - selectedImages.length
			const imageFiles = files
				.filter((file) => {
					const [type, subtype] = file.type.split("/")
					return type === "image" && ACCEPTED_IMAGE_TYPES.includes(subtype)
				})
				.slice(0, remainingSlots)

			if (imageFiles.length === 0) return

			const imagePromises = imageFiles.map(async (file) => {
				try {
					const dataUrl = await blobToDataUrl(file)
					const filePath = extractFilePath(file)

					const attachment: ImageAttachment = {
						dataUrl,
						filePath,
						source: "drag",
						timestamp: Date.now(),
					}
					return attachment
				} catch (error) {
					console.error("Error reading dropped image:", error)
					return null
				}
			})

			const imageAttachments = await Promise.all(imagePromises)
			const validAttachments = imageAttachments.filter(
				(attachment): attachment is ImageAttachment => attachment !== null,
			)

			if (validAttachments.length > 0) {
				setSelectedImages((prevImages) => [...prevImages, ...validAttachments].slice(0, MAX_IMAGES_PER_MESSAGE))
			}
		},
		[canAddMore, setSelectedImages, selectedImages.length],
	)

	/**
	 * Handle file selection from the file input.
	 * Reads selected files and converts them to data URLs with paths.
	 */
	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!canAddMore) return

			const files = e.target.files
			if (!files || files.length === 0) return

			const remainingSlots = MAX_IMAGES_PER_MESSAGE - selectedImages.length
			const filesToProcess = Array.from(files).slice(0, remainingSlots)

			const imageFiles = filesToProcess.filter((file) => {
				const [type, subtype] = file.type.split("/")
				return type === "image" && ACCEPTED_IMAGE_TYPES.includes(subtype)
			})

			for (const file of imageFiles) {
				try {
					const dataUrl = await blobToDataUrl(file)
					const filePath = extractFilePath(file)

					const attachment: ImageAttachment = {
						dataUrl,
						filePath,
						source: "file-browser",
						timestamp: Date.now(),
					}

					setSelectedImages((prev) => [...prev, attachment].slice(0, MAX_IMAGES_PER_MESSAGE))
				} catch (error) {
					console.error("Error reading image file:", error)
				}
			}

			// Reset input value to allow selecting the same file again
			e.target.value = ""
		},
		[canAddMore, setSelectedImages, selectedImages.length],
	)

	/**
	 * Trigger the hidden file input to open file browser.
	 */
	const openFileBrowser = useCallback(() => {
		if (!canAddMore) return
		fileInputRef.current?.click()
	}, [canAddMore])

	const removeImage = useCallback(
		(index: number) => {
			setSelectedImages((prevImages) => prevImages.filter((_, i) => i !== index))
		},
		[setSelectedImages],
	)

	return {
		handlePaste,
		handleDrop,
		handleFileSelect,
		openFileBrowser,
		removeImage,
		canAddMore,
		fileInputRef,
		acceptedMimeTypes: ACCEPTED_MIME_TYPES,
	}
}
