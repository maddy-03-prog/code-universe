import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => apiClient.get<{ user: AuthUser | null }>("/api/auth/me").then((response) => response.user).catch(() => null),
    staleTime: 60_000,
    retry: false,
  });

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data,
  };
}
