# Quick Start Guide - HR Document Templates MCP Server

## 🚀 5-Minute Setup

### 1. Start the Server

```bash
cd HellioHR
docker-compose up -d mcp-server
```

**Verify it's running:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","templates_count":4,...}
```

---

### 2. Configure Claude Desktop

**Windows:** Edit `%APPDATA%\Claude\claude_desktop_config.json`

**macOS:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**Add this:**
```json
{
  "mcpServers": {
    "hr-document-templates": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

---

### 3. Restart Claude Desktop

- **Fully quit** Claude Desktop (not just close)
- Wait 5 seconds
- Relaunch

---

### 4. Test It!

**In Claude Desktop, try:**

```
What HR document templates are available?
```

**Expected:** Claude shows you 4 templates

```
Generate a hiring email for Sarah Chen for the Software Engineer
position. I'm John Smith from TechCorp.
```

**Expected:** Claude generates a professional hiring email

---

## 📚 Available Templates

1. **Hiring Introduction Email** - Outreach to candidates
2. **Rejection Email** - Professional rejection after interview
3. **Job Description** - Formal job posting
4. **NDA/Interview Invitation** - Combined interview + NDA

---

## 🛠️ Common Commands

**Check server status:**
```bash
docker ps | grep hellio-mcp-server
```

**View server logs:**
```bash
docker logs hellio-mcp-server
```

**Restart server:**
```bash
docker-compose restart mcp-server
```

**Stop server:**
```bash
docker-compose down mcp-server
```

**Test tools locally:**
```bash
docker exec hellio-mcp-server python test_fill_demo.py
```

**Run tests:**
```bash
docker exec hellio-mcp-server pytest tests/ -v
```

---

## 💬 Example Conversations

**Discover:**
```
"What HR templates do you have?"
```

**Explore:**
```
"What fields are needed for a hiring email?"
```

**Generate:**
```
"Create a job description for a Senior DevOps Engineer at
CloudTech in Engineering. Summary: Lead cloud migration.
Responsibilities: Manage AWS, implement CI/CD. Requirements:
5+ years experience, AWS certification."
```

**Handle Errors:**
```
"Generate a hiring email for Jane Doe"
→ Claude asks for missing required fields
```

---

## 🔧 Troubleshooting

**Tools not appearing?**
1. Check server is running: `docker ps`
2. Test health: `curl http://localhost:3001/health`
3. Verify config file path and syntax
4. Fully restart Claude Desktop

**Server not responding?**
```bash
docker-compose down mcp-server
docker-compose up -d mcp-server
```

**Need more help?**
- See `CLAUDE_DESKTOP_SETUP.md` for detailed setup
- See `DEMO_WORKFLOW.md` for example conversations
- Check `docker logs hellio-mcp-server` for errors

---

## 📖 Documentation

- **Setup:** `CLAUDE_DESKTOP_SETUP.md` - Complete setup guide
- **Demo:** `DEMO_WORKFLOW.md` - Example conversations
- **Verification:** `MILESTONE_6_VERIFICATION.md` - Testing guide
- **Technical:** `README.md` - Architecture and development

---

## ✅ Success Checklist

- [ ] Server running (`docker ps`)
- [ ] Health check passes (`curl http://localhost:3001/health`)
- [ ] Config file created
- [ ] Claude Desktop restarted
- [ ] "What templates are available?" works in Claude
- [ ] Successfully generated a document

---

## 🎯 Quick Test

Run this in Claude Desktop:

```
Generate a hiring introduction email for Alex Johnson for the
Senior Software Engineer position. I'm Sarah Williams from
InnovateTech. Salary range is $120,000 - $150,000.
```

**Expected:** Professional email ready to send!

---

## 🚨 Common Errors

**"Connection refused"**
→ Server not running. Start it: `docker-compose up -d mcp-server`

**"Template not found"**
→ Available templates: hiring_intro_email, rejection_email, job_description, nda_interview_invitation

**"Missing required fields"**
→ Claude will tell you which fields are needed. Provide them in natural language.

---

## 📊 Server Info

- **Endpoint:** http://localhost:3001/sse
- **Health:** http://localhost:3001/health
- **Transport:** HTTP/SSE
- **Framework:** FastMCP 2.14.5
- **Templates:** 4
- **Tools:** 3 (list_templates, get_template_schema, fill_template)

---

## 🎓 Learn More

**Want to understand the workflow?**
See `DEMO_WORKFLOW.md` for 8 detailed scenarios

**Need to customize?**
Edit templates in `templates/*.j2` and metadata in `metadata/*.json`

**Want to add templates?**
1. Create `templates/my_template.j2`
2. Create `metadata/my_template.json`
3. Restart server

---

## 🌟 Quick Wins

**1-Minute Win:** List available templates
```
"Show me the HR templates"
```

**3-Minute Win:** Generate your first document
```
"Generate a hiring email for [name] for the [position] position.
I'm [your name] from [company]."
```

**5-Minute Win:** Try all 4 templates
- Hiring email ✅
- Rejection email ✅
- Job description ✅
- Interview invitation ✅

---

**Ready to start?** Just run `docker-compose up -d mcp-server` and configure Claude Desktop!
