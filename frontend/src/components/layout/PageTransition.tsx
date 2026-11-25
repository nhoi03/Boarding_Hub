import { useLocation, useOutlet } from "react-router";
import { AnimatePresence, motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

function scrollTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

/** Fade giữa trang chủ, đăng nhập, cổng người thuê và ứng dụng. Trong /app thì giữ nguyên khung. */
export function RootLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const pageKey = location.pathname.startsWith("/app") ? "/app" : location.pathname;
  return (
    <AnimatePresence mode="wait" initial={false} onExitComplete={scrollTop}>
      <motion.div key={pageKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.34, ease }}>
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
