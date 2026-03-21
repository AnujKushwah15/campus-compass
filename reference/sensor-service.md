# Raspberry Pi Edge Node — Setup & Operations Guide

Campus Compass runs two systemd services on each bus Pi:

| Service | Role |
|---|---|
| `camstream.service` | IP camera → ffmpeg → MediaMTX VPS (live video) |
| `sensor_service.service` | IMU + GPS → Firebase RTDB (location telemetry) |

Both auto-restart on crash and auto-update from GitHub every 5 minutes.

---

## 🚀 Provisioning a New Pi (One Command)

### Prerequisites
1. **Raspberry Pi OS** (Bookworm or Bullseye, 64-bit recommended)
2. **GitHub deploy key** configured (read-only access to the repo)
3. **SSH access** to the Pi from your local machine

### Step 1 — Add GitHub Deploy Key
```bash
# On the Pi
ssh-keygen -t ed25519 -C "bus-1-pi"
cat ~/.ssh/id_ed25519.pub
```
Copy the output → GitHub repo → **Settings → Deploy keys → Add deploy key** (read-only).

### Step 2 — Run the Installer
```bash
# On the Pi — clone repo and run setup
git clone git@github.com:AnujKushwah15/campus-compass.git
cd campus-compass/backend/pi
chmod +x setup_pi.sh
sudo ./setup_pi.sh
```

The script will prompt you for:
| Prompt | Example |
|---|---|
| `BUS_ID` | `bus-1` |
| `VPS_IP` | `72.61.250.73` |
| `CAMERA_IP` | `192.168.1.34` (find with `arp-scan -l`) |
| `CAMERA_USER` | `admin` |
| `CAMERA_PASS` | your camera's web UI password |
| `CAMERA_RTSP_PATH` | `stream1` (or `1`, check your camera model) |
| `RTMP_PASS` | MediaMTX publisher password from VPS `mediamtx.yml` |

After completion, both services start immediately and are enabled for boot.

---

## 🚌 Adding a Second Bus (New Pi)

Repeat the exact same steps on the new Pi. Enter a different `BUS_ID` (e.g. `bus-2`). You also need to:
- Add the new Pi's deploy key to GitHub
- Add `live_bus-2` to VPS `mediamtx.yml` and restart MediaMTX

---

## 🔄 CI/CD — Auto-Update

The installer adds a cron job that runs every 5 minutes:

```
*/5 * * * * ~/update_campus_compass.sh >> ~/update_campus_compass.log 2>&1
```

**What it does:**
1. `git fetch origin` — checks for new commits
2. If changes exist in `backend/pi/`, pulls and restarts services
3. If only other files changed, skips the restart

View the update log:
```bash
tail -f ~/update_campus_compass.log
```

---

## 🔧 Daily Operations

### Check service status
```bash
systemctl status camstream.service
systemctl status sensor_service.service
```

### View live logs
```bash
journalctl -u camstream -f          # Camera stream
journalctl -u sensor_service -f     # GPS/IMU sensor
```

### Restart a service
```bash
sudo systemctl restart camstream.service
sudo systemctl restart sensor_service.service
```

### Manual update (without waiting for cron)
```bash
~/update_campus_compass.sh
```

---

## 📁 File Locations

| File | Purpose |
|---|---|
| `/etc/campus-compass.env` | All secrets and config (chmod 600) |
| `/etc/systemd/system/camstream.service` | Camera stream service definition |
| `/etc/systemd/system/sensor_service.service` | Sensor service definition |
| `~/campus-compass/backend/pi/sensor_service.py` | Sensor service Python script |
| `~/campus-compass/backend/pi/venv/` | Python virtual environment |
| `~/update_campus_compass.sh` | Auto-update script (run by cron) |
| `~/update_campus_compass.log` | Auto-update log |

---

## 🛠 Troubleshooting

### Camera not streaming
```bash
# Find camera IP on local network
sudo arp-scan -l | grep -i hikvision

# Test RTSP directly
ffplay rtsp://admin:password@192.168.1.34:554/stream1
```

### GPS not getting a fix
GPS requires an outdoor location with sky view. Indoors the module acquires no satellites — this is expected. Check:
```bash
ls -la /dev/tty*        # Verify port exists
sudo cat /dev/ttyS0     # Should print raw NMEA sentences
```
Update `GPS_PORT` in `/etc/campus-compass.env` if the port differs.

### Sensor service Firebase errors
The `service-account.json` must be present in `~/campus-compass/backend/pi/`. If missing:
```bash
# Copy from your local machine
scp backend/pi/service-account.json pi:~/campus-compass/backend/pi/
```

### Service keeps restarting
```bash
journalctl -u sensor_service --no-pager -n 50
```
Look for Python import errors — likely a missing pip package. Fix:
```bash
cd ~/campus-compass/backend/pi
venv/bin/pip install -r requirements.txt
```
