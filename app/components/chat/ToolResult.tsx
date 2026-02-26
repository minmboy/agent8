import { useEffect } from 'react';
import { toolUIStore } from '~/lib/stores/toolUI';

export interface ToolResult {
  isError: boolean;
  error?: string;
  result: any;
}

interface ToolResultProps {
  toolResult: ToolResult;
  id: string;
}

export const ToolResult = ({ toolResult, id }: ToolResultProps) => {
  useEffect(() => {
    const currentTool = toolUIStore.get().tools?.[id] || {};
    toolUIStore.set({
      tools: {
        ...toolUIStore.get().tools,
        [id]: {
          ...currentTool,
          loaded: true,
          isError: toolResult.isError,
          error: toolResult.error,
        },
      },
    });
  }, [toolResult, id]);

  // Just mark as loaded, no UI needed
  return null;
};
