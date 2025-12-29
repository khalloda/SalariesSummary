# Ubuntu 24.04.3 LTS Setup on Hyper-V - Complete Guide

This guide will walk you through setting up Ubuntu 24.04.3 LTS on Hyper-V (Windows Server 2012 R2) and deploying the SalariesSummary application for access from client laptops/PCs.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Enable Hyper-V on Windows Server 2012 R2](#step-1-enable-hyper-v-on-windows-server-2012-r2)
3. [Step 2: Create a New Virtual Machine](#step-2-create-a-new-virtual-machine)
4. [Step 3: Install Ubuntu 24.04.3 LTS](#step-3-install-ubuntu-24043-lts)
5. [Step 4: Initial Ubuntu Configuration](#step-4-initial-ubuntu-configuration)
6. [Step 5: Configure Network for Remote Access](#step-5-configure-network-for-remote-access)
7. [Step 6: Install Required Software](#step-6-install-required-software)
   - [Step 6A: Install Docker (Recommended for Multiple Applications)](#step-6a-install-docker-recommended-for-multiple-applications)
   - [Step 6B: Install Node.js and Dependencies (Direct Installation)](#step-6b-install-nodejs-and-dependencies-direct-installation)
8. [Step 7: Deploy Application](#step-7-deploy-application)
   - [Step 7A: Docker Deployment](#step-7a-docker-deployment)
   - [Step 7B: Transfer Application Files (Direct Installation)](#step-7b-transfer-application-files-direct-installation)
9. [Step 8: Set Up the Application (Direct Installation Only)](#step-8-set-up-the-application-direct-installation-only)
10. [Step 9: Configure Firewall](#step-9-configure-firewall)
11. [Step 10: Run the Application](#step-10-run-the-application)
12. [Step 11: Access from Client Machines](#step-11-access-from-client-machines)
13. [Troubleshooting](#troubleshooting)
14. [Deployment Method Comparison](#deployment-method-comparison)

---

## Prerequisites

Before starting, ensure you have:
- Windows Server 2012 R2 with Hyper-V role installed
- Administrator access to the Windows Server
- Ubuntu 24.04.3 LTS ISO file downloaded
- At least 20 GB free disk space
- Minimum 4 GB RAM available for the VM (8 GB recommended)
- Network connectivity between the server and client machines

---

## Step 1: Enable Hyper-V on Windows Server 2012 R2

1. **Open Server Manager**
   - Click the **Server Manager** icon in the taskbar
   - Or press `Windows Key + X` and select **Server Manager**

2. **Add Roles and Features**
   - Click **Add roles and features** in the Dashboard
   - Click **Next** on the Before You Begin screen

3. **Select Installation Type**
   - Choose **Role-based or feature-based installation**
   - Click **Next**

4. **Select Server**
   - Select your server from the list
   - Click **Next**

5. **Select Hyper-V Role**
   - Check the box next to **Hyper-V**
   - When prompted, click **Add Features** to include required features
   - Click **Next**

6. **Create Virtual Switches**
   - Select your network adapter(s) for virtual switches
   - Check **Allow management operating system to share this network adapter**
   - Click **Next**

7. **Migration Settings**
   - Leave default settings (no live migration needed for basic setup)
   - Click **Next**

8. **Default Stores**
   - Accept default locations or change if needed
   - Click **Next**

9. **Confirm Installation**
   - Review selections and click **Install**
   - Wait for installation to complete
   - **Restart the server** when prompted

---

## Step 2: Create a New Virtual Machine

1. **Open Hyper-V Manager**
   - Click **Start** → **Administrative Tools** → **Hyper-V Manager**
   - Or press `Windows Key + X` → **Hyper-V Manager**

2. **Start New Virtual Machine Wizard**
   - In the right panel, click **New** → **Virtual Machine...**
   - Or right-click your server name → **New** → **Virtual Machine...**

3. **Before You Begin**
   - Read the information (optional)
   - Check **Do not show this page again** if desired
   - Click **Next**

4. **Specify Name and Location**
   - **Name**: `SalariesSummary-Ubuntu` (or your preferred name)
   - **Location**: Choose where to store VM files (default is fine)
   - Click **Next**

5. **Specify Generation**
   - Select **Generation 2** (recommended for Ubuntu 24.04)
   - Click **Next**

6. **Assign Memory**
   - **Startup memory**: `4096 MB` (4 GB) minimum, `8192 MB` (8 GB) recommended
   - Check **Use Dynamic Memory for this virtual machine**
   - Click **Next**

7. **Configure Networking**
   - Select **Default Switch** or your preferred virtual switch
   - Click **Next**

8. **Connect Virtual Hard Disk**
   - Select **Create a virtual hard disk**
   - **Name**: `SalariesSummary-Ubuntu.vhdx`
   - **Location**: Default or custom path
   - **Size**: `60 GB` (minimum recommended)
   - Click **Next**

9. **Installation Options**
   - Select **Install an operating system from a bootable CD/DVD-ROM**
   - Choose **Image file (.iso)**
   - Click **Browse** and select your **Ubuntu 24.04.3 LTS ISO file**
   - Click **Next**

10. **Summary**
    - Review all settings
    - Click **Finish**

11. **Start the Virtual Machine**
    - Right-click the new VM → **Start**
    - Right-click the VM → **Connect** to open the console window

---

## Step 3: Install Ubuntu 24.04.3 LTS

1. **Boot from ISO**
   - The VM should boot from the Ubuntu ISO automatically
   - If not, in the VM connection window, click **Action** → **Reset**

2. **Ubuntu Installation Screen**
   - Select **Try or Install Ubuntu**
   - Wait for the desktop to load

3. **Start Installation**
   - Double-click **Install Ubuntu 24.04.3 LTS**
   - Select your language → **Continue**

4. **Keyboard Layout**
   - Select your keyboard layout
   - Click **Continue**

5. **Updates and Other Software**
   - Select **Normal installation**
   - Check **Install third-party software for graphics and Wi-Fi hardware**
   - Click **Continue**

6. **Installation Type**
   - Select **Erase disk and install Ubuntu** (this only affects the virtual disk)
   - Click **Install Now**
   - Click **Continue** to confirm

7. **Where Are You?**
   - Select your timezone on the map
   - Click **Continue**

8. **Who Are You?**
   - **Your name**: `admin` (or your preferred username)
   - **Your computer's name**: `salaries-summary-server` (or your preferred name)
   - **Pick a username**: `admin` (or your preferred username)
   - **Choose a password**: Enter a strong password (you'll need this for sudo commands)
   - **Confirm your password**: Re-enter the password
   - **Require my password to log in**: Recommended for security
   - Click **Continue**

9. **Wait for Installation**
   - Installation will take 10-20 minutes
   - You can watch the slideshow or wait

10. **Restart Required**
    - When installation completes, click **Restart Now**
    - The VM will restart

11. **Remove Installation Media**
    - In Hyper-V Manager, right-click the VM → **Settings**
    - Go to **SCSI Controller** → **DVD Drive**
    - Select **None** or remove the ISO file
    - Click **OK**
    - The VM will boot into Ubuntu

12. **Login**
    - Enter your password to log in

---

## Step 4: Initial Ubuntu Configuration

1. **Update System Packages**
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

2. **Install Essential Tools**
   ```bash
   sudo apt install -y curl wget git vim net-tools
   ```

3. **Check Network Configuration**
   ```bash
   ip addr show
   ```
   - Note the IP address (usually starts with 192.168.x.x or 10.x.x.x)

4. **Enable SSH (for remote access)**
   ```bash
   sudo apt install -y openssh-server
   sudo systemctl enable ssh
   sudo systemctl start ssh
   ```

5. **Check SSH Status**
   ```bash
   sudo systemctl status ssh
   ```
   - Should show "active (running)"

6. **Find Your IP Address**
   ```bash
   hostname -I
   ```
   - Write down this IP address - you'll need it to connect from client machines

---

## Step 5: Configure Network for Remote Access

### Option A: Using Default Switch (NAT) - Recommended for Testing

The Default Switch provides NAT networking. The VM will get an IP from the host.

1. **Check Current IP**
   ```bash
   ip addr show
   ```

2. **Test Connectivity**
   ```bash
   ping 8.8.8.8
   ```
   - If this works, you have internet connectivity

### Option B: Using External Virtual Switch (For Production)

1. **In Hyper-V Manager (on Windows Server)**
   - Click **Virtual Switch Manager** in the right panel
   - Select **New virtual network switch**
   - Choose **External**
   - Click **Create Virtual Switch**

2. **Configure Switch**
   - **Name**: `External Switch` (or your preferred name)
   - Select your physical network adapter
   - Check **Allow management operating system to share this network adapter**
   - Click **OK**

3. **Attach to VM**
   - Right-click your VM → **Settings**
   - Go to **Network Adapter**
   - Under **Virtual switch**, select your new external switch
   - Click **OK**

4. **Restart VM Network**
   - In Ubuntu, restart networking:
   ```bash
   sudo systemctl restart networking
   ```

5. **Check New IP**
   ```bash
   ip addr show
   ```
   - The VM should now have an IP on your network

---

## Step 6: Install Required Software

**Choose one of the following deployment methods:**

- **Option A: Docker Deployment** (Recommended if hosting multiple applications) - See [Step 6A](#step-6a-install-docker-recommended-for-multiple-applications)
- **Option B: Direct Installation** (Simpler for single application) - See [Step 6B](#step-6b-install-nodejs-and-dependencies-direct-installation)

---

## Step 6A: Install Docker (Recommended for Multiple Applications)

If you plan to host multiple applications or want better isolation and management, use Docker.

### Install Docker Engine

1. **Update package index**
   ```bash
   sudo apt update
   ```

2. **Install prerequisites**
   ```bash
   sudo apt install -y ca-certificates curl gnupg lsb-release
   ```

3. **Add Docker's official GPG key**
   ```bash
   sudo mkdir -p /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   ```

4. **Set up the repository**
   ```bash
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```

5. **Install Docker Engine**
   ```bash
   sudo apt update
   sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

6. **Add your user to docker group** (to run Docker without sudo)
   ```bash
   sudo usermod -aG docker $USER
   ```

7. **Apply group changes**
   ```bash
   newgrp docker
   ```
   - Or log out and log back in

8. **Verify installation**
   ```bash
   docker --version
   docker compose version
   ```

9. **Test Docker**
   ```bash
   docker run hello-world
   ```
   - Should display "Hello from Docker!" message

10. **Enable Docker to start on boot**
    ```bash
    sudo systemctl enable docker
    sudo systemctl start docker
    ```

**Continue to [Step 7A: Docker Deployment](#step-7a-docker-deployment)** for Docker-based setup.

---

## Step 6B: Install Node.js and Dependencies (Direct Installation)

If you prefer direct installation without Docker, follow these steps:

### Install Node.js (Version 20.x LTS)

1. **Add NodeSource Repository**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   ```

2. **Install Node.js**
   ```bash
   sudo apt install -y nodejs
   ```

3. **Verify Installation**
   ```bash
   node --version
   npm --version
   ```
   - Should show Node.js v20.x.x and npm 10.x.x

### Install pnpm (Package Manager)

```bash
npm install -g pnpm
```

### Install Additional Dependencies

```bash
sudo apt install -y build-essential python3
```

### Install Prisma Dependencies

Prisma requires additional libraries for SQLite:

```bash
sudo apt install -y libsqlite3-dev
```

**Continue to [Step 7B: Direct Application Setup](#step-7b-transfer-application-files-direct-installation)** for direct installation setup.

---

## Step 7A: Docker Deployment

### Transfer Application Files

Follow one of the file transfer methods from [Step 7B](#step-7b-transfer-application-files-direct-installation) to get the application files to the VM.

### Deploy with Docker

1. **Navigate to Application Directory**
   ```bash
   cd ~/SalariesSummary
   ```

2. **Verify Docker Compose File Exists**
   ```bash
   ls -la docker-compose.yml
   ls -la apps/api/Dockerfile
   ls -la apps/web/Dockerfile
   ```

3. **Build and Start Containers**
   ```bash
   docker compose up -d --build
   ```
   - `-d` runs in detached mode (background)
   - `--build` builds images before starting

4. **Check Container Status**
   ```bash
   docker compose ps
   ```
   - Both `salaries-api` and `salaries-web` should show "Up"

5. **View Logs**
   ```bash
   docker compose logs -f
   ```
   - Press `Ctrl+C` to exit log view

6. **Verify Services are Running**
   ```bash
   # Check API health
   curl http://localhost:3001/api/health
   
   # Check web interface
   curl http://localhost:3000
   ```

### Configure Firewall for Docker

1. **Allow Docker Ports**
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw allow 3001/tcp
   ```

2. **Verify Firewall Rules**
   ```bash
   sudo ufw status verbose
   ```

### Access from Client Machines

- **Web Interface**: `http://<VM_IP_ADDRESS>:3000`
- **API**: `http://<VM_IP_ADDRESS>:3001/api`

### Docker Management Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose stop

# Start services
docker compose start

# Stop and remove containers
docker compose down

# Rebuild and restart
docker compose up -d --build

# View resource usage
docker stats
```

### Database Management with Docker

```bash
# Access Prisma Studio
docker compose exec salaries-api npx prisma studio

# Run migrations
docker compose exec salaries-api npx prisma migrate deploy

# Backup database
docker cp salaries-api:/app/prisma/dev.db ./backups/dev.db.backup
```

**For detailed Docker deployment instructions, see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)**

**Skip to [Step 11: Access from Client Machines](#step-11-access-from-client-machines)** if using Docker.

---

## Step 7B: Transfer Application Files (Direct Installation)

### Option A: Using SCP (from Windows client)

1. **On your Windows client machine**, open PowerShell or Command Prompt

2. **Transfer files using SCP**
   ```powershell
   scp -r "D:\Claude\SalariesSummary" admin@<VM_IP_ADDRESS>:/home/admin/
   ```
   - Replace `<VM_IP_ADDRESS>` with the IP from Step 4
   - Enter your password when prompted

### Option B: Using Git (if repository is on GitHub/GitLab)

1. **On Ubuntu VM**
   ```bash
   cd ~
   git clone <your-repository-url>
   cd SalariesSummary
   ```

### Option C: Using Shared Folder (if configured)

1. **Create shared folder in Hyper-V** (requires additional setup)
2. **Mount in Ubuntu** and copy files

### Option D: Using USB Drive

1. **In Hyper-V Manager**
   - Right-click VM → **Settings** → **USB Device**
   - Enable USB passthrough (if supported)

2. **In Ubuntu**
   ```bash
   sudo mkdir /mnt/usb
   sudo mount /dev/sdb1 /mnt/usb  # Adjust device name as needed
   cp -r /mnt/usb/SalariesSummary ~/
   ```

---

## Step 8: Set Up the Application (Direct Installation Only)

**Note**: If you're using Docker (Step 7A), skip this section and go to [Step 11](#step-11-access-from-client-machines).

1. **Navigate to Application Directory**
   ```bash
   cd ~/SalariesSummary
   ```

2. **Install Dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install API dependencies
   cd apps/api
   npm install
   
   # Install Web dependencies
   cd ../web
   npm install
   
   # Return to root
   cd ../..
   ```

3. **Set Up Database**
   ```bash
   cd apps/api
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Create .env File for API (if needed)**
   ```bash
   cd apps/api
   nano .env
   ```
   - Add any required environment variables
   - Press `Ctrl+X`, then `Y`, then `Enter` to save

5. **Build the Application (Optional, for production)**
   ```bash
   cd ~/SalariesSummary
   npm run build
   ```

---

## Step 9: Configure Firewall

1. **Check Firewall Status**
   ```bash
   sudo ufw status
   ```

2. **Allow SSH**
   ```bash
   sudo ufw allow ssh
   ```

3. **Allow API Port (3001)**
   ```bash
   sudo ufw allow 3001/tcp
   ```

4. **Allow Web Port (3000)**
   ```bash
   sudo ufw allow 3000/tcp
   ```

5. **Enable Firewall**
   ```bash
   sudo ufw enable
   ```

6. **Verify Rules**
   ```bash
   sudo ufw status verbose
   ```

---

## Step 10: Run the Application

### For Development Mode

1. **Start the Application**
   ```bash
   cd ~/SalariesSummary
   npm run dev
   ```
   - This starts both API (port 3001) and Web (port 3000) servers
   - Keep this terminal window open

### For Production Mode (Using PM2 - Process Manager)

1. **Install PM2**
   ```bash
   sudo npm install -g pm2
   ```

2. **Build the Application**
   ```bash
   cd ~/SalariesSummary
   npm run build
   ```

3. **Create PM2 Ecosystem File**
   ```bash
   cd ~/SalariesSummary
   nano ecosystem.config.js
   ```
   
   Add the following content:
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'salaries-api',
         cwd: './apps/api',
         script: 'npm',
         args: 'start',
         env: {
           NODE_ENV: 'production',
           PORT: 3001
         }
       },
       {
         name: 'salaries-web',
         cwd: './apps/web',
         script: 'npm',
         args: 'preview',
         env: {
           NODE_ENV: 'production',
           PORT: 3000
         }
       }
     ]
   };
   ```

4. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```
   - Follow the instructions to enable PM2 on system startup

5. **Check Status**
   ```bash
   pm2 status
   pm2 logs
   ```

---

## Step 11: Access from Client Machines

### Find the VM's IP Address

1. **On Ubuntu VM**
   ```bash
   hostname -I
   ```
   - Note the IP address (e.g., `192.168.1.100`)

### Access from Client Laptop/PC

1. **Open Web Browser** on your client machine

2. **Navigate to the Application**
   - Web Interface: `http://<VM_IP_ADDRESS>:3000`
   - API Endpoint: `http://<VM_IP_ADDRESS>:3001`
   
   Example:
   - `http://192.168.1.100:3000` (Web UI)
   - `http://192.168.1.100:3001/api/reports/available-years` (API test)

3. **If Using Default Switch (NAT)**
   - You may need to access via the Windows Server's IP address
   - Or configure port forwarding in Hyper-V

### Configure Port Forwarding (If Needed)

If the VM is behind NAT and not directly accessible:

1. **On Windows Server**, open PowerShell as Administrator

2. **Add Port Forwarding Rule**
   ```powershell
   netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<VM_IP>
   netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=<VM_IP>
   ```

3. **Allow Firewall Rules**
   ```powershell
   New-NetFirewallRule -DisplayName "Salaries Web" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "Salaries API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   ```

4. **Access via Server IP**
   - Use the Windows Server's IP address instead of the VM's IP
   - Example: `http://<SERVER_IP>:3000`

---

## Troubleshooting

### VM Won't Start

- **Check Hyper-V Services**: Ensure all Hyper-V services are running
- **Check Resources**: Verify sufficient RAM and disk space
- **Check Virtualization**: Ensure hardware virtualization is enabled in BIOS

### Can't Connect to Network

- **Check Virtual Switch**: Verify the virtual switch is configured correctly
- **Check IP Configuration**: Run `ip addr show` to see network interfaces
- **Restart Network**: `sudo systemctl restart networking`

### Can't Access from Client

- **Check Firewall**: Verify UFW rules allow ports 3000 and 3001
- **Check Windows Firewall**: Ensure Windows Server firewall allows connections
- **Ping Test**: From client, try `ping <VM_IP>` to test connectivity
- **Port Test**: Use `telnet <VM_IP> 3000` or `telnet <VM_IP> 3001` to test ports

### Application Won't Start

- **Check Node.js**: Verify `node --version` shows v20.x
- **Check Dependencies**: Re-run `npm install` in both `apps/api` and `apps/web`
- **Check Database**: Ensure Prisma migrations are applied: `npx prisma migrate dev`
- **Check Logs**: Review application logs for error messages

### Port Already in Use

- **Find Process**: `sudo lsof -i :3000` or `sudo lsof -i :3001`
- **Kill Process**: `sudo kill -9 <PID>`

### Performance Issues

- **Increase VM RAM**: In Hyper-V Manager, increase allocated memory
- **Add CPU Cores**: In VM Settings, increase number of virtual processors
- **Check Disk Space**: `df -h` to check available disk space

### SSH Connection Issues

- **Check SSH Service**: `sudo systemctl status ssh`
- **Check Firewall**: `sudo ufw allow ssh`
- **Check IP**: Verify you're using the correct IP address

---

## Additional Security Recommendations

1. **Change Default SSH Port** (optional)
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Change Port 22 to a different port (e.g., 2222)
   sudo systemctl restart ssh
   ```

2. **Disable Root Login**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set PermitRootLogin no
   sudo systemctl restart ssh
   ```

3. **Set Up Fail2Ban** (optional, for SSH protection)
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

4. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## Quick Reference Commands

```bash
# Check IP address
hostname -I

# Check running services
sudo systemctl status ssh
pm2 status

# View application logs
pm2 logs
# Or for dev mode, check terminal output

# Restart application
pm2 restart all
# Or for dev mode: Ctrl+C and restart with npm run dev

# Check firewall rules
sudo ufw status verbose

# Check disk space
df -h

# Check memory usage
free -h

# Check network connectivity
ping 8.8.8.8
```

---

## Next Steps

After successful setup:

1. **Test the Application**: Access the web interface and verify all features work
2. **Set Up Automatic Backups**: Configure database backups
3. **Monitor Resources**: Set up monitoring for CPU, memory, and disk usage
4. **Document Network Configuration**: Keep a record of IP addresses and ports
5. **Create User Accounts**: Set up additional user accounts if needed

---

## Support

If you encounter issues not covered in this guide:

1. Check application logs: `pm2 logs` or terminal output
2. Check system logs: `journalctl -xe`
3. Verify all prerequisites are met
4. Review Hyper-V and Ubuntu documentation

---

## Deployment Method Comparison

### Docker Deployment (Recommended)
- ✅ Better for hosting multiple applications
- ✅ Isolated environments (no dependency conflicts)
- ✅ Easier updates and rollbacks
- ✅ Better resource management
- ✅ Industry-standard approach
- ⚠️ Requires Docker knowledge

### Direct Installation
- ✅ Simpler for single application
- ✅ Direct file access
- ✅ Easier debugging
- ✅ Lower overhead
- ⚠️ Harder to manage multiple apps
- ⚠️ Potential dependency conflicts

**For detailed Docker instructions, see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)**

---

**Last Updated**: 2024
**Ubuntu Version**: 24.04.3 LTS
**Application**: SalariesSummary
**Docker Support**: Included

