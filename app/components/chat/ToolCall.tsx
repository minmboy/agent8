import { useStore } from '@nanostores/react';
import Lottie from 'lottie-react';
import { useState } from 'react';
import { toolUIStore } from '~/lib/stores/toolUI';
import { mcpServersStore } from '~/lib/stores/settings';
import { EXCLUSIVE_3D_DOC_TOOLS, TOOL_NAMES } from '~/utils/constants';
import { checkCircleAnimationData } from '~/utils/animationData';
import { BranchIndicatorIcon } from '~/components/ui/Icons';

export interface ToolCall {
  toolName: string;
  toolCallId: string;
  input: Record<string, any>;
}

interface ToolCallProps {
  toolCall: ToolCall;
  id: string;
}

// System tools that should be hidden from UI
const SYSTEM_TOOLS: string[] = [
  TOOL_NAMES.UNKNOWN_HANDLER,
  TOOL_NAMES.INVALID_TOOL_INPUT_HANDLER,
  TOOL_NAMES.SUBMIT_FILE_ACTION,
  TOOL_NAMES.SUBMIT_MODIFY_ACTION,
  TOOL_NAMES.SUBMIT_SHELL_ACTION,
  TOOL_NAMES.SEARCH_FILE_CONTENTS,
  TOOL_NAMES.READ_FILES_CONTENTS,
  ...EXCLUSIVE_3D_DOC_TOOLS,
];

// MCP server name to icon mapping
const MCP_SERVER_ICONS: Record<string, string> = {
  Image: '/icons/Image.svg',
  Cinematic: '/icons/Cinematic.svg',
  Audio: '/icons/Audio.svg',
  Skybox: '/icons/Skybox.svg',
  UI: '/icons/UI.svg',
  Claythis: '/icons/Claythis.svg',
};

// MCP server display name mapping (for servers with different display names)
const MCP_SERVER_DISPLAY_NAMES: Record<string, string> = {
  Claythis: '2D-to-3D',
};

// MCP server background gradient mapping (Tool Use pill color per server)
const MCP_SERVER_BACKGROUNDS: Record<string, string> = {
  UI: 'linear-gradient(90deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 132, 161, 0.10) 100%)',
  Skybox: 'linear-gradient(90deg, rgba(255, 255, 255, 0.10) 0%, rgba(104, 177, 255, 0.10) 100%)',
  Audio: 'linear-gradient(90deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 175, 114, 0.10) 100%)',
  Cinematic: 'linear-gradient(90deg, rgba(255, 255, 255, 0.10) 0%, rgba(180, 145, 255, 0.10) 100%)',
  Image: 'linear-gradient(90deg, rgba(255, 255, 255, 0.10) 0%, rgba(194, 255, 186, 0.10) 100%)',
  Claythis: 'linear-gradient(90deg, rgba(255, 255, 255, 0.10) 0%, rgba(81, 193, 203, 0.10) 100%)',
};

// Linked servers that should use parent server's icon and name
const LINKED_SERVERS: Record<string, string> = {
  Spritesheet: 'Image',
};

// Tool Use whitelist - tools that display "Tool Use" text (based on CSV "Tool Use" column)
const TOOL_USE_WHITELIST = [
  // Image tools
  'image_asset_generate',
  'image_variation_generate',

  // Spritesheet tools
  'spritesheet_generate',
  'spritesheet_variation_generate',

  // Cinematic tools
  'cinematic_asset_generate',

  // Audio tools
  'music_generate',
  'sfx_generate',

  // Skybox tools
  'skybox_generate',

  // Claythis (2D-to-3D) tools
  'claythis_3d_generate',

  // UI Theme tools
  'ui_theme_list',
  'ui_theme_style',

  // Story Protocol tools
  'story_ip_to_variation_workflow',
];

// All MCP server names (including linked servers)
const ALL_MCP_SERVERS = [...Object.keys(MCP_SERVER_ICONS), ...Object.keys(LINKED_SERVERS)];

// Extract MCP server name from tool name (e.g., "Image_generate_image" -> "Image")
const getMcpServerName = (toolName: string): string | null => {
  for (const serverName of ALL_MCP_SERVERS) {
    if (toolName.startsWith(serverName + '_') || toolName === serverName) {
      // If it's a linked server, return the parent server name
      if (LINKED_SERVERS[serverName]) {
        return LINKED_SERVERS[serverName];
      }

      return serverName;
    }
  }

  return null;
};

const getMcpServerIcon = (toolName: string): string => {
  const serverName = getMcpServerName(toolName);

  if (serverName && MCP_SERVER_ICONS[serverName]) {
    return MCP_SERVER_ICONS[serverName];
  }

  return '/icons/Sparkle.svg';
};

const getMcpServerDisplayName = (toolName: string): string | null => {
  const serverName = getMcpServerName(toolName);

  if (serverName) {
    return MCP_SERVER_DISPLAY_NAMES[serverName] || serverName;
  }

  return null;
};

const getMcpServerBackground = (toolName: string): string | null => {
  const serverName = getMcpServerName(toolName);

  if (serverName && MCP_SERVER_BACKGROUNDS[serverName]) {
    return MCP_SERVER_BACKGROUNDS[serverName];
  }

  return null;
};

export const ToolCall = ({ toolCall, id }: ToolCallProps) => {
  const toolUI = useStore(toolUIStore);
  const mcpServers = useStore(mcpServersStore);
  const currentTool = toolUI.tools?.[id] || {};
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  // Hide system tools, only show MCP tools
  const isSystemTool = SYSTEM_TOOLS.includes(toolCall.toolName);

  if (isSystemTool) {
    return null;
  }

  // Hide tools from hidden MCP servers (Crossramp is hidden)
  const isHiddenMcpTool = toolCall.toolName.startsWith('Crossramp_') || toolCall.toolName === 'Crossramp';

  if (isHiddenMcpTool) {
    return null;
  }

  const isStatusTool =
    toolCall.toolName.endsWith('_status') ||
    toolCall.toolName.endsWith('_wait') ||
    toolCall.toolName.endsWith('_result');

  const mcpServerName = getMcpServerName(toolCall.toolName);
  const mcpServerDisplayName = getMcpServerDisplayName(toolCall.toolName);
  const iconPath = getMcpServerIcon(toolCall.toolName);
  const mcpServerBackground = getMcpServerBackground(toolCall.toolName);

  /*
   * For custom MCP servers (not in the known list), find by matching registered server names
   * Server names with spaces are stored as-is in the store, but tool names use dashes (toolset.ts:239)
   */
  const customMcpServer =
    mcpServerName === null
      ? (mcpServers.find((server) => {
          const normalizedName = server.name.replaceAll(' ', '-');
          return toolCall.toolName.startsWith(normalizedName + '_') || toolCall.toolName === normalizedName;
        }) ?? null)
      : null;

  /*
   * Extract the actual tool name part for custom MCP servers (strip server name prefix)
   * e.g., "git-mcp_clone" with server "git mcp" → "clone"
   */
  const customToolName = customMcpServer
    ? toolCall.toolName.slice(customMcpServer.name.replaceAll(' ', '-').length + 1) || null
    : null;

  // True when the tool belongs to a known or custom MCP server (false = agent8 internal tool)
  const isIdentifiedMcpTool = mcpServerName !== null || customMcpServer !== null;

  /*
   * Determine label: "Tool Use" or "Check"
   * - Whitelist applies globally (covers known servers + story protocol etc.)
   * - Custom servers (found in store): non-status tools show "Tool Use"
   */
  const isToolUseTool =
    TOOL_USE_WHITELIST.some((whitelistedTool) =>
      toolCall.toolName.toLowerCase().includes(whitelistedTool.toLowerCase()),
    ) ||
    (customMcpServer !== null && !isStatusTool);

  let toolLabel = isToolUseTool ? 'Tool Use' : 'Check';

  if (currentTool.isError) {
    toolLabel = isToolUseTool ? 'Tool Use Failed' : 'Check Failed';
  }

  // Check tools are fully removed from DOM after disappear animation completes
  if (!isToolUseTool && !isVisible) {
    return null;
  }

  const handleLottieComplete = () => {
    if (!isToolUseTool) {
      setIsFadingOut(true);
      setTimeout(() => setIsVisible(false), 500);
    }
  };

  let containerStyle: React.CSSProperties;

  if (!isToolUseTool) {
    containerStyle = {
      transition: 'transform 0.5s ease, opacity 0.5s ease',
      transform: isFadingOut ? 'translateY(-8px)' : 'translateY(0)',
      opacity: isFadingOut ? 0 : 1,
    };
  } else if (mcpServerBackground) {
    containerStyle = {
      width: 'fit-content',
      padding: '8px 12px',
      borderRadius: '24px',
      background: mcpServerBackground,
    };
  } else {
    containerStyle = {
      paddingLeft: '4px',
      paddingRight: '4px',
    };
  }

  return (
    <div className="flex items-center gap-2 mt-4" style={containerStyle}>
      {!isToolUseTool && <BranchIndicatorIcon />}
      <div className="text-[20px]">
        {currentTool.loaded ? (
          currentTool.isError ? (
            <div
              style={{ width: '20px', height: '20px', padding: '2.5px' }}
              className="flex items-center justify-center"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#EF4444" strokeWidth="2" fill="none" />
                <path d="M10 6V11" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                <circle cx="10" cy="14" r="0.75" fill="#EF4444" />
              </svg>
            </div>
          ) : (
            <div style={{ width: '20px', height: '20px' }}>
              <Lottie animationData={checkCircleAnimationData} loop={false} onComplete={handleLottieComplete} />
            </div>
          )
        ) : (
          <div className="i-svg-spinners:90-ring-with-bg text-white"></div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-[1_0_0]">
        <span className={`text-body-sm shrink-0 ${currentTool.isError ? 'text-danger-bold' : 'text-tertiary'}`}>
          {toolLabel}
        </span>
        <div className="flex items-center gap-0.5 min-w-0 overflow-hidden">
          {isIdentifiedMcpTool && (
            <img
              src={iconPath}
              alt={mcpServerDisplayName || mcpServerName || customMcpServer?.name || 'Tool'}
              className="w-4 h-4 shrink-0"
            />
          )}
          <span className={`text-body-sm line-clamp-1 ${isIdentifiedMcpTool ? 'text-secondary' : 'text-subtle'}`}>
            {mcpServerDisplayName || mcpServerName || customMcpServer?.name || toolCall.toolName}
          </span>
          {customToolName && <span className="text-body-sm text-subtle ml-1.5 line-clamp-1">{customToolName}</span>}
        </div>
      </div>
    </div>
  );
};
