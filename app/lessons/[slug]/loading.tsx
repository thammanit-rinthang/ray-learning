import { Loader2 } from "lucide-react";

export default function LessonLoading() {
  return (
    <div className="reading-container">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", padding: "var(--space-2xl) 0", alignItems: "center" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", fontWeight: 500 }}>
          กำลังเปิดเนื้อหาบทเรียน...
        </span>
      </div>
    </div>
  );
}
