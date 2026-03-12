import { useEffect, useRef, useState, useId } from "react"
import { useTranslation } from "react-i18next"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import { useThinkingBlockSync } from "@src/context/ThinkingBlockSyncContext"

import MarkdownBlock from "../common/MarkdownBlock"
import { Lightbulb, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReasoningBlockProps {
	content: string
	ts: number
	isStreaming: boolean
	isLast: boolean
	autoExpandSubsequentThinking?: boolean
	metadata?: any
}

export const ReasoningBlock = ({ content, isStreaming, isLast, autoExpandSubsequentThinking }: ReasoningBlockProps) => {
	const { t } = useTranslation()
	const { reasoningBlockCollapsed } = useExtensionState()
	const { syncEnabled, expandedState, setExpandedState, registerBlock, unregisterBlock } =
		useThinkingBlockSync() ?? {}

	const id = useId()

	// When sync is enabled, use the sync state; otherwise use the normal collapsed state
	const getInitialState = () => {
		if (syncEnabled && expandedState !== null) {
			// Sync is enabled and user has interacted - use sync state
			return !expandedState // expandedState true means isCollapsed should be false
		}
		if (autoExpandSubsequentThinking) {
			// Legacy: if autoExpandSubsequentThinking is true, start expanded
			return false
		}
		// Default behavior
		return reasoningBlockCollapsed
	}

	const [isCollapsed, setIsCollapsed] = useState(getInitialState)

	// Register this block with the sync context
	useEffect(() => {
		if (syncEnabled && registerBlock && unregisterBlock) {
			registerBlock(id, setIsCollapsed)
			return () => {
				unregisterBlock(id)
			}
		}
	}, [syncEnabled, id, registerBlock, unregisterBlock])

	// Sync with external state changes
	useEffect(() => {
		if (syncEnabled && expandedState !== null) {
			// Sync is enabled and user has interacted - update local state
			setIsCollapsed(!expandedState)
		}
	}, [syncEnabled, expandedState])

	// Reset when global collapsed setting changes (only when not syncing)
	useEffect(() => {
		if (!syncEnabled) {
			setIsCollapsed(reasoningBlockCollapsed)
		}
	}, [reasoningBlockCollapsed, syncEnabled])

	const startTimeRef = useRef<number>(Date.now())
	const [elapsed, setElapsed] = useState<number>(0)
	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isLast && isStreaming) {
			const tick = () => setElapsed(Date.now() - startTimeRef.current)
			tick()
			const id = setInterval(tick, 1000)
			return () => clearInterval(id)
		}
	}, [isLast, isStreaming])

	const seconds = Math.floor(elapsed / 1000)
	const secondsLabel = t("chat:reasoning.seconds", { count: seconds })

	const handleToggle = () => {
		const newCollapsed = !isCollapsed
		setIsCollapsed(newCollapsed)

		// If sync is enabled, update the sync state
		if (syncEnabled && setExpandedState) {
			// If newCollapsed is true (collapsed), then expanded should be false
			// If newCollapsed is false (expanded), then expanded should be true
			setExpandedState(!newCollapsed)
		}
	}

	return (
		<div className="group">
			<div
				className="flex items-center justify-between pr-2 cursor-pointer select-none opacity-40 hover:opacity-100 transition-opacity" // kilocode_change: removed mb-2.5, added opacity
				onClick={handleToggle}>
				<div className="flex items-center gap-2">
					<Lightbulb className="w-4" />
					{/* kilocode_change start */}
					<span className="text-sm text-vscode-foreground">{t("chat:reasoning.thinking")}</span>
					{/* kilocode_change end */}
					{elapsed > 0 && (
						<span className="text-sm text-vscode-descriptionForeground mt-0.5">{secondsLabel}</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<ChevronUp
						className={cn(
							"w-4 transition-all opacity-0 group-hover:opacity-100",
							isCollapsed && "-rotate-180",
						)}
					/>
				</div>
			</div>
			{(content?.trim()?.length ?? 0) > 0 && !isCollapsed && (
				<div
					ref={contentRef}
					className="border-l border-vscode-descriptionForeground/20 ml-2 pl-4 pb-1 text-vscode-descriptionForeground">
					<MarkdownBlock markdown={content} />
				</div>
			)}
		</div>
	)
}
