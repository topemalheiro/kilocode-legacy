import { memo, useState, useRef, useEffect } from "react"
import type { HistoryItem } from "@roo-code/types"

import { vscode } from "@/utils/vscode"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Pencil, Check, X } from "lucide-react"

import TaskItemFooter from "./TaskItemFooter"

interface DisplayHistoryItem extends HistoryItem {
	highlight?: string
}

interface TaskItemProps {
	item: DisplayHistoryItem
	variant: "compact" | "full"
	showWorkspace?: boolean
	isSelectionMode?: boolean
	isSelected?: boolean
	onToggleSelection?: (taskId: string, isSelected: boolean) => void
	onDelete?: (taskId: string) => void
	className?: string
}

const TaskItem = ({
	item,
	variant,
	showWorkspace = false,
	isSelectionMode = false,
	isSelected = false,
	onToggleSelection,
	onDelete,
	className,
}: TaskItemProps) => {
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState(item.customName || item.task)
	const inputRef = useRef<HTMLInputElement>(null)

	// Focus input when editing starts
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isEditing])

	// Reset edit value when item changes
	useEffect(() => {
		setEditValue(item.customName || item.task)
	}, [item.customName, item.task])

	const handleClick = () => {
		if (isEditing) return
		if (isSelectionMode && onToggleSelection) {
			onToggleSelection(item.id, !isSelected)
		} else {
			vscode.postMessage({ type: "showTaskWithId", text: item.id })
		}
	}

	const startEditing = (e: React.MouseEvent) => {
		e.stopPropagation()
		setEditValue(item.customName || item.task)
		setIsEditing(true)
	}

	const cancelEditing = () => {
		setIsEditing(false)
		setEditValue(item.customName || item.task)
	}

	const saveEditing = (e?: React.MouseEvent | React.FocusEvent) => {
		e?.stopPropagation()
		const trimmed = editValue.trim()
		if (trimmed && trimmed !== (item.customName || item.task)) {
			// Send rename to backend - text is used as taskId in the handler
			vscode.postMessage({
				type: "setTaskCustomName",
				text: item.id,
				customName: trimmed,
			})
		}
		setIsEditing(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			saveEditing()
		} else if (e.key === "Escape") {
			cancelEditing()
		}
	}

	const isCompact = variant === "compact"

	// Display name: customName if set, otherwise task
	const displayName = item.customName || item.task

	return (
		<div
			key={item.id}
			data-testid={`task-item-${item.id}`}
			className={cn(
				"cursor-pointer group bg-vscode-editor-background rounded relative overflow-hidden border border-transparent hover:bg-vscode-list-hoverBackground transition-colors",
				className,
			)}
			onClick={handleClick}>
			<div className={(!isCompact && isSelectionMode ? "pl-3 pb-3" : "pl-4") + " flex gap-3 px-3 pt-3 pb-1"}>
				{/* Selection checkbox - only in full variant */}
				{!isCompact && isSelectionMode && (
					<div
						className="task-checkbox mt-1"
						onClick={(e) => {
							e.stopPropagation()
						}}>
						<Checkbox
							checked={isSelected}
							onCheckedChange={(checked: boolean) => onToggleSelection?.(item.id, checked === true)}
							variant="description"
						/>
					</div>
				)}

				<div className="flex-1 min-w-0">
					{/* Header with task name and edit button */}
					<div className="flex items-start justify-between gap-2">
						<div
							className={cn(
								"overflow-hidden whitespace-pre-wrap font-light text-vscode-foreground text-ellipsis line-clamp-3 flex-1",
								{
									"text-base": !isCompact,
								},
								!isCompact && isSelectionMode ? "mb-1" : "",
							)}
							data-testid="task-content"
							{...(item.highlight ? { dangerouslySetInnerHTML: { __html: item.highlight } } : {})}>
							{item.highlight ? undefined : displayName}
						</div>

						{/* Pencil edit button - only show on hover */}
						<button
							className="opacity-0 group-hover:opacity-100 p-1 hover:bg-vscode-button-secondaryBackground rounded transition-opacity flex-shrink-0"
							onClick={startEditing}
							title="Rename task"
							aria-label="Rename task">
							<Pencil className="w-3.5 h-3.5 text-vscode-descriptionForeground" />
						</button>
					</div>

					{/* Edit input - inline editing mode */}
					{isEditing && (
						<div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
							<input
								ref={inputRef}
								type="text"
								value={editValue}
								onChange={(e) => setEditValue(e.target.value)}
								onKeyDown={handleKeyDown}
								onBlur={saveEditing}
								className="flex-1 px-2 py-1 text-sm bg-vscode-input-background text-vscode-foreground border border-vscode-focusBorder rounded outline-none"
								placeholder="Task name"
							/>
							<button
								onClick={saveEditing}
								className="p-1 hover:bg-vscode-button-secondaryBackground rounded"
								aria-label="Save">
								<Check className="w-3.5 h-3.5 text-vscode-testing-iconPassed" />
							</button>
							<button
								onClick={cancelEditing}
								className="p-1 hover:bg-vscode-button-secondaryBackground rounded"
								aria-label="Cancel">
								<X className="w-3.5 h-3.5 text-vscode-testing-iconFailed" />
							</button>
						</div>
					)}

					<TaskItemFooter
						item={item}
						variant={variant}
						isSelectionMode={isSelectionMode}
						onDelete={onDelete}
					/>

					{showWorkspace && item.workspace && (
						<div className="flex flex-row gap-1 text-vscode-descriptionForeground text-xs mt-1">
							<span className="codicon codicon-folder scale-80" />
							<span>{item.workspace}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default memo(TaskItem)
