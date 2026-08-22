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

### 1. ตั้งค่าใน Antigravity CLI / IDE (`~/.gemini/antigravity.json` หรือ Agent Config)
```json
{
  "mcpServers": {
    "ray-learning-admin": {
      "command": "npx",
      "args": ["-y", "tsx", "D:/projects/Bot-Learning/report-viewer/mcp-server/index.ts"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "NEXT_PUBLIC_SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOi...",
        "SUPABASE_REPORT_BUCKET": "lesson-reports"
      }
    }
  }
}
```

### 2. ตั้งค่าใน Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "ray-learning-admin": {
      "command": "cmd.exe",
      "args": [
        "/c",
        "npx tsx D:\\projects\\Bot-Learning\\report-viewer\\mcp-server\\index.ts"
      ],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "NEXT_PUBLIC_SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOi...",
        "SUPABASE_REPORT_BUCKET": "lesson-reports"
      }
    }
  }
}
```

### 3. ตั้งค่าใน Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "ray-learning-admin": {
      "command": "npx",
      "args": ["tsx", "mcp-server/index.ts"]
    }
  }
}
```

---

## 💬 ตัวอย่างคำสั่งที่สามารถสั่ง AI Agent ได้

- *"ช่วยสร้างบทเรียนเรื่อง CSS Container Queries ในหมวด Web Development ให้หน่อย แล้วอัปโหลดเข้าระบบเลย"*
- *"ตรวจสอบบทเรียนทั้งหมดในวิชา Next.js แล้วสรุปให้ดูหน่อยว่ามีเรื่องอะไรบ้าง"*
- *"ออกข้อสอบ 5 ข้อ สำหรับบทเรียน ID xxx พร้อมเฉลยและบันทึกลงระบบ"*
