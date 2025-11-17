/**
 * FILE: src/components/Tabs.tsx
 * PURPOSE: Accessible tab interface for organizing content.
 *
 * ACCESSIBILITY:
 * - ARIA tabs pattern
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Proper focus management
 * - aria-selected and aria-controls
 *
 * USAGE:
 * - Software detail (Overview, Install, Config, Security, Sources)
 * - Any multi-panel content organization
 */

import { useState, useCallback, useRef, type ReactNode } from 'react';
import styles from './Tabs.module.css';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  /** Optional controlled tab (if omitted, uses internal state) */
  activeTab?: string;
  /** Optional handler for tab changes */
  onTabChange?: (tabId: string) => void;
  /** ID prefix for ARIA attributes */
  idPrefix?: string;
}

export function Tabs({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  idPrefix = 'tabs',
}: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || '');
  const tablistRef = useRef<HTMLDivElement>(null);

  // Use controlled or internal state
  const activeTabId = controlledActiveTab ?? internalActiveTab;

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (onTabChange) {
        onTabChange(tabId);
      } else {
        setInternalActiveTab(tabId);
      }
    },
    [onTabChange]
  );

  /**
   * Keyboard navigation for tabs.
   * Arrow keys move between tabs.
   * Home/End jump to first/last.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      const newTabId = tabs[newIndex].id;
      handleTabClick(newTabId);

      // Focus the new tab button
      const tabButton = tablistRef.current?.querySelector(
        `[data-tab-id="${newTabId}"]`
      ) as HTMLButtonElement | null;
      tabButton?.focus();
    },
    [tabs, activeTabId, handleTabClick]
  );

  const activeTabContent = tabs.find((tab) => tab.id === activeTabId)?.content;

  return (
    <div className={styles.container}>
      {/* Tab list */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Content sections"
        className={styles.tablist}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              data-tab-id={tab.id}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${idPrefix}-panel-${tab.id}`}
            aria-labelledby={`${idPrefix}-tab-${tab.id}`}
            tabIndex={0}
            hidden={!isActive}
            className={styles.panel}
          >
            {isActive && activeTabContent}
          </div>
        );
      })}
    </div>
  );
}

export default Tabs;
