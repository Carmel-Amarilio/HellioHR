# HR Document Templates MCP Server

MCP (Model Context Protocol) server providing standardized HR document template generation tools for Claude Desktop.

## ✨ Quick Start (5 Minutes)

**Want to use this with Claude Desktop right now?** → See [QUICK_START.md](./QUICK_START.md)

1. Start server: `docker-compose up -d mcp-server`
2. Configure Claude Desktop (see [CLAUDE_DESKTOP_SETUP.md](./CLAUDE_DESKTOP_SETUP.md))
3. Restart Claude Desktop
4. Ask: *"What HR templates are available?"*

**That's it!** You can now generate professional HR documents through conversation.

---

## Pinned Versions

For deterministic builds and Pydantic 2.12+ compatibility:

- **FastMCP 2.14.5** (upgraded from 0.2.0 to resolve Pydantic 2.8+ compatibility issues)
- **MCP 1.26.0**
- **Pydantic 2.12.5**
- **Uvicorn 0.40.0** (auto-upgraded to meet FastMCP >=0.35 requirement)

See `requirements.txt` for full dependency list.

## Features

- **3 MCP Tools**:
  - `list_templates` - Discover available HR document templates
  - `get_template_schema` - Get required/optional fields for a template
  - `fill_template` - Generate document from template + data

- **4 HR Templates**:
  - Hiring Introduction Email
  - Rejection Email
  - Job Description
  - NDA/Interview Invitation

## Quick Start

### Using Docker (Recommended)

```bash
# Build and start MCP server
docker-compose up mcp-server

# Server will be available at:
# - MCP Endpoint (SSE): http://localhost:3001/sse
```

**Verify server is running:**
```bash
# Test SSE endpoint (should return event-stream data)
curl -N -H "Accept: text/event-stream" http://localhost:3001/sse

# Or check Docker logs
docker logs hellio-mcp-server
```

### Local Development

```bash
cd mcp-server

# Install dependencies
pip install -r requirements.txt

# Run server
python src/server.py

# Server starts with banner showing endpoints
```

## Transport: HTTP/SSE (NOT stdio)

This MCP server uses **HTTP with Server-Sent Events (SSE)** for client communication.

- ✅ Network-accessible on port 3001
- ✅ Works with Docker containers
- ✅ Compatible with Claude Desktop MCP client
- ❌ NOT stdio-based (no stdin/stdout pipes)

See [HTTP_SSE_VALIDATION.md](./HTTP_SSE_VALIDATION.md) for detailed transport verification.

## Using with Claude Desktop

### Setup (One-Time)

1. **Start MCP Server:**
   ```bash
   docker-compose up -d mcp-server
   ```

2. **Configure Claude Desktop:**

   Edit your Claude Desktop config file:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

   Add:
   ```json
   {
     "mcpServers": {
       "hr-document-templates": {
         "url": "http://localhost:3001/sse"
       }
     }
   }
   ```

3. **Restart Claude Desktop** (fully quit and relaunch)

### Example Conversations

**Discover Templates:**
```
You: "What HR document templates are available?"
Claude: [Uses list_templates] "I can see 4 HR templates..."
```

**Generate Document:**
```
You: "Generate a hiring email for Sarah Chen for Senior Engineer at TechCorp. I'm John Smith."
Claude: [Uses fill_template] "Subject: Exciting Opportunity at TechCorp..."
```

**See [DEMO_WORKFLOW.md](./DEMO_WORKFLOW.md) for 8 complete demo scenarios**

## Architecture

```
mcp-server/
├── src/
│   ├── server.py           # FastMCP server entry point
│   ├── tools/              # MCP tool implementations
│   └── utils/              # Template loading utilities
├── templates/              # Jinja2 template files
├── metadata/               # Template schema definitions
└── tests/                  # Pytest test suite
```

## Environment Variables

- `MCP_SERVER_HOST` - Server host (default: 0.0.0.0)
- `MCP_SERVER_PORT` - Server port (default: 3001)
- `MCP_LOG_LEVEL` - Logging level (default: INFO)
- `MCP_TEMPLATES_DIR` - Templates directory path
- `MCP_METADATA_DIR` - Metadata directory path

## Development

```bash
# Run tests
pytest

# Run with debug logging
MCP_LOG_LEVEL=DEBUG python src/server.py
```

## Tool Usage Examples

### list_templates

```json
Response: {
  "templates": [
    {
      "name": "hiring_intro_email",
      "description": "Initial outreach to candidate about job opportunity",
      "version": "1.0"
    }
  ]
}
```

### get_template_schema

```json
Request: {
  "template_name": "hiring_intro_email"
}

Response: {
  "required": ["candidate_name", "position_title", "recruiter_name", "company_name"],
  "optional": ["salary_range", "start_date"],
  "types": {
    "candidate_name": "string",
    "position_title": "string",
    "recruiter_name": "string",
    "company_name": "string",
    "salary_range": "string",
    "start_date": "string"
  }
}
```

### fill_template

```json
Request: {
  "template_name": "hiring_intro_email",
  "data": {
    "candidate_name": "Jane Smith",
    "position_title": "Senior DevOps Engineer",
    "recruiter_name": "John Doe",
    "company_name": "Hellio HR"
  }
}

Response: {
  "ok": true,
  "document": "Dear Jane Smith,\n\nI hope this email finds you well..."
}
```

## Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](./QUICK_START.md) | 5-minute setup guide |
| [CLAUDE_DESKTOP_SETUP.md](./CLAUDE_DESKTOP_SETUP.md) | Detailed Claude Desktop configuration |
| [DEMO_WORKFLOW.md](./DEMO_WORKFLOW.md) | 8 example conversations and workflows |
| [MILESTONE_3_VERIFICATION.md](./MILESTONE_3_VERIFICATION.md) | list_templates implementation |
| [MILESTONE_4_VERIFICATION.md](./MILESTONE_4_VERIFICATION.md) | get_template_schema implementation |
| [MILESTONE_5_VERIFICATION.md](./MILESTONE_5_VERIFICATION.md) | fill_template implementation |
| [MILESTONE_6_VERIFICATION.md](./MILESTONE_6_VERIFICATION.md) | Claude Desktop integration |
| [HTTP_SSE_VALIDATION.md](./HTTP_SSE_VALIDATION.md) | HTTP/SSE transport verification |

## Testing

```bash
# Run all tests
docker exec hellio-mcp-server pytest tests/ -v

# Test specific tool
docker exec hellio-mcp-server pytest tests/test_fill_template.py -v

# Manual demonstration
docker exec hellio-mcp-server python test_fill_demo.py
```

**Test Coverage:**
- list_templates: ✅ (Milestone 3)
- get_template_schema: ✅ 15 tests passing (Milestone 4)
- fill_template: ✅ 18 tests passing (Milestone 5)
- Total: 33+ tests

## License

MIT
