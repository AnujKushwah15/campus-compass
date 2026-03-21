# Streaming System Technical Handoff (For Another AI / Engineer)

This document summarizes the full setup completed today for the
streaming architecture:

Camera → Raspberry Pi → VPS (MediaMTX) → WebRTC

------------------------------------------------------------------------

# 1️⃣ Network Architecture

## Camera (Private Network)

-   Connected directly to Raspberry Pi via Ethernet (eth0)
-   Static subnet used between Pi and camera
-   Example:
    -   Camera IP: 192.168.1.34
    -   Pi eth0 IP: 192.168.1.10/24
-   Camera codec configured to H.264
-   RTSP Path used:
    -   /Streaming/Channels/102 (substream)

------------------------------------------------------------------------

## Raspberry Pi Network

-   eth0 → Private camera subnet
-   wlan0 → Internet (WiFi)
-   Publishing to VPS over public internet

Check IP:

``` bash
ip a
ip route
```

------------------------------------------------------------------------

# 2️⃣ Raspberry Pi Configuration

## Streaming Service File

Location:

    /etc/systemd/system/camstream.service

Contents:

    [Unit]
    Description=Camera Stream Push (Stable)
    After=network-online.target
    Wants=network-online.target

    [Service]
    Type=simple

    ExecStart=/usr/bin/ffmpeg -rtsp_transport tcp -i rtsp://admin:123456@192.168.1.34:554/Streaming/Channels/102 -c copy -f rtsp -rtsp_transport tcp rtsp://pi:StrongPublishPass123@VPS_IP:8554/live

    Restart=always
    RestartSec=5
    StartLimitIntervalSec=0
    TimeoutStartSec=0
    Nice=5

    [Install]
    WantedBy=multi-user.target

Enable service:

``` bash
sudo systemctl daemon-reload
sudo systemctl enable camstream
sudo systemctl start camstream
```

Check status:

``` bash
sudo systemctl status camstream
journalctl -u camstream -f
```

------------------------------------------------------------------------

# 3️⃣ VPS Configuration

## MediaMTX Installed At

Binary:

    /opt/mediamtx_dir/mediamtx

Config file:

    /opt/mediamtx_dir/mediamtx.yml

## MediaMTX Service File

    /etc/systemd/system/mediamtx.service

Check service:

``` bash
sudo systemctl status mediamtx
journalctl -u mediamtx -f
```

------------------------------------------------------------------------

# 4️⃣ MediaMTX Configuration (Secured — Updated 2026-02-11)

> **Breaking Change**: Static viewer credentials (`viewer` / `StrongViewerPass123`) are removed.
> Viewers now authenticate via JWT tokens issued by the backend.

    logLevel: info

    rtspAddress: ":8554"
    webrtcAddress: ":8889"

    rtmpAddress: ""
    hlsAddress: ""
    srtAddress: ""

    api: yes
    apiAddress: ":9997"

    # HTTP auth for viewers (calls backend to verify JWT)
    authMethod: http
    authHTTPAddress: http://localhost:3001/stream-auth
    authHTTPExclude:
      - action: publish    # Pi uses internal static auth
      # [2026-03-21] 'read' bypass removed. All viewers must use JWT.

    authInternalUsers:
      - user: pi
        pass: StrongPublishPass123    # ← Change this!
        permissions:
          - action: publish
            path: live
          - action: publish
            path: live_bus-1
          - action: publish
            path: live_bus-2
          - action: publish
            path: live_bus-3

    paths:
      live:
        source: publisher
      live_bus-1:
        source: publisher
      live_bus-2:
        source: publisher
      live_bus-3:
        source: publisher
      "live_bus-~.*":
        source: publisher

Restart server:

``` bash
sudo systemctl restart mediamtx
```

------------------------------------------------------------------------

# 5️⃣ Firewall Configuration (VPS)

Check firewall:

``` bash
sudo ufw status
```

Allowed ports:

-   22/tcp (SSH)
-   8554/tcp (RTSP publish)
-   8889/tcp (WebRTC)
-   8000-9000/udp (RTP + ICE)
-   3001/tcp (Backend API — internal only, block external access)

------------------------------------------------------------------------

# 6️⃣ Stream Access (Updated — JWT Auth)

## How It Works Now

1. **Frontend** calls `GET /api/stream-token` (Next.js Proxy)
2. **Next.js Proxy** forwards to **Backend** (port 3001) → issues 300s (5 min) JWT
3. **Frontend** initiates WHEP via `POST /api/whep` (Next.js Proxy)
4. **Next.js Proxy** forwards SDP to **MediaMTX** (port 8189)
5. **MediaMTX** calls `POST /stream-auth` on backend to verify JWT
6. Stream plays if valid, denied if not

## Publish Credentials (Pi → VPS — unchanged)

RTSP Publish URL:

    rtsp://pi:StrongPublishPass123@VPS_IP:8554/live_bus-1

## Environment Variable Required

    STREAM_JWT_SECRET=<generate with: openssl rand -base64 32>

------------------------------------------------------------------------

# 7️⃣ Time Synchronization

Ensure NTP enabled on:

-   Camera (GMT+05:30, IST)
-   Raspberry Pi
-   VPS

Check time:

``` bash
date
timedatectl
```

------------------------------------------------------------------------

# 8️⃣ Recovery Strategy

If stream fails:

1.  Check Pi service:

``` bash
sudo systemctl status camstream
```

2.  Check VPS publish logs:

``` bash
journalctl -u mediamtx -f
```

3.  Check backend auth service:

``` bash
journalctl -u campus-compass -f
```

4.  Restart services if needed:

``` bash
sudo systemctl restart camstream
sudo systemctl restart mediamtx
sudo systemctl restart campus-compass
```

------------------------------------------------------------------------

# 9️⃣ Final Architecture (Updated 2026-02-11)

```
Camera (Private Subnet)
    ↓
Raspberry Pi (RTSP Pull + RTSP Publish + Sensor Service)
    ↓ streams to                ↓ writes GPS/IMU to
VPS (MediaMTX)              Firebase RTDB
    ↓                           ↓
Backend (Express:3001)      Arbitration → /buses/{id}/location
    ↓ verifies JWT              ↓
Authenticated WebRTC        Dashboard Maps (Leaflet)
```

------------------------------------------------------------------------

End of technical handoff document.
