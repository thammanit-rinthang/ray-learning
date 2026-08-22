import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <span>Ray Learning System · ระบบเรียนรู้จากรายงานและเอกสาร</span>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/" style={{ color: "var(--color-text-tertiary)" }}>
            บทเรียน
          </Link>
          <Link href="/quiz" style={{ color: "var(--color-text-tertiary)" }}>
            แบบทดสอบ
          </Link>
          <Link href="/chat" style={{ color: "var(--color-text-tertiary)" }}>
            ถาม AI
          </Link>
          <Link href="/manage" style={{ color: "var(--color-text-tertiary)" }}>
            จัดการเนื้อหา
          </Link>
        </div>
      </div>
    </footer>
  );
}
