import { MutationCache, QueryCache, QueryClient, useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/api/types";
import { useAuth } from "@/stores/auth";

function handleAuthError(err: unknown) {
  if (err instanceof ApiError && err.status === 401) {
    useAuth.getState().clear();
    if (!location.pathname.startsWith("/login")) location.assign("/login?expired=1");
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Có lỗi xảy ra, vui lòng thử lại.";
}

/**
 * Mutation dùng chung: báo lỗi bằng toast và làm mới toàn bộ dữ liệu sau khi ghi,
 * vì một thao tác tiền (ví dụ thu tiền) ảnh hưởng nhiều màn hình cùng lúc.
 */
export function useApiMutation<TData, TVars>(
  fn: (vars: TVars) => Promise<TData>,
  opts: Omit<UseMutationOptions<TData, unknown, TVars>, "mutationFn"> & { success?: string | ((d: TData) => string | undefined); silentError?: boolean } = {},
) {
  const { success, silentError, onSuccess, onError, ...rest } = opts;
  return useMutation<TData, unknown, TVars>({
    mutationFn: fn,
    ...rest,
    onSuccess: async (data, vars, ctx, mctx) => {
      await queryClient.invalidateQueries();
      const msg = typeof success === "function" ? success(data) : success;
      if (msg) toast.success(msg);
      onSuccess?.(data, vars, ctx, mctx);
    },
    onError: (err, vars, ctx, mctx) => {
      if (!silentError) toast.error(errorMessage(err));
      onError?.(err, vars, ctx, mctx);
    },
  });
}

export function fieldError(err: unknown, field: string): string | undefined {
  return err instanceof ApiError && err.field === field ? err.message : undefined;
}
