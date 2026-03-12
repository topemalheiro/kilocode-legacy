import React, { createContext, useCallback, useContext, useRef, useState } from "react"

interface ThinkingBlockSyncContextValue {
	// Whether sync is enabled
	syncEnabled: boolean
	// Current expanded state to sync to (null = user hasn't interacted yet)
	expandedState: boolean | null
	// Function to update the sync state when user manually toggles
	setExpandedState: (expanded: boolean) => void
	// Register a block to receive sync updates
	registerBlock: (id: string, setCollapsed: (collapsed: boolean) => void) => void
	// Unregister a block
	unregisterBlock: (id: string) => void
}

const ThinkingBlockSyncContext = createContext<ThinkingBlockSyncContextValue | undefined>(undefined)

export const ThinkingBlockSyncProvider: React.FC<{
	children: React.ReactNode
	syncEnabled: boolean
}> = ({ children, syncEnabled }) => {
	// Track the expanded state to sync to
	const [expandedState, setExpandedState] = useState<boolean | null>(null)

	// Track registered blocks and their setCollapsed functions
	const blocksRef = useRef<Map<string, (collapsed: boolean) => void>>(new Map())

	const registerBlock = useCallback((id: string, setCollapsed: (collapsed: boolean) => void) => {
		blocksRef.current.set(id, setCollapsed)
	}, [])

	const unregisterBlock = useCallback((id: string) => {
		blocksRef.current.delete(id)
	}, [])

	const handleSetExpandedState = useCallback((expanded: boolean) => {
		setExpandedState(expanded)

		// Update all registered blocks to sync to this state
		// If expanded is true, blocks should show content (isCollapsed = false)
		// If expanded is false, blocks should hide content (isCollapsed = true)
		blocksRef.current.forEach((setCollapsed) => {
			setCollapsed(!expanded)
		})
	}, [])

	return (
		<ThinkingBlockSyncContext.Provider
			value={{
				syncEnabled,
				expandedState,
				setExpandedState: handleSetExpandedState,
				registerBlock,
				unregisterBlock,
			}}>
			{children}
		</ThinkingBlockSyncContext.Provider>
	)
}

export const useThinkingBlockSync = () => {
	const context = useContext(ThinkingBlockSyncContext)
	// Return undefined if not within provider (allows optional chaining)
	return context
}
