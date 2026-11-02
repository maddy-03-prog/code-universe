import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Camera, Code2, ExternalLink, FolderKanban, Loader2, MapPin, Trash2, Trophy, UserRound } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import type { SupportedLanguage } from "../../../shared/types";

interface ProfileRecord {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedInUrl: string | null;
  preferredLanguage: string | null;
  programmingInterests: string[];
  createdAt: string;
}

interface ProfileResponse {
  profile: ProfileRecord;
  stats: { projectsCreated: number; problemsSolved: number; submissionCount: number };
  recentSubmissions: Array<{ id: number; problemId: number | null; language: string; status: string; testsPassed: number | null; testsTotal: number | null; createdAt: string }>;
  preferences: { profileVisibility?: string | null } | null;
}

const languages: SupportedLanguage[] = ["python", "javascript", "typescript", "java", "c", "cpp", "r", "html", "css", "sql", "json"];
const inputClass = "h-10 border-[var(--cu-border)] bg-[var(--cu-bg-elevated)] text-[var(--cu-text-primary)]";

export default function Profile() {
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<ProfileRecord>>({});
  const [interestsText, setInterestsText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const { data, isLoading: profileLoading, error } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: () => apiClient.get<ProfileResponse>("/api/profile"),
    enabled: isAuthenticated,
  });
  const { data: healthData } = useQuery({
    queryKey: ["/api/health"],
    queryFn: () => apiClient.get<{ storageMode: string; database: string }>("/api/health"),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data?.profile) return;
    setForm(data.profile);
    setInterestsText((data.profile.programmingInterests || []).join(", "));
  }, [data?.profile]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const saveProfile = useMutation({
    mutationFn: () => apiClient.patch<{ profile: ProfileRecord }>("/api/profile", {
      fullName: form.fullName || null,
      displayName: form.displayName || null,
      username: form.username,
      bio: form.bio || null,
      location: form.location || null,
      websiteUrl: form.websiteUrl || null,
      githubUrl: form.githubUrl || null,
      linkedInUrl: form.linkedInUrl || null,
      preferredLanguage: form.preferredLanguage || "javascript",
      programmingInterests: interestsText.split(",").map((interest) => interest.trim()).filter(Boolean),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile saved", variant: "success" });
    },
    onError: (saveError: Error) => toast({ title: "Could not save profile", description: saveError.message, variant: "error" }),
  });

  const uploadPhoto = useMutation({
    mutationFn: async () => {
      if (!photo) return null;
      const response = await fetch("/api/profile/avatar", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": photo.type },
        body: photo,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Photo upload failed.");
      return result as { avatarUrl: string };
    },
    onSuccess: async (result) => {
      if (result) {
        setPhoto(null);
        await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Profile photo updated", variant: "success" });
      }
    },
    onError: (uploadError: Error) => toast({ title: "Could not upload photo", description: uploadError.message, variant: "error" }),
  });

  const removePhoto = useMutation({
    mutationFn: () => apiClient.delete<{ avatarUrl: null }>("/api/profile/avatar"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile photo removed", variant: "success" });
    },
    onError: (removeError: Error) => toast({ title: "Could not remove photo", description: removeError.message, variant: "error" }),
  });

  const setField = (field: keyof ProfileRecord, value: string) => setForm((current) => ({ ...current, [field]: value }));

  if (isLoading || profileLoading) {
    return <AppLayout title="Profile"><div className="p-8 text-sm text-[var(--cu-text-muted)]">Loading profile…</div></AppLayout>;
  }
  if (!isAuthenticated) {
    return <AppLayout title="Profile"><section className="m-6 cu-surface rounded-xl p-8 text-center"><UserRound className="mx-auto mb-3 h-8 w-8 text-[var(--cu-blue)]" /><h2 className="text-lg font-semibold">Sign in to view your profile</h2><Link href="/login"><Button className="mt-4">Sign in</Button></Link></section></AppLayout>;
  }
  if (error || !data) {
    return <AppLayout title="Profile"><div role="alert" className="p-8 text-sm text-[var(--cu-red)]">Unable to load your profile. Refresh the page to try again.</div></AppLayout>;
  }

  const profile = data.profile;
  const avatar = photoPreview || profile.avatarUrl;

  return (
    <AppLayout title="Profile">
      <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
        {healthData?.storageMode === "in-memory" && <div role="status" className="rounded-lg border border-[var(--cu-amber)]/40 bg-[var(--cu-amber)]/10 p-4 text-sm text-[var(--cu-text-secondary)]">Development storage is in-memory. Profile changes will be lost when the server restarts and are not shared across devices. Configure <code>DATABASE_URL</code> for durable storage.</div>}
        <section className="cu-surface flex flex-col gap-5 rounded-xl p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="relative h-24 w-24 shrink-0">
            {avatar ? <img src={avatar} alt={`${profile.username}'s profile`} className="h-24 w-24 rounded-full border border-[var(--cu-border)] object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cu-blue)] to-[var(--cu-violet)] text-3xl font-semibold text-white">{profile.username[0]?.toUpperCase()}</div>}
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Choose a profile photo" className="absolute bottom-0 right-0 rounded-full border border-[var(--cu-border)] bg-[var(--cu-bg-elevated)] p-2 text-[var(--cu-text-primary)]"><Camera className="h-4 w-4" /></button>
            <input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
              const selected = event.target.files?.[0];
              if (!selected) return;
              if (selected.size > 3 * 1024 * 1024) {
                toast({ title: "Photo is too large", description: "Choose an image smaller than 3 MB.", variant: "error" });
                event.target.value = "";
                return;
              }
              setPhoto(selected);
            }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-semibold text-[var(--cu-text-primary)]">{profile.displayName || profile.fullName || profile.username}</h2>
            <p className="mt-1 text-sm text-[var(--cu-text-muted)]">@{profile.username} · {profile.email}</p>
            <p className="mt-2 text-xs text-[var(--cu-text-muted)]">Active account · Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.preferences?.profileVisibility !== "private" && <Link href={`/u/${encodeURIComponent(profile.username)}`}><Button variant="secondary">View public profile</Button></Link>}
            {photo && <Button disabled={uploadPhoto.isPending} onClick={() => uploadPhoto.mutate()}>{uploadPhoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Save photo</Button>}
            {profile.avatarUrl && !photo && <Button variant="secondary" disabled={removePhoto.isPending} onClick={() => removePhoto.mutate()}><Trash2 className="h-4 w-4" /> Remove photo</Button>}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Projects created", value: data.stats.projectsCreated, icon: FolderKanban },
            { label: "Problems solved", value: data.stats.problemsSolved, icon: Trophy },
            { label: "Submissions", value: data.stats.submissionCount, icon: Activity },
          ].map(({ label, value, icon: Icon }) => <div key={label} className="cu-surface flex items-center gap-4 rounded-xl p-4"><Icon className="h-5 w-5 text-[var(--cu-blue)]" /><div><div className="text-xl font-semibold">{value}</div><div className="text-xs text-[var(--cu-text-muted)]">{label}</div></div></div>)}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
          <section className="cu-surface rounded-xl p-5 sm:p-6">
            <h3 className="mb-5 text-base font-semibold">Personal information</h3>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); saveProfile.mutate(); }}>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">Full name<Input className={inputClass} value={form.fullName || ""} onChange={(event) => setField("fullName", event.target.value)} maxLength={100} /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">Display name<Input className={inputClass} value={form.displayName || ""} onChange={(event) => setField("displayName", event.target.value)} maxLength={64} /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">Username<Input className={inputClass} value={form.username || ""} onChange={(event) => setField("username", event.target.value)} minLength={3} maxLength={32} required /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">Email<Input className={inputClass} value={profile.email} disabled title="Changing email requires verification, which is not configured." /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">Location<Input className={inputClass} value={form.location || ""} onChange={(event) => setField("location", event.target.value)} maxLength={100} /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">Preferred language<select className={`${inputClass} w-full rounded-md px-3 text-sm`} value={form.preferredLanguage || "javascript"} onChange={(event) => setField("preferredLanguage", event.target.value)}>{languages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)] sm:col-span-2">Bio<Textarea className="min-h-24 border-[var(--cu-border)] bg-[var(--cu-bg-elevated)] text-[var(--cu-text-primary)]" value={form.bio || ""} onChange={(event) => setField("bio", event.target.value)} maxLength={500} placeholder="A little about you…" /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">Website<Input className={inputClass} type="url" value={form.websiteUrl || ""} onChange={(event) => setField("websiteUrl", event.target.value)} /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">GitHub profile URL<Input className={inputClass} type="url" value={form.githubUrl || ""} onChange={(event) => setField("githubUrl", event.target.value)} /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)]">LinkedIn profile URL<Input className={inputClass} type="url" value={form.linkedInUrl || ""} onChange={(event) => setField("linkedInUrl", event.target.value)} /></label>
              <label className="space-y-1.5 text-xs text-[var(--cu-text-muted)] sm:col-span-2">Programming interests (comma separated)<Input className={inputClass} value={interestsText} onChange={(event) => setInterestsText(event.target.value)} placeholder="Web development, algorithms, AI" /></label>
              <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saveProfile.isPending}>{saveProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</Button><Button type="button" variant="secondary" onClick={() => { setForm(profile); setInterestsText((profile.programmingInterests || []).join(", ")); setPhoto(null); }}>Cancel</Button></div>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="cu-surface rounded-xl p-5">
              <h3 className="mb-4 text-base font-semibold">Programming interests</h3>
              {profile.programmingInterests?.length ? <div className="flex flex-wrap gap-2">{profile.programmingInterests.map((interest) => <span key={interest} className="rounded-full border border-[var(--cu-border)] px-3 py-1 text-xs">{interest}</span>)}</div> : <p className="text-sm text-[var(--cu-text-muted)]">Add interests to personalize your profile.</p>}
              {profile.location && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--cu-text-muted)]"><MapPin className="h-4 w-4" />{profile.location}</p>}
              <p className="mt-3 flex items-center gap-2 text-sm text-[var(--cu-text-muted)]"><Code2 className="h-4 w-4" />{profile.preferredLanguage || "javascript"}</p>
              <div className="mt-4 flex gap-3 text-xs">{profile.websiteUrl && <a className="inline-flex items-center gap-1 text-[var(--cu-blue)]" href={profile.websiteUrl} target="_blank" rel="noreferrer">Website <ExternalLink className="h-3 w-3" /></a>}{profile.githubUrl && <a className="inline-flex items-center gap-1 text-[var(--cu-blue)]" href={profile.githubUrl} target="_blank" rel="noreferrer">GitHub <ExternalLink className="h-3 w-3" /></a>}{profile.linkedInUrl && <a className="inline-flex items-center gap-1 text-[var(--cu-blue)]" href={profile.linkedInUrl} target="_blank" rel="noreferrer">LinkedIn <ExternalLink className="h-3 w-3" /></a>}</div>
            </section>
            <section className="cu-surface rounded-xl p-5">
              <h3 className="mb-4 text-base font-semibold">Recent submissions</h3>
              {data.recentSubmissions.length ? <ul className="space-y-3">{data.recentSubmissions.map((submission) => <li key={submission.id} className="flex items-center justify-between gap-3 border-b border-[var(--cu-border)] pb-3 last:border-0 last:pb-0"><span className="text-sm">Problem #{submission.problemId ?? "—"}<span className="ml-2 text-xs text-[var(--cu-text-muted)]">{submission.language}</span></span><span className={`text-xs ${submission.status === "accepted" ? "text-[var(--cu-green)]" : "text-[var(--cu-text-muted)]"}`}>{submission.status.replaceAll("_", " ")}</span></li>)}</ul> : <p className="text-sm text-[var(--cu-text-muted)]">No submissions yet. Try a practice problem to get started.</p>}
            </section>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
