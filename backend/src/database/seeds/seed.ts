/**
 * FILE: src/database/seeds/seed.ts
 * PURPOSE: Seeds the database with sample data for development and testing.
 *          Provides realistic content for missions, labs, knowledge, and tools.
 * INPUTS: None (uses getDatabase() singleton)
 * OUTPUTS: Populated database tables
 * SIDE EFFECTS: Inserts rows into all content tables
 * NOTES:
 *   - Only seeds empty tables (won't overwrite existing data)
 *   - Sample data is realistic but abbreviated for MVP
 *   - Run via SEED_DATABASE_ON_STARTUP=true or manually
 *   - UUIDs are pre-generated for consistent IDs in dev
 */

import { getDatabase, stringifyForDb, getCurrentTimestamp } from '../db';
import { logger } from '../../utils/logger';
import {
  Mission,
  Lab,
  KnowledgeTopic,
  SoftwareTool,
} from '../../types';

/**
 * Seeds the database with sample data.
 * Only inserts data if tables are empty.
 *
 * @returns Promise<void>
 */
export async function seedDatabase(): Promise<void> {
  const db = getDatabase();
  const now = getCurrentTimestamp();

  logger.info('Starting database seeding...');

  /*
   * Check if data already exists.
   * We don't want to duplicate seed data on each startup.
   */
  const missionCount = (
    db.prepare('SELECT COUNT(*) as count FROM missions').get() as { count: number }
  ).count;

  if (missionCount > 0) {
    logger.info('Database already seeded, skipping...');
    return;
  }

  /*
   * ==========================================================================
   * SEED MISSIONS
   * ==========================================================================
   * Sample missions for Week 1 to demonstrate structure.
   * Full curriculum would have 60+ missions (5 per week for 12 weeks).
   */

  const missions: Mission[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      week: 1,
      day: 1,
      title: 'Your First Linux Server',
      narrative: `Welcome to OmegaOps Academy! Today marks the beginning of your journey into server administration.
        You've just been hired as a junior sysadmin at a growing tech startup. Your first task?
        Set up a development server that the team can use. The CTO is counting on you to get this right.
        Let's dive in and show them what you're capable of!`,
      objectives: [
        'Connect to a Linux server via SSH',
        'Navigate the filesystem using basic commands',
        'Understand Linux file permissions',
        'Create your first user account',
      ],
      warmup: [
        {
          question: 'What operating system do most web servers run?',
          answer: 'Linux (specifically distributions like Ubuntu, CentOS/AlmaLinux, or Debian)',
        },
        {
          question: 'Why is the command line important for server administration?',
          answer:
            'It provides precise control, can be automated, uses less resources than GUIs, and is available on all servers',
        },
      ],
      tasks: [
        {
          id: 'task-1-1-1',
          title: 'Connect via SSH',
          instructions: `Use SSH to connect to your server. The command format is:
            \`\`\`bash
            ssh username@server_ip
            \`\`\`
            For this exercise, connect to the provided practice server using the credentials given.`,
          expectedOutcome:
            'You should see a welcome message and a command prompt on the remote server.',
          hints: [
            'Make sure SSH client is installed (OpenSSH comes with most Linux/Mac systems)',
            'On Windows, use PowerShell or install PuTTY',
            'The default SSH port is 22',
          ],
          xpValue: 25,
        },
        {
          id: 'task-1-1-2',
          title: 'Explore the Filesystem',
          instructions: `Navigate around the Linux filesystem using these commands:
            - \`pwd\` - Print working directory
            - \`ls\` - List files
            - \`cd\` - Change directory

            Explore /home, /etc, /var, and /usr directories.`,
          expectedOutcome: 'Understand the standard Linux directory structure.',
          hints: [
            'Use `ls -la` to see hidden files and permissions',
            'Use `cd ..` to go up one directory',
            'Use `cd ~` to return to home directory',
          ],
          xpValue: 30,
        },
        {
          id: 'task-1-1-3',
          title: 'Create a New User',
          instructions: `Create a new user account for your colleague using:
            \`\`\`bash
            sudo useradd -m -s /bin/bash newuser
            sudo passwd newuser
            \`\`\``,
          expectedOutcome:
            'A new user account created with home directory and bash shell.',
          hints: [
            'The -m flag creates a home directory',
            'The -s flag sets the default shell',
            'You need sudo (root) privileges to create users',
          ],
          xpValue: 45,
        },
      ],
      quiz: [
        {
          question: 'What does the `pwd` command do?',
          options: [
            'Print working directory',
            'Password change',
            'Power down',
            'Process working data',
          ],
          correct: 0,
          explanation:
            'pwd stands for "print working directory" and shows your current location in the filesystem.',
        },
        {
          question: 'Which directory contains user home directories?',
          options: ['/usr', '/home', '/etc', '/var'],
          correct: 1,
          explanation:
            '/home is the standard location for user home directories in Linux.',
        },
        {
          question: 'What permission does "x" represent in Linux file permissions?',
          options: ['Read', 'Write', 'Execute', 'Delete'],
          correct: 2,
          explanation:
            'x means execute permission - the ability to run a file as a program or enter a directory.',
        },
      ],
      xpReward: 150,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      week: 1,
      day: 2,
      title: 'Package Management Mastery',
      narrative: `Great job on day one! Now the team needs some software installed on the server.
        They need a web server, database, and some development tools.
        Your mission today is to become proficient with package management -
        the skill that will save you countless hours in your sysadmin career.`,
      objectives: [
        'Understand package management concepts',
        'Install software using apt (Debian/Ubuntu)',
        'Update and upgrade system packages',
        'Remove unwanted software cleanly',
      ],
      warmup: [
        {
          question: 'What is a package manager?',
          answer:
            'A tool that automates installing, updating, and removing software packages and their dependencies',
        },
        {
          question: 'Why not just download software from websites?',
          answer:
            'Package managers handle dependencies, security updates, and ensure software integrity',
        },
      ],
      tasks: [
        {
          id: 'task-1-2-1',
          title: 'Update Package Lists',
          instructions: `Before installing anything, update your package lists:
            \`\`\`bash
            sudo apt update
            \`\`\`
            This fetches the latest package information from repositories.`,
          expectedOutcome: 'Package lists are updated with latest versions.',
          xpValue: 20,
        },
        {
          id: 'task-1-2-2',
          title: 'Install Nginx Web Server',
          instructions: `Install Nginx web server:
            \`\`\`bash
            sudo apt install nginx
            \`\`\`
            After installation, verify it's running with:
            \`\`\`bash
            sudo systemctl status nginx
            \`\`\``,
          expectedOutcome: 'Nginx installed and running on port 80.',
          hints: ['Use -y flag to auto-confirm: `sudo apt install -y nginx`'],
          xpValue: 40,
        },
        {
          id: 'task-1-2-3',
          title: 'Upgrade System Packages',
          instructions: `Upgrade all installed packages to their latest versions:
            \`\`\`bash
            sudo apt upgrade
            \`\`\`
            Review the list before confirming.`,
          expectedOutcome: 'All packages updated to latest stable versions.',
          xpValue: 30,
        },
      ],
      quiz: [
        {
          question: 'What command updates the package list but does not install anything?',
          options: ['apt upgrade', 'apt install', 'apt update', 'apt remove'],
          correct: 2,
          explanation:
            '`apt update` refreshes the package lists from repositories without installing or upgrading anything.',
        },
        {
          question: 'What is a dependency?',
          options: [
            'A backup copy of software',
            'Software that another package needs to function',
            'An optional feature',
            'A configuration file',
          ],
          correct: 1,
          explanation:
            'Dependencies are libraries or other software packages that a program needs to run correctly.',
        },
      ],
      xpReward: 140,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      week: 1,
      day: 3,
      title: 'Securing SSH Access',
      narrative: `Security is paramount! Your server is now online, but it's exposed to the internet.
        Hackers are constantly scanning for vulnerable servers. Today, you'll learn to secure SSH -
        your primary access method. One wrong move and unauthorized users could take control. Let's lock it down!`,
      objectives: [
        'Understand SSH security best practices',
        'Configure SSH to use key-based authentication',
        'Disable password authentication',
        'Change the default SSH port',
      ],
      warmup: [
        {
          question: 'Why is SSH security critical?',
          answer:
            'SSH provides remote access to your server. Compromised SSH means complete server compromise.',
        },
      ],
      tasks: [
        {
          id: 'task-1-3-1',
          title: 'Generate SSH Key Pair',
          instructions: `Generate a secure SSH key pair on your local machine:
            \`\`\`bash
            ssh-keygen -t ed25519 -C "your_email@example.com"
            \`\`\`
            This creates a private key (keep secret!) and public key (share with servers).`,
          expectedOutcome: 'SSH key pair generated in ~/.ssh/ directory.',
          xpValue: 35,
        },
        {
          id: 'task-1-3-2',
          title: 'Copy Public Key to Server',
          instructions: `Copy your public key to the server:
            \`\`\`bash
            ssh-copy-id user@server_ip
            \`\`\`
            Now you can login without a password!`,
          expectedOutcome: 'Public key added to server\'s authorized_keys.',
          xpValue: 40,
        },
        {
          id: 'task-1-3-3',
          title: 'Disable Password Authentication',
          instructions: `Edit the SSH config file:
            \`\`\`bash
            sudo nano /etc/ssh/sshd_config
            \`\`\`
            Set: PasswordAuthentication no
            Restart SSH: \`sudo systemctl restart sshd\``,
          expectedOutcome: 'Password authentication disabled, key-only access.',
          hints: ['IMPORTANT: Verify key access works BEFORE disabling passwords!'],
          xpValue: 50,
        },
      ],
      quiz: [
        {
          question: 'Which SSH key should NEVER be shared?',
          options: ['Public key', 'Private key', 'Both keys', 'Neither key'],
          correct: 1,
          explanation:
            'The private key is your secret identity. Never share it or you lose all security.',
        },
      ],
      xpReward: 175,
      createdAt: now,
      updatedAt: now,
    },
  ];

  /*
   * Insert missions into database.
   * Using prepared statement for efficiency and security.
   */
  const insertMission = db.prepare(`
    INSERT INTO missions (
      id, week, day, title, narrative, objectives, warmup, tasks, quiz,
      xpReward, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const mission of missions) {
    insertMission.run(
      mission.id,
      mission.week,
      mission.day,
      mission.title,
      mission.narrative,
      stringifyForDb(mission.objectives),
      stringifyForDb(mission.warmup),
      stringifyForDb(mission.tasks),
      stringifyForDb(mission.quiz),
      mission.xpReward,
      mission.createdAt,
      mission.updatedAt
    );
  }

  logger.info(`Seeded ${missions.length} missions`);

  /*
   * ==========================================================================
   * SEED LABS
   * ==========================================================================
   * Hands-on scenarios for practice.
   */

  const labs: Lab[] = [
    {
      id: 'lab-11111111-1111-1111-1111-111111111111',
      title: 'Diagnose a Failing Web Server',
      description:
        'A production web server is returning 500 errors. Find and fix the issue.',
      difficulty: 'beginner',
      xpReward: 100,
      scenarioDescription: `You receive an urgent alert: the company website is down!
        Users are seeing "500 Internal Server Error" messages.
        The Nginx web server was working fine yesterday.
        Your task is to investigate the logs, identify the root cause, and restore service.`,
      objectives: [
        'Check Nginx service status',
        'Review error logs in /var/log/nginx/',
        'Identify configuration syntax errors',
        'Test and reload configuration',
      ],
      hints: [
        'Start by checking if Nginx is running: `systemctl status nginx`',
        'Look at recent error logs: `tail -f /var/log/nginx/error.log`',
        'Test config syntax: `nginx -t`',
        'Common issue: missing semicolon in config files',
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'lab-22222222-2222-2222-2222-222222222222',
      title: 'Secure a Compromised Server',
      description:
        'A server shows signs of unauthorized access. Lock it down and investigate.',
      difficulty: 'intermediate',
      xpReward: 200,
      scenarioDescription: `Your monitoring system detected suspicious activity on one of your servers.
        Multiple failed login attempts, unusual processes running, and unexpected network connections.
        You need to secure the server immediately and investigate what happened.`,
      objectives: [
        'Review authentication logs for suspicious activity',
        'Check running processes for anomalies',
        'Identify and block suspicious IP addresses',
        'Rotate compromised credentials',
        'Document findings for incident report',
      ],
      hints: [
        'Check auth logs: `sudo tail -100 /var/log/auth.log`',
        'View running processes: `ps aux` or `top`',
        'Check network connections: `netstat -tupn`',
        'Block IPs with: `sudo ufw deny from IP_ADDRESS`',
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'lab-33333333-3333-3333-3333-333333333333',
      title: 'Optimize a Slow Database',
      description: 'A MySQL database is causing performance issues. Identify and fix bottlenecks.',
      difficulty: 'advanced',
      xpReward: 300,
      scenarioDescription: `The application team reports that database queries are taking too long.
        Page load times have increased from 200ms to 5+ seconds.
        You need to analyze the database performance, identify slow queries,
        and implement optimizations.`,
      objectives: [
        'Enable and review slow query log',
        'Analyze query execution plans with EXPLAIN',
        'Add appropriate indexes',
        'Optimize MySQL configuration',
        'Measure performance improvement',
      ],
      hints: [
        'Enable slow query log in /etc/mysql/mysql.conf.d/mysqld.cnf',
        'Use EXPLAIN before SELECT queries to see execution plan',
        'Missing indexes are the most common cause of slow queries',
        'Consider query caching for read-heavy workloads',
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const insertLab = db.prepare(`
    INSERT INTO labs (
      id, title, description, difficulty, xpReward, scenarioDescription,
      objectives, hints, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const lab of labs) {
    insertLab.run(
      lab.id,
      lab.title,
      lab.description,
      lab.difficulty,
      lab.xpReward,
      lab.scenarioDescription,
      stringifyForDb(lab.objectives),
      stringifyForDb(lab.hints),
      lab.createdAt,
      lab.updatedAt
    );
  }

  logger.info(`Seeded ${labs.length} labs`);

  /*
   * ==========================================================================
   * SEED KNOWLEDGE TOPICS
   * ==========================================================================
   * Reference documentation linked to missions and labs.
   */

  const knowledgeTopics: KnowledgeTopic[] = [
    {
      id: 'topic-11111111-1111-1111-1111-111111111111',
      title: 'SSH (Secure Shell)',
      description: 'Cryptographic network protocol for secure remote server access',
      category: 'Security',
      content: `# SSH (Secure Shell)

SSH is the standard protocol for secure remote access to servers.

## Key Concepts

- **Encrypted Communication**: All data is encrypted in transit
- **Key-Based Authentication**: More secure than passwords
- **Port 22**: Default SSH port (can be changed)

## Common Commands

\`\`\`bash
# Connect to server
ssh user@hostname

# Connect with specific key
ssh -i ~/.ssh/mykey user@hostname

# Copy files over SSH
scp file.txt user@hostname:/path/

# Port forwarding
ssh -L 8080:localhost:80 user@hostname
\`\`\`

## Security Best Practices

1. Use key-based authentication
2. Disable password login
3. Change default port
4. Use fail2ban to block brute force
5. Keep SSH software updated`,
      relatedMissions: ['33333333-3333-3333-3333-333333333333'],
      relatedLabs: [],
      sources: [
        {
          id: 'src-1',
          name: 'OpenSSH Official',
          url: 'https://www.openssh.com/',
          lastCheckedAt: now,
        },
      ],
      confidenceLevel: 'high',
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'topic-22222222-2222-2222-2222-222222222222',
      title: 'Linux Package Management',
      description: 'Installing, updating, and removing software packages on Linux systems',
      category: 'System Administration',
      content: `# Linux Package Management

Package managers automate software installation and maintenance.

## Popular Package Managers

- **APT** (Debian/Ubuntu): apt, apt-get
- **DNF/YUM** (RHEL/CentOS/AlmaLinux): dnf, yum
- **Pacman** (Arch Linux)

## APT Commands (Ubuntu/Debian)

\`\`\`bash
# Update package lists
sudo apt update

# Install package
sudo apt install nginx

# Upgrade all packages
sudo apt upgrade

# Remove package
sudo apt remove nginx

# Search for packages
apt search keyword

# Show package info
apt show nginx
\`\`\`

## Best Practices

1. Always update before installing
2. Review what will be installed
3. Regular security updates
4. Clean up unused packages`,
      relatedMissions: ['22222222-2222-2222-2222-222222222222'],
      relatedLabs: [],
      sources: [
        {
          id: 'src-2',
          name: 'Ubuntu Package Management',
          url: 'https://ubuntu.com/server/docs/package-management',
          lastCheckedAt: now,
        },
      ],
      confidenceLevel: 'high',
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const insertTopic = db.prepare(`
    INSERT INTO knowledge_topics (
      id, title, description, category, content, relatedMissions, relatedLabs,
      sources, confidenceLevel, lastVerifiedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const topic of knowledgeTopics) {
    insertTopic.run(
      topic.id,
      topic.title,
      topic.description,
      topic.category,
      topic.content,
      stringifyForDb(topic.relatedMissions),
      stringifyForDb(topic.relatedLabs),
      stringifyForDb(topic.sources),
      topic.confidenceLevel,
      topic.lastVerifiedAt,
      topic.createdAt,
      topic.updatedAt
    );
  }

  logger.info(`Seeded ${knowledgeTopics.length} knowledge topics`);

  /*
   * ==========================================================================
   * SEED SOFTWARE TOOLS
   * ==========================================================================
   * Server software with installation and configuration guides.
   */

  const softwareTools: SoftwareTool[] = [
    {
      id: 'tool-11111111-1111-1111-1111-111111111111',
      name: 'Nginx',
      category: 'Web Server',
      description:
        'High-performance HTTP server and reverse proxy, known for stability and low resource consumption.',
      useCases: [
        'Web server for static content',
        'Reverse proxy for application servers',
        'Load balancer',
        'SSL/TLS termination',
      ],
      difficulty: 'beginner',
      supportedEnvironments: ['Ubuntu', 'AlmaLinux', 'Debian', 'Docker'],
      installGuides: [
        {
          environment: 'Ubuntu',
          minVersion: '20.04',
          steps: [
            {
              title: 'Update Package Lists',
              description: 'Ensure you have the latest package information',
              commands: [
                {
                  command: 'sudo apt update',
                  explanation: 'Downloads latest package information from repositories',
                  expectedOutputExample: 'Hit:1 http://archive.ubuntu.com/ubuntu focal InRelease',
                },
              ],
            },
            {
              title: 'Install Nginx',
              description: 'Install Nginx web server package',
              commands: [
                {
                  command: 'sudo apt install -y nginx',
                  explanation: 'Installs Nginx and its dependencies. -y auto-confirms.',
                  expectedOutputExample: 'Setting up nginx (1.18.0-0ubuntu1)...',
                },
              ],
            },
            {
              title: 'Start and Enable Service',
              description: 'Ensure Nginx starts on boot',
              commands: [
                {
                  command: 'sudo systemctl enable --now nginx',
                  explanation: 'Enables Nginx to start on boot and starts it immediately',
                  expectedOutputExample: 'Created symlink ... nginx.service.',
                },
              ],
            },
          ],
        },
      ],
      configGuides: [
        {
          scenario: 'Reverse Proxy for Node.js App',
          description: 'Configure Nginx as a reverse proxy for a Node.js application running on port 3000',
          configSnippets: [
            {
              path: '/etc/nginx/sites-available/myapp',
              language: 'nginx',
              content: `server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`,
              annotations: [
                'listen 80 - Accept HTTP traffic on port 80',
                'server_name - Your domain name',
                'proxy_pass - Forward requests to Node.js app',
                'proxy_set_header - Pass important headers to backend',
              ],
            },
          ],
          tuningTips: [
            'Enable gzip compression to reduce bandwidth',
            'Add caching headers for static assets',
            'Configure rate limiting to prevent abuse',
          ],
        },
      ],
      status: 'seeded',
      relevanceScore: 95,
      firstSeenAt: now,
      lastUpdatedAt: now,
      lastVerifiedAt: now,
      sources: [
        {
          id: 'src-nginx-1',
          name: 'Nginx Official Documentation',
          url: 'https://nginx.org/en/docs/',
          lastCheckedAt: now,
        },
      ],
      confidenceLevel: 'high',
    },
    {
      id: 'tool-22222222-2222-2222-2222-222222222222',
      name: 'Docker',
      category: 'Container Runtime',
      description:
        'Platform for developing, shipping, and running applications in containers.',
      useCases: [
        'Application containerization',
        'Development environment consistency',
        'Microservices deployment',
        'CI/CD pipelines',
      ],
      difficulty: 'intermediate',
      supportedEnvironments: ['Ubuntu', 'AlmaLinux', 'Debian'],
      installGuides: [
        {
          environment: 'Ubuntu',
          minVersion: '20.04',
          steps: [
            {
              title: 'Remove Old Docker Versions',
              description: 'Remove any pre-existing Docker installations',
              commands: [
                {
                  command:
                    'sudo apt remove -y docker docker-engine docker.io containerd runc || true',
                  explanation: 'Removes old versions. || true prevents error if not installed.',
                },
              ],
            },
            {
              title: 'Add Docker Repository',
              description: 'Add the official Docker repository for latest versions',
              commands: [
                {
                  command: 'sudo apt update && sudo apt install -y ca-certificates curl gnupg',
                  explanation: 'Install prerequisites for adding repositories',
                },
                {
                  command:
                    'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg',
                  explanation: 'Download and add Docker GPG key for package verification',
                },
              ],
            },
            {
              title: 'Install Docker Engine',
              description: 'Install Docker CE (Community Edition)',
              commands: [
                {
                  command:
                    'sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io',
                  explanation: 'Install Docker engine and CLI tools',
                },
              ],
            },
          ],
        },
      ],
      configGuides: [],
      status: 'seeded',
      relevanceScore: 90,
      firstSeenAt: now,
      lastUpdatedAt: now,
      lastVerifiedAt: now,
      sources: [
        {
          id: 'src-docker-1',
          name: 'Docker Official Documentation',
          url: 'https://docs.docker.com/',
          lastCheckedAt: now,
        },
      ],
      confidenceLevel: 'high',
    },
  ];

  const insertTool = db.prepare(`
    INSERT INTO software_tools (
      id, name, category, description, useCases, difficulty,
      supportedEnvironments, installGuides, configGuides, status,
      relevanceScore, firstSeenAt, lastUpdatedAt, lastVerifiedAt,
      sources, confidenceLevel
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const tool of softwareTools) {
    insertTool.run(
      tool.id,
      tool.name,
      tool.category,
      tool.description,
      stringifyForDb(tool.useCases),
      tool.difficulty,
      stringifyForDb(tool.supportedEnvironments),
      stringifyForDb(tool.installGuides),
      stringifyForDb(tool.configGuides),
      tool.status,
      tool.relevanceScore,
      tool.firstSeenAt,
      tool.lastUpdatedAt,
      tool.lastVerifiedAt,
      stringifyForDb(tool.sources),
      tool.confidenceLevel
    );
  }

  logger.info(`Seeded ${softwareTools.length} software tools`);

  logger.info('Database seeding completed successfully!');
}

// Allow running directly as script
if (require.main === module) {
  // Load environment variables
  import('dotenv').then((dotenv) => {
    dotenv.config();
    seedDatabase()
      .then(() => {
        logger.info('Seeding script completed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Seeding script failed', { error: error.message });
        process.exit(1);
      });
  });
}
