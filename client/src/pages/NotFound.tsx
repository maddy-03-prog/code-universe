import { Link } from "wouter";
import AppLayout from "@/components/AppLayout";

export default function NotFound() {
  return (
    <AppLayout title="Page not found">
      <div className="min-h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="font-mono text-sm text-[var(--cu-blue)]">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--cu-text-primary)]">This page is outside the universe.</h1>
        <p className="mt-2 text-sm text-[var(--cu-text-muted)]">The address may be incorrect, or the page may have moved.</p>
        <Link href="/">
          <span className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-[var(--cu-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--cu-blue)]/90">
            Back to dashboard
          </span>
        </Link>
      </div>
    </AppLayout>
  );
}
