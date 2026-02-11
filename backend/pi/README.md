# Raspberry Pi Sensor Service — Deployment Guide

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

## 5. Install as System Service

```bash
# Copy service file
sudo cp sensor_service.service /etc/systemd/system/

# Reload, enable, start
sudo systemctl daemon-reload
sudo systemctl enable sensor_service
sudo systemctl start sensor_service

# Check status
sudo systemctl status sensor_service

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
