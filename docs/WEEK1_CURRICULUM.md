# Week 1 Curriculum: Linux & systemd Basics

**Target Audience:** Beginners (0-1 years Linux experience)
**Difficulty:** Beginner
**Total XP:** 825 XP (625 missions + 200 lab)
**Estimated Time:** 5-7 hours total

---

## Overview

Week 1 establishes the foundational Linux skills every sysadmin needs. Students will learn to:

- Connect to and navigate Linux servers via SSH
- Manage file permissions and ownership
- Control services with systemd
- Create and manage user accounts and groups
- Monitor and control system processes and resources
- Troubleshoot real-world server outages

By the end of Week 1, students will be comfortable working in a Linux command-line environment and capable of performing basic system administration tasks.

---

## Daily Missions

### Mission 1 (Monday): "Your First Server Access"

**XP Reward:** 100 XP
**Difficulty:** Beginner
**Estimated Time:** 30-45 minutes

#### Narrative

Welcome to OmegaOps Academy! Today marks the beginning of your journey into server administration. You've just been hired as a junior sysadmin at a growing tech startup. Your first task? Connect to your first Linux server and get oriented. The CTO is counting on you. Let's dive in and show them what you're capable of!

#### Learning Objectives

- Understand SSH and remote access
- Navigate the Linux filesystem
- Identify basic system information
- Recognize standard Linux directory structure

#### Tasks

**Task 1: Connect via SSH** (25 XP)

Learn to connect to a Linux server using SSH (Secure Shell):

```bash
ssh username@server_ip
# Example: ssh student@192.168.1.100
```

**Expected Outcome:** You see a welcome message and command prompt on the remote server.

**Hints:**
- OpenSSH comes with most Linux/Mac systems
- On Windows 10+, use PowerShell; older Windows needs PuTTY
- Default SSH port is 22
- First connection prompts to verify host authenticity (type 'yes')

**Task 2: Explore the Filesystem** (30 XP)

Navigate the Linux directory structure:

```bash
# Basic navigation
pwd             # Print working directory (where am I?)
ls              # List files (what's here?)
ls -la          # List all files with details
cd /home        # Change directory
cd ..           # Go up one directory
cd ~            # Return to home directory

# Explore critical directories
ls -la /home    # User home directories
ls -la /etc     # System configuration files
ls -la /var     # Variable data (logs, databases, web content)
ls -la /usr     # User programs and libraries
```

**Expected Outcome:** Understand the standard Linux directory structure and navigate confidently.

**Hints:**
- Use Tab key for auto-completion
- Use `cd -` to return to previous directory
- Use `ls -lh` for human-readable file sizes
- The forward slash (/) is the root of the filesystem

**Task 3: Identify System Information** (45 XP)

Learn to identify server information:

```bash
whoami              # Who am I logged in as?
uname -a            # What is this server?
cat /etc/os-release # What Linux distribution is this?
uptime              # How long has the server been running?
hostname            # What's the hostname?
```

**Expected Outcome:** You can identify the current user, OS version, hostname, and uptime of any Linux server.

**Hints:**
- `uname -a` shows kernel version and architecture (x86_64)
- `/etc/os-release` contains distribution name and version
- Uptime shows how long since last reboot (important for stability)
- Hostname is what the server calls itself on the network

#### Quiz

1. **What does the `pwd` command do?**
   - A) Print working directory ✓
   - B) Password change
   - C) Power down
   - D) Process working data

   **Explanation:** pwd stands for "print working directory" and shows your current location in the filesystem.

2. **Which directory contains user home directories?**
   - A) /usr
   - B) /home ✓
   - C) /etc
   - D) /var

   **Explanation:** /home is the standard location for user home directories in Linux.

3. **What command shows who you are logged in as?**
   - A) whoami ✓
   - B) who
   - C) id
   - D) username

   **Explanation:** whoami prints the current user name.

4. **What does SSH stand for?**
   - A) Super Shell
   - B) Secure Shell ✓
   - C) System Shell
   - D) Server Shell

   **Explanation:** SSH stands for Secure Shell. It provides encrypted remote access to servers.

#### Sources

- [SSH Manual Page](https://man7.org/linux/man-pages/man1/ssh.1.html) - High Confidence
- [Linux Handbook SSH Guide](https://linuxhandbook.com/ssh/) - High Confidence

---

### Mission 2 (Tuesday): "Master File Permissions"

**XP Reward:** 125 XP
**Difficulty:** Beginner
**Estimated Time:** 45-60 minutes

#### Narrative

Great job on day one! Now the development team has a problem: some scripts won't execute, and certain users can't access files they need. Your mission today is to become proficient with Linux file permissions - the skill that will save you countless hours of troubleshooting. Let's unlock the mystery of rwx!

#### Learning Objectives

- Understand rwx permissions (owner, group, others)
- Use chmod to modify permissions
- Use chown to change ownership
- Apply principle of least privilege

#### Tasks

**Task 1: Understand Permission Notation** (35 XP)

Learn to read Linux file permissions:

```bash
ls -l
# Example output:
# -rw-r--r-- 1 user group 1234 Nov 18 10:00 file.txt
# drwxr-xr-x 2 user group 4096 Nov 18 10:00 mydir
```

**Permission breakdown:**
- First character: file type (- = file, d = directory, l = symlink)
- Next 9 characters: permissions in groups of 3
  - Characters 2-4: Owner permissions (rwx)
  - Characters 5-7: Group permissions (rwx)
  - Characters 8-10: Others permissions (rwx)

**Permission meanings:**
- `r` = read (4)
- `w` = write (2)
- `x` = execute (1)
- `-` = no permission

**Numeric permissions:**
- 7 = rwx (4+2+1)
- 6 = rw- (4+2)
- 5 = r-x (4+1)
- 4 = r-- (4)
- 0 = --- (0)

Example: 755 means rwxr-xr-x (owner full, group+others read+execute)

**Task 2: Modify Permissions with chmod** (40 XP)

Practice changing file permissions:

```bash
# Create a test script
touch test.sh
echo '#!/bin/bash' > test.sh
echo 'echo Hello World' >> test.sh

# Check current permissions
ls -l test.sh

# Make it executable
chmod +x test.sh

# Run it
./test.sh

# Set specific permissions (owner: rwx, group: rx, others: r)
chmod 754 test.sh

# Remove write permission from everyone
chmod a-w test.sh
```

**chmod syntax:**
- Symbolic: `chmod u+x file` (u=user/owner, g=group, o=others, a=all)
- Numeric: `chmod 755 file` (owner=7, group=5, others=5)

**Common permissions:**
- 644 (rw-r--r--): Regular files
- 755 (rwxr-xr-x): Executables and directories
- 600 (rw-------): Private files (only owner can access)

**Task 3: Change Ownership with chown** (50 XP)

Learn to change file ownership and group:

```bash
# Create test file
touch myfile.txt

# Check current owner and group
ls -l myfile.txt

# Change owner (requires sudo)
sudo chown newuser myfile.txt

# Change both owner and group
sudo chown newuser:newgroup myfile.txt

# Change group only
sudo chgrp newgroup myfile.txt

# Change ownership recursively for a directory
sudo chown -R user:group /path/to/directory
```

**Common use cases:**
- Fix permissions after copying files as root
- Grant web server access to website files
- Share files between team members via groups

#### Quiz

1. **What does 'rwx' stand for in Linux permissions?**
   - A) read, write, execute ✓
   - B) run, write, exit
   - C) read, watch, exit
   - D) run, watch, execute

2. **What does chmod 755 mean?**
   - A) rwxr-xr-x ✓
   - B) rwxrwxrwx
   - C) rw-r--r--
   - D) r-xr-xr-x

3. **What command changes file ownership?**
   - A) chmod
   - B) chown ✓
   - C) chgrp
   - D) usermod

4. **Why should you avoid using chmod 777?**
   - A) It makes files too small
   - B) It gives everyone full permissions (security risk) ✓
   - C) It deletes the file
   - D) It's not a valid chmod value

#### Sources

- [chmod Manual Page](https://man7.org/linux/man-pages/man1/chmod.1.html) - High Confidence
- [Ubuntu File Permissions Guide](https://help.ubuntu.com/community/FilePermissions) - High Confidence

---

### Mission 3 (Wednesday): "systemd Service Master"

**XP Reward:** 125 XP
**Difficulty:** Beginner
**Estimated Time:** 45-60 minutes

#### Narrative

The production web server just went down! Customers are complaining. Your manager is panicking. You need to understand systemd - the init system that manages all services on modern Linux distributions. Master this, and you'll be able to diagnose, restart, and fix almost any service issue. Time to become a service master!

#### Learning Objectives

- Understand systemd and unit files
- Start, stop, restart, enable/disable services
- Check service status and logs
- Troubleshoot service failures

#### Tasks

**Task 1: Understand systemd Basics** (30 XP)

Learn systemd concepts:

**Key concepts:**
- **Unit**: A resource managed by systemd (service, socket, timer, etc.)
- **Service**: A type of unit representing a daemon/service
- **Enabled**: Service will start automatically on boot
- **Active**: Service is currently running

```bash
# List all services
systemctl list-units --type=service

# List all service unit files (even if not running)
systemctl list-unit-files --type=service

# Check systemd version
systemctl --version

# List only running services
systemctl list-units --type=service --state=running

# List failed services
systemctl list-units --type=service --state=failed
```

**Task 2: Control Services** (40 XP)

Learn to start, stop, and restart services:

```bash
# Check service status
systemctl status nginx

# Start a service
sudo systemctl start nginx

# Stop a service
sudo systemctl stop nginx

# Restart a service (stop then start)
sudo systemctl restart nginx

# Reload configuration without full restart
sudo systemctl reload nginx

# Try to reload, fallback to restart if reload not supported
sudo systemctl reload-or-restart nginx
```

**When to use each:**
- **start**: Service is stopped, you want it running
- **stop**: Service is running, you want it stopped (temporarily)
- **restart**: Service is misbehaving, need fresh start
- **reload**: Configuration changed, want to apply without downtime

**Task 3: Enable and Disable Auto-Start** (55 XP)

Control whether services start on boot:

```bash
# Check if service is enabled (auto-start on boot)
systemctl is-enabled nginx

# Enable service to start on boot
sudo systemctl enable nginx

# Disable service from starting on boot
sudo systemctl disable nginx

# Enable AND start immediately
sudo systemctl enable --now nginx

# Disable AND stop immediately
sudo systemctl disable --now nginx

# Check both enabled and active status
systemctl is-enabled nginx && systemctl is-active nginx
```

**Important distinction:**
- **enabled**: Will start automatically on boot
- **active**: Currently running right now

A service can be:
- Enabled but not active (will start on next boot)
- Active but not enabled (running now but won't survive reboot)
- Both enabled and active (running now, will start on boot) ← Best practice
- Neither enabled nor active (stopped, won't auto-start)

#### Quiz

1. **What command checks if a service is running?**
   - A) systemctl status servicename ✓
   - B) systemctl check servicename
   - C) systemctl running servicename
   - D) systemctl is-running servicename

2. **How do you make a service auto-start at boot?**
   - A) systemctl start servicename
   - B) systemctl enable servicename ✓
   - C) systemctl boot servicename
   - D) systemctl autostart servicename

3. **What is the difference between 'restart' and 'reload'?**
   - A) No difference
   - B) reload is faster and has no downtime, restart stops then starts ✓
   - C) restart is safer than reload
   - D) reload requires sudo, restart does not

4. **Where are systemd unit files typically stored?**
   - A) /etc/systemd/system/
   - B) /usr/lib/systemd/system/
   - C) Both A and B ✓
   - D) /var/systemd/

#### Sources

- [systemd Official Documentation](https://systemd.io/) - High Confidence
- [systemctl Manual Page](https://man7.org/linux/man-pages/man1/systemctl.1.html) - High Confidence

---

### Mission 4 (Thursday): "Manage Users & Groups"

**XP Reward:** 125 XP
**Difficulty:** Beginner
**Estimated Time:** 45-60 minutes

#### Narrative

The company is growing fast! HR just sent you a list of 10 new hires who need server access. But wait - different people need different levels of access. Developers need sudo, contractors need restricted access, and some users should only be able to run specific commands. Time to master user and group management!

#### Learning Objectives

- Create and delete user accounts
- Create and manage groups
- Understand and configure sudo access
- Apply principle of least privilege

#### Tasks

**Task 1: Create and Manage Users** (40 XP)

```bash
# Create a new user
sudo useradd -m -s /bin/bash developer1

# Set password for new user
sudo passwd developer1

# Create user with specific home directory and custom shell
sudo useradd -m -d /home/custompath -s /bin/zsh developer2

# View user information
id developer1
getent passwd developer1

# Modify existing user (change shell)
sudo usermod -s /bin/zsh developer1

# Delete user (keep home directory)
sudo userdel developer1

# Delete user AND remove home directory
sudo userdel -r developer1

# List all users
cat /etc/passwd
```

**Important flags:**
- `-m` = create home directory
- `-s` = set default shell
- `-d` = specify home directory path
- `-r` = remove home directory when deleting user

**Task 2: Create and Manage Groups** (40 XP)

```bash
# Create a new group
sudo groupadd developers

# Add user to group (append, don't replace existing groups)
sudo usermod -aG developers developer1

# Add user to multiple groups
sudo usermod -aG developers,sudo,docker developer1

# Check what groups a user belongs to
groups developer1
id developer1

# List all groups
cat /etc/group

# Delete group
sudo groupdel developers
```

**Common groups:**
- `sudo` = Can use sudo command (Debian/Ubuntu)
- `wheel` = Can use sudo command (RHEL/AlmaLinux)
- `www-data` = Web server group
- `docker` = Can use Docker without sudo

**IMPORTANT:** Always use `-a` flag with `-G` (append, don't replace). Without `-a`, usermod `-G` will REMOVE user from all other groups!

**Task 3: Configure sudo Access** (45 XP)

```bash
# Add user to sudo group (Debian/Ubuntu)
sudo usermod -aG sudo developer1

# Add user to wheel group (RHEL/CentOS/AlmaLinux)
sudo usermod -aG wheel developer1

# Test sudo access (run as the user)
su - developer1
sudo whoami  # Should return 'root'
exit

# Edit sudoers file (ALWAYS use visudo, never edit directly)
sudo visudo

# Example sudoers entries:
# Allow user to run specific command without password:
developer1 ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx

# Allow group to run all commands with password:
%developers ALL=(ALL:ALL) ALL

# Check sudo access
sudo -l -U developer1
```

**CRITICAL sudo safety rules:**
1. NEVER edit /etc/sudoers directly - use visudo
2. visudo checks syntax before saving (prevents lockout)
3. Grant sudo sparingly (principle of least privilege)
4. Use NOPASSWD only for specific safe commands
5. Prefer group-based sudo (easier to manage)

#### Quiz

1. **What flag creates a home directory when adding a user?**
   - A) -h
   - B) -m ✓
   - C) -d
   - D) -c

2. **What file controls sudo access?**
   - A) /etc/passwd
   - B) /etc/sudoers ✓
   - C) /etc/sudo.conf
   - D) /etc/group

3. **What does usermod -aG do?**
   - A) Delete user from group
   - B) Add user to group (append to existing groups) ✓
   - C) Create a new group
   - D) List user's groups

4. **Why should you use visudo instead of editing /etc/sudoers directly?**
   - A) visudo is faster
   - B) visudo checks syntax and prevents lockouts from syntax errors ✓
   - C) visudo requires less typing
   - D) visudo automatically backs up the file

#### Sources

- [useradd Manual Page](https://man7.org/linux/man-pages/man8/useradd.8.html) - High Confidence
- [Ubuntu Sudo Guide](https://help.ubuntu.com/community/Sudoers) - High Confidence

---

### Mission 5 (Friday): "Process & Resource Management"

**XP Reward:** 150 XP
**Difficulty:** Beginner
**Estimated Time:** 60-75 minutes

#### Narrative

RED ALERT! The server is running out of memory. CPU usage is at 95%. Something is consuming all resources and the application is grinding to a halt. You have minutes before customers start calling. You need to identify the rogue process, understand what it's doing, and terminate it before the entire system crashes. This is where you prove your worth as a sysadmin!

#### Learning Objectives

- Understand processes and PIDs
- Monitor resource usage (CPU, memory, disk)
- Identify and kill problematic processes
- Interpret top/htop output

#### Tasks

**Task 1: View and Understand Processes** (40 XP)

```bash
# View all processes
ps aux

# View processes in tree format (shows parent-child relationships)
ps auxf

# View processes for current user only
ps -u $(whoami)

# Find specific process
ps aux | grep nginx

# Sort by memory usage (highest first)
ps aux --sort=-%mem

# Sort by CPU usage (highest first)
ps aux --sort=-%cpu
```

**Understanding ps aux output:**
- USER: Who owns the process
- PID: Process ID (unique identifier)
- %CPU: CPU usage percentage
- %MEM: Memory usage percentage
- VSZ: Virtual memory size (KB)
- RSS: Resident set size (physical memory, KB)
- TTY: Terminal (? means no terminal)
- STAT: Process state (R=running, S=sleeping, Z=zombie)
- START: When process started
- TIME: CPU time consumed
- COMMAND: What command/program is running

**Task 2: Monitor Resources with top/htop** (50 XP)

```bash
# Launch top (built-in)
top

# In top:
# Press Shift+M to sort by memory usage
# Press Shift+P to sort by CPU usage
# Press k to kill a process (enter PID)
# Press q to quit

# Launch htop (may need to install first)
sudo apt install htop  # Ubuntu/Debian
htop

# In htop:
# F3 = search
# F4 = filter
# F5 = tree view
# F6 = sort
# F9 = kill
# F10 = quit
```

**Top/htop header sections:**
- **Load average**: 1min, 5min, 15min (< number of CPU cores = good)
- **CPU**: us=user, sy=system, id=idle, wa=wait (I/O)
- **Memory**: total, used, free, buffers, cache

**Interpreting load average:**
- For a 4-core CPU: load < 4.0 is good, > 4.0 means overloaded
- For a 2-core CPU: load < 2.0 is good, > 2.0 means overloaded

**Interpreting CPU:**
- High `us` (user) = applications using CPU
- High `sy` (system) = kernel using CPU
- High `wa` (wait) = CPU waiting for I/O (disk/network bottleneck)
- High `id` (idle) = CPU is idle (good)

**Task 3: Terminate Processes** (60 XP)

```bash
# Find process PID
ps aux | grep processname

# Graceful termination (SIGTERM - allows cleanup)
kill PID

# Force kill (SIGKILL - immediate, no cleanup)
kill -9 PID

# Send specific signal
kill -SIGTERM PID
kill -SIGHUP PID  # Reload configuration

# Kill by process name (kills all matching)
pkill processname
pkill -9 processname  # Force kill

# Kill all instances of a command
killall nginx
killall -9 nginx  # Force kill

# Kill processes by user
pkill -u username
```

**Signal types:**
- SIGTERM (15): Polite request to terminate (default) - allows cleanup
- SIGKILL (9): Immediate termination (cannot be ignored) - no cleanup
- SIGHUP (1): Reload configuration (some services)
- SIGSTOP (19): Pause process
- SIGCONT (18): Resume paused process

**Best practice:**
1. Try SIGTERM first: `kill PID`
2. Wait a few seconds
3. If still running, use SIGKILL: `kill -9 PID`

**WARNING:** Never kill PID 1 (systemd/init) or critical system processes!

#### Quiz

1. **What does PID stand for?**
   - A) Process ID ✓
   - B) Program ID
   - C) Parent ID
   - D) Primary ID

2. **What signal does kill -9 send?**
   - A) SIGTERM
   - B) SIGKILL ✓
   - C) SIGHUP
   - D) SIGSTOP

3. **What does high 'wa' in top output indicate?**
   - A) High CPU usage
   - B) High memory usage
   - C) I/O wait (disk or network bottleneck) ✓
   - D) Too many processes

4. **What is the difference between kill and killall?**
   - A) No difference
   - B) kill uses PID, killall uses process name ✓
   - C) kill is safer than killall
   - D) killall requires sudo

5. **What is a good load average for a 4-core CPU?**
   - A) Below 1.0
   - B) Below 4.0 ✓
   - C) Below 10.0
   - D) Above 4.0

#### Sources

- [ps Manual Page](https://man7.org/linux/man-pages/man1/ps.1.html) - High Confidence
- [kill Manual Page](https://man7.org/linux/man-pages/man1/kill.1.html) - High Confidence

---

## Weekend Lab: "Emergency: Critical Service Down"

**XP Reward:** 200 XP
**Difficulty:** Beginner
**Estimated Time:** 45-60 minutes

### Scenario

It's 3 AM. Your phone is ringing. The automated monitoring system is sending critical alerts. The company website is down with a 502 Bad Gateway error. You SSH into the server and immediately notice several problems:

1. The Nginx web server is not responding
2. Disk usage is at 100%
3. Several processes are in a zombie state
4. The application backend service has crashed
5. File permissions on /var/www are incorrect

### Your Mission

You have 60 minutes to:
- Identify all issues causing the outage
- Fix each problem systematically
- Restore all services to healthy state
- Verify the website is accessible again
- Document what went wrong and how you fixed it

### The Stakes

Every minute of downtime costs the company $5,000 in lost revenue. The CEO is watching. Your manager is panicking. This is your chance to prove you're a real sysadmin.

### Objectives

1. Diagnose why Nginx web server is not running
2. Identify and fix disk space issues
3. Repair file permissions on web root directory
4. Restart crashed application services
5. Verify all services are running and enabled
6. Test website accessibility from external perspective
7. Document root causes and remediation steps

### Hints

1. **Where to Start**: Always check service status first. Run `systemctl status nginx` and `systemctl status php-fpm`.

2. **Disk Space**: Use `df -h` to check disk usage. If /var is full, check `du -sh /var/log/*` to find large log files.

3. **File Permissions**: Web server needs to read files in /var/www. Check with `ls -ld /var/www/html`. Fix with `sudo chmod 755 /var/www/html`.

4. **Service Dependencies**: Some services depend on others (Nginx might need PHP-FPM). Start dependencies first.

5. **Verification**: After fixing, verify from multiple angles: `systemctl status`, `curl http://localhost`, `ps aux | grep nginx`.

6. **Enable Services**: Use `sudo systemctl enable nginx` to ensure it starts on boot.

7. **Logs Are Your Friend**: Check logs with `journalctl -u nginx -n 50` or `tail -f /var/log/nginx/error.log`.

8. **Test as You Go**: Fix one issue, verify it's fixed, then move to the next.

9. **Zombie Processes**: Zombie processes (Z state) are harmless and will be cleaned up. Focus on real issues first.

10. **Final Test**: Use `curl -I http://localhost` to test. Expect HTTP 200 or 301 (not 502).

### Troubleshooting Steps

**Step 1: Check Service Status**
```bash
systemctl status nginx
systemctl status php-fpm
systemctl list-units --type=service --state=failed
```

**Step 2: Check Disk Space**
```bash
df -h
du -sh /var/log/*
du -sh /var/www/*
```

**Step 3: Clean Up Disk Space**
```bash
sudo truncate -s 0 /var/log/largefile
sudo rm /var/log/largefile
sudo journalctl --vacuum-size=100M
```

**Step 4: Check File Permissions**
```bash
ls -ld /var/www/html
ls -la /var/www/html/
```

**Step 5: Fix File Permissions**
```bash
sudo chmod 755 /var/www/html
sudo chown -R www-data:www-data /var/www/html
```

**Step 6: Start Services**
```bash
sudo systemctl start nginx
sudo systemctl start php-fpm
```

**Step 7: Enable Services**
```bash
sudo systemctl enable nginx
sudo systemctl enable php-fpm
```

**Step 8: Verify Services**
```bash
systemctl status nginx
systemctl status php-fpm
curl -I http://localhost
```

### Acceptance Criteria

- ✓ Nginx service is active and running
- ✓ Nginx service is enabled for auto-start
- ✓ Disk usage is below 90%
- ✓ File permissions on /var/www/html are correct (755)
- ✓ Website returns HTTP 200 or 301 (not 502)
- ✓ No critical services in failed state

### Learning Outcomes

- Systematic troubleshooting methodology (check, diagnose, fix, verify)
- Disk space management and cleanup
- File permissions repair
- Service management with systemd
- Service dependency understanding
- Verification and testing techniques
- Documentation of incidents and resolutions

### Bonus Challenges

1. **Performance Optimization** (+50 XP): After fixing core issues, optimize Nginx configuration for better performance
2. **Monitoring Setup** (+50 XP): Set up a simple monitoring script that alerts when disk usage exceeds 80%
3. **Automated Cleanup** (+50 XP): Create a cron job to automatically clean old log files weekly

### Sources

- [Nginx Troubleshooting Guide](https://nginx.org/en/docs/debugging_log.html) - High Confidence
- [Linux Disk Space Management](https://www.redhat.com/sysadmin/linux-disk-space) - High Confidence
- [systemd Troubleshooting](https://www.freedesktop.org/software/systemd/man/systemctl.html) - High Confidence

---

## Week 1 Summary

### Total XP Available

- Mission 1 (Monday): 100 XP
- Mission 2 (Tuesday): 125 XP
- Mission 3 (Wednesday): 125 XP
- Mission 4 (Thursday): 125 XP
- Mission 5 (Friday): 150 XP
- Lab (Saturday): 200 XP
- **Total: 825 XP**

### Skills Acquired

By completing Week 1, students will have mastered:

1. **SSH & Remote Access**: Securely connect to and navigate Linux servers
2. **File Permissions**: Understand and modify rwx permissions with chmod/chown
3. **systemd Service Management**: Start, stop, enable services; troubleshoot failures
4. **User & Group Management**: Create users, manage groups, configure sudo
5. **Process Management**: Monitor resources, identify issues, terminate processes
6. **Troubleshooting**: Systematic approach to diagnosing and fixing server issues

### Progression to Week 2

Week 1 establishes the Linux foundation. Week 2 (Web Servers) will build on these skills by:
- Installing and configuring Nginx and Apache
- Understanding web server logs
- Configuring virtual hosts
- Implementing SSL/TLS certificates

Students should feel comfortable with the command line and basic sysadmin tasks before proceeding.

---

## For Instructors & Content Developers

### Creating Additional Week Content

This Week 1 curriculum serves as a template for creating Weeks 2-12. Follow this structure:

1. **Choose a Theme**: Each week should focus on one major topic (e.g., Web Servers, Databases, DNS)
2. **Define Learning Objectives**: What skills should students master by end of week?
3. **Create 5 Daily Missions**: Progressive difficulty (100-150 XP each)
4. **Create 1 Weekend Lab**: Real-world scenario integrating all week's concepts (200 XP)
5. **Write Engaging Narratives**: Make learning feel like adventure, not academic exercise
6. **Include Quizzes**: 3-5 questions per mission to reinforce learning
7. **Cite Sources**: Always link to official documentation (high confidence)
8. **Test Everything**: Verify all commands work on target platforms (Ubuntu 22.04, AlmaLinux 9)

### Quality Checklist

Before deploying new week content:

- [ ] All commands tested on Ubuntu 22.04 and AlmaLinux 9
- [ ] Safe examples only (example.com, RFC1918 IPs)
- [ ] No production credentials or real domains
- [ ] All sources cited with confidence levels
- [ ] Narratives are engaging and realistic
- [ ] Quiz questions test understanding (not just memorization)
- [ ] XP rewards match difficulty (harder = more XP)
- [ ] Estimated times are realistic
- [ ] Lab has clear acceptance criteria
- [ ] Lab includes verification commands

### Database Seeding

To seed Week 1 content into the database:

```bash
# Option 1: Using SQL seed script
cd /home/metrik/docker/learn/backend
sqlite3 /data/omegaops.db < src/database/seeds/week1-content.sql

# Option 2: Using TypeScript seed
npm run seed:week1

# Verify seeding
sqlite3 /data/omegaops.db "SELECT COUNT(*) FROM missions WHERE week = 1;"
sqlite3 /data/omegaops.db "SELECT COUNT(*) FROM labs WHERE id = 'wk1-lab-troubleshooting';"
```

Expected output:
- 5 missions for week 1
- 1 lab for week 1
- Total 825 XP available

---

## License & Attribution

This curriculum is part of OmegaOps Academy, an open-source learning platform for Linux and server administration.

All content is verified against official sources and licensed under MIT License.

**Contributors:**
- Content Design: OmegaOps Academy Team
- Technical Review: Linux Foundation, Ubuntu, Red Hat documentation
- Narrative Design: Claude Code (Anthropic)

**Last Updated:** November 18, 2025
**Version:** 1.0
**Confidence Level:** High
