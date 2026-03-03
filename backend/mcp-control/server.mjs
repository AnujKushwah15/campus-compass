import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import axios from "axios";
import { exec } from "child_process";
import util from "util";
import os from "os";

const execAsync = util.promisify(exec);

// Security configuration
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || "default-secure-token-change-me";
const PORT = parseInt(process.env.MCP_PORT || "3002", 10);
const ALLOWED_SERVICES = ["mediamtx", "campus-compass"];

// Initialize MCP Server
const mcp = new McpServer({
    name: "Service Control MCP",
    version: "1.0.0"
});

// Helper for service validation
function validateService(service) {
    if (!ALLOWED_SERVICES.includes(service)) {
        throw new Error(`Service '${service}' is not in the allowed list.`);
    }
}

// 1. Tool: get_service_status
mcp.tool(
    "get_service_status",
    "Check if a specific allowed service is active.",
    { service: { type: "string" } },
    async ({ service }) => {
        try {
            validateService(service);
            const { stdout } = await execAsync(`systemctl is-active ${service}`);
            return { content: [{ type: "text", text: JSON.stringify({ status: stdout.trim() }) }] };
        } catch (error) {
            const status = error.stdout ? error.stdout.trim() : "inactive/error";
            return { content: [{ type: "text", text: JSON.stringify({ status }) }] };
        }
    }
);

// 2. Tool: restart_service
// Basic rate limiting tracking
const lastRestart = new Map();

mcp.tool(
    "restart_service",
    "Restart a specific allowed service securely.",
    { service: { type: "string" } },
    async ({ service }) => {
        validateService(service);
        const now = Date.now();
        const last = lastRestart.get(service) || 0;
        if (now - last < 60000) { // 1 min rate limit
            return { content: [{ type: "text", text: JSON.stringify({ error: "Rate limit exceeded. Wait 60s." }) }] };
        }

        try {
            await execAsync(`sudo systemctl restart ${service}`);
            lastRestart.set(service, now);

            const { stdout } = await execAsync(`systemctl is-active ${service}`);
            return { content: [{ type: "text", text: JSON.stringify({ status: stdout.trim(), message: "Restart success" }) }] };
        } catch (error) {
            return { content: [{ type: "text", text: JSON.stringify({ error: error.message }) }] };
        }
    }
);

// 3. Tool: get_service_logs
mcp.tool(
    "get_service_logs",
    "Fetch recent logs for a specific service.",
    { service: { type: "string" }, lines: { type: "number", default: 50 } },
    async ({ service, lines }) => {
        validateService(service);
        const numLines = Math.min(Math.max(1, lines), 100);

        try {
            const { stdout } = await execAsync(`journalctl -u ${service} -n ${numLines} --no-pager`);
            return { content: [{ type: "text", text: JSON.stringify({ logs: stdout.split('\n') }) }] };
        } catch (error) {
            return { content: [{ type: "text", text: JSON.stringify({ error: error.message }) }] };
        }
    }
);

// 4. Tool: get_stream_status
mcp.tool(
    "get_stream_status",
    "Monitor MediaMTX stream health over its API.",
    {},
    async () => {
        try {
            const API_URL = process.env.MEDIAMTX_API_URL || "http://127.0.0.1:9997/v2/paths/list";
            const response = await axios.get(API_URL);

            const items = response.data?.items || [];
            const report = items.map((pathItem) => ({
                path: pathItem.name,
                publishing: !!pathItem.ready,
                readers: pathItem.readers?.length || 0
            }));

            return { content: [{ type: "text", text: JSON.stringify({ streams: report }) }] };
        } catch (error) {
            return { content: [{ type: "text", text: JSON.stringify({ error: `Failed to fetch MediaMTX API: ${error.message}` }) }] };
        }
    }
);

// 5. Tool: get_system_health
mcp.tool(
    "get_system_health",
    "Retrieve CPU, RAM, disk, and uptime.",
    {},
    async () => {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const uptime = os.uptime();
        const cpus = os.cpus();

        let diskUsage = "unknown";
        try {
            const { stdout } = await execAsync("df -h / | awk 'NR==2 {print $5}'");
            diskUsage = stdout.trim();
        } catch (e) {
            // Ignore shell failure on non-linux systems like local dev
        }

        return {
            content: [{
                type: "text", text: JSON.stringify({
                    cpu_cores: cpus.length,
                    ram_total_gb: (totalMem / 1024 ** 3).toFixed(2),
                    ram_free_gb: (freeMem / 1024 ** 3).toFixed(2),
                    disk_usage: diskUsage,
                    uptime_seconds: uptime
                })
            }]
        };
    }
);

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

// Token Authentication Middleware
app.use((req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (token !== AUTH_TOKEN) {
        return res.status(401).json({ error: "Unauthorized: Invalid or missing token" });
    }
    next();
});

// SSE Transport Map
const transports = new Map();

app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    // Assign a unique ID per connection if needed
    const id = Date.now().toString();
    transports.set(id, transport);

    await mcp.connect(transport);
    console.log(`[MCP] Client connected via SSE (ID: ${id})`);

    req.on('close', () => {
        console.log(`[MCP] Client disconnected (ID: ${id})`);
        transports.delete(id);
    });
});

app.post("/messages", async (req, res) => {
    // Broad simple matching of transport. In production, 
    // you might parse sessionId from the request URL to map perfectly.
    const transport = Array.from(transports.values())[0];

    if (!transport) {
        return res.status(404).json({ error: "No active SSE connection found" });
    }

    await transport.handlePostMessage(req, res);
});

// Start the server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`🔒 Secure MCP Server running on http://127.0.0.1:${PORT}`);
    console.log(`🛡️  Token authentication required`);
});
