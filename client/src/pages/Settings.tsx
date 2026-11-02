import { Link, useLocation } from "wouter";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Moon, Palette, Shield, SlidersHorizontal, Sun } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/useToast";
import type { SupportedLanguage } from "../../../shared/types";

interface Preferences {
  theme: "dark" | "light" | "system";
  accentColor: "blue" | "violet" | "green" | "cyan" | "orange";
  editorTheme: "cu-dark" | "vs-dark" | "vs" | "hc-black";
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  defaultLanguage: SupportedLanguage;
  profileVisibility: "public" | "private";
  notifications: {
    codingActivity: boolean;
    submissionResults: boolean;
    productUpdates: boolean;
    security: boolean;
  };
}

const defaults: Preferences = {
  theme: "dark",
  accentColor: "blue",
  editorTheme: "cu-dark",
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  defaultLanguage: "javascript",
  profileVisibility: "public",
  notifications: { codingActivity: true, submissionResults: true, productUpdates: false, security: true },
};

const languages: SupportedLanguage[] = ["python", "c", "cpp", "java", "javascript", "typescript", "r", "html", "css", "sql", "json"];
const colors: Array<Preferences["accentColor"]> = ["blue", "violet", "green", "cyan", "orange"];
const controlClass = "h-10 rounded-md border border-[var(--cu-border)] bg-[var(--cu-bg-elevated)] px-3 text-sm text-[var(--cu-text-primary)]";

export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [fontSizeDraft, setFontSizeDraft] = useState<number | null>(null);
  const fontSizeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data, isLoading: preferencesLoading, error } = useQuery({
    queryKey: ["/api/preferences"],
    queryFn: () => apiClient.get<{ preferences: Preferences | null }>("/api/preferences"),
    enabled: isAuthenticated,
  });
  const { data: healthData } = useQuery({
    queryKey: ["/api/health"],
    queryFn: () => apiClient.get<{ storageMode: string; database: string }>("/api/health"),
    staleTime: 60_000,
  });
  const preferences = { ...defaults, ...data?.preferences, notifications: { ...defaults.notifications, ...data?.preferences?.notifications } };

  const save = useMutation({
    mutationFn: (patch: Partial<Preferences>) => apiClient.patch<{ preferences: Preferences }>("/api/preferences", patch),
    onSuccess: async (result) => {
      queryClient.setQueryData(["/api/preferences"], { preferences: result.preferences });
      toast({ title: "Preference saved", variant: "success" });
    },
    onError: (saveError: Error) => toast({ title: "Could not save setting", description: saveError.message, variant: "error" }),
  });
  const changePassword = useMutation({
    mutationFn: () => apiClient.patch<{ message: string }>("/api/auth/password", { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password changed", variant: "success" });
    },
    onError: (passwordError: Error) => toast({ title: "Could not change password", description: passwordError.message, variant: "error" }),
  });
  const deleteAccount = useMutation({
    mutationFn: () => apiClient.delete<{ message: string }>("/api/auth/account", { password: deletePassword }),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.removeQueries({ queryKey: ["/api/preferences"] });
      toast({ title: "Account deleted", variant: "default" });
      setLocation("/");
    },
    onError: (deleteError: Error) => toast({ title: "Could not delete account", description: deleteError.message, variant: "error" }),
  });
  const exportData = useMutation({
    mutationFn: () => apiClient.get<unknown>("/api/auth/export"),
    onSuccess: (accountData) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(accountData, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "code-universe-account-export.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: "Account data exported", variant: "success" });
    },
    onError: (exportError: Error) => toast({ title: "Could not export data", description: exportError.message, variant: "error" }),
  });

  if (isLoading || preferencesLoading) {
    return <AppLayout title="Settings"><div className="p-8 text-sm text-[var(--cu-text-muted)]">Loading settings…</div></AppLayout>;
  }
  if (!isAuthenticated) {
    return <AppLayout title="Settings"><section className="m-6 cu-surface rounded-xl p-8 text-center"><Shield className="mx-auto mb-3 h-8 w-8 text-[var(--cu-blue)]" /><h2 className="text-lg font-semibold">Sign in to manage settings</h2><Link href="/login"><Button className="mt-4">Sign in</Button></Link></section></AppLayout>;
  }
  if (error || !data) {
    return <AppLayout title="Settings"><div role="alert" className="p-8 text-sm text-[var(--cu-red)]">Unable to load settings. Refresh the page to try again.</div></AppLayout>;
  }

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => save.mutate({ [key]: value } as Pick<Preferences, K>);
  const checkbox = (label: string, key: "wordWrap" | "minimap" | "lineNumbers" | "autoSave") => (
    <label key={key} className="flex items-center justify-between gap-4 py-2 text-sm"><span>{label}</span><input type="checkbox" checked={preferences[key]} disabled={save.isPending} onChange={(event) => set(key, event.target.checked)} className="h-4 w-4 accent-[var(--cu-blue)]" /></label>
  );
  const notificationCheckbox = (label: string, key: keyof Preferences["notifications"]) => (
    <label key={key} className="flex items-center justify-between gap-4 py-2 text-sm"><span>{label}</span><input type="checkbox" checked={preferences.notifications[key]} disabled={save.isPending} onChange={(event) => set("notifications", { ...preferences.notifications, [key]: event.target.checked })} className="h-4 w-4 accent-[var(--cu-blue)]" /></label>
  );

  return (
    <AppLayout title="Settings">
      <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
        <div><h2 className="text-2xl font-semibold">Workspace preferences</h2><p className="mt-1 text-sm text-[var(--cu-text-muted)]">Changes are saved to your account as you make them.</p></div>
        {healthData?.storageMode === "in-memory" && <div role="status" className="rounded-lg border border-[var(--cu-amber)]/40 bg-[var(--cu-amber)]/10 p-4 text-sm text-[var(--cu-text-secondary)]">Development storage is in-memory. Profile and settings changes will be lost when the server restarts and are not shared across devices. Configure <code>DATABASE_URL</code> and apply the schema to enable durable storage.</div>}
        {save.isPending && <div className="flex items-center gap-2 text-xs text-[var(--cu-text-muted)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving preference…</div>}

        <section className="cu-surface rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><Palette className="h-5 w-5 text-[var(--cu-blue)]" /><div><h3 className="font-semibold">Appearance</h3><p className="text-xs text-[var(--cu-text-muted)]">Theme and accent color</p></div></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-xs text-[var(--cu-text-muted)]">Theme mode<select className={`${controlClass} w-full`} value={preferences.theme} onChange={(event) => set("theme", event.target.value as Preferences["theme"])}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System default</option></select></label>
            <div className="space-y-2 text-xs text-[var(--cu-text-muted)]"><span>Accent color</span><div className="flex gap-2">{colors.map((color) => <button key={color} type="button" aria-label={`${color} accent`} aria-pressed={preferences.accentColor === color} onClick={() => set("accentColor", color)} className={`h-9 w-9 rounded-full border-2 ${preferences.accentColor === color ? "border-white ring-2 ring-[var(--cu-blue)]" : "border-transparent"}`} style={{ backgroundColor: `var(--cu-${color === "orange" ? "amber" : color})` }} />)}</div></div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-[var(--cu-border)] bg-[var(--cu-bg-elevated)] p-4 text-sm"><span className="rounded-md bg-[var(--cu-blue)]/15 p-2 text-[var(--cu-blue)]">{preferences.theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</span><span>Live preview <span className="ml-1 text-[var(--cu-text-muted)]">One Universe. Every Language.</span></span></div>
        </section>

        <section className="cu-surface rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><SlidersHorizontal className="h-5 w-5 text-[var(--cu-blue)]" /><div><h3 className="font-semibold">Editor</h3><p className="text-xs text-[var(--cu-text-muted)]">Defaults applied to the code editor</p></div></div>
          <div className="grid gap-x-6 sm:grid-cols-2">
            <label className="space-y-2 py-2 text-xs text-[var(--cu-text-muted)]">Default language<select className={`${controlClass} w-full`} value={preferences.defaultLanguage} onChange={(event) => set("defaultLanguage", event.target.value as SupportedLanguage)}>{languages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
            <label className="space-y-2 py-2 text-xs text-[var(--cu-text-muted)]">Editor theme<select className={`${controlClass} w-full`} value={preferences.editorTheme} onChange={(event) => set("editorTheme", event.target.value as Preferences["editorTheme"])}><option value="cu-dark">CODE UNIVERSE Dark</option><option value="vs-dark">Visual Studio Dark</option><option value="vs">Visual Studio Light</option><option value="hc-black">High Contrast</option></select></label>
            <label className="space-y-2 py-2 text-xs text-[var(--cu-text-muted)]">Font size: {fontSizeDraft ?? preferences.fontSize}px<input className="w-full accent-[var(--cu-blue)]" type="range" min={10} max={32} value={fontSizeDraft ?? preferences.fontSize} onChange={(event) => {
              const nextSize = Number(event.target.value);
              setFontSizeDraft(nextSize);
              if (fontSizeSaveTimer.current) clearTimeout(fontSizeSaveTimer.current);
              fontSizeSaveTimer.current = setTimeout(() => {
                set("fontSize", nextSize);
                setFontSizeDraft(null);
                fontSizeSaveTimer.current = null;
              }, 400);
            }} onBlur={() => {
              if (fontSizeSaveTimer.current) {
                clearTimeout(fontSizeSaveTimer.current);
                set("fontSize", fontSizeDraft ?? preferences.fontSize);
                setFontSizeDraft(null);
                fontSizeSaveTimer.current = null;
              }
            }} /></label>
            <label className="space-y-2 py-2 text-xs text-[var(--cu-text-muted)]">Tab size<select className={`${controlClass} w-full`} value={preferences.tabSize} onChange={(event) => set("tabSize", Number(event.target.value))}>{[2, 4, 8].map((size) => <option key={size} value={size}>{size} spaces</option>)}</select></label>
            <label className="space-y-2 py-2 text-xs text-[var(--cu-text-muted)]">Font family<select className={`${controlClass} w-full`} value={preferences.fontFamily} onChange={(event) => set("fontFamily", event.target.value)}>{["JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas"].map((font) => <option key={font}>{font}</option>)}</select></label>
          </div>
          <div className="mt-3 divide-y divide-[var(--cu-border)]">{checkbox("Word wrap", "wordWrap")}{checkbox("Show minimap", "minimap")}{checkbox("Show line numbers", "lineNumbers")}{checkbox("Auto save", "autoSave")}</div>
        </section>

        <section className="cu-surface rounded-xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3"><Shield className="h-5 w-5 text-[var(--cu-blue)]" /><div><h3 className="font-semibold">Privacy and notifications</h3><p className="text-xs text-[var(--cu-text-muted)]">Only available notification preferences are shown</p></div></div>
          <label className="mb-4 block max-w-sm space-y-2 text-xs text-[var(--cu-text-muted)]">Profile visibility<select className={`${controlClass} w-full`} value={preferences.profileVisibility} onChange={(event) => set("profileVisibility", event.target.value as Preferences["profileVisibility"])}><option value="public">Public</option><option value="private">Private</option></select></label>
          <div className="divide-y divide-[var(--cu-border)]">{notificationCheckbox("Coding activity", "codingActivity")}{notificationCheckbox("Submission results", "submissionResults")}{notificationCheckbox("Product updates", "productUpdates")}{notificationCheckbox("Security notifications", "security")}</div>
          <p className="mt-3 text-xs text-[var(--cu-text-muted)]">Notification delivery channels are not configured, so these preferences are stored but do not send email or push notifications.</p>
        </section>

        <section className="cu-surface rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><Shield className="h-5 w-5 text-[var(--cu-blue)]" /><div><h3 className="font-semibold">Account security</h3><p className="text-xs text-[var(--cu-text-muted)]">Change your password or permanently delete this account</p></div></div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--cu-border)] p-4"><div><h4 className="text-sm font-medium">Export your data</h4><p className="mt-1 text-xs text-[var(--cu-text-muted)]">Download your profile, preferences, projects, files, and submissions as JSON.</p></div><Button variant="secondary" disabled={exportData.isPending} onClick={() => exportData.mutate()}>{exportData.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Export data</Button></div>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); changePassword.mutate(); }}>
            <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">Current password<input className={`${controlClass} w-full`} type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">New password<input className={`${controlClass} w-full`} type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <div className="flex items-end"><Button type="submit" variant="secondary" disabled={changePassword.isPending}>{changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Change password</Button></div>
          </form>
          <div className="mt-6 border-t border-[var(--cu-border)] pt-5">
            <h4 className="text-sm font-medium text-[var(--cu-red)]">Delete account</h4>
            <p className="mt-1 text-xs text-[var(--cu-text-muted)]">This permanently deletes your account and its associated projects, files, submissions, preferences, and sessions. This cannot be undone.</p>
            <form className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => {
              event.preventDefault();
              if (window.confirm("Permanently delete your CODE UNIVERSE account and its data? This cannot be undone.")) deleteAccount.mutate();
            }}>
              <label className="w-full max-w-sm space-y-1.5 text-xs text-[var(--cu-text-muted)]">Confirm with your current password<input className={`${controlClass} w-full`} type="password" autoComplete="current-password" required value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /></label>
              <Button type="submit" variant="destructive" disabled={deleteAccount.isPending}>{deleteAccount.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete account</Button>
            </form>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
