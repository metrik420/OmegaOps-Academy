/**
 * FILE: src/components/SoftwareCard.tsx
 * PURPOSE: Preview card for software tools in the Software Galaxy.
 *
 * FEATURES:
 * - Tool name, description, category
 * - Environment badges (ubuntu, docker, etc.)
 * - Deprecation warning if applicable
 * - Confidence level indicator
 * - Click to navigate to detail
 */

import { Link } from 'react-router-dom';
import { ChevronRight, AlertTriangle, Shield } from 'lucide-react';
import Badge from './Badge';
import type { SoftwareTool } from '@/types';
import styles from './SoftwareCard.module.css';

interface SoftwareCardProps {
  tool: SoftwareTool;
}

/**
 * Truncate description to specific length.
 * Adds ellipsis if truncated.
 */
const truncateDescription = (text: string, maxLength: number = 120): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export function SoftwareCard({ tool }: SoftwareCardProps) {
  const {
    id,
    name,
    description,
    category,
    environments,
    deprecated,
    confidenceLevel,
  } = tool;

  return (
    <Link
      to={`/software/${id}`}
      className={`${styles.card} ${deprecated ? styles.deprecated : ''}`}
      aria-label={`${name}${deprecated ? ' (Deprecated)' : ''}: ${description}`}
    >
      {/* Deprecation warning */}
      {deprecated && (
        <div className={styles.deprecatedBanner}>
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Deprecated</span>
        </div>
      )}

      {/* Header with category */}
      <div className={styles.header}>
        <Badge variant="category" value={category} size="sm" />
        <div className={styles.confidence}>
          <Shield size={12} aria-hidden="true" />
          <span>{confidenceLevel}</span>
        </div>
      </div>

      {/* Tool name */}
      <h3 className={styles.name}>{name}</h3>

      {/* Description */}
      <p className={styles.description}>{truncateDescription(description)}</p>

      {/* Environment badges */}
      <div className={styles.environments}>
        {environments.slice(0, 4).map((env) => (
          <Badge key={env} variant="environment" value={env} size="sm" />
        ))}
        {environments.length > 4 && (
          <span className={styles.moreEnvs}>+{environments.length - 4}</span>
        )}
      </div>

      {/* Action indicator */}
      <div className={styles.action}>
        <span>View Details</span>
        <ChevronRight size={16} aria-hidden="true" />
      </div>
    </Link>
  );
}

export default SoftwareCard;
