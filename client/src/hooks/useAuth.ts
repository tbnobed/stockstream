import { useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
}

export function useAuth() {
  const token = localStorage.getItem("auth_token");
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!token,
    retry: false,
  });

  const login = async (associateCode: string): Promise<{ user: User; token: string }> => {
    const response = await apiRequest("POST", "/api/auth/login", { associateCode });
    const data = await response.json();
    
    localStorage.setItem("auth_token", data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

  return {
    user,
    isLoading: isLoading && !!token,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    error,
  };
}