# VPS Deployment Guide - Campus Compass

This document serves as the primary reference for deploying and maintaining the **Arbitration Service (Backend)** on a cloud VPS.

## 1. Architecture Overview
The backend is a standalone Node.js service located in the `backend/` folder of this project.
It runs on the VPS to:
1.  Listen to Realtime Database streams (Phone vs Pi).
2.  Arbitrate the "Best Source".
3.  Write the authoritative location to `/buses/{id}/location`.

---

## 2. Server Prerequisites
*   **OS**: Ubuntu 20.04 LTS (or newer)
*   **Runtime**: Node.js 18+
*   **Access**: SSH Key or Root Password

### Initial Server Setup
Run these commands once on a fresh VPS:

```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v
npm -v
```

---

## 3. Deploying the Code

### 3.1 Copy Files (Local -> Remote)
> [!IMPORTANT]
> **Run this command from your LOCAL Windows/Mac terminal.**
> Do NOT run this inside the VPS SSH session. The `backend` folder is on your computer, not the server yet!

From your local project root (`d:\projects\campus-compass`):
```powershell
# 1. (Optional) Delete node_modules to speed up copy (Run in backend folder)
#    It's better to install fresh on the server.
rm backend/node_modules -r -fo  # PowerShell command to remove folder

# 2. Syntax: scp -r [Local Folder] [User]@[Server IP]:[Destination Path]
scp -r backend root@your_vps_ip:/root/campus-compass-backend
```
*Ensure `backend/service-account.json` is present before copying.*

### 3.2 Install Dependencies (Remote)
SSH into the server and install libraries:

```bash
ssh root@your_vps_ip

cd /root/campus-compass-backend
npm install
```


### Troubleshooting: Failed Uploads
If an upload gets interrupted or you want to start fresh:
```bash
# On the VPS (SSH Terminal):
rm -rf /root/campus-compass-backend
```
Then try the `scp` command again from your local machine.

---

## 4. Run as a Service (Systemd)

We use `systemd` to ensure the service starts on boot and restarts if it crashes.

### 4.1 Install Service File
```bash
# Copy the service definition to the system folder
cp campus-compass.service /etc/systemd/system/

# Reload the systemd daemon to recognize the new file
systemctl daemon-reload
```

### 4.2 Start & Enable
```bash
# Start the service immediately
systemctl start campus-compass

# Enable it to run on boot
systemctl enable campus-compass
```

### 4.3 Check Status
```bash
systemctl status campus-compass
```
*Expected Output: `Active: active (running)`*

---

## 5. Monitoring & Maintenance

### View Live Logs
To see what the Arbitrator is doing in real-time:
```bash
journalctl -u campus-compass -f
```

### Restarting Service
If you deploy code updates:
```bash
systemctl restart campus-compass
```

### Stopping Service
```bash
systemctl stop campus-compass
```

---

## 6. Changelog & Updates

### [2026-03-21] Streaming Security & Nginx Refactor
- **Nginx**: Rewrote `/etc/nginx/nginx.conf` with a robust CORS map and optimized proxying for `/stream/` (RTDB-backed WebRTC on port 8189).
- **Security**: Switched from 60s to 300s JWT tokens and enforced mandatory auth for all read actions in MediaMTX.
- **Backend**: Reduced MediaMTX polling interval to 30s to improve server and UI stability.
