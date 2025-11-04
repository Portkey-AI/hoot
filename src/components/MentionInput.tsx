import { useState, useRef, useEffect, useMemo, KeyboardEvent } from 'react';
import { Code2, Server, Filter } from 'lucide-react';
import { ServerConfig, ToolSchema } from '../types';
import './MentionInput.css';

export interface Mention {
    type: 'server' | 'tool';
    id: string;
    name: string;
    serverId?: string; // For tools, which server they belong to
    serverName?: string; // For display
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    mentions: Mention[];
    onMentionsChange: (mentions: Mention[]) => void;
    servers: ServerConfig[];
    tools: Record<string, ToolSchema[]>;
    placeholder?: string;
    disabled?: boolean;
    onKeyPress?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
    inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

interface MentionOption {
    type: 'server' | 'tool';
    id: string;
    name: string;
    serverId?: string;
    serverName?: string;
    icon?: string | null;
}

// Simple fuzzy matching
function fuzzyMatch(text: string, query: string): boolean {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Simple substring match for now
    return textLower.includes(queryLower);
}

export function MentionInput({
    value,
    onChange,
    mentions,
    onMentionsChange,
    servers,
    tools,
    placeholder,
    disabled,
    onKeyPress,
    onKeyDown,
    inputRef,
}: MentionInputProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [dropdownPosition, setDropdownPosition] = useState<'up' | 'down'>('down');
    const [cursorPosition, setCursorPosition] = useState(0);
    const [serverFavicons, setServerFavicons] = useState<Map<string, string | null>>(new Map());

    const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = inputRef || internalTextareaRef;
    const dropdownRef = useRef<HTMLDivElement>(null);
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Build list of all available mentions
    const allOptions = useMemo(() => {
        const options: MentionOption[] = [];

        // Add connected servers
        const connectedServers = servers.filter(s => s.connected);
        connectedServers.forEach(server => {
            options.push({
                type: 'server',
                id: server.id,
                name: server.name,
            });
        });

        // Add all tools from connected servers
        connectedServers.forEach(server => {
            const serverTools = tools[server.id] || [];
            serverTools.forEach(tool => {
                options.push({
                    type: 'tool',
                    id: tool.name,
                    name: tool.name,
                    serverId: server.id,
                    serverName: server.name,
                });
            });
        });

        return options;
    }, [servers, tools]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery) return allOptions;

        return allOptions.filter(option => {
            const matchName = fuzzyMatch(option.name, searchQuery);
            const matchServerName = option.serverName ? fuzzyMatch(option.serverName, searchQuery) : false;
            return matchName || matchServerName;
        });
    }, [allOptions, searchQuery]);

    // Reset selected index when filtered options change
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredOptions.length]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (showDropdown && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [showDropdown]);

    // Fetch favicons for servers when mentions change
    useEffect(() => {
        const fetchFavicons = async () => {
            const newFavicons = new Map(serverFavicons);
            let hasUpdates = false;

            for (const mention of mentions) {
                if (mention.type === 'tool' && mention.serverId && !newFavicons.has(mention.serverId)) {
                    const server = servers.find(s => s.id === mention.serverId);
                    if (server?.url) {
                        try {
                            // Use the backend client to get favicon
                            const { getFaviconUrl } = await import('../lib/backendClient');
                            const oauthLogoUri = server.auth?.oauthServerMetadata?.logo_uri;
                            const faviconUrl = await getFaviconUrl(server.url, oauthLogoUri);
                            newFavicons.set(mention.serverId, faviconUrl);
                            hasUpdates = true;
                        } catch (e) {
                            newFavicons.set(mention.serverId, null);
                            hasUpdates = true;
                        }
                    }
                } else if (mention.type === 'server' && !newFavicons.has(mention.id)) {
                    const server = servers.find(s => s.id === mention.id);
                    if (server?.url) {
                        try {
                            const { getFaviconUrl } = await import('../lib/backendClient');
                            const oauthLogoUri = server.auth?.oauthServerMetadata?.logo_uri;
                            const faviconUrl = await getFaviconUrl(server.url, oauthLogoUri);
                            newFavicons.set(mention.id, faviconUrl);
                            hasUpdates = true;
                        } catch (e) {
                            newFavicons.set(mention.id, null);
                            hasUpdates = true;
                        }
                    }
                }
            }

            if (hasUpdates) {
                setServerFavicons(newFavicons);
            }
        };

        if (mentions.length > 0) {
            fetchFavicons();
        }
    }, [mentions, servers, serverFavicons]);

    // Handle search input change in dropdown
    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        setSelectedIndex(0);
    };

    // Detect @ symbol and show dropdown
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart || 0;

        onChange(newValue);
        setCursorPosition(cursorPos);

        // Check if we just typed @ or if we're in an @ mention context
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

            // Show dropdown if @ is at start or preceded by whitespace
            // and there's no whitespace after @
            const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
            const hasWhitespaceBefore = charBeforeAt === ' ' || charBeforeAt === '\n';
            const hasWhitespaceAfter = textAfterAt.includes(' ') || textAfterAt.includes('\n');

            if ((lastAtIndex === 0 || hasWhitespaceBefore) && !hasWhitespaceAfter) {
                setSearchQuery(textAfterAt);
                if (!showDropdown) {
                    setShowDropdown(true);
                    // Determine dropdown position
                    if (textareaRef.current) {
                        const textareaRect = textareaRef.current.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const spaceBelow = viewportHeight - textareaRect.bottom;
                        const spaceAbove = textareaRect.top;

                        setDropdownPosition(spaceBelow < 300 && spaceAbove > spaceBelow ? 'up' : 'down');
                    }
                }
                return;
            }
        }

        // Close dropdown if we're not in @ context anymore
        if (showDropdown && !searchInputRef.current) {
            setShowDropdown(false);
            setSearchQuery('');
        }
    };

    // Toggle dropdown visibility via plus button
    const toggleDropdown = () => {
        if (!showDropdown) {
            setSearchQuery('');
            setSelectedIndex(0);

            // Determine dropdown position
            if (plusButtonRef.current) {
                const buttonRect = plusButtonRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const spaceBelow = viewportHeight - buttonRect.bottom;
                const spaceAbove = buttonRect.top;

                setDropdownPosition(spaceBelow < 300 && spaceAbove > spaceBelow ? 'up' : 'down');
            }
        }
        setShowDropdown(!showDropdown);
    };

    // Handle mention selection
    const selectMention = (option: MentionOption) => {
        // Add to mentions list
        const newMention: Mention = {
            type: option.type,
            id: option.id,
            name: option.name,
            serverId: option.serverId,
            serverName: option.serverName,
        };

        // Don't add duplicates
        const isDuplicate = mentions.some(m =>
            m.type === newMention.type &&
            m.id === newMention.id &&
            (m.type === 'server' || m.serverId === newMention.serverId)
        );

        if (!isDuplicate) {
            onMentionsChange([...mentions, newMention]);
        }

        // If we were using @mention, remove the @ from the text
        if (textareaRef.current && value.includes('@')) {
            const cursorPos = cursorPosition;
            const textBeforeCursor = value.slice(0, cursorPos);
            const lastAtIndex = textBeforeCursor.lastIndexOf('@');

            if (lastAtIndex !== -1) {
                const before = value.slice(0, lastAtIndex);
                const after = value.slice(cursorPos);
                onChange(before + after);
            }
        }

        // Close dropdown and reset search
        setShowDropdown(false);
        setSearchQuery('');

        // Focus back to textarea
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    };

    // Handle keyboard navigation in search input
    const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                selectMention(filteredOptions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowDropdown(false);
            setSearchQuery('');
            textareaRef.current?.focus();
        }
        // Allow space key to be typed in search (don't prevent default)
    };

    // Remove a mention tag
    const removeMention = (mention: Mention) => {
        const newMentions = mentions.filter(m =>
            !(m.type === mention.type &&
                m.id === mention.id &&
                (m.type === 'server' || m.serverId === mention.serverId))
        );
        onMentionsChange(newMentions);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="mention-input-wrapper">
            {/* Combined container for tags and textarea */}
            <div className="mention-input-container">
                {/* Mention tags display */}
                {mentions.length > 0 && (
                    <div className="mention-tags">
                        {mentions.map((mention, index) => {
                            const serverId = mention.type === 'server' ? mention.id : mention.serverId;
                            const favicon = serverId ? serverFavicons.get(serverId) : null;

                            return (
                                <div key={`${mention.type}-${mention.id}-${index}`} className="mention-tag">
                                    {mention.type === 'server' ? (
                                        <>
                                            {favicon ? (
                                                <img src={favicon} alt="" className="mention-tag-favicon" />
                                            ) : (
                                                <Server size={12} />
                                            )}
                                            <span>{mention.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            {favicon ? (
                                                <img src={favicon} alt="" className="mention-tag-favicon" />
                                            ) : (
                                                <Code2 size={12} />
                                            )}
                                            <span>{mention.name}</span>
                                        </>
                                    )}
                                    <button
                                        className="mention-tag-remove"
                                        onClick={() => removeMention(mention)}
                                        title="Remove mention"
                                        disabled={disabled}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}

                        {/* Plus button to add more */}
                        <button
                            ref={plusButtonRef}
                            className="mention-add-button"
                            onClick={toggleDropdown}
                            title="Add server or tool"
                            disabled={disabled}
                        >
                            +
                        </button>
                    </div>
                )}

                {/* Filter button when no mentions - appears at top */}
                {mentions.length === 0 && (
                    <button
                        ref={plusButtonRef}
                        className="mention-filter-button"
                        onClick={toggleDropdown}
                        title="Pin servers or tools"
                        disabled={disabled}
                    >
                        <Filter size={14} />
                        <span>Filter servers and tools</span>
                    </button>
                )}

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    className="mention-input"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={onKeyDown}
                    onKeyPress={onKeyPress}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                />

                {/* Dropdown */}
                {showDropdown && (
                    <div
                        ref={dropdownRef}
                        className={`mention-dropdown ${dropdownPosition === 'up' ? 'mention-dropdown-up' : 'mention-dropdown-down'}`}
                    >
                        <div className="mention-dropdown-header">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="mention-dropdown-search"
                                placeholder="Search servers and tools..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                autoFocus
                            />
                        </div>
                        <div className="mention-dropdown-list">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <div
                                        key={`${option.type}-${option.id}-${option.serverId || ''}`}
                                        className={`mention-dropdown-item ${index === selectedIndex ? 'selected' : ''}`}
                                        onClick={() => selectMention(option)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div className="mention-dropdown-item-icon">
                                            {option.type === 'server' ? (
                                                <Server size={14} />
                                            ) : (
                                                <Code2 size={14} />
                                            )}
                                        </div>
                                        <div className="mention-dropdown-item-content">
                                            <div className="mention-dropdown-item-name">
                                                {option.name}
                                            </div>
                                            {option.type === 'tool' && option.serverName && (
                                                <div className="mention-dropdown-item-meta">
                                                    {option.serverName}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mention-dropdown-item-type">
                                            {option.type}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="mention-dropdown-empty">
                                    No servers or tools found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

