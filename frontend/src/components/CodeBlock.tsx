/**
 * FILE: src/components/CodeBlock.tsx
 * PURPOSE: Syntax-highlighted code display with copy functionality.
 *
 * FEATURES:
 * - Copy to clipboard button
 * - Language indicator
 * - Optional filename display
 * - Line numbers (optional)
 * - Scrollable for long code
 *
 * ACCESSIBILITY:
 * - Keyboard accessible copy button
 * - Screen reader announcements for copy status
 * - Semantic code element
 *
 * PERFORMANCE:
 * - No runtime syntax highlighting (server-side or build-time preferred)
 * - Lazy loading for large code blocks could be added
 */

import { useState, useCallback } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  /** The code to display */
  code: string;
  /** Programming language for display (e.g., "bash", "javascript", "yaml") */
  language: string;
  /** Optional filename to show above code */
  filename?: string;
  /** Show line numbers (default false) */
  showLineNumbers?: boolean;
  /** Maximum height before scrolling (default "400px") */
  maxHeight?: string;
  /** Description of the code block for accessibility */
  description?: string;
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = false,
  maxHeight = '400px',
  description,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Copy code to clipboard.
   * Uses modern Clipboard API with fallback.
   * Shows success state for 2 seconds.
   */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      // Fallback for older browsers or permission denied
      console.error('Failed to copy:', err);

      // Try fallback method using execCommand (deprecated but works)
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }, [code]);

  /**
   * Split code into lines for line numbering.
   * Preserves empty lines for accurate numbering.
   */
  const codeLines = code.split('\n');

  return (
    <div className={styles.container} aria-label={description || `${language} code block`}>
      {/* Header with language/filename and copy button */}
      <div className={styles.header}>
        <div className={styles.languageInfo}>
          <FileCode size={16} aria-hidden="true" />
          {filename ? (
            <span className={styles.filename}>{filename}</span>
          ) : (
            <span className={styles.language}>{language}</span>
          )}
        </div>

        {/* Copy button with status feedback */}
        <button
          type="button"
          onClick={handleCopy}
          className={styles.copyButton}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check size={14} aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content area */}
      <div className={styles.codeWrapper} style={{ maxHeight }}>
        <pre className={styles.pre}>
          {showLineNumbers ? (
            <code className={styles.code}>
              {codeLines.map((line, index) => (
                <div key={index} className={styles.line}>
                  {/* Line number - not selectable to avoid copying */}
                  <span
                    className={styles.lineNumber}
                    aria-hidden="true"
                    data-line={index + 1}
                  >
                    {index + 1}
                  </span>
                  {/* Actual code line */}
                  <span className={styles.lineContent}>{line || ' '}</span>
                </div>
              ))}
            </code>
          ) : (
            <code className={styles.code}>{code}</code>
          )}
        </pre>
      </div>

      {/* Screen reader announcement for copy status */}
      {copied && (
        <div role="status" aria-live="polite" className={styles.srOnly}>
          Code copied to clipboard
        </div>
      )}
    </div>
  );
}

export default CodeBlock;
