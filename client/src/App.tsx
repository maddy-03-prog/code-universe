import { Switch, Route } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Practice from "@/pages/Practice";
import ProblemDetail from "@/pages/ProblemDetail";
import Playground from "@/pages/Playground";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";

const Profile = lazy(() => import("@/pages/Profile"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const PublicProfile = lazy(() => import("@/pages/PublicProfile"));

export default function App() {
  const { user, isLoading } = useAuth();
  const { data: preferencesData } = useQuery({
    queryKey: ["/api/preferences"],
    queryFn: () => apiClient.get<{ preferences: { theme?: string; accentColor?: string } | null }>("/api/preferences"),
    enabled: !!user,
    staleTime: 60_000,
  });
  const preferences = preferencesData?.preferences;

  useEffect(() => {
    const root = document.documentElement;
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
    const updateTheme = () => {
      const activeTheme = user ? preferences?.theme : "dark";
      const useLight = activeTheme === "light"
        || (activeTheme === "system" && systemTheme.matches);
      root.dataset.theme = useLight ? "light" : "dark";
    };
    const accentHsl: Record<string, string> = {
      blue: "217, 91%, 60%",
      violet: "250, 70%, 65%",
      green: "143, 71%, 45%",
      cyan: "190, 90%, 50%",
      orange: "25, 92%, 55%",
    };
    const accent = user ? preferences?.accentColor : "blue";
    root.style.setProperty("--cu-blue", `hsl(${accentHsl[accent || "blue"] || accentHsl.blue})`);
    updateTheme();
    systemTheme.addEventListener("change", updateTheme);
    return () => systemTheme.removeEventListener("change", updateTheme);
  }, [user, preferences?.theme, preferences?.accentColor]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--cu-bg-base)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--cu-blue)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--cu-text-muted)] font-mono">Loading CODE UNIVERSE...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--cu-bg-base)] text-sm text-[var(--cu-text-muted)]">Loading page…</div>}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/editor" component={Editor} />
          <Route path="/editor/:projectId" component={Editor} />
          <Route path="/practice" component={Practice} />
          <Route path="/practice/:slug" component={ProblemDetail} />
          <Route path="/playground" component={Playground} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/u/:username" component={PublicProfile} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      <Toaster />
    </>
  );
}
