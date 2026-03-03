---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Edge Device Automated Provisioning & Hardening

## Objective
Create a unified, automated installation script for Raspberry Pi edge nodes, refactor the existing systemd services to use a centralized environment file, and add read-only filesystem support to prevent SD card corruption on abrupt power loss.

## Context
- .gsd/SPEC.md (REQ-01, REQ-02, REQ-06)
- .gsd/phases/1/RESEARCH.md
- backend/pi/camstream.service
- backend/pi/sensor_service.service

## Tasks

<task type="auto" effort="medium">
  <name>Refactor Service Files</name>
  <files>
    backend/pi/camstream.service
    backend/pi/sensor_service.service
  </files>
  <action>
    Replace the hardcoded `Environment=` lines in both service files with `EnvironmentFile=/etc/campus-compass.env`.
    Ensure paths to the `sensor_service.py` script refer to an expected installation directory like `/opt/campus-compass/pi`.
    Make the `User` setting consistent (e.g., `pi` instead of `pi1`).
  </action>
  <verify>grep "EnvironmentFile" backend/pi/*.service</verify>
  <done>Services use dynamic EnvironmentFile instead of hardcoded Environment lines.</done>
</task>

<task type="auto" effort="medium">
  <name>Create Provisioning Script</name>
  <files>backend/pi/init_pi.sh</files>
  <action>
    Create a bash script `init_pi.sh` that:
    1. Checks if run as root.
    2. Installs `ffmpeg`, `python3-venv`, `python3-pip`, `i2c-tools`, and `overlayroot`.
    3. Prompts the user or accepts parameters for `BUS_ID`, `VPS_IP`, `CAMERA_IP`, `STREAM_PASSWORD` to generate `/etc/campus-compass.env`.
    4. Sets up the Python virtual environment and installs dependencies from `requirements.txt`.
    5. Copies the `.service` files to `/etc/systemd/system/` and enables them.
    6. Explains how to enable `overlayroot` for production.
  </action>
  <verify>bash -n backend/pi/init_pi.sh</verify>
  <done>init_pi.sh is created, executable, and syntax-correct.</done>
</task>

## Success Criteria
- [ ] `camstream.service` and `sensor_service.service` no longer contain hardcoded environments.
- [ ] `init_pi.sh` cleanly automates the deployment process.
