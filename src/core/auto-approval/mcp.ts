import type { McpServerUse, McpServer, McpTool } from "@roo-code/types"

export function isMcpToolAlwaysAllowed(mcpServerUse: McpServerUse, mcpServers: McpServer[] | undefined): boolean {
	// If the tool is the 'question' tool, it should ALWAYS ask for confirmation
	// This is the only exception - all other tools can be auto-approved when alwaysAllowMcp is true
	if (mcpServerUse.toolName === "question") {
		return false
	}

	if (mcpServerUse.type === "use_mcp_tool" && mcpServerUse.toolName) {
		const server = mcpServers?.find((s: McpServer) => s.name === mcpServerUse.serverName)
		const tool = server?.tools?.find((t: McpTool) => t.name === mcpServerUse.toolName)
		// If the tool has alwaysAllow explicitly set to true, allow it
		// Otherwise, when alwaysAllowMcp is enabled globally, we allow all tools except 'question'
		return tool?.alwaysAllow ?? true
	}

	return false
}
