import React, { useState, useEffect, useRef } from 'react';
import { masterDataAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

export const MasterDataInput = ({
  type, // 'society' | 'area' | 'allergy' | 'complaint' | 'medicine' | 'investigation'
  value,
  onChange,
  placeholder = '',
  required = false,
  style = {},
  inputStyle = {},
  onSelectCallback,
  allowMultiple = false, // When true, supports comma-separated list and space-to-comma
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Auto-scroll highlighted suggestion into view
  useEffect(() => {
    if (isOpen && listRef.current && suggestions.length > 0) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, suggestions.length]);

  // Extract active search token (text after last comma when allowMultiple is active)
  const getActiveToken = (text) => {
    if (!allowMultiple) return (text || '').trim();
    const str = text || '';
    const lastComma = str.lastIndexOf(',');
    return (lastComma !== -1 ? str.slice(lastComma + 1) : str).trim();
  };

  const currentToken = getActiveToken(value);
  const debouncedToken = useDebounce(currentToken, 200);

  // Fetch suggestions for this type
  useEffect(() => {
    let active = true;
    const fetchItems = async () => {
      try {
        const res = await masterDataAPI.getItems(type, debouncedToken || '');
        if (active && res.success) {
          const items = res.data || [];
          setSuggestions(items);
          setHighlightedIndex(0); // Automatically pre-select first match
        }
      } catch (err) {
        console.error(`Error loading master data for ${type}:`, err);
      }
    };

    fetchItems();
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
    } else {
      setIsOpen(true);
      setHighlightedIndex(0);
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

    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        setHighlightedIndex(0);
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
    } else if (e.key === 'Enter') {
      // If suggestions are active, automatically use highlighted/first selection on Enter
      if (suggestions.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const itemToUse = suggestions[highlightedIndex] || suggestions[0];
        if (itemToUse) {
          selectItem(itemToUse);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', ...style }}>
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
          padding: '11px 14px',
          fontSize: '0.92rem',
          backgroundColor: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text)',
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
                  {isHighlighted && (
                    <span style={styles.autoSelectHint}>↵ Enter</span>
                  )}
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
    minWidth: '240px',
    maxWidth: '420px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-md)',
    maxHeight: '190px',
    overflowY: 'auto',
    listStyle: 'none',
    zIndex: 1000,
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

