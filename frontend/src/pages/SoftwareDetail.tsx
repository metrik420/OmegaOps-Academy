/**
 * FILE: src/pages/SoftwareDetail.tsx
 * PURPOSE: Individual software tool detail with tabs for different sections.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge from '@/components/Badge';
import Tabs from '@/components/Tabs';
import CodeBlock from '@/components/CodeBlock';
import styles from './SoftwareDetail.module.css';

const mockTool = {
  id: 'docker',
  name: 'Docker',
  description: 'Docker is a platform for building, shipping, and running applications in containers.',
  category: 'container-runtime',
  useCases: ['Development environments', 'Microservices architecture', 'CI/CD pipelines', 'Application isolation'],
  environments: ['ubuntu', 'debian', 'centos', 'macos', 'windows', 'docker'],
  installGuides: [
    {
      environment: 'ubuntu',
      steps: [
        { order: 1, description: 'Update package index', command: 'sudo apt update' },
        { order: 2, description: 'Install prerequisites', command: 'sudo apt install -y ca-certificates curl gnupg' },
        { order: 3, description: 'Add Docker GPG key', command: 'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg' },
        { order: 4, description: 'Add Docker repository', command: 'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null' },
        { order: 5, description: 'Install Docker', command: 'sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io' },
      ],
      verified: true,
      verifiedVersion: '24.0.7',
      lastVerifiedAt: '2025-01-15',
    },
  ],
  configGuide: {
    overview: 'Docker configuration is managed through the daemon.json file and various command-line options.',
    commonSettings: [
      { name: 'storage-driver', description: 'Storage driver to use', defaultValue: 'overlay2', recommendedValue: 'overlay2' },
      { name: 'log-driver', description: 'Default logging driver', defaultValue: 'json-file', recommendedValue: 'json-file' },
    ],
    bestPractices: ['Use multi-stage builds', 'Minimize layer count', 'Use .dockerignore', 'Scan images for vulnerabilities'],
    exampleConfigs: [
      {
        language: 'json',
        filename: '/etc/docker/daemon.json',
        code: `{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}`,
      },
    ],
  },
  securityConsiderations: [
    'Run containers as non-root user',
    'Use trusted base images',
    'Scan images for vulnerabilities',
    'Limit container capabilities',
    'Use read-only file systems where possible',
    'Implement resource limits',
  ],
  sources: [
    { title: 'Docker Documentation', url: 'https://docs.docker.com/', type: 'official' as const, accessedAt: '2025-01-15' },
    { title: 'Docker Security Best Practices', url: 'https://docs.docker.com/engine/security/', type: 'official' as const, accessedAt: '2025-01-10' },
  ],
  lastVerifiedAt: '2025-01-15',
  confidenceLevel: 'high' as const,
  deprecated: false,
  relatedTools: ['containerd', 'podman', 'buildah'],
  tags: ['container', 'devops', 'docker'],
};

export function SoftwareDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading tool details..." />
      </div>
    );
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className={styles.tabContent}>
          <h3>Description</h3>
          <p>{mockTool.description}</p>

          <h3>Use Cases</h3>
          <ul>
            {mockTool.useCases.map((useCase, i) => (
              <li key={i}>{useCase}</li>
            ))}
          </ul>

          <h3>Related Tools</h3>
          <div className={styles.relatedTools}>
            {mockTool.relatedTools.map((tool) => (
              <Badge key={tool} variant="category" value={tool} size="md" />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'install',
      label: 'Installation',
      content: (
        <div className={styles.tabContent}>
          {mockTool.installGuides.map((guide, i) => (
            <div key={i} className={styles.installGuide}>
              <h3>
                <Badge variant="environment" value={guide.environment} size="md" />
                Installation Guide
              </h3>
              <p className={styles.verificationInfo}>
                Verified for version {guide.verifiedVersion} on {guide.lastVerifiedAt}
              </p>
              <ol className={styles.installSteps}>
                {guide.steps.map((step) => (
                  <li key={step.order}>
                    <p>{step.description}</p>
                    {step.command && <CodeBlock code={step.command} language="bash" />}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'config',
      label: 'Configuration',
      content: (
        <div className={styles.tabContent}>
          <h3>Overview</h3>
          <p>{mockTool.configGuide.overview}</p>

          <h3>Best Practices</h3>
          <ul>
            {mockTool.configGuide.bestPractices.map((practice, i) => (
              <li key={i}>{practice}</li>
            ))}
          </ul>

          <h3>Example Configuration</h3>
          {mockTool.configGuide.exampleConfigs.map((config, i) => (
            <CodeBlock key={i} code={config.code} language={config.language} filename={config.filename} />
          ))}
        </div>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      content: (
        <div className={styles.tabContent}>
          <h3>Security Considerations</h3>
          <ul className={styles.securityList}>
            {mockTool.securityConsiderations.map((item, i) => (
              <li key={i}>
                <Shield size={16} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: 'sources',
      label: 'Sources',
      content: (
        <div className={styles.tabContent}>
          <h3>Reference Sources</h3>
          <div className={styles.sourcesList}>
            {mockTool.sources.map((source, i) => (
              <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className={styles.sourceItem}>
                <ExternalLink size={16} aria-hidden="true" />
                <span>{source.title}</span>
                <Badge variant="status" value={source.type} size="sm" />
                <span className={styles.accessedDate}>Accessed: {source.accessedAt}</span>
              </a>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.softwareDetail}>
      <button type="button" onClick={() => navigate(-1)} className={styles.backButton}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Badge variant="category" value={mockTool.category} size="md" />
          <div className={styles.confidence}>
            <Shield size={16} aria-hidden="true" />
            <span>{mockTool.confidenceLevel} confidence</span>
          </div>
        </div>

        <h1 className={styles.title}>{mockTool.name}</h1>

        {mockTool.deprecated && (
          <div className={styles.deprecationWarning}>
            <AlertTriangle size={20} aria-hidden="true" />
            <span>This tool is deprecated. Consider using alternatives.</span>
          </div>
        )}

        <div className={styles.environments}>
          {mockTool.environments.map((env) => (
            <Badge key={env} variant="environment" value={env} size="sm" />
          ))}
        </div>

        <p className={styles.lastVerified}>Last verified: {mockTool.lastVerifiedAt}</p>
      </header>

      <Tabs tabs={tabs} />
    </div>
  );
}

export default SoftwareDetail;
