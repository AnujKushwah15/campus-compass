# Research: Phase 1 — Edge Layer Hardening

## Overview
This phase requires automating the Pi provisioning, enforcing read-only root filesystems to prevent SD card corruption, and making systemd services configurable and resilient.

## 1. Automated Provisioning Strategy
Instead of manual commands, we need an `init_pi.sh` script that:
1. Installs system dependencies (`ffmpeg`, `python3-venv`, `i2c-tools`, `overlayroot`).
2. Creates the Python virtual environment and installs `requirements.txt`.
3. Sets up a centralized configuration file at `/etc/campus-compass.env` to store `BUS_ID`, `VPS_IP`, `CAMERA_IP`, and passwords.
4. Copies and enables the systemd services (`camstream.service` and `sensor_service.service`).

## 2. Dynamic Service Configuration
Currently, `camstream.service` and `sensor_service.service` have hardcoded `Environment=` variables. 
To scale to multiple buses, these should use `EnvironmentFile=/etc/campus-compass.env`.

## 3. Read-Only Root Filesystem (SD Card Protection)
Raspberry Pi SD cards corrupt easily when power is cut abruptly (common on buses). 
**Solution:** `overlayroot`.
- `overlayroot` mounts the root filesystem as read-only and uses a strictly in-RAM tmpfs overlay for any write operations.
- When the device loses power, the RAM overlay is wiped, but the underlying OS is untouched.
- **Limitation:** Any permanent changes (like updating scripts) require rebooting in write-mode or using `overlayroot-chroot`.
- The `init_pi.sh` script should optionally enable `overlayroot` via configuration at the very end of its execution.

## 4. Resilience
Both `camstream` and `sensor_service` already use `Restart=always` and `RestartSec=5`. This is sufficient for process-level recovery, but they also require `After=network-online.target` to ensure they only start when cellular/wifi is up.
