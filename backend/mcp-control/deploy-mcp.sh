#!/bin/bash
# Campus Compass MCP Server Deploy Script
# Run this from local machine to push the MCP server to your VPS

set -e

VPS="root@72.61.250.73"
MCP_DIR="/opt/campus-compass-backend/mcp-control"

echo "📦 Creating directory on VPS..."
ssh "${VPS}" "mkdir -p ${MCP_DIR}"

echo "📦 Copying MCP files to VPS..."
scp backend/mcp-control/package.json "${VPS}:${MCP_DIR}/package.json"
scp backend/mcp-control/server.mjs "${VPS}:${MCP_DIR}/server.mjs"
scp backend/mcp-control/.env.example "${VPS}:${MCP_DIR}/.env.example"
scp backend/mcp-control/mcp-server.service "${VPS}:/etc/systemd/system/mcp-server.service"

echo "🔄 Initializing MCP dependencies and permissions on VPS..."
ssh "${VPS}" "
  cd ${MCP_DIR}
  npm install
  
  # Ensure the mcp-user exists but has no login shell
  if ! id 'mcp-user' &>/dev/null; then
    useradd -r -s /bin/false mcp-user
  fi
  
  # Set correct ownership
  chown -R mcp-user:mcp-user ${MCP_DIR}
  
  # Safely inject sudoers rule
  cat << 'EOTS' > /etc/sudoers.d/mcp-server
mcp-user ALL=(root) NOPASSWD: /bin/systemctl restart mediamtx, /bin/systemctl restart campus-compass, /bin/systemctl is-active *, /bin/journalctl *
EOTS
  chmod 440 /etc/sudoers.d/mcp-server
  
  # Reload and restart services
  sudo systemctl daemon-reload
  sudo systemctl enable mcp-server
  sudo systemctl restart mcp-server
  
  echo '── Status of MCP Server ──'
  sudo systemctl status mcp-server --no-pager -n 10
"

echo "✅ MCP Deployment Completed!"
