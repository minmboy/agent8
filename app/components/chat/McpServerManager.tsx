import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useSettings } from '~/lib/hooks/useSettings';
import { classNames } from '~/utils/classNames';
import { useMobileView } from '~/lib/hooks/useMobileView';
import * as Tooltip from '@radix-ui/react-tooltip';
import CustomButton from '~/components/ui/CustomButton';
import { PlusIcon } from 'lucide-react';

// MCP Server Manager Component
const McpServerManager: React.FC<{ chatStarted?: boolean }> = ({ chatStarted = false }) => {
  const { mcpServers, toggleMCPServer, toggleMCPServerV8Auth, addMCPServer, removeMCPServer } = useSettings();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const triggerContainerRef = useRef<HTMLDivElement>(null);
  const isMobileView = useMobileView();

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newServer, setNewServer] = useState<{ name: string; url: string }>({
    name: '',
    url: '',
  });
  const [nameError, setNameError] = useState<string>('');

  const defaultServerNames = import.meta.env?.VITE_DEFAULT_SERVER_NAMES
    ? JSON.parse(import.meta.env.VITE_DEFAULT_SERVER_NAMES)
    : ['Image', 'Cinematic', 'Audio', 'Skybox', 'UI', 'Claythis'];
  const disabledServerNames = import.meta.env?.VITE_DISABLED_SERVER_NAMES
    ? JSON.parse(import.meta.env.VITE_DISABLED_SERVER_NAMES)
    : ['All-in-one'];

  const hiddenServerNames = ['Spritesheet', 'Crossramp'];
  const isDisabledServer = (serverName: string) => disabledServerNames.includes(serverName);
  const isHiddenServer = (serverName: string) => hiddenServerNames.includes(serverName);
  const isDefaultServer = (serverName: string) => defaultServerNames.includes(serverName);

  // UI display name mapping (for servers with different display names)
  const getDisplayName = (serverName: string) => {
    const displayNameMap: Record<string, string> = {
      Claythis: '2D-to-3D',
    };
    return displayNameMap[serverName] || serverName;
  };

  const linkedServers: Record<string, string[]> = {
    Image: ['Spritesheet'],
  };

  const hasActiveTools = mcpServers.some(
    (server) => server.enabled && !isDisabledServer(server.name) && !isHiddenServer(server.name),
  );

  const getServerIcon = (serverName: string) => {
    switch (serverName) {
      case 'Image':
        return '/icons/Image.svg';
      case 'Cinematic':
        return '/icons/Cinematic.svg';
      case 'Audio':
        return '/icons/Audio.svg';
      case 'Skybox':
        return '/icons/Skybox.svg';
      case 'UI':
        return '/icons/UI.svg';
      case 'Claythis':
        return '/icons/Claythis.svg';
      default:
        return '/icons/Sparkle.svg';
    }
  };

  const getServerCredit = (serverName: string) => {
    switch (serverName) {
      case 'Image':
        return '$0.2/call';
      case 'Cinematic':
        return '$2.5/call';
      case 'Audio':
        return '$0.2/call';
      case 'Skybox':
        return '$0.2/call';
      case 'UI':
        return '$0.05/call';
      case 'Claythis':
        return '$0.5/call';
      default:
        return '$0.05/call';
    }
  };

  const [showServerManager, setShowServerManager] = useState<boolean>(false);
  const [gridColumns, setGridColumns] = useState<number>(3);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown max height based on view mode and grid columns
  const dropdownMaxHeight = useMemo(() => {
    if (isMobileView) {
      return chatStarted ? '182px' : '220px';
    }

    if (gridColumns === 3) {
      return '260px';
    }

    return chatStarted ? '310px' : '420px';
  }, [isMobileView, gridColumns, chatStarted]);

  useEffect(() => {
    if (!isMobileView && showServerManager && gridContainerRef.current) {
      const handleResize = () => {
        if (gridContainerRef.current) {
          const width = gridContainerRef.current.offsetWidth;
          setGridColumns(width <= 450 ? 2 : 3);
        }
      };

      handleResize();

      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });

      resizeObserver.observe(gridContainerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }

    return undefined;
  }, [showServerManager, isMobileView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showServerManager &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerContainerRef.current &&
        !triggerContainerRef.current.contains(event.target as Node)
      ) {
        setShowServerManager(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showServerManager]);

  const handleToggleServer = (index: number, enabled: boolean) => {
    const server = mcpServers[index];

    toggleMCPServer(index, enabled);
    toggleMCPServerV8Auth(index, enabled);

    const linkedServerNames = linkedServers[server.name];

    if (linkedServerNames) {
      linkedServerNames.forEach((linkedName) => {
        const linkedIndex = mcpServers.findIndex((s) => s.name === linkedName);

        if (linkedIndex !== -1) {
          toggleMCPServer(linkedIndex, enabled);
          toggleMCPServerV8Auth(linkedIndex, enabled);
        }
      });
    }
  };

  const validateToolName = (name: string): string => {
    if (/^\d/.test(name)) {
      return 'MCP Tool Name cannot start with a number.';
    }

    return '';
  };

  const handleNameChange = (name: string) => {
    setNewServer({ ...newServer, name });
    setNameError(validateToolName(name));
  };

  const handleAddServer = () => {
    const nameValidationError = validateToolName(newServer.name);

    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }

    if (newServer.name && newServer.url) {
      const server = {
        name: newServer.name,
        url: newServer.url,
        enabled: true,
        v8AuthIntegrated: true,
        description: '',
      };

      addMCPServer(server);

      setNewServer({ name: '', url: '' });
      setNameError('');
      setShowAddForm(false);
    }
  };

  const handleRemoveServer = (index: number) => {
    removeMCPServer(index);
  };

  const renderServerItem = (server: any, index: number, isDefault: boolean) => {
    if (isDefault) {
      return (
        <>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 flex-1">
              <img src={getServerIcon(server.name)} alt={server.name} className="w-5 h-5 flex-shrink-0" />

              <h4 className="text-body-md-medium text-primary truncate flex-1">{getDisplayName(server.name)}</h4>

              <button
                type="button"
                className={classNames(
                  'flex w-4 h-4 p-[var(--spacing-0,0px)] flex-col items-start gap-[var(--spacing-0,0px)] aspect-square rounded-[var(--border-radius-2,2px)] cursor-pointer',
                  server.enabled
                    ? 'bg-interactive-primary'
                    : 'bg-interactive-neutral border border-solid border-interactive-primary',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleServer(index, !server.enabled);
                }}
                aria-pressed={server.enabled}
                aria-label={`${server.enabled ? 'Disable' : 'Enable'} ${server.name} server`}
              >
                {server.enabled && <img src="/icons/Check.svg" alt="Selected" className="w-full h-full" />}
              </button>
            </div>
          </div>

          <p className="text-body-sm text-tertiary line-clamp-2 w-full">{server.description}</p>

          <span className="text-accent-secondary text-body-sm">{getServerCredit(server.name)}</span>
        </>
      );
    }

    return (
      <>
        <button
          className="flex w-6 px-0.5 justify-center items-center gap-[10px] bg-transparent-subtle"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveServer(index);
          }}
          aria-label={`Remove ${server.name} server`}
        >
          <img src="/icons/Close.svg" alt="Close" className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-start gap-[10px] py-[10px] flex-[1_0_0] overflow-hidden">
          <div className="flex justify-between items-start self-stretch">
            <h4 className="text-body-md-medium text-primary truncate flex-1 min-w-0">{getDisplayName(server.name)}</h4>
            <button
              type="button"
              className={classNames(
                'flex w-4 h-4 p-[var(--spacing-0,0px)] flex-col items-start gap-[var(--spacing-0,0px)] aspect-square rounded-[var(--border-radius-2,2px)] cursor-pointer',
                server.enabled
                  ? 'bg-interactive-primary'
                  : 'bg-interactive-neutral border border-solid border-interactive-primary',
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleServer(index, !server.enabled);
              }}
              aria-pressed={server.enabled}
              aria-label={`${server.enabled ? 'Disable' : 'Enable'} ${server.name} server`}
            >
              {server.enabled && <img src="/icons/Check.svg" alt="Selected" className="w-full h-full" />}
            </button>
          </div>
          <span className="text-body-sm text-tertiary line-clamp-2 w-full">{server.url}</span>
        </div>
      </>
    );
  };

  const sortedAndFilteredServers = useMemo(() => {
    return mcpServers
      .map((server, index) => ({ server, index }))
      .filter((item) => !isDisabledServer(item.server.name) && !isHiddenServer(item.server.name))
      .sort((a, b) => {
        const aIsDefault = isDefaultServer(a.server.name);
        const bIsDefault = isDefaultServer(b.server.name);

        if (aIsDefault && !bIsDefault) {
          return -1;
        }

        if (!aIsDefault && bIsDefault) {
          return 1;
        }

        return 0;
      });
  }, [mcpServers]);

  const activeServers = useMemo(() => {
    return sortedAndFilteredServers.filter((item) => item.server.enabled);
  }, [sortedAndFilteredServers]);

  return (
    <div
      className={classNames('w-full mx-auto flex flex-col', {
        'tablet:max-w-chat': chatStarted,
        'tablet:max-w-chat-before-start': !chatStarted,
      })}
    >
      {/* Desktop & Mobile dropdown - positioned above */}
      {showServerManager && (
        <motion.div
          ref={dropdownRef}
          className="flex w-full flex-col items-start rounded-[8px] bg-transparent mb-2 relative z-[999]"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {mcpServers.length > 0 ? (
            <div className="w-full" ref={gridContainerRef}>
              <div
                className="overflow-y-auto -mx-2"
                style={{
                  maxHeight: dropdownMaxHeight,
                }}
              >
                <div
                  className="inline-grid self-stretch"
                  style={{
                    rowGap: '8px',
                    columnGap: '6px',
                    gridTemplateRows: 'repeat(1, fit-content(100%))',
                    gridTemplateColumns: isMobileView
                      ? 'repeat(2, minmax(0, 1fr))'
                      : `repeat(${gridColumns}, minmax(0, 1fr))`,
                  }}
                >
                  {sortedAndFilteredServers.map(({ server, index }) => {
                    const isDefault = isDefaultServer(server.name);

                    return (
                      <div
                        key={index}
                        className={classNames(
                          'flex gap-2.5 rounded-lg cursor-pointer',
                          isDefault ? 'flex-col items-start flex-1 px-3 py-[10px]' : 'items-stretch pr-3',
                          server.enabled
                            ? 'border border-solid border-interactive-selected bg-interactive-neutral'
                            : 'border border-solid border-tertiary bg-interactive-neutral-subtle hover:bg-interactive-neutral-subtle-hovered active:bg-interactive-neutral-subtle-hovered',
                        )}
                        onClick={() => handleToggleServer(index, !server.enabled)}
                      >
                        {renderServerItem(server, index, isDefault)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full text-center py-3.2 px-3.2 text-bolt-elements-textSecondary text-[11.2px]">
              No MCP servers registered. Add a new server to get started.
            </div>
          )}
        </motion.div>
      )}

      {/* Tools Active button area - positioned below */}
      <div
        className={classNames(
          'flex items-center justify-between flex-wrap self-stretch',
          showServerManager ? '-mx-2' : '',
        )}
      >
        {showServerManager ? (
          <>
            {/* When dropdown is open: Add Custom MCP Tool button */}
            <CustomButton variant="secondary-text" size="sm" onClick={() => setShowAddForm(true)}>
              <PlusIcon size={20} />
              Add Custom MCP Tool
            </CustomButton>

            {/* When dropdown is open: Apply button */}
            <CustomButton variant="primary-text" size="sm" onClick={() => setShowServerManager(false)}>
              Apply
            </CustomButton>
          </>
        ) : (
          <>
            {/* When dropdown is closed: Tools Active text */}
            {hasActiveTools && <span className="text-subtle text-heading-xs">Tools Active</span>}

            {/* When dropdown is closed: icons + Use Tools button */}
            <div ref={triggerContainerRef} className="flex items-center justify-center gap-3">
              {activeServers.map(({ server, index }) => (
                <div
                  key={index}
                  className="flex justify-center items-center cursor-pointer"
                  onClick={() => setShowServerManager(!showServerManager)}
                >
                  <img src={getServerIcon(server.name)} alt={server.name} className="w-5 h-5" />
                </div>
              ))}

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    ref={buttonRef}
                    onClick={() => setShowServerManager(!showServerManager)}
                    className={classNames(
                      hasActiveTools
                        ? 'flex w-[28px] min-h-[28px] max-h-[28px] justify-center items-center rounded-[var(--border-radius-circle,99999px)] border border-solid border-[var(--color-border-interactive-neutral,rgba(255,255,255,0.18))] bg-[var(--color-bg-interactive-neutral,#222428)] hover:bg-[var(--color-bg-interactive-neutral-hovered,#32363C)] active:bg-[var(--color-bg-interactive-neutral-pressed,#464C54)] focus:bg-[var(--color-bg-interactive-neutral,#222428)]'
                        : 'flex min-h-8 max-h-8 px-[14px] py-[8px] justify-center items-center gap-1.5 rounded-full border border-white/18 bg-[#222428] hover:bg-[var(--color-bg-interactive-neutral-hovered,#32363C)] active:bg-[var(--color-bg-interactive-neutral-pressed,#464C54)] focus:bg-[var(--color-bg-interactive-neutral,#222428)] text-xs font-medium hover:text-gray-500',
                      'transition-colors duration-200',
                    )}
                  >
                    <img src="/icons/Plus.svg" alt="Plus" className={hasActiveTools ? 'w-5 h-5' : ''} />
                    {!hasActiveTools && <span className="font-normal text-cyan-400 text-[14px]">Use Tools</span>}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="inline-flex items-start rounded-radius-8 bg-[var(--color-bg-inverse,#F3F5F8)] text-[var(--color-text-inverse,#111315)] p-[9.6px] shadow-md z-[9999] font-primary text-body-md-medium w-[288px] justify-between"
                    sideOffset={5}
                    side="top"
                    align="end"
                    alignOffset={0}
                  >
                    Use it to create images, cinematics, audio, skyboxes, and UI elements
                    <Tooltip.Arrow className="fill-[var(--color-bg-inverse,#F3F5F8)]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </>
        )}
      </div>

      {showAddForm &&
        createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 font-primary flex items-center justify-center"
            style={{ zIndex: 1200 }}
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md w-[500px] max-w-[90vw]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                    <span className="bg-cyan-100 dark:bg-cyan-900/30 p-1.5 rounded-md mr-2">
                      <div className="i-ph:plus-circle-fill w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    </span>
                    Add Custom MCP Tool
                  </h4>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 group transition-all duration-200"
                  >
                    <div className="i-ph:x w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-[0.4]">
                    <label
                      htmlFor="mcp-tool-name"
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1"
                    >
                      MCP Tool Name
                    </label>
                    <input
                      id="mcp-tool-name"
                      type="text"
                      placeholder="e.g. agent8"
                      value={newServer.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className={classNames(
                        'w-full p-2.5 rounded-lg text-sm',
                        'bg-gray-50 dark:bg-gray-800',
                        'text-gray-900 dark:text-gray-100',
                        'focus:outline-none focus:ring-2 focus:ring-cyan-500/40',
                        'transition-all duration-200',
                        nameError
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-200 dark:border-gray-700 focus:border-cyan-500',
                      )}
                    />
                    {nameError && <p className="text-red-500 text-xs mt-1 ml-1">{nameError}</p>}
                  </div>
                  <div className="flex-[0.6]">
                    <label
                      htmlFor="mcp-tool-url"
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1"
                    >
                      MCP Tool URL
                    </label>
                    <input
                      id="mcp-tool-url"
                      type="text"
                      placeholder="http://localhost:3333/sse"
                      value={newServer.url}
                      onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                      className={classNames(
                        'w-full p-2.5 rounded-lg text-sm',
                        'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                        'text-gray-900 dark:text-gray-100',
                        'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500',
                        'transition-all duration-200',
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className={classNames(
                        'px-4 py-2 rounded-lg text-sm font-medium',
                        'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
                        'text-gray-700 dark:text-gray-300',
                        'transition-colors duration-200',
                        'border border-gray-200 dark:border-gray-700',
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddServer}
                      disabled={!newServer.name || !newServer.url || !!nameError}
                      className={classNames(
                        'px-4 py-2 rounded-lg text-sm font-medium',
                        'transition-colors duration-200',
                        'shadow-sm',
                        'disabled:cursor-not-allowed',
                        !newServer.name || !newServer.url || !!nameError
                          ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 dark:hover:text-white hover:border-cyan-400 dark:hover:border-cyan-500',
                      )}
                    >
                      Add Tool
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default McpServerManager;
