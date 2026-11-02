import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Code2, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => apiClient.post<{ user: AuthUser }>("/api/auth/login", { username, password }),
    onSuccess: (response) => {
      queryClient.setQueryData(["/api/auth/me"], response.user);
      void queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      setLocation("/");
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    loginMutation.mutate();
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--cu-bg-base)] px-4 py-10">
      <section className="w-full max-w-md cu-surface rounded-xl p-7 sm:p-9">
        <Link href="/">
          <div className="flex items-center gap-3 mb-8 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--cu-blue)] to-[var(--cu-violet)] flex items-center justify-center">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--cu-text-primary)]">CODE UNIVERSE</p>
              <p className="text-xs text-[var(--cu-text-muted)]">One Universe. Every Language.</p>
            </div>
          </div>
        </Link>

        <h1 className="text-xl font-semibold text-[var(--cu-text-primary)]">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--cu-text-muted)]">Sign in to continue to your workspace.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs text-[var(--cu-text-secondary)]">Username</label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs text-[var(--cu-text-secondary)]">Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-[var(--cu-red)]">{errorMessage}</p>
          )}

          <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--cu-text-muted)]">
          New to CODE UNIVERSE?{" "}
          <Link href="/register">
            <span className="text-[var(--cu-blue)] hover:underline">Create an account</span>
          </Link>
        </p>
      </section>
    </main>
  );
}
