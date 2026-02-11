#!/usr/bin/env python3
"""
Campus Compass — Raspberry Pi Sensor Service
=============================================
Reads real hardware sensors and pushes data to Firebase RTDB.

Sensors:
  - Neo-8M GPS Module (UART, /dev/ttyS0) — NMEA parsing via pynmea2
  - MPU6500 IMU (I2C, addr 0x68) — Accelerometer + Gyroscope via smbus2

Wiring (User's actual setup):
  Neo-8M GPS → Pi pins 1(3.3V), 6(GND), 8(TXD), 10(RXD)
  MPU6500   → Pi pins 3(SDA), 5(SCL), 9(GND), 17(3.3V)

RTDB Writes:
  /buses/{busId}/sources/neo_m8n  — GPS data (1Hz)
  /buses/{busId}/sources/imu      — IMU data (1Hz summary, 10Hz internal)
  /buses/{busId}/piStatus         — Heartbeat (every 10s)
"""

import time
import math
import json
import struct
import threading
import logging
import os
import sys

# ─── Configuration ───────────────────────────────────────────────────────────
BUS_ID = os.environ.get("BUS_ID", "bus-1")
GPS_SERIAL_PORT = os.environ.get("GPS_PORT", "/dev/ttyS0")
GPS_BAUD_RATE = int(os.environ.get("GPS_BAUD", "9600"))
IMU_I2C_BUS = int(os.environ.get("I2C_BUS", "1"))
IMU_I2C_ADDR = int(os.environ.get("I2C_ADDR", "0x68"), 0)
FIREBASE_DB_URL = os.environ.get(
    "FIREBASE_DB_URL",
    "https://transportation-system-1c24e-default-rtdb.firebaseio.com"
)
SERVICE_ACCOUNT_PATH = os.environ.get(
    "SERVICE_ACCOUNT",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "service-account.json")
)

# Feature flags — set GPS_ENABLED=false to skip GPS (e.g. indoors)
GPS_ENABLED = os.environ.get("GPS_ENABLED", "true").lower() == "true"
IMU_ENABLED = os.environ.get("IMU_ENABLED", "true").lower() == "true"

HEARTBEAT_INTERVAL = 10  # seconds
IMU_POLL_HZ = 10         # internal read rate
IMU_PUBLISH_HZ = 1       # RTDB write rate
GPS_POLL_HZ = 1           # NMEA read rate

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("sensor_service")

# ─── Firebase Init ───────────────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, db as rtdb

cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DB_URL})

bus_ref = rtdb.reference(f"buses/{BUS_ID}")
gps_ref = bus_ref.child("sources/neo_m8n")
imu_ref = bus_ref.child("sources/imu")
pi_ref  = bus_ref.child("piStatus")

log.info(f"🚀 Sensor Service started for {BUS_ID}")
log.info(f"   GPS enabled: {GPS_ENABLED} | IMU enabled: {IMU_ENABLED}")


# ══════════════════════════════════════════════════════════════════════════════
# MPU6500 IMU Driver
# ══════════════════════════════════════════════════════════════════════════════

class MPU6500:
    """Minimal driver for MPU6500 6-axis IMU over I2C."""

    # Register addresses
    PWR_MGMT_1   = 0x6B
    ACCEL_XOUT_H = 0x3B
    GYRO_XOUT_H  = 0x43
    TEMP_OUT_H   = 0x41
    WHO_AM_I     = 0x75
    ACCEL_CONFIG = 0x1C
    GYRO_CONFIG  = 0x1B

    # Scale factors
    ACCEL_SCALE_2G   = 16384.0   # LSB/g for ±2g
    GYRO_SCALE_250   = 131.0     # LSB/(°/s) for ±250°/s
    TEMP_SCALE       = 333.87    # LSB/°C
    TEMP_OFFSET      = 21.0      # °C at 0 LSB

    # Stationary detection threshold (g)
    STATIONARY_THRESHOLD = 0.15  # deviation from 1g

    def __init__(self, bus_num=1, address=0x68):
        import smbus2
        self.bus = smbus2.SMBus(bus_num)
        self.address = address
        self._gyro_heading = 0.0
        self._last_time = time.time()

        # Calibration offsets (computed on startup)
        self._accel_offset = [0.0, 0.0, 0.0]
        self._gyro_offset = [0.0, 0.0, 0.0]

        self._init_sensor()

    def _init_sensor(self):
        """Wake up the MPU6500 and verify identity."""
        # Check WHO_AM_I (expected: 0x70 for MPU6500, 0x71 for MPU9250)
        who = self.bus.read_byte_data(self.address, self.WHO_AM_I)
        if who not in (0x70, 0x71, 0x73, 0x75):
            log.warning(f"⚠ Unexpected WHO_AM_I: 0x{who:02X} (expected 0x70 for MPU6500)")
        else:
            log.info(f"✅ MPU6500 detected (WHO_AM_I: 0x{who:02X})")

        # Wake up (clear sleep bit)
        self.bus.write_byte_data(self.address, self.PWR_MGMT_1, 0x00)
        time.sleep(0.1)

        # Set accel range to ±2g
        self.bus.write_byte_data(self.address, self.ACCEL_CONFIG, 0x00)
        # Set gyro range to ±250°/s
        self.bus.write_byte_data(self.address, self.GYRO_CONFIG, 0x00)

        time.sleep(0.1)
        self._calibrate()

    def _calibrate(self, samples=100):
        """Calibrate by averaging readings while stationary."""
        log.info("📐 Calibrating IMU (keep device still)...")
        accel_sum = [0.0, 0.0, 0.0]
        gyro_sum = [0.0, 0.0, 0.0]

        for _ in range(samples):
            raw_accel = self._read_raw_accel()
            raw_gyro = self._read_raw_gyro()
            for i in range(3):
                accel_sum[i] += raw_accel[i]
                gyro_sum[i] += raw_gyro[i]
            time.sleep(0.01)

        # Accel offset: we expect [0, 0, 1g] when flat
        self._accel_offset = [
            accel_sum[0] / samples,
            accel_sum[1] / samples,
            accel_sum[2] / samples - self.ACCEL_SCALE_2G  # subtract 1g from Z
        ]
        self._gyro_offset = [s / samples for s in gyro_sum]

        log.info(f"   Accel offset: [{self._accel_offset[0]:.1f}, {self._accel_offset[1]:.1f}, {self._accel_offset[2]:.1f}]")
        log.info(f"   Gyro offset:  [{self._gyro_offset[0]:.1f}, {self._gyro_offset[1]:.1f}, {self._gyro_offset[2]:.1f}]")

    def _read_raw_word(self, reg):
        """Read a signed 16-bit value from two consecutive registers."""
        high = self.bus.read_byte_data(self.address, reg)
        low = self.bus.read_byte_data(self.address, reg + 1)
        value = (high << 8) | low
        if value >= 0x8000:
            value -= 0x10000
        return value

    def _read_raw_accel(self):
        return [
            self._read_raw_word(self.ACCEL_XOUT_H),
            self._read_raw_word(self.ACCEL_XOUT_H + 2),
            self._read_raw_word(self.ACCEL_XOUT_H + 4),
        ]

    def _read_raw_gyro(self):
        return [
            self._read_raw_word(self.GYRO_XOUT_H),
            self._read_raw_word(self.GYRO_XOUT_H + 2),
            self._read_raw_word(self.GYRO_XOUT_H + 4),
        ]

    def read(self):
        """Read calibrated accelerometer, gyroscope, and temperature.
        
        Returns dict with:
            accel_x/y/z (g), gyro_x/y/z (°/s), temperature (°C),
            heading_imu (°), is_moving (bool)
        """
        now = time.time()
        dt = now - self._last_time
        self._last_time = now

        # Raw reads
        raw_accel = self._read_raw_accel()
        raw_gyro = self._read_raw_gyro()
        raw_temp = self._read_raw_word(self.TEMP_OUT_H)

        # Calibrated values
        accel = [
            (raw_accel[0] - self._accel_offset[0]) / self.ACCEL_SCALE_2G,
            (raw_accel[1] - self._accel_offset[1]) / self.ACCEL_SCALE_2G,
            (raw_accel[2] - self._accel_offset[2]) / self.ACCEL_SCALE_2G,
        ]
        gyro = [
            (raw_gyro[0] - self._gyro_offset[0]) / self.GYRO_SCALE_250,
            (raw_gyro[1] - self._gyro_offset[1]) / self.GYRO_SCALE_250,
            (raw_gyro[2] - self._gyro_offset[2]) / self.GYRO_SCALE_250,
        ]
        temp = (raw_temp / self.TEMP_SCALE) + self.TEMP_OFFSET

        # Integrate gyro Z for heading (yaw)
        self._gyro_heading += gyro[2] * dt
        self._gyro_heading %= 360.0

        # Stationary detection: magnitude of accel should be ~1g when stationary
        accel_magnitude = math.sqrt(accel[0]**2 + accel[1]**2 + accel[2]**2)
        is_moving = abs(accel_magnitude - 1.0) > self.STATIONARY_THRESHOLD

        return {
            "accel_x": round(accel[0], 4),
            "accel_y": round(accel[1], 4),
            "accel_z": round(accel[2], 4),
            "gyro_x": round(gyro[0], 3),
            "gyro_y": round(gyro[1], 3),
            "gyro_z": round(gyro[2], 3),
            "heading_imu": round(self._gyro_heading, 2),
            "is_moving": is_moving,
            "temperature": round(temp, 1),
        }

    def reset_heading(self, heading=0.0):
        """Reset the integrated heading (e.g. when GPS course is available)."""
        self._gyro_heading = heading


# ══════════════════════════════════════════════════════════════════════════════
# Neo-8M GPS Reader
# ══════════════════════════════════════════════════════════════════════════════

class NeoGPS:
    """Reads NMEA sentences from Neo-8M GPS via serial UART."""

    def __init__(self, port="/dev/ttyS0", baud=9600):
        import serial
        import pynmea2
        self.serial = serial.Serial(port, baud, timeout=2)
        self.pynmea2 = pynmea2
        self._last_fix = None
        log.info(f"✅ GPS serial opened on {port} @ {baud} baud")

    def read(self):
        """Read one cycle of NMEA data. Returns dict or None if no fix."""
        try:
            # Read lines until we get a useful sentence
            deadline = time.time() + 1.5  # 1.5s timeout
            rmc_data = None
            gga_data = None

            while time.time() < deadline:
                line = self.serial.readline().decode("ascii", errors="ignore").strip()
                if not line:
                    continue

                try:
                    msg = self.pynmea2.parse(line)
                except self.pynmea2.ParseError:
                    continue

                if isinstance(msg, self.pynmea2.types.talker.RMC):
                    if msg.status == "A":  # Active fix
                        rmc_data = msg
                elif isinstance(msg, self.pynmea2.types.talker.GGA):
                    if msg.gps_qual > 0:
                        gga_data = msg

                # If we have both, we're good
                if rmc_data and gga_data:
                    break

            if not rmc_data and not gga_data:
                return None

            result = {
                "active": True,
                "timestamp": int(time.time() * 1000),
                "last_seen": int(time.time() * 1000),
            }

            if rmc_data:
                result["lat"] = round(rmc_data.latitude, 7)
                result["lng"] = round(rmc_data.longitude, 7)
                result["speed"] = round((rmc_data.spd_over_grnd or 0) * 1.852, 2)  # knots → km/h
                result["heading"] = round(rmc_data.true_course or 0, 2)

            if gga_data:
                result["lat"] = result.get("lat", round(gga_data.latitude, 7))
                result["lng"] = result.get("lng", round(gga_data.longitude, 7))
                result["satellites"] = int(gga_data.num_sats or 0)
                result["hdop"] = float(gga_data.horizontal_dil or 99)
                # Fix type mapping
                qual = int(gga_data.gps_qual or 0)
                result["fix_type"] = {0: "None", 1: "2D", 2: "3D", 4: "RTK", 5: "Float"}.get(qual, "2D")

            if not result.get("fix_type"):
                result["fix_type"] = "2D"
            if not result.get("satellites"):
                result["satellites"] = 0
            if not result.get("hdop"):
                result["hdop"] = 99.0

            self._last_fix = result
            return result

        except Exception as e:
            log.error(f"GPS read error: {e}")
            return None


# ══════════════════════════════════════════════════════════════════════════════
# Main Service Loop
# ══════════════════════════════════════════════════════════════════════════════

class SensorService:
    """Orchestrates all sensor reads and Firebase writes."""

    def __init__(self):
        self.imu = None
        self.gps = None
        self.running = True

        # Latest readings (thread-safe via GIL for simple reads)
        self.latest_imu = None
        self.latest_gps = None

        # Initialize sensors
        if IMU_ENABLED:
            try:
                self.imu = MPU6500(bus_num=IMU_I2C_BUS, address=IMU_I2C_ADDR)
                log.info("✅ IMU initialized successfully")
            except Exception as e:
                log.error(f"❌ IMU init failed: {e}")
                log.error("   Check: sudo i2cdetect -y 1")

        if GPS_ENABLED:
            try:
                self.gps = NeoGPS(port=GPS_SERIAL_PORT, baud=GPS_BAUD_RATE)
                log.info("✅ GPS initialized successfully")
            except Exception as e:
                log.error(f"❌ GPS init failed: {e}")
                log.error("   Check: ls -la /dev/ttyS0 && cat /dev/ttyS0")

    def _imu_loop(self):
        """High-frequency IMU read loop (10Hz internal, 1Hz publish to RTDB)."""
        if not self.imu:
            return

        last_publish = 0
        accumulated_readings = []

        while self.running:
            try:
                reading = self.imu.read()
                accumulated_readings.append(reading)
                self.latest_imu = reading

                now = time.time()
                if now - last_publish >= (1.0 / IMU_PUBLISH_HZ):
                    # Average the accumulated readings for a smoother output
                    if accumulated_readings:
                        avg = {}
                        keys = ["accel_x", "accel_y", "accel_z", "gyro_x", "gyro_y", "gyro_z"]
                        for k in keys:
                            avg[k] = round(sum(r[k] for r in accumulated_readings) / len(accumulated_readings), 4)

                        # Use latest values for non-averaged fields
                        latest = accumulated_readings[-1]
                        avg["heading_imu"] = latest["heading_imu"]
                        avg["is_moving"] = any(r["is_moving"] for r in accumulated_readings)
                        avg["temperature"] = latest["temperature"]
                        avg["timestamp"] = int(now * 1000)
                        avg["last_seen"] = int(now * 1000)
                        avg["sample_count"] = len(accumulated_readings)

                        imu_ref.set(avg)
                        log.debug(f"📡 IMU → RTDB: moving={avg['is_moving']}, heading={avg['heading_imu']}°, temp={avg['temperature']}°C")

                        accumulated_readings = []
                        last_publish = now

            except Exception as e:
                log.error(f"IMU loop error: {e}")
                time.sleep(1)

            time.sleep(1.0 / IMU_POLL_HZ)

    def _gps_loop(self):
        """GPS read loop (1Hz)."""
        if not self.gps:
            return

        while self.running:
            try:
                reading = self.gps.read()
                if reading:
                    self.latest_gps = reading
                    gps_ref.set(reading)
                    log.info(f"🛰 GPS → RTDB: {reading.get('lat', 0):.6f}, {reading.get('lng', 0):.6f} | "
                             f"Speed: {reading.get('speed', 0):.1f} km/h | "
                             f"Sats: {reading.get('satellites', 0)} | "
                             f"Fix: {reading.get('fix_type', 'None')}")
                else:
                    log.warning("🛰 GPS: No fix (are you outdoors?)")

            except Exception as e:
                log.error(f"GPS loop error: {e}")
                time.sleep(1)

            time.sleep(1.0 / GPS_POLL_HZ)

    def _heartbeat_loop(self):
        """Heartbeat every 10 seconds."""
        while self.running:
            try:
                status = {
                    "alive": True,
                    "lastSeen": int(time.time() * 1000),
                    "gps_fix": self.latest_gps is not None and GPS_ENABLED,
                    "imu_ok": self.latest_imu is not None and IMU_ENABLED,
                    "gps_enabled": GPS_ENABLED,
                    "imu_enabled": IMU_ENABLED,
                }
                pi_ref.set(status)
                log.info(f"💓 Heartbeat → RTDB | GPS fix: {status['gps_fix']} | IMU ok: {status['imu_ok']}")
            except Exception as e:
                log.error(f"Heartbeat error: {e}")

            time.sleep(HEARTBEAT_INTERVAL)

    def start(self):
        """Start all sensor loops in threads."""
        threads = []

        if IMU_ENABLED and self.imu:
            t = threading.Thread(target=self._imu_loop, name="imu_loop", daemon=True)
            threads.append(t)

        if GPS_ENABLED and self.gps:
            t = threading.Thread(target=self._gps_loop, name="gps_loop", daemon=True)
            threads.append(t)

        # Heartbeat always runs
        t = threading.Thread(target=self._heartbeat_loop, name="heartbeat_loop", daemon=True)
        threads.append(t)

        for t in threads:
            t.start()
            log.info(f"  ▸ Started thread: {t.name}")

        log.info(f"✅ All sensor loops running for bus '{BUS_ID}'")
        log.info(f"   Press Ctrl+C to stop.")

        # Keep main thread alive
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            log.info("\n🛑 Shutting down sensor service...")
            self.running = False
            # Mark Pi as offline
            try:
                pi_ref.set({
                    "alive": False,
                    "lastSeen": int(time.time() * 1000),
                    "gps_fix": False,
                    "imu_ok": False,
                })
            except:
                pass
            log.info("👋 Goodbye!")


# ══════════════════════════════════════════════════════════════════════════════
# Entry Point
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("  Campus Compass — Pi Sensor Service v1.0")
    log.info(f"  Bus ID: {BUS_ID}")
    log.info(f"  GPS: {'ENABLED' if GPS_ENABLED else 'DISABLED'} ({GPS_SERIAL_PORT})")
    log.info(f"  IMU: {'ENABLED' if IMU_ENABLED else 'DISABLED'} (I2C bus {IMU_I2C_BUS}, addr 0x{IMU_I2C_ADDR:02X})")
    log.info("=" * 60)

    service = SensorService()
    service.start()
