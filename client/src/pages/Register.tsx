import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Code2, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/hooks/useAuth";

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const registerMutation = useMutation({
    mutationFn: () => apiClient.post<{ user: AuthUser }>("/api/auth/register", { username, email, password }),
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
    if (username.trim().length < 3 || username.trim().length > 32) {
      setErrorMessage("Username must be between 3 and 32 characters.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    registerMutation.mutate();
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

        <h1 className="text-xl font-semibold text-[var(--cu-text-primary)]">Create your account</h1>
        <p className="mt-1 text-sm text-[var(--cu-text-muted)]">Set up an account to save your projects.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs text-[var(--cu-text-secondary)]">Username</label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              minLength={3}
              maxLength={32}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs text-[var(--cu-text-secondary)]">Email</label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs text-[var(--cu-text-secondary)]">Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-xs text-[var(--cu-text-secondary)]">Confirm password</label>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-[var(--cu-red)]">{errorMessage}</p>
          )}

          <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--cu-text-muted)]">
          Already registered?{" "}
          <Link href="/login">
            <span className="text-[var(--cu-blue)] hover:underline">Sign in</span>
          </Link>
        </p>
      </section>
    </main>
  );
}
