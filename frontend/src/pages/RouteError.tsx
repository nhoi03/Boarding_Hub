import { isRouteErrorResponse, useRouteError } from "react-router";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/api/types";

export function RouteError() {
  const err = useRouteError();
  const msg = err instanceof ApiError ? err.message : isRouteErrorResponse(err) ? err.statusText : err instanceof Error ? err.message : "Lỗi không xác định";
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
        <AlertTriangle className="size-7" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Đã có lỗi khi hiển thị trang</h1>
        <p className="mt-1 max-w-md text-sm text-slate-500">{msg}</p>
      </div>
      <Button icon={<RotateCcw className="size-4" />} onClick={() => location.reload()}>
        Tải lại trang
      </Button>
    </div>
  );
}
