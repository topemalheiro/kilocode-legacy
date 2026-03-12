import React, { useCallback, useRef, useEffect, useMemo } from "react"
import { SlashCommand, getMatchingSlashCommands } from "@/utils/slash-commands"
import { useExtensionState } from "@/context/ExtensionStateContext" // kilocode_change

interface SlashCommandMenuProps {
	onSelect: (command: SlashCommand) => void
	selectedIndex: number
	setSelectedIndex: (index: number) => void
	onMouseDown: () => void
	query: string
	customModes?: any[]
}

// Group commands by source type
interface GroupedCommands {
	commands: SlashCommand[]
	modes: SlashCommand[]
	skills: SlashCommand[]
	workflows: SlashCommand[]
}

const getSourceIcon = (source?: string) => {
	switch (source) {
		case "skill":
			return "✨"
		case "mode":
			return "⚡"
		case "workflow":
			return "🔄"
		case "command":
		default:
			return "📝"
	}
}

const getSourceLabel = (source?: string, skillType?: "workspace" | "global") => {
	switch (source) {
		case "skill":
			return skillType === "workspace" ? "Workspace Skill" : "Global Skill"
		case "mode":
			return "Mode"
		case "workflow":
			return "Workflow"
		case "command":
		default:
			return "Command"
	}
}

const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
	onSelect,
	selectedIndex,
	setSelectedIndex,
	onMouseDown,
	query,
	customModes,
}) => {
	const { localWorkflows, globalWorkflows } = useExtensionState() // kilocode_change
	const menuRef = useRef<HTMLDivElement>(null)

	const handleClick = useCallback(
		(command: SlashCommand) => {
			onSelect(command)
		},
		[onSelect],
	)

	// Auto-scroll logic remains the same...
	useEffect(() => {
		if (menuRef.current) {
			const selectedElement = menuRef.current.children[selectedIndex] as HTMLElement
			if (selectedElement) {
				const menuRect = menuRef.current.getBoundingClientRect()
				const selectedRect = selectedElement.getBoundingClientRect()

				if (selectedRect.bottom > menuRect.bottom) {
					menuRef.current.scrollTop += selectedRect.bottom - menuRect.bottom
				} else if (selectedRect.top < menuRect.top) {
					menuRef.current.scrollTop -= menuRect.top - selectedRect.top
				}
			}
		}
	}, [selectedIndex])

	// Filter commands based on query
	const filteredCommands = getMatchingSlashCommands(query, customModes, localWorkflows, globalWorkflows) // kilocode_change

	// Group commands by source type
	const groupedCommands = useMemo((): GroupedCommands => {
		const result: GroupedCommands = {
			commands: [],
			modes: [],
			skills: [],
			workflows: [],
		}
		filteredCommands.forEach((cmd) => {
			switch (cmd.source) {
				case "skill":
					result.skills.push(cmd)
					break
				case "mode":
					result.modes.push(cmd)
					break
				case "workflow":
					result.workflows.push(cmd)
					break
				case "command":
				default:
					result.commands.push(cmd)
			}
		})
		return result
	}, [filteredCommands])

	// Flatten with section headers
	const flattenedItems = useMemo(() => {
		const items: (SlashCommand | { type: "header"; label: string })[] = []
		if (groupedCommands.commands.length > 0) {
			items.push({ type: "header", label: "Commands" })
			items.push(...groupedCommands.commands)
		}
		if (groupedCommands.modes.length > 0) {
			items.push({ type: "header", label: "Modes" })
			items.push(...groupedCommands.modes)
		}
		if (groupedCommands.skills.length > 0) {
			items.push({ type: "header", label: "Skills" })
			items.push(...groupedCommands.skills)
		}
		if (groupedCommands.workflows.length > 0) {
			items.push({ type: "header", label: "Workflows" })
			items.push(...groupedCommands.workflows)
		}
		return items
	}, [groupedCommands])

	// Calculate actual index considering headers
	const getDisplayIndex = (item: SlashCommand | { type: "header"; label: string }): number => {
		if ("type" in item && item.type === "header") return -1
		return flattenedItems.findIndex((i) => !("type" in i) && "name" in i && i.name === (item as SlashCommand).name)
	}

	return (
		<div
			className="absolute bottom-[calc(100%-10px)] left-[15px] right-[15px] overflow-x-hidden z-[1000]"
			onMouseDown={onMouseDown}>
			<div
				ref={menuRef}
				className="bg-[var(--vscode-dropdown-background)] border border-[var(--vscode-editorGroup-border)] rounded-[3px] shadow-[0_4px_10px_rgba(0,0,0,0.25)] flex flex-col max-h-[200px] overflow-y-auto" // Corrected rounded and shadow
			>
				{flattenedItems.length > 0 ? (
					flattenedItems.map((item, _index) => {
						// Header item
						if ("type" in item && item.type === "header") {
							return (
								<div
									key={`header-${item.label}`}
									className="py-1 px-3 bg-[var(--vscode-editorGroup-header-background)] text-[var(--vscode-descriptionForeground)] text-xs font-semibold border-b border-[var(--vscode-editorGroup-border)]">
									{item.label}
								</div>
							)
						}
						const command = item as SlashCommand
						const isSelected = getDisplayIndex(command) === selectedIndex
						return (
							<div
								key={command.name}
								className={`py-2 px-3 cursor-pointer flex flex-col border-b border-[var(--vscode-editorGroup-border)] ${
									isSelected
										? "bg-[var(--vscode-quickInputList-focusBackground)] text-[var(--vscode-quickInputList-focusForeground)]"
										: ""
								} hover:bg-[var(--vscode-list-hoverBackground)]`}
								onClick={() => handleClick(command)}
								onMouseEnter={() => setSelectedIndex(getDisplayIndex(command))}>
								<div className="flex items-center gap-2">
									<span className="text-sm">{getSourceIcon(command.source)}</span>
									<div className="font-bold whitespace-nowrap overflow-hidden text-ellipsis">
										/{command.name}
									</div>
									{command.source === "skill" && (
										<span className="text-[0.7em] px-1.5 py-0.5 rounded bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
											{command.skillType === "workspace" ? "WS" : "GL"}
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 mt-0.5">
									<div className="text-[0.85em] text-[var(--vscode-descriptionForeground)] whitespace-normal overflow-hidden text-ellipsis flex-1">
										{command.description}
									</div>
									<div className="text-[0.7em] text-[var(--vscode-disabledForeground)]">
										{getSourceLabel(command.source, command.skillType)}
									</div>
								</div>
							</div>
						)
					})
				) : (
					<div className="py-2 px-3 cursor-default flex flex-col">
						{" "}
						{/* Corrected padding, removed border, changed cursor */}
						<div className="text-[0.85em] text-[var(--vscode-descriptionForeground)]">
							No matching commands found
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default SlashCommandMenu
