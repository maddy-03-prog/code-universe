import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Code2, LayoutDashboard, Terminal, Play, BookOpen, Globe,
  LogOut, User, Settings, ChevronDown, Sparkles, Moon
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/editor", icon: Code2, label: "Editor" },
  { href: "/playground", icon: Globe, label: "Playground" },
  { href: "/practice", icon: BookOpen, label: "Practice" },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post("/api/auth/logout", {}),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      toast({ title: "Signed out", variant: "default" });
    },
  });

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-[var(--cu-bg-base)]">
        {/* ── Sidebar ── */}
        <aside className="flex flex-col w-14 border-r border-[var(--cu-border)] bg-[var(--cu-bg-surface)] z-30 shrink-0">
          {/* Logo */}
          <div className="flex items-center justify-center h-12 border-b border-[var(--cu-border)] shrink-0">
            <Link href="/">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--cu-blue)] to-[var(--cu-violet)] flex items-center justify-center cursor-pointer">
                <Code2 className="h-4 w-4 text-white" />
              </div>
            </Link>
          </div>

          {/* Nav icons */}
          <nav className="flex flex-col items-center gap-1 p-2 flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <button
                        className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                          isActive
                            ? "bg-[var(--cu-blue)]/20 text-[var(--cu-blue)]"
                            : "text-[var(--cu-text-muted)] hover:bg-[var(--cu-bg-elevated)] hover:text-[var(--cu-text-primary)]"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                      </button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* User / Auth */}
          <div className="flex flex-col items-center gap-1 p-2 border-t border-[var(--cu-border)]">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-9 h-9 rounded-md flex items-center justify-center text-[var(--cu-text-muted)] hover:bg-[var(--cu-bg-elevated)] hover:text-[var(--cu-text-primary)] transition-colors">
                    {user?.avatarUrl
                      ? <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                      : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--cu-blue)] to-[var(--cu-violet)] flex items-center justify-center text-[10px] font-bold text-white">
                        {user?.username?.[0]?.toUpperCase() || "U"}
                      </div>}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-48">
                  <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setLocation("/profile")}>
                    <User className="h-3.5 w-3.5" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setLocation("/settings")}>
                    <Settings className="h-3.5 w-3.5" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[var(--cu-red)]"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/login">
                    <button className="w-9 h-9 rounded-md flex items-center justify-center text-[var(--cu-text-muted)] hover:bg-[var(--cu-bg-elevated)] hover:text-[var(--cu-text-primary)] transition-colors">
                      <User className="h-4 w-4" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Sign in</TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          {title && (
            <header className="h-12 flex items-center justify-between px-4 border-b border-[var(--cu-border)] bg-[var(--cu-bg-surface)] shrink-0">
              <h1 className="text-sm font-semibold text-[var(--cu-text-primary)]">{title}</h1>
            </header>
          )}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
