# Claude Desktop Setup Guide

## Prerequisites

1. ✅ **MCP Server Running**
   ```bash
   docker-compose up -d mcp-server
   # Server should be accessible at http://localhost:3001/sse
   ```

2. ✅ **Verify Server Health**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok","version":"1.0.0",...}
   ```

3. ✅ **Claude Desktop Installed**
   - Download from: https://claude.ai/download

---

## Configuration Steps

### Step 1: Locate Claude Desktop Config File

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```
**Full path example:**
```
C:\Users\YourUsername\AppData\Roaming\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

---

### Step 2: Add MCP Server Configuration

Open `claude_desktop_config.json` and add the HR Document Templates MCP server:

```json
{
  "mcpServers": {
    "hr-document-templates": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

**If you already have other MCP servers configured:**

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "npx",
      "args": ["-y", "@some/mcp-server"]
    },
    "hr-document-templates": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

---

### Step 3: Restart Claude Desktop

1. **Quit Claude Desktop completely** (not just close the window)
   - Windows: Right-click system tray icon → Exit
   - macOS: Cmd+Q
   - Linux: Quit from application menu

2. **Restart Claude Desktop**

3. **Verify Connection**
   - Look for an MCP icon or indicator in Claude Desktop
   - Check for "hr-document-templates" in available tools

---

### Step 4: Test Connection

In Claude Desktop, try:

```
What HR document templates are available?
```

**Expected Response:**
Claude should use the `list_templates` tool and show you:
- Hiring Introduction Email
- Rejection Email
- Job Description
- NDA/Interview Invitation

---

## Troubleshooting

### Issue: "MCP server not found" or "Connection failed"

**Solution 1: Verify Server is Running**
```bash
docker ps | grep hellio-mcp-server
# Should show container running on port 3001

docker logs hellio-mcp-server
# Should show "Uvicorn running on http://0.0.0.0:3001"
```

**Solution 2: Test SSE Endpoint**
```bash
curl -N -H "Accept: text/event-stream" http://localhost:3001/sse
# Should return event-stream data (Ctrl+C to exit)
```

**Solution 3: Check Firewall**
- Ensure localhost port 3001 is not blocked
- Try accessing http://localhost:3001/health in browser

**Solution 4: Verify Config File Path**
```bash
# Windows (PowerShell)
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json"

# macOS/Linux
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

---

### Issue: "Tools not appearing in Claude"

**Solution 1: Check Config Syntax**
- Ensure JSON is valid (no trailing commas, proper quotes)
- Use a JSON validator: https://jsonlint.com/

**Solution 2: Restart Claude Desktop Completely**
- Must fully quit, not just close window
- Wait 5 seconds before restarting

**Solution 3: Check Claude Desktop Version**
- Ensure you have the latest version
- MCP support requires Claude Desktop 0.7.0+

---

### Issue: "Server responds but tools fail"

**Solution 1: Check Server Logs**
```bash
docker logs hellio-mcp-server --tail 50
# Look for errors when tools are called
```

**Solution 2: Test Tools Directly**
```bash
docker exec hellio-mcp-server python test_fill_demo.py
# Should show successful renders
```

**Solution 3: Rebuild Server**
```bash
docker-compose down mcp-server
docker-compose build mcp-server
docker-compose up -d mcp-server
```

---

## Advanced Configuration

### Enable Debug Logging

```json
{
  "mcpServers": {
    "hr-document-templates": {
      "url": "http://localhost:3001/sse",
      "env": {
        "MCP_LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

### Custom Port

If port 3001 conflicts, update `docker-compose.yml`:

```yaml
mcp-server:
  ports:
    - "3002:3001"  # External:Internal
```

Then update Claude Desktop config:
```json
{
  "mcpServers": {
    "hr-document-templates": {
      "url": "http://localhost:3002/sse"
    }
  }
}
```

---

## Verification Checklist

Before testing with Claude Desktop:

- [ ] MCP server container running (`docker ps`)
- [ ] Health endpoint responds (`curl http://localhost:3001/health`)
- [ ] SSE endpoint accessible (`curl -N http://localhost:3001/sse`)
- [ ] Config file exists at correct location
- [ ] JSON syntax is valid
- [ ] Claude Desktop fully restarted
- [ ] No firewall blocking port 3001

---

## Next Steps

Once configured, proceed to the **End-to-End Demo** workflow documented in `DEMO_WORKFLOW.md`.

---

## Support

**Server Issues:**
- Check `docker logs hellio-mcp-server`
- Verify with `docker exec hellio-mcp-server python test_fill_demo.py`

**Claude Desktop Issues:**
- Check Claude Desktop logs (location varies by OS)
- Ensure MCP support is enabled in settings

**Configuration Issues:**
- Validate JSON syntax
- Ensure file permissions allow Claude Desktop to read config
- Try minimal config with only HR templates server
