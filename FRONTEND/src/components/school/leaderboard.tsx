"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Clock, Crown, Flame, Gem, Hourglass, Medal, Sparkles, Star, Target, Timer, Trophy, Users } from "lucide-react";
import type { GameBoard, LeaderRow, TestBoard } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { Avatar } from "@/components/brand/avatar";
import { CountUp } from "@/components/motion/reveal";
import { cn, EASE } from "@/lib/utils";

/* Metals for the podium: gold, silver, bronze — gradients, ring and ribbon. */
const METAL = {
  1: { block: "from-[#fde68a] via-[#f5c542] to-[#c99317]", ring: "ring-[#f0c35a]", ribbon: "#d9a21b", text: "text-[#7a5306]", h: "h-28", label: "1st" },
  2: { block: "from-[#f1f4f9] via-[#cfd6e1] to-[#9aa5b5]", ring: "ring-[#c0c7d4]", ribbon: "#8f9bad", text: "text-[#46505e]", h: "h-20", label: "2nd" },
  3: { block: "from-[#f6d2b0] via-[#d79a62] to-[#a8642f]", ring: "ring-[#d29a69]", ribbon: "#b06d36", text: "text-[#5e3214]", h: "h-14", label: "3rd" },
} as const;

function MedalBadge({ place }: { place: 1 | 2 | 3 }) {
  const m = METAL[place];
  return (
    <svg viewBox="0 0 40 48" className="h-8 w-7 drop-shadow" aria-hidden>
      <path d="M8 0 L20 18 L32 0 L26 0 L20 9 L14 0 Z" fill={m.ribbon} />
      <circle cx="20" cy="30" r="13" fill={m.ribbon} />
      <circle cx="20" cy="30" r="10" fill="#fff" fillOpacity="0.35" />
      <text x="20" y="35" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{place}</text>
    </svg>
  );
}

function Burst() {
  const [bits] = useState(() => Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * Math.PI * 2, d: 50 + Math.random() * 40, c: ["#f0c35a", "#3b66ae", "#5f9474", "#e5917f"][i % 4] })));
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/3">
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute h-2 w-1.5 rounded-sm" style={{ background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: Math.cos(b.a) * b.d, y: Math.sin(b.a) * b.d, opacity: 0, rotate: 360 }}
          transition={{ duration: 1.2, delay: 0.9, ease: "easeOut" }} />
      ))}
    </div>
  );
}

/** Shared podium: the top three on gold, silver and bronze. */
function Podium({ rows, value, sub }: { rows: LeaderRow[]; value: (r: LeaderRow) => React.ReactNode; sub?: (r: LeaderRow) => React.ReactNode }) {
  const { lang } = useI18n();
  const order: Array<1 | 2 | 3> = [2, 1, 3];
  const meTop = rows.slice(0, 3).some((r) => r.me);
  return (
    <div className="relative">
      {meTop && <Burst />}
      <div className="grid grid-cols-3 items-end gap-2 pt-8 sm:gap-3">
        {order.map((place, i) => {
          const r = rows[place - 1];
          const m = METAL[place];
          return (
            <motion.div key={place} className="flex min-w-0 flex-col items-center"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: [0.25, 0.5, 0.05][i], duration: 0.6, ease: EASE }}>
              {r ? (
                <>
                  <motion.div className="relative" animate={place === 1 ? { y: [0, -5, 0] } : undefined} transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}>
                    {place === 1 && <Crown className="absolute -top-6 left-1/2 h-6 w-6 -translate-x-1/2 fill-[#f5c542] text-[#c99317] drop-shadow" />}
                    <span className={cn("block rounded-full ring-4 ring-offset-2 ring-offset-surface", m.ring, r.me && "outline outline-2 outline-offset-4 outline-sky-500")}>
                      <Avatar user={r} size={place === 1 ? 64 : 50} />
                    </span>
                    <span className="absolute -bottom-3 -right-2"><MedalBadge place={place} /></span>
                  </motion.div>
                  <p className={cn("mt-3 w-full truncate text-center text-sm font-semibold", r.me ? "text-sky-700" : "text-ink")}>{r.full_name}{r.me && (lang === "hi" ? " (आप)" : " (you)")}</p>
                  <p className="font-display text-xl leading-tight text-ink">{value(r)}</p>
                  {sub && <p className="text-[0.68rem] text-ink-3">{sub(r)}</p>}
                </>
              ) : <div className="h-24" />}
              <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.35 + i * 0.1, duration: 0.6, ease: EASE }} style={{ originY: 1 }}
                className={cn("relative mt-2 grid w-full place-items-center overflow-hidden rounded-t-2xl bg-gradient-to-b shadow-inner", m.block, m.h)}>
                <span className={cn("font-display text-2xl font-bold", m.text)}>{m.label}</span>
                {/* a slow shine sweeps across the metal */}
                <motion.span className="absolute inset-y-0 w-1/3 -skew-x-12 bg-white/40" initial={{ x: "-150%" }} animate={{ x: "350%" }}
                  transition={{ repeat: Infinity, duration: 2.8, delay: 1 + i * 0.3, repeatDelay: 2.5, ease: "easeInOut" }} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ r, i, right, bar, children }: { r: LeaderRow; i: number; right: React.ReactNode; bar?: number; children?: React.ReactNode }) {
  const { n, lang } = useI18n();
  return (
    <motion.li initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + Math.min(i, 12) * 0.04, ease: EASE }}
      className={cn("relative overflow-hidden rounded-2xl border px-3 py-2", r.me ? "border-sky-300 bg-sky-50" : "border-line bg-surface")}>
      {bar != null && <motion.span className="absolute inset-y-0 left-0 bg-sky-100/60" initial={{ width: 0 }} animate={{ width: `${bar}%` }} transition={{ duration: 0.8, delay: 0.6, ease: EASE }} />}
      <span className="relative flex items-center gap-3">
        <span className="w-7 text-center text-sm font-bold text-ink-3">{n(r.rank)}</span>
        <Avatar user={r} size={30} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{r.full_name}{r.me && <span className="ml-1.5 text-xs text-sky-700">({lang === "hi" ? "आप" : "you"})</span>}</span>
          {children}
        </span>
        <span className="shrink-0 text-right font-semibold tabular-nums text-ink">{right}</span>
      </span>
    </motion.li>
  );
}

const TIER: Record<string, { icon: React.ReactNode; tone: string }> = {
  Diamond: { icon: <Gem className="h-3 w-3" />, tone: "bg-[#e0f2fe] text-[#0369a1]" },
  Gold: { icon: <Trophy className="h-3 w-3" />, tone: "bg-[#fef3c7] text-[#92600a]" },
  Silver: { icon: <Medal className="h-3 w-3" />, tone: "bg-[#eef1f6] text-[#46505e]" },
  Bronze: { icon: <Medal className="h-3 w-3" />, tone: "bg-[#fbe7d6] text-[#7a4119]" },
};

export function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return null;
  const t = TIER[tier] ?? TIER.Bronze;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide", t.tone)}>{t.icon}{tier}</span>;
}

/** Games: a league — points, stars, tiers, and a nudge to climb one place. */
export function GameLeaderboard({ data }: { data: GameBoard }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const rows = data.rows;
  const top = Math.max(1, rows[0]?.points ?? 1);
  if (!rows.some((r) => (r.points ?? 0) > 0)) return <Empty text={hi ? "अभी कोई अंक नहीं — पहला गेम खेलिए और लीग में सबसे ऊपर पहुँचिए! 🎮" : "No points yet — play a game and top the league! 🎮"} />;
  const podium = rows.length >= 3;
  return (
    <div>
      {podium && <Podium rows={rows} value={(r) => <>{n(r.points ?? 0)} <span className="text-xs text-ink-3">pts</span></>}
        sub={(r) => <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-marigold-400 text-marigold-400" />{n(r.stars ?? 0)} · <TierBadge tier={r.tier} /></span>} />}
      {data.gap && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-marigold-50 px-3 py-2 text-sm text-ink">
          <Flame className="h-4 w-4 shrink-0 text-marigold-600" />
          {hi ? <><b>{n(data.gap.points)}</b> अंक और, और आप <b>{data.gap.name}</b> से आगे!</> : <><b>{n(data.gap.points)}</b> more points to pass <b>{data.gap.name}</b>!</>}
        </p>
      )}
      <ol className="mt-3 space-y-1.5">
        {(podium ? rows.slice(3) : rows).map((r, i) => (
          <Row key={r.id} r={r} i={i} bar={(100 * (r.points ?? 0)) / top} right={<>{n(r.points ?? 0)}</>}>
            <span className="flex items-center gap-1.5 text-[0.68rem] text-ink-3"><TierBadge tier={r.tier} /><Star className="h-3 w-3" />{n(r.stars ?? 0)} · {n(r.games ?? 0)} {hi ? "गेम" : "games"}{r.accuracy != null ? ` · ${n(r.accuracy)}%` : ""}</span>
          </Row>
        ))}
      </ol>
    </div>
  );
}

const fmtTime = (sec?: number) => (sec == null ? "–" : sec >= 60 ? `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s` : `${sec}s`);

function useCountdown(iso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!iso) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [iso]);
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, "0")}s`;
}

/** One test: score first, then whoever finished faster. Provisional until it closes. */
export function TestLeaderboard({ data }: { data: TestBoard }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const left = useCountdown(data.final ? null : data.due_at);
  const rows = data.rows;
  return (
    <div>
      <div className={cn("flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 text-sm", data.final ? "bg-sage-100 text-ink" : "bg-sky-50 text-ink")}>
        {data.final ? <Trophy className="h-4 w-4 text-sage" /> : <Hourglass className="h-4 w-4 text-sky-700" />}
        <span className="font-medium">{data.final ? (hi ? "अंतिम परिणाम" : "Final results") : (hi ? "अस्थायी रैंक — सबके जमा करने तक" : "Provisional — until everyone submits")}</span>
        {left && <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-sky-700"><Clock className="h-3 w-3" />{hi ? "बंद होने में" : "closes in"} {left}</span>}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-3"><Users className="h-3.5 w-3.5" />{n(data.submitted)}/{n(data.class_size)} {hi ? "ने जमा किया" : "submitted"}</span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3"><Timer className="h-3.5 w-3.5" />{hi ? "बराबर अंक होने पर, जिसने जल्दी पूरा किया वह आगे।" : "Equal scores? The faster finisher ranks higher."}</p>
      {!rows.length ? <Empty text={hi ? "अभी किसी ने जमा नहीं किया।" : "Nobody has submitted yet."} /> : (
        <>
          {rows.length >= 3 && <Podium rows={rows} value={(r) => <>{n(r.pct ?? 0)}%</>} sub={(r) => <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" />{fmtTime(r.time_taken_sec)}</span>} />}
          <ol className="mt-4 space-y-1.5">
            {(rows.length >= 3 ? rows.slice(3) : rows).map((r, i) => (
              <Row key={r.id} r={r} i={i} bar={r.pct ?? 0} right={<>{n(r.pct ?? 0)}%</>}>
                <span className="flex items-center gap-1 text-[0.68rem] text-ink-3"><Timer className="h-3 w-3" />{fmtTime(r.time_taken_sec)}</span>
              </Row>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

/** All of a class's tests: average score, tests taken, total time. */
export function ClassTestLeaderboard({ rows }: { rows: LeaderRow[] }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const ranked = rows.filter((r) => r.pct != null);
  if (!ranked.length) return <Empty text={hi ? "अभी कोई टेस्ट नहीं दिया गया।" : "No tests taken yet."} />;
  return (
    <div>
      {ranked.length >= 3 && <Podium rows={ranked} value={(r) => <>{n(r.pct ?? 0)}%</>} sub={(r) => <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" />{n(r.tests_taken ?? 0)} {hi ? "टेस्ट" : "tests"}</span>} />}
      <ol className="mt-4 space-y-1.5">
        {(ranked.length >= 3 ? ranked.slice(3) : ranked).map((r, i) => (
          <Row key={r.id} r={r} i={i} bar={r.pct ?? 0} right={<>{n(r.pct ?? 0)}%</>}>
            <span className="text-[0.68rem] text-ink-3">{n(r.tests_taken ?? 0)} {hi ? "टेस्ट" : "tests"} · {fmtTime(r.time_taken_sec)}</span>
          </Row>
        ))}
      </ol>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="flex items-center justify-center gap-2 py-8 text-center text-sm text-ink-3"><Sparkles className="h-4 w-4" />{text}</p>;
}

/** Back-compat: the teacher's test report uses this generic board. */
export function Leaderboard({ rows, unit }: { rows: LeaderRow[]; unit: "pct" | "points"; me?: LeaderRow | null }) {
  const { n } = useI18n();
  if (!rows.length) return <Empty text="—" />;
  return (
    <div>
      {rows.length >= 3 && <Podium rows={rows} value={(r) => (unit === "pct" ? <>{n(r.pct ?? 0)}%</> : <CountUp to={r.points ?? 0} format={(v) => n(v)} />)} sub={(r) => (r.time_taken_sec != null ? fmtTime(r.time_taken_sec) : null)} />}
      <ol className="mt-4 space-y-1.5">
        {(rows.length >= 3 ? rows.slice(3) : rows).map((r, i) => <Row key={r.id} r={r} i={i} right={unit === "pct" ? `${n(r.pct ?? 0)}%` : n(r.points ?? 0)} />)}
      </ol>
    </div>
  );
}
