import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react"

export interface ThinkingBlockSyncContextValue {
	// The current expanded/collapsed state that all blocks should sync to
	syncedExpanded: boolean | null
	// Set to true when user manually toggles a block (leader)
	isLeader: boolean
	// Called when a thinking block is toggled
	setSyncedExpanded: (expanded: boolean) => void
	// Mark this block as the leader (first one toggled)
	markAsLeader: () => void
	// Reset sync state (e.g., when new messages arrive)
	resetSync: () => void
}

const ThinkingBlockSyncContext = createContext<ThinkingBlockSyncContextValue | null>(null)

export const useThinkingBlockSync = () => {
	const context = useContext(ThinkingBlockSyncContext)
	if (!context) {
		throw new Error("useThinkingBlockSync must be used within ThinkingBlockSyncProvider")
	}
	return context
}

interface ThinkingBlockSyncProviderProps {
	children: React.ReactNode
}

export const ThinkingBlockSyncProvider: React.FC<ThinkingBlockSyncProviderProps> = ({ children }) => {
	const [syncedExpanded, setSyncedExpanded] = useState<boolean | null>(null)
	const [isLeader, setIsLeader] = useState(false)
	const leaderRef = useRef(false)

	const markAsLeader = useCallback(() => {
		if (!leaderRef.current) {
			leaderRef.current = true
			setIsLeader(true)
		}
	}, [])

	const handleSetSyncedExpanded = useCallback((expanded: boolean) => {
		setSyncedExpanded(expanded)
	}, [])

	const resetSync = useCallback(() => {
		setSyncedExpanded(null)
		setIsLeader(false)
		leaderRef.current = false
	}, [])

	// Reset when component unmounts
	useEffect(() => {
		return () => {
			resetSync()
		}
	}, [resetSync])

	const value: ThinkingBlockSyncContextValue = {
		syncedExpanded,
		isLeader,
		setSyncedExpanded: handleSetSyncedExpanded,
		markAsLeader,
		resetSync,
	}

	return <ThinkingBlockSyncContext.Provider value={value}>{children}</ThinkingBlockSyncContext.Provider>
}
