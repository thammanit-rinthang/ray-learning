# Ray Learning MCP Admin Server

MCP (Model Context Protocol) Server สำหรับให้ **AI Agents** (เช่น Antigravity, Claude Desktop, Cursor, Windsurf) สามารถจัดการบทเรียน, อัปโหลดไฟล์ Markdown, ค้นหา และสร้างแบบทดสอบได้โดยอัตโนมัติ

---

## 🛠️ รายการ Tools ที่มีให้ Agent เรียกใช้

| Tool Name | คำอธิบาย | พารามิเตอร์หลัก |
|---|---|---|
| `upload_lesson` | อัปโหลดหรืออัปเดตบทเรียน (บันทึก Markdown เข้า Storage และลง DB ทันที) | `title`, `course`, `content` (Markdown), `chapter?`, `lessonId?` |
| `list_lessons` | ดึงรายชื่อบทเรียนทั้งหมดในระบบ | `course?`, `search?` |
| `get_lesson` | ดึงข้อมูลบทเรียนพร้อมเนื้อหา Markdown เต็ม | `id?` หรือ `slug?` |
| `delete_lesson` | ลบบทเรียนทั้งใน Storage และ Database | `id` |
| `create_quiz` | สร้างชุดข้อสอบและบันทึกเฉลยลง Database ให้บทเรียนนั้นๆ | `title`, `lessonId`, `difficulty`, `questions` |

---

## 🚀 วิธีตั้งค่าใน AI Agents

### 1. Build ไฟล์ MCP ให้พร้อมใช้งาน (รันคำสั่งนี้ครั้งแรก):
```bash
npm run build:mcp
```

---

### 2. ตั้งค่าใน Antigravity CLI / IDE (`~/.gemini/antigravity-cli/mcp/ray-learning-admin.json` หรือ Agent Config)
```json
{
  "mcpServers": {
    "ray-learning-admin": {
      "command": "node",
      "args": ["D:/projects/Bot-Learning/report-viewer/mcp-server/dist/index.mjs"],
      "env": {
        "DATABASE_URL": "postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true",
        "NEXT_PUBLIC_SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOi...",
        "SUPABASE_REPORT_BUCKET": "lesson-reports"
      }
    }
  }
}
```

### 3. ตั้งค่าใน Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "ray-learning-admin": {
      "command": "node",
      "args": ["D:/projects/Bot-Learning/report-viewer/mcp-server/dist/index.mjs"],
      "env": {
        "DATABASE_URL": "postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true",
        "NEXT_PUBLIC_SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOi...",
        "SUPABASE_REPORT_BUCKET": "lesson-reports"
      }
    }
  }
}
```

### 4. ตั้งค่าใน Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "ray-learning-admin": {
      "command": "node",
      "args": ["mcp-server/dist/index.mjs"]
    }
  }
}
```

---

## 💬 ตัวอย่างคำสั่งที่สามารถสั่ง AI Agent ได้

- *"ช่วยสร้างบทเรียนเรื่อง CSS Container Queries ในหมวด Web Development ให้หน่อย แล้วอัปโหลดเข้าระบบเลย"*
- *"ตรวจสอบบทเรียนทั้งหมดในวิชา Next.js แล้วสรุปให้ดูหน่อยว่ามีเรื่องอะไรบ้าง"*
- *"ออกข้อสอบ 5 ข้อ สำหรับบทเรียน ID xxx พร้อมเฉลยและบันทึกลงระบบ"*
