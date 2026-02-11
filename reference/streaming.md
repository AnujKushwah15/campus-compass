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

# 4️⃣ MediaMTX Configuration (Hardened)

    logLevel: info

    rtspAddress: ":8554"
    webrtcAddress: ":8889"

    rtmpAddress: ""
    hlsAddress: ""
    srtAddress: ""

    authMethod: internal

    authInternalUsers:
      - user: pi
        pass: StrongPublishPass123
        permissions:
          - action: publish
            path: live

      - user: viewer
        pass: StrongViewerPass123
        permissions:
          - action: read
            path: live

    paths:
      live:
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

------------------------------------------------------------------------

# 6️⃣ Stream Access

## WebRTC Playback

URL:

    http://VPS_IP:8889/live

Viewer Credentials: - Username: viewer - Password: StrongViewerPass123

------------------------------------------------------------------------

## Publish Credentials (Pi → VPS)

RTSP Publish URL:

    rtsp://pi:StrongPublishPass123@VPS_IP:8554/live

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

3.  Restart services if needed:

``` bash
sudo systemctl restart camstream
sudo systemctl restart mediamtx
```

------------------------------------------------------------------------

# 9️⃣ Final Architecture

Camera (Private Subnet) ↓ Raspberry Pi (RTSP Pull + Authenticated
Publish) ↓ VPS (MediaMTX) ↓ Authenticated WebRTC Playback

------------------------------------------------------------------------

End of technical handoff document.
