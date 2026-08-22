import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "40vh",
        gap: "var(--space-sm)",
        color: "var(--color-text-secondary)",
      }}
    >
      <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
      <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>กำลังโหลดข้อมูล...</span>
    </div>
  );
}
