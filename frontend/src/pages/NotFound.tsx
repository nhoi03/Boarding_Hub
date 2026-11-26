import { Home } from "lucide-react";
import { Aurora } from "@/components/fx";
import { BoardingHouse } from "@/components/fx/BoardingHouse";
import { Button } from "@/components/ui/Button";
import { useAuth, homePathFor } from "@/stores/auth";

export default function NotFound() {
  const user = useAuth((s) => s.user);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f1ea] px-6 dark:bg-ink-950">
      <Aurora />
      <div className="relative text-center">
        <BoardingHouse className="mx-auto mb-2 max-w-xs" />
        <div className="text-gradient text-6xl font-black">404</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Phòng này không tồn tại</h1>
        <p className="mt-2 text-slate-500">Có thể đường dẫn đã cũ hoặc bạn gõ nhầm.</p>
        <Button className="mt-8" variant="glow" size="lg" icon={<Home className="size-5" />} to={user ? homePathFor(user) : "/"}>
          Về trang chính
        </Button>
      </div>
    </div>
  );
}
