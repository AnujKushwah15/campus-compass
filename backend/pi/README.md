# Raspberry Pi — Deployment Guide (Sensor + Camera Stream)

## Overview
This service replaces `mock_pi.js` with real hardware sensor reads. It runs on the Raspberry Pi and pushes Neo-8M GPS + MPU6500 IMU data to Firebase RTDB.

---

## 1. Hardware Wiring

### Neo-8M GPS Module → Pi (UART)
| GPS Pin | Pi Pin | Description |
|---------|--------|-------------|
| VCC     | Pin 1 (3.3V) | Power |
| GND     | Pin 6  | Ground |
| TX      | Pin 10 (GPIO15 RXD) | GPS transmit → Pi receive |
| RX      | Pin 8  (GPIO14 TXD) | Pi transmit → GPS receive (optional) |

### MPU6500 IMU → Pi (I2C)
| MPU Pin | Pi Pin | Description |
|---------|--------|-------------|
| VCC     | Pin 17 (3.3V) | Power (**3.3V only!**) |
| GND     | Pin 9  | Ground |
| SDA     | Pin 3  (GPIO2) | I2C Data |
| SCL     | Pin 5  (GPIO3) | I2C Clock |

---

## 2. Pi Configuration

```bash
# Enable UART and I2C
sudo raspi-config
# → Interface Options → Serial Port → Login shell: NO, Hardware: YES
# → Interface Options → I2C → Enable
sudo reboot

# Verify hardware after reboot
sudo apt install -y i2c-tools
sudo i2cdetect -y 1          # Should show 0x68
cat /dev/ttyS0               # Should show NMEA sentences (go outdoors)
```

---

## 3. Deploy Files

From your local machine (PowerShell):
```powershell
# Copy pi/ folder to the Raspberry Pi
scp -r backend/pi pi@<PI_IP>:/home/pi/campus-compass-pi

# Also copy the Firebase service account
scp backend/service-account.json pi@<PI_IP>:/home/pi/campus-compass-pi/
```

On the Raspberry Pi:
```bash
cd /home/pi/campus-compass-pi
pip3 install -r requirements.txt
```

---

## 4. Test Manually

```bash
# GPS disabled (indoor testing)
GPS_ENABLED=false python3 sensor_service.py

# Full test (outdoor)
python3 sensor_service.py
```

You should see:
- `✅ MPU6500 detected (WHO_AM_I: 0x70)` 
- `📐 Calibrating IMU (keep device still)...`
- `💓 Heartbeat → RTDB`
- `📡 IMU → RTDB: moving=False, heading=0.0°`

Check Firebase RTDB console → `buses/bus-1/sources/imu` for live data.

---

## 5. Install as System Service (Auto-Recovery)

We provide a provisioning script that installs dependencies, sets up the virtual environment, configures environment variables, and enables **auto-recovery** via systemd (so services restart on crash or reboot).

```bash
# Run the automated setup script
sudo ./init_pi.sh
```

The script will ask for standard parameters (`BUS_ID`, `VPS_IP`, `CAMERA_IP`, etc.) and generate `/etc/campus-compass.env`.

Both `sensor_service` and `camstream` will be enabled to start automatically. 

**Manual Commands (if needed):**
```bash
# Check status
sudo systemctl status sensor_service
sudo systemctl status camstream

# Watch live logs
journalctl -u sensor_service -f
```

---

## 6. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BUS_ID` | `bus-1` | Which bus this Pi belongs to |
| `GPS_ENABLED` | `true` | Set `false` to skip GPS (indoor testing) |
| `IMU_ENABLED` | `true` | Set `false` to skip IMU |
| `GPS_PORT` | `/dev/ttyS0` | Serial port for GPS |
| `GPS_BAUD` | `9600` | GPS baud rate |
| `I2C_BUS` | `1` | I2C bus number |
| `I2C_ADDR` | `0x68` | MPU6500 I2C address |

To change for the service:
```bash
sudo systemctl edit sensor_service
# Add: Environment=BUS_ID=bus-2
```

---

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| `IMU init failed` | Run `sudo i2cdetect -y 1` — check wiring, VCC must be 3.3V |
| `GPS: No fix` | Go outdoors, wait 1-2 min for cold start |
| `Permission denied /dev/ttyS0` | `sudo adduser pi dialout && sudo reboot` |
| `Permission denied I2C` | `sudo adduser pi i2c && sudo reboot` |
| `firebase_admin import error` | `pip3 install firebase-admin` |

---

## 8. Camera Stream Service (camstream.service)

**Architecture:** `Hi-focus IP Camera (RTSP) → Pi (ffmpeg relay) → VPS (MediaMTX)`

The camera is a **Hi-focus HC-IPC-DQA4113-0280-DLS** connected via Ethernet to the Pi. It does **not** appear as `/dev/video*` — it exposes its own RTSP stream which ffmpeg reads over the LAN.

### Step 1 — Find the camera's IP address

```bash
# Install arp-scan if needed
sudo apt install -y arp-scan

# Scan the interface your camera is on (eth0 = Ethernet port)
sudo arp-scan --interface=eth0 --localnet
# or: nmap -sn 192.168.1.0/24
```

The camera will appear as an unknown or Hi-focus/Hikvision MAC address. Note its IP (e.g. `192.168.1.64`).

### Step 2 — Test the RTSP URL manually

Common RTSP paths for Hi-focus / Hikvision-compatible cameras:

| Stream | URL |
|--------|-----|
| Main (HD) | `rtsp://admin:password@<CAMERA_IP>:554/stream1` |
| Sub (SD)  | `rtsp://admin:password@<CAMERA_IP>:554/stream2` |
| Hikvision | `rtsp://admin:password@<CAMERA_IP>:554/h264/ch1/main/av_stream` |

Test on the Pi (stops after 5 s):
```bash
ffplay -rtsp_transport tcp -t 5 rtsp://admin:admin123@192.168.1.64:554/stream1
```

### Step 3 — Configure environment variables in the service file

Edit `/etc/systemd/system/camstream.service` and set:

| Variable | Example | Description |
|----------|---------|-------------|
| `CAMERA_IP` | `192.168.1.64` | Camera's LAN IP |
| `CAMERA_USER` | `admin` | Camera web-admin username |
| `CAMERA_PASS` | `admin123` | Camera web-admin password |
| `CAMERA_RTSP_PATH` | `stream1` | RTSP path (from step 2) |
| `VPS_IP` | `1.2.3.4` | VPS public IP |
| `STREAM_PATH` | `live_bus-1` | MediaMTX path |

### Step 4 — Deploy & start

```bash
sudo cp camstream.service /etc/systemd/system/
sudo nano /etc/systemd/system/camstream.service  # set variables above
sudo systemctl daemon-reload
sudo systemctl enable camstream
sudo systemctl start camstream

# Verify
sudo systemctl status camstream
journalctl -u camstream -f
```

### Key ffmpeg flags

| Flag | Purpose |
|------|---------|
| `-rtsp_transport tcp` (input) | Pull from IP camera over TCP — prevents UDP drops |
| `-rtsp_transport tcp` (output) | Push to MediaMTX VPS over TCP |
| `Restart=always` + `RestartSec=5` | systemd auto-restarts on any ffmpeg exit |

### Per-bus configuration

For a second or third bus, override `STREAM_PATH` (and `CAMERA_IP` if different camera):

```bash
sudo systemctl edit camstream
# [Service]
# Environment=STREAM_PATH=live_bus-2
# Environment=CAMERA_IP=192.168.1.65
```

Valid paths (defined in `backend/mediamtx.yml`): `live`, `live_bus-1`, `live_bus-2`, `live_bus-3`

---

## 9. Incident Postmortem — 2026-03-03 Streaming Failure

### Root Cause

MediaMTX on the VPS crashed repeatedly due to an **invalid path name** in `mediamtx.yml`:

```yaml
# INVALID — MediaMTX does not allow bare wildcards in path names
live_bus-~.*:
  source: publisher
```

MediaMTX exited with `status=1` on every start. systemd restarted it immediately, causing a restart loop. Because MediaMTX was down intermittently:

- ffmpeg on the Pi lost its RTSP connection
- `Broken pipe` and `Connection timed out` errors appeared in logs
- `camstream.service` restarted repeatedly

### Fix

1. Removed `live_bus-~.*` from `mediamtx.yml`
2. Replaced with explicit static paths (`live_bus-1`, `live_bus-2`, `live_bus-3`)
3. Restarted MediaMTX → confirmed `Active: active (running)`

> **Note:** MediaMTX supports regex paths but they must start with `~^`, e.g. `~^live_bus-[0-9]+$`. Bare `*` wildcards inside path names are not valid.

### Lesson Learned

Always validate `mediamtx.yml` changes with:

```bash
/usr/local/bin/mediamtx --help   # dry-run / version check
sudo systemctl status mediamtx   # check for exit-code errors after config change
journalctl -u mediamtx -n 50     # read the actual error message
```
