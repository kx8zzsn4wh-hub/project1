"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type AppShellProps = {
  children: React.ReactNode;
};

const STORAGE_KEYS = {
  sidebarCollapsed: "project1.sidebarCollapsed",
} as const;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [authLoading, setAuthLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const isAdmin = isLoggedIn && role === "admin";

  useEffect(() => {
    try {
      const collapsedRaw = window.localStorage.getItem(STORAGE_KEYS.sidebarCollapsed);
      if (collapsedRaw !== null) {
        setCollapsed(collapsedRaw === "true");
      }
    } finally {
      setSidebarReady(true);
    }
  }, []);

  useEffect(() => {
    if (!sidebarReady) {
      return;
    }

    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(collapsed));
  }, [collapsed, sidebarReady]);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });

        if (!response.ok) {
          if (active) {
            setIsLoggedIn(false);
            setUsername("");
            setRole("user");
          }
          return;
        }

        const payload = (await response.json()) as {
          ok: boolean;
          user?: { username?: string; role?: "user" | "admin" };
        };

        if (active && payload.ok && payload.user?.username) {
          setIsLoggedIn(true);
          setUsername(payload.user.username);
          setRole(payload.user.role ?? "user");
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, [pathname]);

  const displayUser = isLoggedIn && username ? username : "Guest";

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setIsLoggedIn(false);
      setUsername("");
      setRole("user");
    }
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formUsername.trim()) {
      setFormError("usernameを入力してください。");
      return;
    }

    if (!formPassword) {
      setFormError("passwordを入力してください。");
      return;
    }

    if (authMode === "register" && formPassword !== formConfirmPassword) {
      setFormError("passwordと確認用passwordが一致しません。");
      return;
    }

    setFormSubmitting(true);

    try {
      const endpoint = authMode === "login" ? "/api/login" : "/api/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formUsername, password: formPassword }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            user?: { username?: string; role?: "user" | "admin" };
            message?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? (authMode === "login" ? "ログインに失敗しました。" : "新規登録に失敗しました。"));
      }

      if (authMode === "login") {
        setIsLoggedIn(true);
        setUsername(payload.user?.username ?? formUsername.trim());
        setRole(payload.user?.role ?? "user");
        setAuthDialogOpen(false);
      } else {
        setFormSuccess("新規登録に成功しました。続けてログインしてください。");
        setAuthMode("login");
      }

      setFormPassword("");
      setFormConfirmPassword("");
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : authMode === "login"
            ? "ログインに失敗しました。"
            : "新規登録に失敗しました。";
      setFormError(message);
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className={`flex min-h-screen ${isAdmin ? "admin-theme bg-green-50" : "bg-zinc-100"}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`flex h-14 items-center justify-between border-b px-4 ${isAdmin ? "bg-green-100" : "bg-white"}`}>
          <p className="text-sm font-medium text-zinc-700">
            User: {displayUser}
            {isAdmin ? " (Admin)" : ""}
          </p>

          {isLoggedIn ? (
            <Button size="sm" variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={authLoading}>
                  {authLoading ? "Checking..." : "Login"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{authMode === "login" ? "ログイン" : "新規登録"}</DialogTitle>
                  <DialogDescription>
                    {authMode === "login"
                      ? "ユーザー名とパスワードでログインします。"
                      : "ユーザー名とパスワードでアカウントを作成します。"}
                  </DialogDescription>
                </DialogHeader>

                <div className="inline-flex rounded-md border p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setFormError("");
                      setFormSuccess("");
                    }}
                    className={`rounded px-3 py-1 text-xs ${authMode === "login" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  >
                    ログイン
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setFormError("");
                      setFormSuccess("");
                    }}
                    className={`rounded px-3 py-1 text-xs ${authMode === "register" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  >
                    新規登録
                  </button>
                </div>

                <form className="space-y-3" onSubmit={handleAuthSubmit}>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-700">username</p>
                    <Input
                      value={formUsername}
                      onChange={(event) => setFormUsername(event.target.value)}
                      placeholder="username"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-zinc-700">password</p>
                    <Input
                      type="password"
                      value={formPassword}
                      onChange={(event) => setFormPassword(event.target.value)}
                      placeholder="password"
                      required
                    />
                  </div>

                  {authMode === "register" ? (
                    <div className="space-y-1">
                      <p className="text-sm text-zinc-700">confirm password</p>
                      <Input
                        type="password"
                        value={formConfirmPassword}
                        onChange={(event) => setFormConfirmPassword(event.target.value)}
                        placeholder="confirm password"
                        required
                      />
                    </div>
                  ) : null}

                  {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
                  {formSuccess ? <p className="text-sm text-green-700">{formSuccess}</p> : null}

                  <Button type="submit" className="w-full" disabled={formSubmitting}>
                    {formSubmitting
                      ? authMode === "login"
                        ? "ログイン中..."
                        : "登録中..."
                      : authMode === "login"
                        ? "ログイン"
                        : "新規登録"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </header>

        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
