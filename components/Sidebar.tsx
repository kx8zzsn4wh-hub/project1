"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const navItems = [
  { href: "/", label: "Home", short: "H" },
  { href: "/practice", label: "Practice", short: "P" },
  { href: "/presets", label: "プリセット", short: "設" },
  { href: "/wiki", label: "Wiki検索", short: "検" },
  { href: "/articles", label: "記事一覧", short: "記" },
] as const;

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex min-h-screen shrink-0 flex-col border-r bg-zinc-50 transition-[width] duration-200",
        collapsed ? "w-16" : "w-40",
      )}
      aria-label="Main sidebar"
    >
      <div className="flex h-14 items-center justify-center border-b px-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? ">" : "<"}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex h-10 items-center rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-2.5",
              pathname === item.href
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200",
            )}
          >
            {collapsed ? item.short : item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
