/**
 * Shared MCP tool response helpers.
 * Ensures consistent response format across all tools.
 */
export function toolSuccess(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function toolError(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  };
}
