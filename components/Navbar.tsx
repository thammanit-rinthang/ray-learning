"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, HelpCircle, MessageSquare, Settings, LogIn, LogOut, Menu, X, User } from "lucide-react";

import type { Route } from "next";

interface NavbarProps {
  user?: { id: string; email: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ href: Route; label: string; icon: typeof BookOpen }> = [
    { href: "/", label: "บทเรียน", icon: BookOpen },
    { href: "/quiz", label: "แบบทดสอบ", icon: HelpCircle },
    { href: "/chat", label: "ถาม AI", icon: MessageSquare },
    { href: "/manage", label: "จัดการ", icon: Settings },
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" onClick={() => setMobileMenuOpen(false)}>
          <span className="brand-mark">R</span>
          <span>Ray Learning</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav-desktop" aria-label="เมนูหลัก">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Account / Auth Actions */}
        <div className="nav-user">
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className="user-email-badge" title={user.email}>
                <User size={12} />
                <span>{user.email || "ผู้ใช้งาน"}</span>
              </div>
              <form action="/auth/signout" method="POST" style={{ display: "inline" }}>
                <button
                  type="submit"
                  className="btn btn-ghost btn-sm"
                  title="ออกจากระบบ"
                  aria-label="ออกจากระบบ"
                >
                  <LogOut size={16} />
                  <span style={{ display: "none" }}>ออกจากระบบ</span>
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn btn-secondary btn-sm">
              <LogIn size={15} />
              <span>เข้าสู่ระบบ</span>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="เปิดเมนู"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-label="เมนูมือถือ">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`nav-link ${isActive ? "active" : ""}`}
                style={{ padding: "0.75rem 1rem" }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {user && (
            <div style={{ marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="btn btn-ghost btn-sm"
                  style={{ width: "100%", justifyContent: "flex-start", color: "var(--color-danger-text)" }}
                >
                  <LogOut size={16} />
                  <span>ออกจากระบบ ({user.email})</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
