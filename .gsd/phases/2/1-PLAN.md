---
phase: 2
plan: 1
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves:
  truths:
    - "Nginx is consistently running and managing systemd process"
    - "Nginx configuration answers SSL correctly"
    - "Cloudflare routes to Origin successfully"
  artifacts:
    - "VPS listening on 80 and 443 via Nginx"
---

# Plan 2.1: VPS Nginx Rescue & SSL Verification

<objective>
Fix Nginx binding issues so it starts via systemd cleanly, ensuring that Cloudflare proxy correctly hits our origin over HTTPS.

Purpose: Nginx is currently failing due to multiple PIDs / port in use. A stable reverse proxy is required to resolve mixed content for Vercel.
Output: Systemd managing Nginx with correct proxy config.
</objective>

<context>
Load for context:
- D:\projects\campus-compass\vps_nginx.conf (as a reference)
</context>

<tasks>

<task type="auto">
  <name>Identify and terminate rogue Nginx instances</name>
  <files>NONE</files>
  <action>
    SSH into the VPS (`ssh root@72.61.250.73`). List all processes holding ports 80/443 using `lsof -i :80,443` or `fuser 80/tcp`. Force stop the `nginx` systemd service, then `kill -9` any remaining rogue processes. Wait 2 seconds for sockets to free.
  </action>
  <verify>ssh root@72.61.250.73 "lsof -i :80"</verify>
  <done>No output returned, indicating port 80 is free</done>
</task>

<task type="auto">
  <name>Start Nginx properly via systemd</name>
  <files>NONE</files>
  <action>
    SSH to VPS. Run `nginx -t` to ensure the current `/etc/nginx/sites-available/lumora-backend` config is valid. Run `systemctl start nginx`. Check `systemctl status nginx`.
  </action>
  <verify>ssh root@72.61.250.73 "systemctl status nginx --no-pager"</verify>
  <done>Nginx shows active (running)</done>
</task>

<task type="auto">
  <name>Verify HTTPS via cURL</name>
  <files>NONE</files>
  <action>
    Run `curl -kI https://thanganat25.com/api/` locally (or via VPS to localhost with the host header) to verify Nginx answers HTTPS and proxies to the backend correctly.
  </action>
  <verify>curl -kI https://thanganat25.com/api/</verify>
  <done>Returns HTTP 200 or 404 (from backend routes, not 502/down)</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Nginx is running under systemd
- [ ] SSL cert is served and valid for thanganat25.com
- [ ] Ports 80 and 443 are correctly bound to Nginx
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Nginx stable and proxying
</success_criteria>
