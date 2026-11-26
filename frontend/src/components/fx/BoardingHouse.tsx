import type { CSSProperties } from "react";
import { cn } from "@/lib/format";

function Window({ className, delay, shutter }: { className?: string; delay?: string; shutter?: boolean }) {
  return (
    <div className={cn("absolute", className)}>
      {shutter && <span className="absolute top-0 -left-1.5 h-full w-1 rounded-[1px] bg-[#fbfaf8] shadow-[0_0_0_1px_rgba(180,160,140,0.35)]" />}
      <div
        className="house-glass relative h-full w-full overflow-hidden rounded-[2px] border-2 border-[#c6a36f]"
        style={delay ? { animationDelay: delay } : undefined}
      >
        <span className="absolute inset-x-0 top-0 h-1/3 bg-white/35" />
        <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-[#c6a36f]" />
        <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-[#c6a36f]" />
      </div>
      {shutter && <span className="absolute top-0 -right-1.5 h-full w-1 rounded-[1px] bg-[#f7f3ee] shadow-[0_0_0_1px_rgba(180,160,140,0.35)]" />}
    </div>
  );
}

const wall = "absolute bg-[#f7f4ef]";

/**
 * Nhà hai tầng mái dốc, hiên cột và ống khói — xoay chậm, đèn trong phòng lần lượt sáng.
 * Kích thước khối: rộng 210, sâu 110 (nửa 55), cao tường 132. Mái và mặt tường khớp mép.
 */
export function BoardingHouse({ className }: { className?: string }) {
  const right: CSSProperties = { left: 65, top: 48, width: 110, height: 132, transform: "rotateY(90deg) translateZ(105px)" };
  return (
    <div className={cn("house-scene relative mx-auto aspect-[5/4] w-full", className)} role="img" aria-label="Ngôi nhà trọ hai tầng mái ngói">
      <div className="absolute inset-0 grid place-items-center [perspective:1400px]">
        <div className="house-rig relative h-[210px] w-[240px]">
          <div className="absolute top-[168px] -left-6 h-8 w-[270px] rounded-[50%] bg-stone-900/15 blur-[1px]" style={{ transform: "rotateX(75deg)" }} />

          {/* bệ móng */}
          <div className="absolute top-[158px] left-1 h-[118px] w-[236px] bg-[#c5ccd1]" style={{ transform: "rotateX(90deg)" }} />

          {/* hai mái dốc gặp nhau ở sống mái, mép dưới chạm đỉnh tường */}
          <div className="house-shingle-dark absolute top-3 left-[5px] h-[78px] w-[230px] origin-top" style={{ transform: "rotateX(-62deg)" }} />
          <div className="house-shingle absolute top-3 left-[5px] h-20 w-[230px] origin-top border-b-[6px] border-white" style={{ transform: "rotateX(60deg)" }} />

          {/* hồi mái, đỉnh trùng sống mái */}
          <div className="absolute bg-[#f7f4ef]" style={{ left: 65, top: 12, width: 110, height: 36, transform: "rotateY(90deg) translateZ(105px)", clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }} />
          <div className="absolute bg-[#e7e0d6]" style={{ left: 65, top: 12, width: 110, height: 36, transform: "rotateY(-90deg) translateZ(105px)", clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }} />

          {/* ống khói, đáy nằm trên sống mái */}
          <div className="absolute -top-1 left-[138px] h-11 w-[18px]" style={{ transformStyle: "preserve-3d" }}>
            <div className="absolute inset-0 bg-[#f3efe8]" style={{ transform: "translateZ(9px)" }} />
            <div className="absolute top-0 left-0 h-full w-4 bg-[#e4ddd2]" style={{ transform: "rotateY(90deg) translateZ(9px)" }} />
            <div className="absolute -top-1.5 -left-1 h-2.5 w-[26px] bg-[#a3563e]" style={{ transform: "translateZ(9px)" }} />
            <div className="absolute -top-1.5 left-0 h-2.5 w-4 bg-[#8d4634]" style={{ transform: "rotateY(90deg) translateZ(13px)" }} />
            <span className="house-smoke absolute -top-2 left-1 size-2 rounded-full bg-stone-400/70" />
            <span className="house-smoke absolute -top-1 left-3 size-1.5 rounded-full bg-stone-400/60" style={{ animationDelay: "1.3s" }} />
            <span className="house-smoke absolute -top-3 left-2 size-2.5 rounded-full bg-stone-300/70" style={{ animationDelay: "2.4s" }} />
          </div>

          {/* mặt trước + hiên */}
          <div className={cn(wall, "shadow-[inset_0_-10px_0_#e7e1d8]")} style={{ left: 15, top: 48, width: 210, height: 132, transform: "translateZ(55px)", transformStyle: "preserve-3d" }}>
            <div className="absolute inset-x-0 top-[46%] h-px bg-[#e6dcd0]" />
            <div className="absolute inset-x-0 bottom-0 h-2.5 bg-[#d5dbe0]" />

            <Window className="top-3.5 left-7 h-9 w-8" delay="0.2s" />
            <Window className="top-3.5 left-[58px] h-9 w-8" delay="1.4s" shutter />
            <Window className="top-3.5 right-[72px] h-9 w-[34px]" delay="0.8s" />
            <Window className="top-3.5 right-6 h-9 w-8" delay="2.1s" shutter />

            <Window className="top-[62%] left-[58px] h-10 w-8" delay="1.1s" />
            <Window className="top-[62%] right-[72px] h-10 w-[34px]" delay="2.6s" />
            <Window className="top-[62%] right-6 h-10 w-8" delay="0.4s" shutter />

            <div className="absolute bottom-2.5 left-6 h-[52px] w-8 rounded-t-[3px] border-2 border-[#7c4e30] bg-[#a56b42]">
              <div className="house-glass mx-auto mt-1 h-3 w-5 border border-[#c6a36f]" style={{ animationDelay: "1.7s" }} />
              <span className="absolute top-7 right-1 size-1.5 rounded-full bg-[#f6e7c4]" />
            </div>

            {/* mái hiên */}
            <div className="house-shingle absolute top-[40%] -left-1 h-11 w-[172px] origin-top" style={{ transform: "rotateX(54deg) translateZ(2px)" }} />
            <div className="absolute top-[40%] -left-1 h-2 w-[172px] bg-white" style={{ transform: "translateZ(14px)" }} />

            {/* cột và lan can */}
            {[8, 78, 150].map((x) => (
              <div key={x} className="absolute bottom-3 w-2 bg-gradient-to-b from-white to-[#f3ece3]" style={{ left: x, height: 58, transform: "translateZ(46px)" }} />
            ))}
            <div className="absolute bottom-[34px] left-2 h-7 w-[158px] border-y border-white/90 bg-white/50" style={{ transform: "translateZ(46px)" }}>
              <div className="flex h-full items-end justify-between px-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="h-4 w-px bg-white" />
                ))}
              </div>
            </div>
            <div className="absolute bottom-2 left-1 h-14 w-[164px] origin-bottom bg-gradient-to-b from-[#efd3ad] to-[#d7b48a]" style={{ transform: "rotateX(74deg)" }} />

            {/* bậc thang */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute left-0 h-2 w-14 bg-[#e4c39a] shadow-[0_2px_0_#c9a57a]"
                style={{ bottom: -4 - i * 8, transform: `translateZ(${16 + i * 13}px)` }}
              />
            ))}
          </div>

          {/* tường hông phải */}
          <div className="absolute bg-[#efe8df]" style={right}>
            <div className="absolute inset-x-0 bottom-0 h-2.5 bg-[#cfd4d8]" />
            <div className="absolute inset-x-3 top-[46%] h-px bg-[#e0d5c8]" />
            <Window className="top-4 left-3 h-8 w-7" delay="0.5s" shutter />
            <Window className="top-4 right-3 h-8 w-7" delay="1.9s" />
            <Window className="top-[60%] left-3 h-9 w-7" delay="2.8s" />
            <Window className="top-[60%] right-3 h-9 w-7" delay="1s" shutter />
          </div>

          <div className={cn(wall, "bg-[#e6dfd4]")} style={{ left: 15, top: 48, width: 210, height: 132, transform: "translateZ(-55px) rotateY(180deg)" }} />
          <div className="absolute bg-[#e8e1d6]" style={{ left: 65, top: 48, width: 110, height: 132, transform: "rotateY(-90deg) translateZ(105px)" }} />

          {/* bụi cây */}
          <div className="absolute bottom-5 -left-1" style={{ transform: "translateZ(78px)" }}>
            <div className="house-leaf h-5 w-7 rounded-[50%] bg-[#6f8f5e]" />
            <div className="house-leaf -mt-3 ml-2 h-4 w-5 rounded-[50%] bg-[#87a56e]" style={{ animationDelay: "0.6s" }} />
          </div>
          <div className="absolute right-2 bottom-6" style={{ transform: "translateZ(70px)" }}>
            <div className="house-leaf h-4 w-6 rounded-[50%] bg-[#6f8f5e]" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
