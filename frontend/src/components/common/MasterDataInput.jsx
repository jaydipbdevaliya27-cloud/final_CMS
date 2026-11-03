import React, { useState, useEffect, useRef } from 'react';
import { masterDataAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

// Global in-memory cache for fast, zero-latency shortcut matching across all MasterDataInput instances
export const masterDataCache = {};
const cacheFetchPromises = {};

export const preloadMasterData = async (type) => {
  if (masterDataCache[type] && masterDataCache[type].length > 0) {
    return masterDataCache[type];
  }
  if (cacheFetchPromises[type]) {
    return cacheFetchPromises[type];
  }

  cacheFetchPromises[type] = masterDataAPI
    .getItems(type, '', 1, 300)
    .then((res) => {
      if (res.success && Array.isArray(res.data)) {
        masterDataCache[type] = res.data;
        return res.data;
      }
      return [];
    })
    .catch((err) => {
      console.warn(`Could not preload master data for ${type}:`, err);
      return [];
    })
    .finally(() => {
      delete cacheFetchPromises[type];
    });

  return cacheFetchPromises[type];
};

export const resolveMasterShortcut = (type, rawText) => {
  if (!rawText || typeof rawText !== 'string') return rawText;
  const token = rawText.trim().toUpperCase();
  if (!token) return rawText;
  const cached = masterDataCache[type] || [];
  const match = cached.find((i) => i.shortcut && i.shortcut.trim().toUpperCase() === token);
  return match ? match.value : rawText;
};

// Prioritized filter helper: exact shortcut match ALWAYS first
export const filterMasterItems = (rawToken, itemsList = []) => {
  if (!rawToken || !rawToken.trim()) return [];
  const token = rawToken.trim().toUpperCase();

  // 1. Exact shortcut match
  const exactShortcut = itemsList.filter(
    (item) => item.shortcut && item.shortcut.trim().toUpperCase() === token
  );
  // 2. Shortcut starts-with
  const startShortcut = itemsList.filter(
    (item) =>
      item.shortcut &&
      item.shortcut.trim().toUpperCase().startsWith(token) &&
      item.shortcut.trim().toUpperCase() !== token
  );
  // 3. Name/Value starts-with
  const startValue = itemsList.filter(
    (item) =>
      item.value &&
      item.value.toUpperCase().startsWith(token) &&
      !exactShortcut.includes(item) &&
      !startShortcut.includes(item)
  );
  // 4. Any other substring match
  const others = itemsList.filter(
    (item) =>
      !exactShortcut.includes(item) &&
      !startShortcut.includes(item) &&
      !startValue.includes(item) &&
      ((item.value && item.value.toUpperCase().includes(token)) ||
        (item.shortcut && item.shortcut.toUpperCase().includes(token)))
  );

  return [...exactShortcut, ...startShortcut, ...startValue, ...others].slice(0, 30);
};

export const MasterDataInput = ({
  id,
  type, // 'society' | 'area' | 'allergy' | 'complaint' | 'medicine' | 'investigation'
  value,
  onChange,
  placeholder = '',
  required = false,
  style = {},
  inputStyle = {},
  onSelectCallback,
  onEnterNext, // Optional callback when Enter is pressed to navigate to next input
  allowMultiple = false, // When true, supports comma-separated list and space-to-comma
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Preload master data cache on mount
  useEffect(() => {
    preloadMasterData(type).then((cached) => {
      const token = getActiveToken(value);
      if (token && token.trim().length > 0) {
        const matches = filterMasterItems(token, cached);
        if (matches.length > 0) {
          setSuggestions(matches);
        }
      }
    });
  }, [type]);

  // Auto-scroll highlighted suggestion into view
  useEffect(() => {
    if (isOpen && listRef.current && suggestions.length > 0) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, suggestions.length]);

  // Ensure dropdown aligns cleanly within viewport (right-align if near right edge)
  useEffect(() => {
    if (isOpen && wrapperRef.current && listRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const listWidth = listRef.current.offsetWidth || 280;
      if (rect.left + listWidth > window.innerWidth - 20) {
        listRef.current.style.left = 'auto';
        listRef.current.style.right = '0';
      } else {
        listRef.current.style.left = '0';
        listRef.current.style.right = 'auto';
      }
    }
  }, [isOpen, suggestions.length]);

  // Extract active search token (text after last comma when allowMultiple is active)
  const getActiveToken = (text) => {
    if (!allowMultiple) return (text || '').trim();
    const str = text || '';
    const lastComma = str.lastIndexOf(',');
    return (lastComma !== -1 ? str.slice(lastComma + 1) : str).trim();
  };

  const currentToken = getActiveToken(value);
  const debouncedToken = useDebounce(currentToken, 200);

  // Fetch suggestions asynchronously as fallback or for un-cached items
  useEffect(() => {
    let active = true;
    const fetchItems = async () => {
      try {
        const res = await masterDataAPI.getItems(type, debouncedToken || '');
        if (active && res.success) {
          const items = res.data || [];
          // Update global cache with freshly received items
          if (!masterDataCache[type]) masterDataCache[type] = [];
          for (const item of items) {
            if (!masterDataCache[type].some((m) => m._id === item._id || m.value === item.value)) {
              masterDataCache[type].push(item);
            }
          }

          const cached = masterDataCache[type] || [];
          const sorted = filterMasterItems(debouncedToken, cached.length > 0 ? cached : items);
          setSuggestions(sorted.length > 0 ? sorted : items);
          setHighlightedIndex(0);
        }
      } catch (err) {
        console.error(`Error loading master data for ${type}:`, err);
      }
    };

    if (debouncedToken && debouncedToken.trim().length > 0) {
      fetchItems();
    }
    return () => {
      active = false;
    };
  }, [type, debouncedToken]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    let val = e.target.value;

    // When allowMultiple is enabled and space is typed after a word:
    // "when we give space in complaint there will be added comma to add other complaints"
    if (allowMultiple && val.endsWith(' ')) {
      const trimmed = val.trimEnd();
      if (trimmed.length > 0 && !trimmed.endsWith(',')) {
        val = trimmed + ', ';
      }
    }

    onChange(val);

    // If the field / active token is empty, close the suggestion datalist immediately
    const token = getActiveToken(val);
    if (!token || token.trim().length === 0) {
      setIsOpen(false);
      setSuggestions([]);
    } else {
      // Synchronous instant match from in-memory cache (0ms latency!)
      const cached = masterDataCache[type] || [];
      const instantMatches = filterMasterItems(token, cached);
      if (instantMatches.length > 0) {
        setSuggestions(instantMatches);
        setHighlightedIndex(0);
        setIsOpen(true);
      } else {
        setIsOpen(true);
      }
    }
  };

  const selectItem = (item) => {
    const selectedVal = item.value;

    if (allowMultiple) {
      const currentVal = value || '';
      const lastCommaIdx = currentVal.lastIndexOf(',');
      let prefix = '';
      if (lastCommaIdx !== -1) {
        prefix = currentVal.slice(0, lastCommaIdx + 1).trimEnd() + ' ';
      }
      const newVal = `${prefix}${selectedVal}, `;
      onChange(newVal);

      // Keep focus in input and cursor at end to immediately select the next item
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newVal.length, newVal.length);
        }
      }, 0);

      // Close suggestions after selection until doctor types the next word
      setIsOpen(false);
    } else {
      onChange(selectedVal);
      setIsOpen(false);
    }

    if (onSelectCallback) onSelectCallback(selectedVal);
  };

  const handleKeyDown = (e) => {
    // Check if this keydown is a save shortcut: Ctrl+S, Ctrl+Enter, Alt+S, Alt+P
    const isSaveShortcut =
      ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) ||
      ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ||
      (e.altKey && (e.key === 's' || e.key === 'S')) ||
      (e.altKey && (e.key === 'p' || e.key === 'P'));

    if (isSaveShortcut) {
      // If there is an active token, auto-commit the matching shortcut or first suggestion before save triggers
      const currentVal = inputRef.current ? inputRef.current.value : (value || '');
      const token = getActiveToken(currentVal).trim().toUpperCase();
      if (token) {
        const cached = masterDataCache[type] || [];
        const match =
          cached.find((i) => i.shortcut && i.shortcut.trim().toUpperCase() === token) ||
          suggestions[highlightedIndex] ||
          suggestions[0];
        if (match) {
          selectItem(match);
        } else if (currentVal !== value) {
          onChange(currentVal);
        }
      }
      return; // allow event to bubble to window handler for handleSaveVisit
    }

    // If Space is pressed and allowMultiple is true:
    if (allowMultiple && e.key === ' ') {
      const val = value || '';
      const input = inputRef.current;
      const cursorPos = input ? input.selectionStart : val.length;
      const beforeCursor = val.slice(0, cursorPos);
      const afterCursor = val.slice(cursorPos);
      const trimmedBefore = beforeCursor.trimEnd();

      if (trimmedBefore.length > 0 && !trimmedBefore.endsWith(',')) {
        e.preventDefault();
        const newVal = trimmedBefore + ', ' + afterCursor.trimStart();
        onChange(newVal);
        setTimeout(() => {
          if (inputRef.current) {
            const nextPos = trimmedBefore.length + 2;
            inputRef.current.setSelectionRange(nextPos, nextPos);
          }
        }, 0);
        setIsOpen(true);
        return;
      }
    }

    // If Comma is pressed and allowMultiple is true:
    if (allowMultiple && e.key === ',') {
      const val = value || '';
      const input = inputRef.current;
      const cursorPos = input ? input.selectionStart : val.length;
      const beforeCursor = val.slice(0, cursorPos);
      const afterCursor = val.slice(cursorPos);
      const trimmedBefore = beforeCursor.trimEnd();

      if (trimmedBefore.length > 0 && !trimmedBefore.endsWith(',')) {
        e.preventDefault();
        const newVal = trimmedBefore + ', ' + afterCursor.trimStart();
        onChange(newVal);
        setTimeout(() => {
          if (inputRef.current) {
            const nextPos = trimmedBefore.length + 2;
            inputRef.current.setSelectionRange(nextPos, nextPos);
          }
        }, 0);
        setIsOpen(true);
        return;
      }
    }

    // Tab key: auto-resolve exact shortcut or top match if token is present
    if (e.key === 'Tab') {
      const currentVal = inputRef.current ? inputRef.current.value : (value || '');
      const token = getActiveToken(currentVal).trim().toUpperCase();
      if (token) {
        const cached = masterDataCache[type] || [];
        const shortcutMatch = cached.find(
          (i) => i.shortcut && i.shortcut.trim().toUpperCase() === token
        );
        const itemToUse = shortcutMatch || (isOpen && suggestions.length > 0 ? suggestions[0] : null);
        if (itemToUse) {
          selectItem(itemToUse);
        } else if (currentVal !== value) {
          onChange(currentVal);
        }
      }
      setIsOpen(false);
      return;
    }

    // Enter key: auto-resolve shortcut/suggestion and optionally advance to next input
    if (e.key === 'Enter') {
      const currentVal = inputRef.current ? inputRef.current.value : (value || '');
      const token = getActiveToken(currentVal).trim().toUpperCase();
      const cached = masterDataCache[type] || [];
      const shortcutMatch = token
        ? cached.find((i) => i.shortcut && i.shortcut.trim().toUpperCase() === token)
        : null;

      const itemToUse = shortcutMatch || (suggestions.length > 0 ? (suggestions[highlightedIndex] || suggestions[0]) : null);
      if (itemToUse) {
        e.preventDefault();
        e.stopPropagation();
        selectItem(itemToUse);
        if (!allowMultiple && onEnterNext) {
          setTimeout(() => onEnterNext(), 40);
        }
      } else if (!allowMultiple && onEnterNext) {
        e.preventDefault();
        e.stopPropagation();
        if (currentVal !== value) {
          onChange(currentVal);
        }
        onEnterNext();
      }
      return;
    }

    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        const token = getActiveToken(value);
        const cached = masterDataCache[type] || [];
        const matches = token ? filterMasterItems(token, cached) : cached.slice(0, 20);
        if (matches.length > 0) {
          setSuggestions(matches);
          setHighlightedIndex(0);
          setIsOpen(true);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    // Auto-resolve shortcut if user clicked away or moved focus
    const currentVal = inputRef.current ? inputRef.current.value : (value || '');
    const token = getActiveToken(currentVal).trim().toUpperCase();
    if (token) {
      const cached = masterDataCache[type] || [];
      const shortcutMatch = cached.find(
        (i) => i.shortcut && i.shortcut.trim().toUpperCase() === token
      );
      if (shortcutMatch) {
        selectItem(shortcutMatch);
      } else if (currentVal !== value) {
        onChange(currentVal);
      }
    }
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
        zIndex: isOpen ? 9999 : 'auto',
        ...style,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (currentToken && currentToken.trim().length > 0) {
            setIsOpen(true);
            setHighlightedIndex(0);
          } else {
            setIsOpen(false);
          }
        }}
        onBlur={() => {
          // Delay closing slightly so mouse clicks on dropdown options trigger first
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          height: '34px',
          padding: '0 10px',
          fontSize: '12.5px',
          backgroundColor: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          color: 'var(--text)',
          outline: 'none',
          ...inputStyle,
        }}
      />

      {/* Suggestion Dropdown - only shown when there is an active search token and matching suggestions */}
      {isOpen && currentToken && currentToken.trim().length > 0 && suggestions.length > 0 && (
        <ul ref={listRef} style={styles.dropdown}>
          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <li
                key={item._id || idx}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevents blur before click
                  selectItem(item);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  ...styles.dropdownItem,
                  backgroundColor: isHighlighted ? 'var(--primary-soft)' : 'transparent',
                  color: isHighlighted ? 'var(--primary-dark)' : 'var(--text)',
                  fontWeight: isHighlighted ? 700 : 400,
                  borderLeft: isHighlighted ? '3px solid var(--primary)' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{item.value}</span>
                  {isHighlighted
                    // && (
                    //   <span style={styles.autoSelectHint}>↵ Enter</span>
                    // )
                  }
                </div>
                {item.shortcut && (
                  <span style={styles.shortcutBadge}>{item.shortcut}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const styles = {
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '280px',
    maxWidth: '460px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid var(--primary)',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.25), 0 4px 10px -2px rgba(0, 0, 0, 0.1)',
    maxHeight: '220px',
    overflowY: 'auto',
    listStyle: 'none',
    zIndex: 99999,
    padding: '4px 0',
  },
  dropdownItem: {
    padding: '8px 12px',
    fontSize: '0.86rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background 0.15s ease',
    gap: '8px',
  },
  autoSelectHint: {
    fontSize: '0.68rem',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: 700,
    letterSpacing: '0.3px',
  },
  shortcutBadge: {
    fontSize: '0.72rem',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    padding: '2px 6px',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
};

