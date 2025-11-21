-- ============================================================================
-- FILE: backend/src/database/seeds/week1-content.sql
-- PURPOSE: Week 1 curriculum seed data for OmegaOps Academy
-- THEME: Linux & systemd Basics
-- MISSIONS: 5 daily missions (Monday-Friday) + 1 weekend lab (Saturday)
-- TOTAL XP: 625 XP (missions) + 200 XP (lab) = 825 XP total
-- ============================================================================

-- Week 1 Mission 1 (Monday): "Your First Server Access"
INSERT INTO missions (
  id, week, day, title, narrative, objectives, warmup, tasks, quiz,
  xpReward, createdAt, updatedAt
) VALUES (
  'wk1-day1-first-server-access',
  1,
  1,
  'Your First Server Access',
  'Welcome to OmegaOps Academy! Today marks the beginning of your journey into server administration. You''ve just been hired as a junior sysadmin at a growing tech startup. Your first task? Connect to your first Linux server and get oriented. The CTO is counting on you. Let''s dive in and show them what you''re capable of!',
  '["Understand SSH and remote access", "Navigate the Linux filesystem", "Identify basic system information", "Recognize standard Linux directory structure"]',
  '[{"question": "What operating system do most web servers run?", "answer": "Linux (specifically distributions like Ubuntu, CentOS/AlmaLinux, or Debian)"}, {"question": "Why is the command line important for server administration?", "answer": "It provides precise control, can be automated, uses less resources than GUIs, and is available on all servers"}]',
  '[
    {
      "id": "task-1-1-1",
      "title": "Connect via SSH",
      "instructions": "Use SSH to connect to your server. SSH (Secure Shell) is the standard protocol for secure remote access to servers.\n\nThe command format is:\n```bash\nssh username@server_ip\n```\n\nFor this exercise, connect to the provided practice server using the credentials given.\n\n**Example:**\n```bash\nssh student@192.168.1.100\n```",
      "expectedOutcome": "You should see a welcome message and a command prompt on the remote server (usually ending with $ for regular users or # for root)",
      "hints": [
        "Make sure SSH client is installed (OpenSSH comes with most Linux/Mac systems)",
        "On Windows, use PowerShell (Windows 10+) or install PuTTY",
        "The default SSH port is 22",
        "If you see \"authenticity of host can''t be established\", type ''yes'' to continue (first time only)"
      ],
      "xpValue": 25
    },
    {
      "id": "task-1-1-2",
      "title": "Explore the Filesystem",
      "instructions": "Navigate around the Linux filesystem using these essential commands:\n\n**Basic navigation:**\n- `pwd` - Print working directory (where am I?)\n- `ls` - List files (what''s here?)\n- `ls -la` - List all files with details (permissions, owner, size)\n- `cd` - Change directory (go somewhere else)\n- `cd ..` - Go up one directory\n- `cd ~` - Return to your home directory\n\n**Explore these critical directories:**\n- `/home` - User home directories\n- `/etc` - System configuration files\n- `/var` - Variable data (logs, databases, web content)\n- `/usr` - User programs and libraries\n\nRun `ls -la /etc` to see system configuration files.",
      "expectedOutcome": "Understand the standard Linux directory structure and be comfortable navigating it",
      "hints": [
        "Use Tab key for auto-completion (type cd /h then Tab to complete to /home)",
        "Use ''cd -'' to return to previous directory",
        "Use ''ls -lh'' for human-readable file sizes (KB, MB instead of bytes)",
        "The forward slash (/) is the root of the entire filesystem"
      ],
      "xpValue": 30
    },
    {
      "id": "task-1-1-3",
      "title": "Identify System Information",
      "instructions": "Learn critical commands to identify server information:\n\n```bash\n# Who am I logged in as?\nwhoami\n\n# What is this server?\nuname -a\n\n# What Linux distribution is this?\ncat /etc/os-release\n\n# How long has the server been running?\nuptime\n\n# What''s the hostname?\nhostname\n```\n\nRun each command and understand the output. This information is critical for troubleshooting and documentation.",
      "expectedOutcome": "You can identify the current user, OS version, hostname, and uptime of any Linux server",
      "hints": [
        "uname -a shows kernel version, architecture (x86_64), and more",
        "/etc/os-release contains distribution name and version number",
        "Uptime shows how long since last reboot (important for stability)",
        "Hostname is what the server calls itself on the network"
      ],
      "xpValue": 45
    }
  ]',
  '[
    {
      "question": "What does the `pwd` command do?",
      "options": ["Print working directory", "Password change", "Power down", "Process working data"],
      "correct": 0,
      "explanation": "pwd stands for \"print working directory\" and shows your current location in the filesystem."
    },
    {
      "question": "Which directory contains user home directories?",
      "options": ["/usr", "/home", "/etc", "/var"],
      "correct": 1,
      "explanation": "/home is the standard location for user home directories in Linux. Each user typically has /home/username."
    },
    {
      "question": "What command shows who you are logged in as?",
      "options": ["whoami", "who", "id", "username"],
      "correct": 0,
      "explanation": "whoami prints the current user name. The ''who'' command shows all logged-in users, and ''id'' shows user ID and group information."
    },
    {
      "question": "What does SSH stand for?",
      "options": ["Super Shell", "Secure Shell", "System Shell", "Server Shell"],
      "correct": 1,
      "explanation": "SSH stands for Secure Shell. It provides encrypted remote access to servers."
    }
  ]',
  100,
  datetime('now'),
  datetime('now')
);

-- Week 1 Mission 2 (Tuesday): "Master File Permissions"
INSERT INTO missions (
  id, week, day, title, narrative, objectives, warmup, tasks, quiz,
  xpReward, createdAt, updatedAt
) VALUES (
  'wk1-day2-file-permissions',
  1,
  2,
  'Master File Permissions',
  'Great job on day one! Now the development team has a problem: some scripts won''t execute, and certain users can''t access files they need. Your mission today is to become proficient with Linux file permissions - the skill that will save you countless hours of troubleshooting. Let''s unlock the mystery of rwx!',
  '["Understand rwx permissions (owner, group, others)", "Use chmod to modify permissions", "Use chown to change ownership", "Apply principle of least privilege"]',
  '[{"question": "What does it mean for a file to be ''executable''?", "answer": "It can be run as a program or script by the system"}, {"question": "Why would you want to restrict file access?", "answer": "Security - prevent unauthorized users from reading sensitive data or modifying critical files"}]',
  '[
    {
      "id": "task-1-2-1",
      "title": "Understand Permission Notation",
      "instructions": "Learn to read Linux file permissions:\n\n```bash\n# List files with permissions\nls -l\n\n# Example output:\n# -rw-r--r-- 1 user group 1234 Nov 18 10:00 file.txt\n# drwxr-xr-x 2 user group 4096 Nov 18 10:00 mydir\n```\n\n**Permission breakdown:**\n- First character: file type (- = file, d = directory, l = symlink)\n- Next 9 characters: permissions in groups of 3\n  - Characters 2-4: Owner permissions (rwx)\n  - Characters 5-7: Group permissions (rwx)\n  - Characters 8-10: Others permissions (rwx)\n\n**Permission meanings:**\n- `r` = read (4)\n- `w` = write (2)\n- `x` = execute (1)\n- `-` = no permission\n\nRun `ls -l /home` to see real permission examples.",
      "expectedOutcome": "You can read and understand permission notation like -rw-r--r-- or drwxr-xr-x",
      "hints": [
        "Use ''ls -la'' to see permissions of hidden files (starting with .)",
        "Directories need x (execute) permission to enter them",
        "Numeric permissions: 7=rwx, 6=rw-, 5=r-x, 4=r--, 0=---",
        "Example: 755 means rwxr-xr-x (owner full, group+others read+execute)"
      ],
      "xpValue": 35
    },
    {
      "id": "task-1-2-2",
      "title": "Modify Permissions with chmod",
      "instructions": "Practice changing file permissions:\n\n```bash\n# Create a test file\ntouch test.sh\necho ''#!/bin/bash'' > test.sh\necho ''echo Hello World'' >> test.sh\n\n# Check current permissions\nls -l test.sh\n\n# Make it executable\nchmod +x test.sh\n\n# Run it\n./test.sh\n\n# Set specific permissions (owner: rwx, group: rx, others: r)\nchmod 754 test.sh\n\n# Remove write permission from everyone\nchmod a-w test.sh\n```\n\n**chmod syntax:**\n- Symbolic: `chmod u+x file` (u=user/owner, g=group, o=others, a=all)\n- Numeric: `chmod 755 file` (owner=7, group=5, others=5)\n\nPractice both methods!",
      "expectedOutcome": "You can make files executable, restrict permissions, and use both symbolic and numeric chmod notation",
      "hints": [
        "Scripts need execute (x) permission to run",
        "chmod +x is shorthand for chmod a+x (add execute for all)",
        "chmod 644 is common for files (rw-r--r--)",
        "chmod 755 is common for directories and executables (rwxr-xr-x)",
        "Never use 777 (full permissions for everyone) unless absolutely necessary"
      ],
      "xpValue": 40
    },
    {
      "id": "task-1-2-3",
      "title": "Change Ownership with chown",
      "instructions": "Learn to change file ownership and group:\n\n```bash\n# Create test file (if not exists)\ntouch myfile.txt\n\n# Check current owner and group\nls -l myfile.txt\n\n# Change owner (requires sudo)\nsudo chown newuser myfile.txt\n\n# Change both owner and group\nsudo chown newuser:newgroup myfile.txt\n\n# Change group only\nsudo chgrp newgroup myfile.txt\n\n# Change ownership recursively for a directory\nsudo chown -R user:group /path/to/directory\n```\n\n**Common use cases:**\n- Fix permissions after copying files as root\n- Grant web server access to website files\n- Share files between team members via groups\n\n**IMPORTANT:** Only root (or sudo) can change file ownership.",
      "expectedOutcome": "You understand ownership concepts and can change owner/group of files and directories",
      "hints": [
        "chown stands for \"change owner\"",
        "chgrp stands for \"change group\"",
        "Use -R flag for recursive changes (all files in a directory)",
        "Web server files often need to be owned by www-data user",
        "Check groups you belong to with ''groups'' command"
      ],
      "xpValue": 50
    }
  ]',
  '[
    {
      "question": "What does ''rwx'' stand for in Linux permissions?",
      "options": ["read, write, execute", "run, write, exit", "read, watch, exit", "run, watch, execute"],
      "correct": 0,
      "explanation": "rwx stands for read, write, and execute - the three basic permission types in Linux."
    },
    {
      "question": "What does chmod 755 mean?",
      "options": ["rwxr-xr-x", "rwxrwxrwx", "rw-r--r--", "r-xr-xr-x"],
      "correct": 0,
      "explanation": "755 means: owner has rwx (7), group has r-x (5), others have r-x (5). This is common for executables and directories."
    },
    {
      "question": "What command changes file ownership?",
      "options": ["chmod", "chown", "chgrp", "usermod"],
      "correct": 1,
      "explanation": "chown (change owner) changes file ownership. It requires sudo/root privileges."
    },
    {
      "question": "Why should you avoid using chmod 777?",
      "options": [
        "It makes files too small",
        "It gives everyone full permissions (security risk)",
        "It deletes the file",
        "It''s not a valid chmod value"
      ],
      "correct": 1,
      "explanation": "chmod 777 gives everyone (owner, group, others) full read, write, and execute permissions - a major security risk."
    }
  ]',
  125,
  datetime('now'),
  datetime('now')
);

-- Week 1 Mission 3 (Wednesday): "systemd Service Master"
INSERT INTO missions (
  id, week, day, title, narrative, objectives, warmup, tasks, quiz,
  xpReward, createdAt, updatedAt
) VALUES (
  'wk1-day3-systemd-services',
  1,
  3,
  'systemd Service Master',
  'The production web server just went down! Customers are complaining. Your manager is panicking. You need to understand systemd - the init system that manages all services on modern Linux distributions. Master this, and you''ll be able to diagnose, restart, and fix almost any service issue. Time to become a service master!',
  '["Understand systemd and unit files", "Start, stop, restart, enable/disable services", "Check service status and logs", "Troubleshoot service failures"]',
  '[{"question": "What is a service/daemon in Linux?", "answer": "A background process that runs continuously, often started at boot (e.g., web server, database, SSH)"}, {"question": "What happens to services when you reboot a server?", "answer": "Only services that are ''enabled'' will automatically start on boot"}]',
  '[
    {
      "id": "task-1-3-1",
      "title": "Understand systemd Basics",
      "instructions": "systemd is the service manager for most modern Linux distributions (Ubuntu, Debian, AlmaLinux, etc.).\n\n**Key concepts:**\n- **Unit**: A resource managed by systemd (service, socket, timer, etc.)\n- **Service**: A type of unit representing a daemon/service\n- **Enabled**: Service will start automatically on boot\n- **Active**: Service is currently running\n\n**Essential commands:**\n```bash\n# List all services\nsystemctl list-units --type=service\n\n# List all service unit files (even if not running)\nsystemctl list-unit-files --type=service\n\n# Check if systemd is running (it almost always is)\nsystemctl --version\n```\n\nRun these commands to see what services are on your system.",
      "expectedOutcome": "You understand systemd concepts and can list all services on a system",
      "hints": [
        "Use ''systemctl list-units --type=service --state=running'' to see only running services",
        "Use ''systemctl list-units --type=service --state=failed'' to see failed services",
        "Most service names end in .service (e.g., nginx.service)",
        "You can omit .service extension: ''systemctl status nginx'' works"
      ],
      "xpValue": 30
    },
    {
      "id": "task-1-3-2",
      "title": "Control Services (Start, Stop, Restart)",
      "instructions": "Learn to control service state:\n\n```bash\n# Check service status\nsystemctl status nginx\n\n# Start a service\nsudo systemctl start nginx\n\n# Stop a service\nsudo systemctl stop nginx\n\n# Restart a service (stop then start)\nsudo systemctl restart nginx\n\n# Reload configuration without full restart\nsudo systemctl reload nginx\n\n# Try to reload, fallback to restart if reload not supported\nsudo systemctl reload-or-restart nginx\n```\n\n**When to use each:**\n- **start**: Service is stopped, you want it running\n- **stop**: Service is running, you want it stopped (temporarily)\n- **restart**: Service is misbehaving, need fresh start\n- **reload**: Configuration changed, want to apply without downtime\n\nPractice with nginx (or another service on your system).",
      "expectedOutcome": "You can start, stop, restart, and reload any service on a Linux system",
      "hints": [
        "Always check ''systemctl status'' before and after changes",
        "Green dot = active/running, Red dot = failed/stopped",
        "''reload'' is faster than ''restart'' (no downtime) but not all services support it",
        "If a service won''t start, check ''systemctl status servicename'' for errors"
      ],
      "xpValue": 40
    },
    {
      "id": "task-1-3-3",
      "title": "Enable and Disable Auto-Start",
      "instructions": "Control whether services start on boot:\n\n```bash\n# Check if service is enabled (auto-start on boot)\nsystemctl is-enabled nginx\n\n# Enable service to start on boot\nsudo systemctl enable nginx\n\n# Disable service from starting on boot\nsudo systemctl disable nginx\n\n# Enable AND start immediately\nsudo systemctl enable --now nginx\n\n# Disable AND stop immediately\nsudo systemctl disable --now nginx\n\n# Check both enabled and active status\nsystemctl is-enabled nginx && systemctl is-active nginx\n```\n\n**Important distinction:**\n- **enabled**: Will start automatically on boot\n- **active**: Currently running right now\n\nA service can be:\n- Enabled but not active (will start on next boot)\n- Active but not enabled (running now but won''t survive reboot)\n- Both enabled and active (running now, will start on boot)\n- Neither enabled nor active (stopped, won''t auto-start)",
      "expectedOutcome": "You understand the difference between enabled and active, and can configure services to auto-start or not",
      "hints": [
        "Always enable critical services (SSH, web server, database)",
        "Use ''systemctl is-enabled servicename'' to check status",
        "Use --now flag to enable/disable AND start/stop in one command",
        "After enabling, verify with ''systemctl list-unit-files | grep servicename''"
      ],
      "xpValue": 55
    }
  ]',
  '[
    {
      "question": "What command checks if a service is running?",
      "options": ["systemctl status servicename", "systemctl check servicename", "systemctl running servicename", "systemctl is-running servicename"],
      "correct": 0,
      "explanation": "systemctl status shows detailed status including whether service is active (running), enabled, recent logs, and PID."
    },
    {
      "question": "How do you make a service auto-start at boot?",
      "options": ["systemctl start servicename", "systemctl enable servicename", "systemctl boot servicename", "systemctl autostart servicename"],
      "correct": 1,
      "explanation": "systemctl enable makes a service start automatically on boot. systemctl start only starts it right now (won''t survive reboot unless enabled)."
    },
    {
      "question": "What is the difference between ''restart'' and ''reload''?",
      "options": [
        "No difference, they do the same thing",
        "reload is faster and has no downtime, restart stops then starts",
        "restart is safer than reload",
        "reload requires sudo, restart does not"
      ],
      "correct": 1,
      "explanation": "reload re-reads configuration without stopping the service (no downtime). restart stops then starts the service (brief downtime). Not all services support reload."
    },
    {
      "question": "Where are systemd unit files typically stored?",
      "options": ["/etc/systemd/system/", "/usr/lib/systemd/system/", "Both A and B", "/var/systemd/"],
      "correct": 2,
      "explanation": "systemd unit files are in /usr/lib/systemd/system/ (package defaults) and /etc/systemd/system/ (admin customizations, takes priority)."
    }
  ]',
  125,
  datetime('now'),
  datetime('now')
);

-- Week 1 Mission 4 (Thursday): "Manage Users & Groups"
INSERT INTO missions (
  id, week, day, title, narrative, objectives, warmup, tasks, quiz,
  xpReward, createdAt, updatedAt
) VALUES (
  'wk1-day4-users-groups',
  1,
  4,
  'Manage Users & Groups',
  'The company is growing fast! HR just sent you a list of 10 new hires who need server access. But wait - different people need different levels of access. Developers need sudo, contractors need restricted access, and some users should only be able to run specific commands. Time to master user and group management!',
  '["Create and delete user accounts", "Create and manage groups", "Understand and configure sudo access", "Apply principle of least privilege"]',
  '[{"question": "Why is it dangerous to give everyone root access?", "answer": "Root can do anything - delete files, modify configs, install malware. One mistake or malicious actor can destroy the entire system"}, {"question": "What is the principle of least privilege?", "answer": "Give users only the minimum permissions they need to do their job, nothing more"}]',
  '[
    {
      "id": "task-1-4-1",
      "title": "Create and Manage Users",
      "instructions": "Learn user account management:\n\n```bash\n# Create a new user\nsudo useradd -m -s /bin/bash developer1\n\n# Set password for new user\nsudo passwd developer1\n\n# Create user with specific home directory and custom shell\nsudo useradd -m -d /home/custompath -s /bin/zsh developer2\n\n# View user information\nid developer1\ngetent passwd developer1\n\n# Modify existing user (change shell)\nsudo usermod -s /bin/zsh developer1\n\n# Delete user (keep home directory)\nsudo userdel developer1\n\n# Delete user AND remove home directory\nsudo userdel -r developer1\n\n# List all users\ncat /etc/passwd\n```\n\n**Important flags:**\n- `-m` = create home directory\n- `-s` = set default shell\n- `-d` = specify home directory path\n- `-r` = remove home directory when deleting user",
      "expectedOutcome": "You can create, modify, and delete user accounts on a Linux system",
      "hints": [
        "Always use -m flag to create home directory (most users need one)",
        "Default shell is usually /bin/bash (or /bin/sh)",
        "User info is stored in /etc/passwd, passwords in /etc/shadow",
        "UID 0 = root, UID 1-999 = system users, UID 1000+ = regular users",
        "Use ''cat /etc/passwd | grep username'' to check if user exists"
      ],
      "xpValue": 40
    },
    {
      "id": "task-1-4-2",
      "title": "Create and Manage Groups",
      "instructions": "Master group management for shared access:\n\n```bash\n# Create a new group\nsudo groupadd developers\n\n# Add user to group (append, don''t replace existing groups)\nsudo usermod -aG developers developer1\n\n# Add user to multiple groups\nsudo usermod -aG developers,sudo,docker developer1\n\n# Check what groups a user belongs to\ngroups developer1\nid developer1\n\n# List all groups\ncat /etc/group\n\n# Create group with specific GID\nsudo groupadd -g 1500 contractors\n\n# Delete group\nsudo groupdel developers\n\n# Change user''s primary group\nsudo usermod -g newprimarygroup username\n```\n\n**Common groups:**\n- `sudo` = Can use sudo command\n- `www-data` = Web server group\n- `docker` = Can use Docker without sudo\n- `adm` = Can read system logs",
      "expectedOutcome": "You can create groups, add/remove users from groups, and understand group-based permissions",
      "hints": [
        "ALWAYS use -a flag with -G (append, don''t replace)",
        "Without -a, usermod -G will REMOVE user from all other groups",
        "Groups enable shared file access without making files world-readable",
        "Users can belong to multiple groups (one primary, many supplementary)",
        "Changes to groups require re-login to take effect"
      ],
      "xpValue": 40
    },
    {
      "id": "task-1-4-3",
      "title": "Configure sudo Access",
      "instructions": "Grant specific users administrative privileges:\n\n```bash\n# Add user to sudo group (Debian/Ubuntu)\nsudo usermod -aG sudo developer1\n\n# Add user to wheel group (RHEL/CentOS/AlmaLinux)\nsudo usermod -aG wheel developer1\n\n# Test sudo access (run as the user)\nsu - developer1\nsudo whoami  # Should return ''root''\nexit\n\n# Edit sudoers file (ALWAYS use visudo, never edit directly)\nsudo visudo\n\n# Allow user to run specific command without password\n# Add this line in visudo:\n# developer1 ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx\n\n# Allow group to run all commands with password\n# %developers ALL=(ALL:ALL) ALL\n\n# Check sudo access\nsudo -l -U developer1\n```\n\n**CRITICAL sudo safety rules:**\n1. NEVER edit /etc/sudoers directly - use visudo\n2. visudo checks syntax before saving (prevents lockout)\n3. Grant sudo sparingly (principle of least privilege)\n4. Use NOPASSWD only for specific safe commands\n5. Prefer group-based sudo (easier to manage)",
      "expectedOutcome": "You can grant and configure sudo access safely, understanding the security implications",
      "hints": [
        "visudo uses vi editor by default (use i to insert, ESC then :wq to save)",
        "Set EDITOR=nano before visudo to use nano instead",
        "Test sudo access before logging out (or you might get locked out)",
        "sudo group (Ubuntu/Debian) or wheel group (RHEL/AlmaLinux)",
        "''sudo -l'' shows what sudo commands current user can run"
      ],
      "xpValue": 45
    }
  ]',
  '[
    {
      "question": "What flag creates a home directory when adding a user?",
      "options": ["-h", "-m", "-d", "-c"],
      "correct": 1,
      "explanation": "useradd -m creates a home directory for the new user (usually /home/username)."
    },
    {
      "question": "What file controls sudo access?",
      "options": ["/etc/passwd", "/etc/sudoers", "/etc/sudo.conf", "/etc/group"],
      "correct": 1,
      "explanation": "/etc/sudoers controls sudo access. Always edit it with ''visudo'' command, never directly."
    },
    {
      "question": "What does usermod -aG do?",
      "options": [
        "Delete user from group",
        "Add user to group (append to existing groups)",
        "Create a new group",
        "List user''s groups"
      ],
      "correct": 1,
      "explanation": "usermod -aG adds user to group while keeping existing group memberships. Without -a, it would REPLACE all groups."
    },
    {
      "question": "Why should you use visudo instead of editing /etc/sudoers directly?",
      "options": [
        "visudo is faster",
        "visudo checks syntax and prevents lockouts from syntax errors",
        "visudo requires less typing",
        "visudo automatically backs up the file"
      ],
      "correct": 1,
      "explanation": "visudo validates syntax before saving. A syntax error in /etc/sudoers can lock you out of sudo access completely."
    }
  ]',
  125,
  datetime('now'),
  datetime('now')
);

-- Week 1 Mission 5 (Friday): "Process & Resource Management"
INSERT INTO missions (
  id, week, day, title, narrative, objectives, warmup, tasks, quiz,
  xpReward, createdAt, updatedAt
) VALUES (
  'wk1-day5-process-management',
  1,
  5,
  'Process & Resource Management',
  'RED ALERT! The server is running out of memory. CPU usage is at 95%. Something is consuming all resources and the application is grinding to a halt. You have minutes before customers start calling. You need to identify the rogue process, understand what it''s doing, and terminate it before the entire system crashes. This is where you prove your worth as a sysadmin!',
  '["Understand processes and PIDs", "Monitor resource usage (CPU, memory, disk)", "Identify and kill problematic processes", "Interpret top/htop output"]',
  '[{"question": "What is a process?", "answer": "A running instance of a program, with its own memory space and resources"}, {"question": "What happens when a server runs out of memory?", "answer": "The OOM (Out Of Memory) killer terminates processes to free memory, or the system becomes unresponsive"}]',
  '[
    {
      "id": "task-1-5-1",
      "title": "View and Understand Processes",
      "instructions": "Learn to view running processes:\n\n```bash\n# View all processes\nps aux\n\n# View processes in tree format (shows parent-child relationships)\nps auxf\n\n# View processes for current user only\nps -u $(whoami)\n\n# Find specific process\nps aux | grep nginx\n\n# View process details\nps -p PID -o pid,ppid,cmd,%mem,%cpu\n\n# Show all processes with full command\nps -ef\n```\n\n**Understanding ps aux output:**\n- USER: Who owns the process\n- PID: Process ID (unique identifier)\n- %CPU: CPU usage percentage\n- %MEM: Memory usage percentage\n- VSZ: Virtual memory size (KB)\n- RSS: Resident set size (physical memory, KB)\n- TTY: Terminal (? means no terminal)\n- STAT: Process state (R=running, S=sleeping, Z=zombie)\n- START: When process started\n- TIME: CPU time consumed\n- COMMAND: What command/program is running",
      "expectedOutcome": "You can list processes, understand their state, and find specific processes by name or PID",
      "hints": [
        "Use ''ps aux --sort=-%mem'' to sort by memory usage (highest first)",
        "Use ''ps aux --sort=-%cpu'' to sort by CPU usage",
        "PID 1 is always the init system (systemd on modern Linux)",
        "PPID = parent process ID (what started this process)",
        "Zombie processes (Z state) are terminated but not yet cleaned up"
      ],
      "xpValue": 40
    },
    {
      "id": "task-1-5-2",
      "title": "Monitor Resources with top/htop",
      "instructions": "Use top (or htop) for real-time monitoring:\n\n```bash\n# Launch top (built-in)\ntop\n\n# Sort by memory usage in top (press Shift+M)\n# Sort by CPU usage in top (press Shift+P)\n# Kill process from top (press k, then enter PID)\n# Quit top (press q)\n\n# Launch htop (may need to install first)\nsudo apt install htop  # Ubuntu/Debian\nhtop\n```\n\n**Top/htop sections:**\n\n**Header (top):**\n- Load average: 1min, 5min, 15min (< number of CPU cores = good)\n- CPU: us=user, sy=system, id=idle, wa=wait (I/O)\n- Memory: total, used, free, buffers, cache\n\n**Process list:**\n- PID, USER, PR (priority), NI (nice), VIRT (virtual), RES (resident), SHR (shared)\n- S (status), %CPU, %MEM, TIME+, COMMAND\n\n**htop advantages:**\n- Colorful, easier to read\n- Mouse support\n- Easier filtering and sorting\n- Tree view (F5)\n\n**Practice:**\n1. Run top or htop\n2. Identify highest CPU process\n3. Identify highest memory process\n4. Check load average (is system overloaded?)",
      "expectedOutcome": "You can monitor system resources in real-time and identify resource-hungry processes",
      "hints": [
        "Load average > number of CPU cores = system is overloaded",
        "High wa (wait) means I/O bottleneck (slow disk)",
        "''free -h'' shows memory usage in human-readable format",
        "Buffers and cache are good - Linux uses free RAM for caching",
        "In htop: F3=search, F4=filter, F5=tree, F6=sort, F9=kill, F10=quit"
      ],
      "xpValue": 50
    },
    {
      "id": "task-1-5-3",
      "title": "Terminate Processes (kill, pkill, killall)",
      "instructions": "Learn to stop misbehaving processes:\n\n```bash\n# Find process PID\nps aux | grep processname\n\n# Graceful termination (SIGTERM - allows cleanup)\nkill PID\n\n# Force kill (SIGKILL - immediate, no cleanup)\nkill -9 PID\n\n# Send specific signal\nkill -SIGTERM PID\nkill -SIGHUP PID  # Reload configuration\n\n# Kill by process name (kills all matching)\npkill processname\npkill -9 processname  # Force kill\n\n# Kill all instances of a command\nkillall nginx\nkillall -9 nginx  # Force kill\n\n# Kill processes by user\npkill -u username\n```\n\n**Signal types:**\n- SIGTERM (15): Polite request to terminate (default)\n- SIGKILL (9): Immediate termination (cannot be ignored)\n- SIGHUP (1): Reload configuration (some services)\n- SIGSTOP (19): Pause process\n- SIGCONT (18): Resume paused process\n\n**Best practice:**\n1. Try SIGTERM first (kill PID)\n2. Wait a few seconds\n3. If still running, use SIGKILL (kill -9 PID)\n\n**WARNING:** Never kill PID 1 (systemd/init) or critical system processes!",
      "expectedOutcome": "You can safely terminate processes using appropriate signals, understanding the difference between graceful and forced termination",
      "hints": [
        "Always try kill (SIGTERM) before kill -9 (SIGKILL)",
        "SIGTERM allows process to clean up (save data, close files)",
        "SIGKILL cannot be caught or ignored (nuclear option)",
        "Use ''pgrep processname'' to find PID by name",
        "Use ''pkill -f pattern'' to match full command line (not just process name)"
      ],
      "xpValue": 60
    }
  ]',
  '[
    {
      "question": "What does PID stand for?",
      "options": ["Process ID", "Program ID", "Parent ID", "Primary ID"],
      "correct": 0,
      "explanation": "PID stands for Process ID - a unique number identifying each running process on the system."
    },
    {
      "question": "What signal does kill -9 send?",
      "options": ["SIGTERM", "SIGKILL", "SIGHUP", "SIGSTOP"],
      "correct": 1,
      "explanation": "kill -9 sends SIGKILL - an immediate, forceful termination that cannot be caught or ignored. Use as last resort."
    },
    {
      "question": "What does high ''wa'' in top output indicate?",
      "options": [
        "High CPU usage",
        "High memory usage",
        "I/O wait (disk or network bottleneck)",
        "Too many processes"
      ],
      "correct": 2,
      "explanation": "High ''wa'' (I/O wait) means the CPU is waiting for I/O operations to complete - usually indicates slow disk or network."
    },
    {
      "question": "What is the difference between kill and killall?",
      "options": [
        "No difference",
        "kill uses PID, killall uses process name",
        "kill is safer than killall",
        "killall requires sudo"
      ],
      "correct": 1,
      "explanation": "kill requires a PID (kill 1234), killall uses process name (killall nginx) and kills all matching processes."
    },
    {
      "question": "What is a good load average for a 4-core CPU?",
      "options": ["Below 1.0", "Below 4.0", "Below 10.0", "Above 4.0"],
      "correct": 1,
      "explanation": "Load average should be below the number of CPU cores. For a 4-core CPU, load average below 4.0 is generally good."
    }
  ]',
  150,
  datetime('now'),
  datetime('now')
);

-- Week 1 Lab (Saturday): "Linux Troubleshooting Scenario"
INSERT INTO labs (
  id, title, description, difficulty, xpReward, scenarioDescription,
  objectives, hints, createdAt, updatedAt
) VALUES (
  'wk1-lab-troubleshooting',
  'Emergency: Critical Service Down',
  'A production web server is down. Multiple services have failed. You have 60 minutes to diagnose the issues and restore service before customers revolt.',
  'beginner',
  200,
  '**SITUATION:**

It''s 3 AM. Your phone is ringing. The automated monitoring system is sending critical alerts. The company website is down with a 502 Bad Gateway error. You SSH into the server and immediately notice several problems:

1. The Nginx web server is not responding
2. Disk usage is at 100%
3. Several processes are in a zombie state
4. The application backend service has crashed
5. File permissions on /var/www are incorrect

**YOUR MISSION:**

You have 60 minutes to:
- Identify all issues causing the outage
- Fix each problem systematically
- Restore all services to healthy state
- Verify the website is accessible again
- Document what went wrong and how you fixed it

**THE STAKES:**

Every minute of downtime costs the company $5,000 in lost revenue. The CEO is watching. Your manager is panicking. This is your chance to prove you''re a real sysadmin.

**SCENARIO SETUP (For Docker Lab Environment):**

This lab is designed to be run in a Docker container with intentionally broken services. Admins can create the scenario with:

```dockerfile
FROM ubuntu:22.04
RUN apt update && apt install -y nginx php-fpm
# Intentionally fill disk with logs
RUN dd if=/dev/zero of=/var/log/bigfile bs=1M count=5000
# Break file permissions
RUN chmod 000 /var/www/html
# Configure nginx to point to broken backend
COPY broken-nginx.conf /etc/nginx/sites-enabled/default
# Disable services
RUN systemctl disable nginx php-fpm
```

Students will need to:
1. Identify services that should be running
2. Check disk space and clean up
3. Fix file permissions
4. Configure services correctly
5. Start and enable all required services',
  '[
    "Diagnose why Nginx web server is not running",
    "Identify and fix disk space issues",
    "Repair file permissions on web root directory",
    "Restart crashed application services",
    "Verify all services are running and enabled",
    "Test website accessibility from external perspective",
    "Document root causes and remediation steps"
  ]',
  '[
    "HINT 1 - Where to Start: Always check service status first. Run ''systemctl status nginx'' and ''systemctl status php-fpm'' to see what''s actually running.",
    "HINT 2 - Disk Space: Use ''df -h'' to check disk usage. If /var is full, check ''du -sh /var/log/*'' to find large log files. Clean up with ''sudo rm'' or ''sudo truncate -s 0 filename''.",
    "HINT 3 - File Permissions: Web server needs to read files in /var/www. Check current permissions with ''ls -ld /var/www/html''. Fix with ''sudo chmod 755 /var/www/html'' and ''sudo chown -R www-data:www-data /var/www/html''.",
    "HINT 4 - Service Dependencies: Some services depend on others. For example, Nginx might need PHP-FPM running if you''re serving PHP applications. Start dependencies first.",
    "HINT 5 - Verification: After fixing everything, verify from multiple angles: ''systemctl status servicename'', ''curl http://localhost'', ''ps aux | grep nginx'', and test from external browser.",
    "HINT 6 - Enable Services: Even if you start services, they won''t survive a reboot unless enabled. Use ''sudo systemctl enable nginx'' and ''sudo systemctl enable php-fpm''.",
    "HINT 7 - Logs Are Your Friend: If a service fails to start, check logs: ''journalctl -u nginx -n 50'' or ''tail -f /var/log/nginx/error.log''.",
    "HINT 8 - Test as You Go: Fix one issue, verify it''s fixed, then move to the next. Don''t try to fix everything at once.",
    "HINT 9 - Zombie Processes: Zombie processes (Z state in ps aux) are harmless and will be cleaned up by systemd. Focus on the real issues first.",
    "HINT 10 - Final Test: Use ''curl -I http://localhost'' to test from command line. Expect ''HTTP/1.1 200 OK'' or ''HTTP/1.1 301'' (not 502)."
  ]',
  datetime('now'),
  datetime('now')
);

-- Success message
SELECT 'Week 1 curriculum seeded successfully!' as message,
       'Missions: 5' as missions_count,
       'Labs: 1' as labs_count,
       'Total XP: 825' as total_xp;
