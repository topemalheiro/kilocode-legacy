import { useEffect, useRef, useState } from "react"
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
	metadata?: any
}

export const ReasoningBlock = ({ content, isStreaming, isLast }: ReasoningBlockProps) => {
	const { t } = useTranslation()
	const { reasoningBlockCollapsed, autoExpandSubsequentThinking } = useExtensionState()
	const { syncedExpanded, setSyncedExpanded } = useThinkingBlockSync()

	const [isCollapsed, setIsCollapsed] = useState(reasoningBlockCollapsed)
	// Track if THIS specific block is the one that triggered the sync
	const [isLeader, setIsLeader] = useState(false)

	const startTimeRef = useRef<number>(Date.now())
	const [elapsed, setElapsed] = useState<number>(0)
	const contentRef = useRef<HTMLDivElement>(null)

	// When sync state changes, update local state (but not if we're the leader - we already handled it)
	useEffect(() => {
		if (autoExpandSubsequentThinking && syncedExpanded !== null && !isLeader) {
			setIsCollapsed(!syncedExpanded)
		}
	}, [autoExpandSubsequentThinking, syncedExpanded, isLeader])

	useEffect(() => {
		// Reset to default when sync is disabled
		if (!autoExpandSubsequentThinking) {
			setIsLeader(false)
		}
	}, [autoExpandSubsequentThinking])

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

	// Track if this specific block is the one that triggered the sync
	const handleToggle = () => {
		// If sync is enabled and this block is not yet the leader
		if (autoExpandSubsequentThinking && !isLeader) {
			// Mark this block as the leader (the one that controls sync)
			setIsLeader(true)
			// Update the synced state to match current collapsed state
			setSyncedExpanded(isCollapsed ?? false)
		}
		// Toggle locally
		setIsCollapsed(!isCollapsed)
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
							"w-4 transition-all",
							// Always show when sync is enabled (so user knows they can click), otherwise show on hover
							autoExpandSubsequentThinking ? "opacity-100" : "opacity-0 group-hover:opacity-100",
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
