import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Activity, Code2, FolderKanban, MapPin, Trophy } from "lucide-react";
import { apiClient } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";

interface PublicProfileData {
  profile: {
    username: string;
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
  };
  stats: { projectsCreated: number; problemsSolved: number; submissionCount: number };
}

export default function PublicProfile() {
  const { username = "" } = useParams<{ username: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/profile/public", username],
    queryFn: () => apiClient.get<PublicProfileData>(`/api/profile/public/${encodeURIComponent(username)}`),
    enabled: Boolean(username),
    retry: false,
  });

  return (
    <AppLayout title="Community profile">
      {isLoading ? <div className="p-8 text-sm text-[var(--cu-text-muted)]">Loading profile…</div>
        : error || !data ? <section className="m-6 cu-surface rounded-xl p-8 text-center"><h2 className="text-lg font-semibold">Profile unavailable</h2><p className="mt-2 text-sm text-[var(--cu-text-muted)]">This profile does not exist or is private.</p><Link href="/"><Button className="mt-4">Back to CODE UNIVERSE</Button></Link></section>
          : <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
            <section className="cu-surface flex flex-col gap-5 rounded-xl p-6 sm:flex-row sm:items-center">
              {data.profile.avatarUrl ? <img src={data.profile.avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cu-blue)] to-[var(--cu-violet)] text-3xl font-semibold text-white">{data.profile.username[0]?.toUpperCase()}</div>}
              <div><h2 className="text-2xl font-semibold">{data.profile.displayName || data.profile.fullName || data.profile.username}</h2><p className="mt-1 text-sm text-[var(--cu-text-muted)]">@{data.profile.username}</p>{data.profile.location && <p className="mt-2 flex items-center gap-1 text-sm text-[var(--cu-text-muted)]"><MapPin className="h-4 w-4" />{data.profile.location}</p>}<p className="mt-2 text-xs text-[var(--cu-text-muted)]">Member since {new Date(data.profile.createdAt).toLocaleDateString()}</p></div>
            </section>
            {data.profile.bio && <section className="cu-surface rounded-xl p-5"><h3 className="mb-2 font-semibold">About</h3><p className="whitespace-pre-wrap text-sm text-[var(--cu-text-secondary)]">{data.profile.bio}</p></section>}
            <section className="grid gap-3 sm:grid-cols-3">
              {[["Projects", data.stats.projectsCreated, FolderKanban], ["Problems solved", data.stats.problemsSolved, Trophy], ["Submissions", data.stats.submissionCount, Activity]].map(([label, count, Icon]) => {
                const MetricIcon = Icon as typeof FolderKanban;
                return <div key={String(label)} className="cu-surface flex items-center gap-3 rounded-xl p-4"><MetricIcon className="h-5 w-5 text-[var(--cu-blue)]" /><div><div className="text-xl font-semibold">{String(count)}</div><div className="text-xs text-[var(--cu-text-muted)]">{String(label)}</div></div></div>;
              })}
            </section>
            <section className="cu-surface rounded-xl p-5"><h3 className="mb-3 font-semibold">Programming interests</h3><div className="flex flex-wrap gap-2">{data.profile.programmingInterests?.length ? data.profile.programmingInterests.map((interest) => <span key={interest} className="rounded-full border border-[var(--cu-border)] px-3 py-1 text-xs">{interest}</span>) : <span className="text-sm text-[var(--cu-text-muted)]">No interests shared.</span>}</div><p className="mt-4 flex items-center gap-2 text-sm text-[var(--cu-text-muted)]"><Code2 className="h-4 w-4" />Preferred language: {data.profile.preferredLanguage || "Not specified"}</p><div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--cu-blue)]">{data.profile.websiteUrl && <a href={data.profile.websiteUrl} target="_blank" rel="noreferrer">Website</a>}{data.profile.githubUrl && <a href={data.profile.githubUrl} target="_blank" rel="noreferrer">GitHub</a>}{data.profile.linkedInUrl && <a href={data.profile.linkedInUrl} target="_blank" rel="noreferrer">LinkedIn</a>}</div></section>
          </div>}
    </AppLayout>
  );
}
