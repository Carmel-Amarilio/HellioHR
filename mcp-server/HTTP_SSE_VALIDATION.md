# HTTP/SSE Transport Validation

## Confirmed: NOT stdio transport

This MCP server uses **HTTP with Server-Sent Events (SSE)** as required by Exercise 7.

## Server Endpoints

### 1. MCP Protocol Endpoint (SSE)
```
http://localhost:3001/sse
```

**Purpose:** MCP client connection point (Claude Desktop, custom clients)
**Protocol:** Server-Sent Events (SSE) over HTTP
**Content-Type:** `text/event-stream`

**Connect with curl:**
```bash
# This will show SSE connection stream
curl -N -H "Accept: text/event-stream" http://localhost:3001/sse
```

Expected response: SSE stream with MCP protocol messages

### 2. Health Check Endpoint
```
http://localhost:3001/health
```

**Purpose:** Simple HTTP GET to verify server is running
**Method:** GET
**Response:** JSON with server status

**Verify with curl:**
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "server": "HR Document Templates MCP Server",
  "transport": "HTTP/SSE"
}
```

## Run Commands

### Docker (Recommended)
```bash
# Build
docker build -t hellio-mcp-server mcp-server/

# Run
docker run -p 3001:3001 hellio-mcp-server

# Or with docker-compose
docker-compose up mcp-server
```

### Local Python
```bash
cd mcp-server

# Install dependencies
pip install -r requirements.txt

# Run server
python src/server.py
```

## Verification Steps

1. **Start the server**
   ```bash
   docker-compose up mcp-server
   ```

2. **Verify HTTP accessibility** (from another terminal)
   ```bash
   curl http://localhost:3001/health
   ```
   ✅ Should return JSON with `"status": "ok"`

3. **Verify SSE endpoint** (MCP protocol)
   ```bash
   curl -N -H "Accept: text/event-stream" http://localhost:3001/sse
   ```
   ✅ Should open SSE stream (stays open, receives events)

4. **Connect Claude Desktop**
   - Configure `.claude/claude_desktop_config.json`
   - Add: `{"url": "http://localhost:3001/sse", "transport": "sse"}`
   - Claude Desktop will connect via HTTP/SSE

## Transport Confirmation

✅ **HTTP/SSE** - Server listens on TCP port 3001
✅ **NOT stdio** - No stdin/stdout pipe communication
✅ **Dockerized** - Can run in container as required
✅ **Network accessible** - Reachable via localhost:3001

## Architecture

```
┌─────────────────┐
│  Claude Desktop │
│   (MCP Client)  │
└────────┬────────┘
         │ HTTP/SSE
         │ GET /sse
         ▼
┌─────────────────┐
│   FastMCP       │
│   (uvicorn)     │
│   Port 3001     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  MCP Tools:     │
│  - list_templates
│  - get_schema   │
│  - fill_template│
└─────────────────┘
```

## Next Steps

After server starts successfully:
1. ✅ HTTP/SSE transport confirmed
2. ⏭️ Proceed to Milestone 2: Create templates & metadata
3. ⏭️ Implement 3 MCP tools
4. ⏭️ Test with Claude Desktop via SSE endpoint
