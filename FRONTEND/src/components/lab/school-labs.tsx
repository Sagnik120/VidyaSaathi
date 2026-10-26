"use client";

/**
 * Practice Lab simulations for Classes 6-10, tagged by class and subject area.
 * Every sim is a set of sliders plus a pure view(values) -> picture + readouts,
 * framed by "predict first, then play, then see why".
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, Dices, RotateCcw, X } from "lucide-react";
import { useI18n } from "@/providers/i18n";
import { cn } from "@/lib/utils";

export type Area = "math" | "physics" | "chemistry" | "biology" | "geography" | "economics";

/** Which subjects on each board an area belongs to. */
export const AREA_SUBJECTS: Record<Area, string[]> = {
  math: ["Mathematics"],
  physics: ["Science", "Physics"],
  chemistry: ["Science", "Chemistry"],
  biology: ["Science", "Biology"],
  geography: ["Social Science", "Geography"],
  economics: ["Social Science", "Mathematics", "History & Civics"],
};

type Param = { k: string; en: string; hi: string; min: number; max: number; step: number; init: number; unit?: string };
type View = { svg: ReactNode; readouts: Array<[string, string]> };
export type Sim = {
  id: string; en: string; hi: string; about: string; aboutHi: string; area: Area; grades: number[];
  params: Param[]; animated?: boolean;
  predict?: { en: string; hi: string; options: Array<[string, string]>; answer: number; why: string; whyHi: string };
  view: (v: Record<string, number>, hi: boolean, t: number) => View;
};

const W = 520, H = 260;
const C = { ink: "var(--ink)", ink3: "var(--ink-3)", sky: "var(--sky-600)", sky2: "var(--sky-200)", sage: "var(--sage)", gold: "var(--marigold-600)", gold2: "var(--marigold-200)", rose: "var(--rose)", line: "var(--line-2)", paper: "var(--paper-2)" };
const fx = (x: number, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toString();
const Txt = ({ x, y, children, size = 13, fill = C.ink, anchor = "middle", weight = 500 }: { x: number; y: number; children: ReactNode; size?: number; fill?: string; anchor?: "start" | "middle" | "end"; weight?: number }) =>
  <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight} fontFamily="var(--font-sans)">{children}</text>;

function Axes({ x0 = 40, y0 = H - 30, x1 = W - 20, y1 = 20 }) {
  return <g stroke={C.line} strokeWidth={1.2}><line x1={x0} y1={y0} x2={x1} y2={y0} /><line x1={x0} y1={y0} x2={x0} y2={y1} /></g>;
}

export const SIMS: Sim[] = [
  /* ── Mathematics ─────────────────────────────────────────────────── */
  {
    id: "fractions", en: "Fraction pies", hi: "भिन्न का पाई", area: "math", grades: [6, 7],
    about: "See a fraction as slices of a roti — and as a decimal and percent.", aboutHi: "भिन्न को रोटी के टुकड़ों की तरह देखें — दशमलव और प्रतिशत में भी।",
    params: [{ k: "n", en: "Numerator", hi: "अंश", min: 0, max: 12, step: 1, init: 3 }, { k: "d", en: "Denominator", hi: "हर", min: 1, max: 12, step: 1, init: 4 }],
    predict: { en: "Which is bigger: 2/3 or 3/5?", hi: "कौन बड़ा है: 2/3 या 3/5?", options: [["2/3", "2/3"], ["3/5", "3/5"], ["Equal", "बराबर"]], answer: 0, why: "2/3 ≈ 0.67 and 3/5 = 0.6 — set them on the pie and compare the shaded parts.", whyHi: "2/3 ≈ 0.67 और 3/5 = 0.6 — पाई पर बनाकर छायांकित भाग की तुलना करें।" },
    view: ({ n, d }) => {
      const whole = Math.max(1, Math.ceil(n / d));
      const pies = Array.from({ length: Math.min(whole, 3) }, (_, p) => p);
      return {
        svg: (
          <g>
            {pies.map((p) => {
              const cx = 100 + p * 160, cy = 125, r = 70;
              return (
                <g key={p}>
                  {Array.from({ length: d }, (_, i) => {
                    const a0 = (i / d) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
                    const filled = p * d + i < n;
                    const large = 1 / d > 0.5 ? 1 : 0;
                    const path = d === 1 ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z` : `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
                    return <path key={i} d={path} fill={filled ? C.gold2 : "var(--surface)"} stroke={C.gold} strokeWidth={1.5} />;
                  })}
                </g>
              );
            })}
            <Txt x={W - 60} y={110} size={34} weight={600}>{n}</Txt>
            <line x1={W - 85} x2={W - 35} y1={122} y2={122} stroke={C.ink} strokeWidth={2} />
            <Txt x={W - 60} y={155} size={34} weight={600}>{d}</Txt>
          </g>
        ),
        readouts: [["Decimal", fx(n / d, 3)], ["Percent", `${fx((100 * n) / d, 1)}%`], ["Type", n === 0 ? "zero" : n < d ? "proper" : n === d ? "one whole" : "improper"]],
      };
    },
  },
  {
    id: "integers", en: "Integer number line", hi: "पूर्णांक संख्या रेखा", area: "math", grades: [6, 7],
    about: "Add integers by jumping along the number line — think lift floors and temperatures.", aboutHi: "संख्या रेखा पर छलाँग लगाकर पूर्णांक जोड़ें — लिफ़्ट की मंज़िलें और तापमान सोचें।",
    params: [{ k: "a", en: "Start (a)", hi: "शुरू (a)", min: -10, max: 10, step: 1, init: -3 }, { k: "b", en: "Jump (b)", hi: "छलाँग (b)", min: -10, max: 10, step: 1, init: 5 }],
    predict: { en: "-4 + 7 = ?", hi: "-4 + 7 = ?", options: [["-11", "-11"], ["3", "3"], ["-3", "-3"]], answer: 1, why: "Start at -4 and jump 7 to the right: you land on 3.", whyHi: "-4 से शुरू करके 7 दाईं ओर कूदें: 3 पर पहुँचते हैं।" },
    view: ({ a, b }) => {
      const X = (v: number) => 30 + ((v + 20) / 40) * (W - 60);
      const s = a + b;
      return {
        svg: (
          <g>
            <line x1={20} x2={W - 20} y1={170} y2={170} stroke={C.ink} strokeWidth={1.5} />
            {Array.from({ length: 41 }, (_, i) => i - 20).map((v) => (
              <g key={v}><line x1={X(v)} x2={X(v)} y1={164} y2={176} stroke={C.ink3} />{v % 5 === 0 && <Txt x={X(v)} y={196} size={11} fill={C.ink3}>{v}</Txt>}</g>
            ))}
            <path d={`M ${X(a)} 165 Q ${(X(a) + X(s)) / 2} ${165 - Math.min(110, Math.abs(b) * 10 + 20)} ${X(s)} 165`} fill="none" stroke={b >= 0 ? C.sage : C.rose} strokeWidth={2.5} strokeDasharray="5 4" />
            <circle cx={X(a)} cy={170} r={7} fill={C.sky} /><circle cx={X(s)} cy={170} r={8} fill={C.gold} />
            <Txt x={X(s)} y={150} size={15} weight={700}>{s}</Txt>
          </g>
        ),
        readouts: [["a + b", `${a} + (${b}) = ${s}`], ["Direction", b >= 0 ? "right →" : "← left"]],
      };
    },
  },
  {
    id: "angles", en: "Types of angles", hi: "कोणों के प्रकार", area: "math", grades: [6, 7],
    about: "Turn the arm and watch the angle change its name.", aboutHi: "भुजा घुमाइए और देखिए कोण का नाम कैसे बदलता है।",
    params: [{ k: "deg", en: "Angle", hi: "कोण", min: 0, max: 360, step: 1, init: 60, unit: "°" }],
    predict: { en: "An angle of 135° is…", hi: "135° का कोण है…", options: [["Acute", "न्यून"], ["Obtuse", "अधिक"], ["Reflex", "प्रतिवर्ती"]], answer: 1, why: "Between 90° and 180° is obtuse.", whyHi: "90° और 180° के बीच अधिक कोण होता है।" },
    view: ({ deg }) => {
      const cx = 260, cy = 170, r = 120, a = (-deg * Math.PI) / 180;
      const type = deg === 0 ? "Zero" : deg < 90 ? "Acute" : deg === 90 ? "Right" : deg < 180 ? "Obtuse" : deg === 180 ? "Straight" : deg < 360 ? "Reflex" : "Complete";
      const ar = 40, large = deg > 180 ? 1 : 0;
      return {
        svg: (
          <g>
            <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
            <line x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke={C.sky} strokeWidth={3} strokeLinecap="round" />
            {deg > 0 && deg < 360 && <path d={`M ${cx + ar} ${cy} A ${ar} ${ar} 0 ${large} 0 ${cx + ar * Math.cos(a)} ${cy + ar * Math.sin(a)}`} fill="none" stroke={C.gold} strokeWidth={2.5} />}
            {deg === 90 && <rect x={cx} y={cy - 18} width={18} height={18} fill="none" stroke={C.gold} strokeWidth={2} />}
            <circle cx={cx} cy={cy} r={5} fill={C.ink} />
            <Txt x={cx} y={40} size={22} weight={700} fill={C.sky}>{deg}° · {type}</Txt>
          </g>
        ),
        readouts: [["Type", type], ["Complement", deg <= 90 ? `${90 - deg}°` : "—"], ["Supplement", deg <= 180 ? `${180 - deg}°` : "—"]],
      };
    },
  },
  {
    id: "triangle", en: "Angle sum of a triangle", hi: "त्रिभुज का कोण योग", area: "math", grades: [7, 8, 9],
    about: "Change two angles — the third always makes 180°.", aboutHi: "दो कोण बदलें — तीसरा हमेशा 180° पूरा कर देता है।",
    params: [{ k: "A", en: "Angle A", hi: "कोण A", min: 10, max: 150, step: 1, init: 60, unit: "°" }, { k: "B", en: "Angle B", hi: "कोण B", min: 10, max: 150, step: 1, init: 70, unit: "°" }],
    predict: { en: "If two angles are 50° and 60°, the third is…", hi: "यदि दो कोण 50° और 60° हैं, तो तीसरा…", options: [["70°", "70°"], ["90°", "90°"], ["110°", "110°"]], answer: 0, why: "180 − 50 − 60 = 70°.", whyHi: "180 − 50 − 60 = 70°" },
    view: ({ A, B }) => {
      const Cc = 180 - A - B;
      if (Cc <= 0) return { svg: <Txt x={W / 2} y={H / 2} size={16} fill={C.rose}>A + B ≥ 180° — no triangle possible!</Txt>, readouts: [["A + B", `${A + B}°`], ["C", "—"]] };
      const base = 300, ra = (A * Math.PI) / 180, rb = (B * Math.PI) / 180;
      const x0 = 110, y0 = 220, x1 = x0 + base;
      const h = (base * Math.sin(ra) * Math.sin(rb)) / Math.sin(ra + rb);
      const px = x0 + h / Math.tan(ra);
      const sc = Math.min(1, 190 / h);
      const py = y0 - h * sc, pxs = x0 + (px - x0) * sc, x1s = x0 + base * sc;
      return {
        svg: (
          <g>
            <polygon points={`${x0},${y0} ${x1s},${y0} ${pxs},${py}`} fill="var(--sky-50)" stroke={C.sky} strokeWidth={2.5} strokeLinejoin="round" />
            <Txt x={x0 - 14} y={y0 + 4} weight={700}>A</Txt><Txt x={x1s + 14} y={y0 + 4} weight={700}>B</Txt><Txt x={pxs} y={py - 10} weight={700}>C</Txt>
            <Txt x={x0 + 34} y={y0 - 8} size={12} fill={C.gold}>{A}°</Txt><Txt x={x1s - 34} y={y0 - 8} size={12} fill={C.gold}>{B}°</Txt><Txt x={pxs} y={py + 26} size={12} fill={C.gold}>{Cc}°</Txt>
          </g>
        ),
        readouts: [["C = 180 − A − B", `${Cc}°`], ["Sum", "180°"], ["Type", A === 90 || B === 90 || Cc === 90 ? "right-angled" : A > 90 || B > 90 || Cc > 90 ? "obtuse" : "acute"]],
      };
    },
  },
  {
    id: "area", en: "Area & perimeter", hi: "क्षेत्रफल और परिमाप", area: "math", grades: [6, 7, 8],
    about: "Fence a field: perimeter is the fence, area is the grass.", aboutHi: "खेत की बाड़: परिमाप बाड़ है, क्षेत्रफल घास।",
    params: [{ k: "l", en: "Length", hi: "लंबाई", min: 1, max: 14, step: 1, init: 6, unit: "m" }, { k: "w", en: "Width", hi: "चौड़ाई", min: 1, max: 8, step: 1, init: 4, unit: "m" }],
    predict: { en: "Same perimeter 16 m: which has more area?", hi: "समान परिमाप 16 m: किसका क्षेत्रफल अधिक?", options: [["7×1", "7×1"], ["4×4", "4×4"], ["5×3", "5×3"]], answer: 1, why: "A square encloses the most area for a given perimeter: 16 m² vs 15 or 7.", whyHi: "दिए परिमाप में वर्ग सबसे अधिक क्षेत्रफल घेरता है: 16 m²।" },
    view: ({ l, w }) => {
      const s = 26, x0 = (W - l * s) / 2, y0 = 30;
      return {
        svg: (
          <g>
            {Array.from({ length: l * w }, (_, i) => <rect key={i} x={x0 + (i % l) * s} y={y0 + Math.floor(i / l) * s} width={s} height={s} fill="var(--sage-100)" stroke="var(--sage)" strokeWidth={0.6} />)}
            <rect x={x0} y={y0} width={l * s} height={w * s} fill="none" stroke={C.gold} strokeWidth={3} />
            <Txt x={W / 2} y={y0 + w * s + 22} fill={C.ink3}>{l} m</Txt>
          </g>
        ),
        readouts: [["Area = l × w", `${l * w} m²`], ["Perimeter = 2(l + w)", `${2 * (l + w)} m`]],
      };
    },
  },
  {
    id: "circle", en: "Circle: πr² and 2πr", hi: "वृत्त: πr² और 2πr", area: "math", grades: [7, 8, 10],
    about: "Grow the radius of a chapati and see circumference and area grow differently.", aboutHi: "चपाती की त्रिज्या बढ़ाइए और देखिए परिधि और क्षेत्रफल अलग-अलग कैसे बढ़ते हैं।",
    params: [{ k: "r", en: "Radius", hi: "त्रिज्या", min: 1, max: 10, step: 0.5, init: 4, unit: "cm" }],
    predict: { en: "Double the radius — the area becomes…", hi: "त्रिज्या दोगुनी — क्षेत्रफल हो जाता है…", options: [["2×", "2×"], ["4×", "4×"], ["π×", "π×"]], answer: 1, why: "Area ∝ r², so doubling r makes it 2² = 4 times.", whyHi: "क्षेत्रफल ∝ r², इसलिए r दोगुना करने पर 4 गुना।" },
    view: ({ r }) => ({
      svg: (
        <g>
          <circle cx={200} cy={130} r={r * 11} fill="var(--marigold-100)" stroke={C.gold} strokeWidth={3} />
          <line x1={200} y1={130} x2={200 + r * 11} y2={130} stroke={C.sky} strokeWidth={2.5} /><Txt x={200 + r * 5.5} y={122} size={12} fill={C.sky}>r = {r}</Txt>
          <Txt x={420} y={110} size={14}>C = 2πr = {fx(2 * Math.PI * r)}</Txt><Txt x={420} y={140} size={14}>A = πr² = {fx(Math.PI * r * r)}</Txt>
        </g>
      ),
      readouts: [["Circumference", `${fx(2 * Math.PI * r)} cm`], ["Area", `${fx(Math.PI * r * r)} cm²`], ["Diameter", `${2 * r} cm`]],
    }),
  },
  {
    id: "pythagoras", en: "Pythagoras theorem", hi: "पाइथागोरस प्रमेय", area: "math", grades: [7, 8, 9, 10],
    about: "Squares on the sides of a right triangle: a² + b² = c².", aboutHi: "समकोण त्रिभुज की भुजाओं पर वर्ग: a² + b² = c²।",
    params: [{ k: "a", en: "Side a", hi: "भुजा a", min: 1, max: 8, step: 1, init: 3 }, { k: "b", en: "Side b", hi: "भुजा b", min: 1, max: 8, step: 1, init: 4 }],
    predict: { en: "Sides 6 and 8 — the hypotenuse is…", hi: "भुजाएँ 6 और 8 — कर्ण है…", options: [["10", "10"], ["14", "14"], ["12", "12"]], answer: 0, why: "√(36 + 64) = √100 = 10.", whyHi: "√(36 + 64) = √100 = 10" },
    view: ({ a, b }) => {
      const s = 18, x0 = 190, y0 = 180, c = Math.hypot(a, b);
      return {
        svg: (
          <g>
            <rect x={x0} y={y0} width={a * s} height={a * s} fill="var(--sky-100)" stroke={C.sky} transform={`translate(0 0)`} />
            <rect x={x0 - b * s} y={y0 - b * s} width={b * s} height={b * s} fill="var(--marigold-100)" stroke={C.gold} />
            <polygon points={`${x0},${y0} ${x0 + a * s},${y0} ${x0},${y0 - b * s}`} fill="var(--surface)" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
            <Txt x={x0 + (a * s) / 2} y={y0 + (a * s) / 2 + 5} size={12} fill={C.sky}>a² = {a * a}</Txt>
            <Txt x={x0 - (b * s) / 2} y={y0 - (b * s) / 2 + 5} size={12} fill={C.gold}>b² = {b * b}</Txt>
            <Txt x={x0 + (a * s) / 2 + 30} y={y0 - (b * s) / 2} size={13} weight={700}>c = {fx(c)}</Txt>
          </g>
        ),
        readouts: [["a² + b²", `${a * a + b * b}`], ["c = √(a² + b²)", fx(c)], ["Triple?", Number.isInteger(c) ? "Yes — a Pythagorean triple!" : "No"]],
      };
    },
  },
  {
    id: "linear", en: "Graph of y = mx + c", hi: "y = mx + c का ग्राफ़", area: "math", grades: [8, 9, 10],
    about: "Slope tilts the line; c lifts it. Find where it cuts the axes.", aboutHi: "ढाल रेखा को झुकाता है; c उसे ऊपर उठाता है। अक्षों पर कटान देखें।",
    params: [{ k: "m", en: "Slope m", hi: "ढाल m", min: -4, max: 4, step: 0.5, init: 1 }, { k: "c", en: "Intercept c", hi: "अंतःखंड c", min: -6, max: 6, step: 1, init: 2 }],
    predict: { en: "y = −2x + 4 crosses the x-axis at…", hi: "y = −2x + 4 x-अक्ष को काटती है…", options: [["x = 2", "x = 2"], ["x = 4", "x = 4"], ["x = −2", "x = −2"]], answer: 0, why: "Set y = 0: −2x + 4 = 0 → x = 2.", whyHi: "y = 0 रखें: −2x + 4 = 0 → x = 2।" },
    view: ({ m, c }) => {
      const X = (x: number) => W / 2 + x * 22, Y = (y: number) => H / 2 - y * 11;
      return {
        svg: (
          <g>
            {Array.from({ length: 21 }, (_, i) => i - 10).map((v) => <line key={v} x1={X(v)} x2={X(v)} y1={0} y2={H} stroke="var(--rule)" />)}
            <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke={C.ink3} /><line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke={C.ink3} />
            <line x1={X(-12)} y1={Y(m * -12 + c)} x2={X(12)} y2={Y(m * 12 + c)} stroke={C.sky} strokeWidth={3} />
            <circle cx={X(0)} cy={Y(c)} r={5} fill={C.gold} />{m !== 0 && <circle cx={X(-c / m)} cy={Y(0)} r={5} fill={C.rose} />}
            <Txt x={70} y={24} size={15} weight={700} fill={C.sky}>y = {m}x {c >= 0 ? "+" : "−"} {Math.abs(c)}</Txt>
          </g>
        ),
        readouts: [["y-intercept", `(0, ${c})`], ["x-intercept", m === 0 ? "none" : `(${fx(-c / m)}, 0)`], ["Rises?", m > 0 ? "up ↗" : m < 0 ? "down ↘" : "flat"]],
      };
    },
  },
  {
    id: "quadratic", en: "Quadratic & its roots", hi: "द्विघात और उसके मूल", area: "math", grades: [10],
    about: "The discriminant b² − 4ac decides how many times the parabola meets the x-axis.", aboutHi: "विविक्तकर b² − 4ac तय करता है कि परवलय x-अक्ष को कितनी बार मिलेगा।",
    params: [{ k: "a", en: "a", hi: "a", min: -3, max: 3, step: 0.5, init: 1 }, { k: "b", en: "b", hi: "b", min: -6, max: 6, step: 0.5, init: -2 }, { k: "c", en: "c", hi: "c", min: -6, max: 6, step: 0.5, init: -3 }],
    predict: { en: "x² + 2x + 5 = 0 has…", hi: "x² + 2x + 5 = 0 के…", options: [["2 real roots", "2 वास्तविक मूल"], ["1 real root", "1 वास्तविक मूल"], ["No real roots", "कोई वास्तविक मूल नहीं"]], answer: 2, why: "D = 4 − 20 = −16 < 0, so the parabola never touches the x-axis.", whyHi: "D = 4 − 20 = −16 < 0, परवलय x-अक्ष को नहीं छूता।" },
    view: ({ a, b, c }) => {
      const X = (x: number) => W / 2 + x * 32, Y = (y: number) => H / 2 - y * 9;
      const D = b * b - 4 * a * c;
      const pts = a === 0 ? "" : Array.from({ length: 81 }, (_, i) => -8 + i * 0.2).map((x) => `${X(x)},${Math.max(-50, Math.min(H + 50, Y(a * x * x + b * x + c)))}`).join(" ");
      const roots = a === 0 ? [] : D < 0 ? [] : D === 0 ? [-b / (2 * a)] : [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)];
      return {
        svg: (
          <g>
            <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke={C.ink3} /><line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke={C.ink3} />
            {a !== 0 && <polyline points={pts} fill="none" stroke={C.sky} strokeWidth={3} />}
            {roots.map((r, i) => <circle key={i} cx={X(r)} cy={Y(0)} r={6} fill={C.rose} />)}
          </g>
        ),
        readouts: [["D = b² − 4ac", fx(D)], ["Roots", a === 0 ? "not quadratic" : D < 0 ? "no real roots" : roots.map((r) => fx(r)).join(", ")], ["Opens", a > 0 ? "upward ∪" : "downward ∩"]],
      };
    },
  },
  {
    id: "trig", en: "Trigonometric ratios", hi: "त्रिकोणमितीय अनुपात", area: "math", grades: [10],
    about: "Tilt a ladder against a wall: sin, cos and tan of its angle.", aboutHi: "दीवार से सीढ़ी टिकाइए: उसके कोण का sin, cos, tan।",
    params: [{ k: "t", en: "Angle θ", hi: "कोण θ", min: 5, max: 85, step: 1, init: 30, unit: "°" }],
    predict: { en: "sin 30° equals…", hi: "sin 30° बराबर है…", options: [["1/2", "1/2"], ["√3/2", "√3/2"], ["1", "1"]], answer: 0, why: "Opposite/hypotenuse = 1/2 at 30° — check the readout.", whyHi: "30° पर लंब/कर्ण = 1/2 — रीडआउट देखें।" },
    view: ({ t }) => {
      const r = (t * Math.PI) / 180, L = 200, x0 = 140, y0 = 225;
      const bx = x0 + L * Math.cos(r), by = y0 - L * Math.sin(r);
      return {
        svg: (
          <g>
            <line x1={bx} y1={y0} x2={bx} y2={20} stroke={C.ink3} strokeWidth={6} />
            <line x1={x0 - 30} y1={y0} x2={W - 20} y2={y0} stroke={C.ink3} strokeWidth={2} />
            <line x1={x0} y1={y0} x2={bx} y2={by} stroke={C.gold} strokeWidth={5} strokeLinecap="round" />
            <line x1={bx} y1={by} x2={bx} y2={y0} stroke={C.sky} strokeWidth={2} strokeDasharray="5 4" />
            <Txt x={x0 + 46} y={y0 - 8} size={12} fill={C.gold}>θ = {t}°</Txt>
            <Txt x={(x0 + bx) / 2} y={y0 + 18} size={12} fill={C.ink3}>adjacent</Txt>
            <Txt x={bx + 40} y={(by + y0) / 2} size={12} fill={C.sky}>opposite</Txt>
          </g>
        ),
        readouts: [["sin θ", fx(Math.sin(r), 3)], ["cos θ", fx(Math.cos(r), 3)], ["tan θ", fx(Math.tan(r), 3)]],
      };
    },
  },
  {
    id: "interest", en: "Simple vs compound interest", hi: "साधारण बनाम चक्रवृद्धि ब्याज", area: "economics", grades: [7, 8, 9, 10],
    about: "Your ₹ in a bank: interest on interest makes compound grow faster.", aboutHi: "बैंक में आपके ₹: ब्याज पर ब्याज से चक्रवृद्धि तेज़ बढ़ता है।",
    params: [{ k: "P", en: "Principal ₹", hi: "मूलधन ₹", min: 1000, max: 20000, step: 1000, init: 10000 }, { k: "R", en: "Rate % p.a.", hi: "दर % वार्षिक", min: 1, max: 20, step: 1, init: 10 }, { k: "T", en: "Years", hi: "वर्ष", min: 1, max: 10, step: 1, init: 3 }],
    predict: { en: "₹10,000 at 10% for 2 years: compound interest is…", hi: "₹10,000, 10% पर 2 वर्ष: चक्रवृद्धि ब्याज…", options: [["₹2,000", "₹2,000"], ["₹2,100", "₹2,100"], ["₹1,000", "₹1,000"]], answer: 1, why: "Year 2 also earns 10% on year 1's ₹1,000: 1,000 + 1,100 = ₹2,100.", whyHi: "दूसरे वर्ष पहले वर्ष के ₹1,000 पर भी 10% मिलता है: ₹2,100।" },
    view: ({ P, R, T }) => {
      const si = (y: number) => P + (P * R * y) / 100, ci = (y: number) => P * (1 + R / 100) ** y;
      const max = ci(T), bw = Math.min(36, (W - 80) / (T * 2.6));
      return {
        svg: (
          <g>
            <Axes />
            {Array.from({ length: T }, (_, i) => i + 1).map((y) => {
              const x = 50 + (y - 1) * ((W - 80) / T);
              const hs = ((si(y) - P * 0.8) / (max - P * 0.8)) * 190, hc = ((ci(y) - P * 0.8) / (max - P * 0.8)) * 190;
              return (
                <g key={y}>
                  <rect x={x} y={H - 30 - hs} width={bw} height={hs} rx={4} fill={C.sky2} />
                  <rect x={x + bw + 3} y={H - 30 - hc} width={bw} height={hc} rx={4} fill={C.gold} />
                  <Txt x={x + bw} y={H - 14} size={11} fill={C.ink3}>Y{y}</Txt>
                </g>
              );
            })}
            <rect x={W - 150} y={18} width={12} height={12} fill={C.sky2} /><Txt x={W - 132} y={28} size={11} anchor="start">Simple</Txt>
            <rect x={W - 80} y={18} width={12} height={12} fill={C.gold} /><Txt x={W - 62} y={28} size={11} anchor="start">Compound</Txt>
          </g>
        ),
        readouts: [["SI", `₹${Math.round(si(T) - P).toLocaleString("en-IN")}`], ["CI", `₹${Math.round(ci(T) - P).toLocaleString("en-IN")}`], ["Extra from CI", `₹${Math.round(ci(T) - si(T)).toLocaleString("en-IN")}`]],
      };
    },
  },
  {
    id: "probability", en: "Coin & dice probability", hi: "सिक्का और पासा प्रायिकता", area: "math", grades: [8, 9, 10],
    about: "Toss many times: experimental probability settles near the theoretical one.", aboutHi: "कई बार उछालें: प्रायोगिक प्रायिकता सैद्धांतिक के पास आ जाती है।",
    params: [{ k: "n", en: "Number of rolls", hi: "फेंकने की संख्या", min: 10, max: 2000, step: 10, init: 60 }, { k: "seed", en: "Shuffle", hi: "बदलें", min: 1, max: 20, step: 1, init: 1 }],
    predict: { en: "Rolling a die 600 times, about how many sixes?", hi: "पासा 600 बार फेंकें, लगभग कितने छक्के?", options: [["~50", "~50"], ["~100", "~100"], ["~300", "~300"]], answer: 1, why: "P(6) = 1/6, and 600 × 1/6 = 100.", whyHi: "P(6) = 1/6, और 600 × 1/6 = 100।" },
    view: ({ n, seed }) => {
      let s = seed * 9301 + 49297;
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      const counts = [0, 0, 0, 0, 0, 0];
      for (let i = 0; i < n; i++) counts[Math.floor(rnd() * 6)]++;
      const max = Math.max(...counts, n / 6);
      return {
        svg: (
          <g>
            <Axes />
            {counts.map((c, i) => {
              const h = (c / max) * 190, x = 70 + i * 72;
              return <g key={i}><rect x={x} y={H - 30 - h} width={44} height={h} rx={6} fill={C.sky} /><Txt x={x + 22} y={H - 14} size={12}>{i + 1}</Txt><Txt x={x + 22} y={H - 36 - h} size={11} fill={C.ink3}>{c}</Txt></g>;
            })}
            <line x1={50} x2={W - 20} y1={H - 30 - ((n / 6) / max) * 190} y2={H - 30 - ((n / 6) / max) * 190} stroke={C.gold} strokeDasharray="6 4" strokeWidth={2} />
          </g>
        ),
        readouts: [["Expected each", fx(n / 6, 1)], ["P(6) experimental", fx(counts[5] / n, 3)], ["P(6) theoretical", "1/6 ≈ 0.167"]],
      };
    },
  },

  /* ── Physics ─────────────────────────────────────────────────────── */
  {
    id: "ohm", en: "Ohm's law circuit", hi: "ओम का नियम परिपथ", area: "physics", grades: [7, 8, 10],
    about: "Turn up the battery or the resistance and watch the bulb.", aboutHi: "बैटरी या प्रतिरोध बढ़ाइए और बल्ब देखिए।",
    params: [{ k: "V", en: "Voltage V", hi: "वोल्टेज V", min: 1, max: 12, step: 0.5, init: 6, unit: "V" }, { k: "R", en: "Resistance R", hi: "प्रतिरोध R", min: 1, max: 30, step: 1, init: 6, unit: "Ω" }],
    predict: { en: "Double V, keep R the same — the current…", hi: "V दोगुना, R वही — धारा…", options: [["halves", "आधी"], ["doubles", "दोगुनी"], ["stays same", "वही"]], answer: 1, why: "I = V/R: current is directly proportional to voltage.", whyHi: "I = V/R: धारा वोल्टेज के समानुपाती है।" },
    view: ({ V, R }) => {
      const I = V / R, glow = Math.min(1, I / 2);
      return {
        svg: (
          <g>
            <rect x={80} y={50} width={360} height={160} rx={18} fill="none" stroke={C.ink} strokeWidth={3} />
            <g transform="translate(70 110)"><rect x={0} y={0} width={20} height={40} fill="var(--surface)" stroke={C.ink} strokeWidth={2} /><Txt x={-30} y={25} size={12}>{V} V</Txt></g>
            <g transform="translate(200 38)"><path d="M0 12 l10 -12 l10 24 l10 -24 l10 24 l10 -24 l10 24 l10 -12" fill="none" stroke={C.gold} strokeWidth={3} /><Txt x={40} y={-6} size={12}>{R} Ω</Txt></g>
            <circle cx={440} cy={130} r={36} fill={`rgba(250, 204, 21, ${glow})`} filter={glow > 0.1 ? "drop-shadow(0 0 18px rgba(250,204,21,0.9))" : undefined} />
            <circle cx={440} cy={130} r={24} fill="var(--surface)" stroke={C.ink} strokeWidth={2} opacity={0.6} />
            {Array.from({ length: 8 }, (_, i) => {
              const dur = Math.max(1.2, 8 / Math.max(I, 0.05));
              return (
                <motion.circle key={`${i}-${fx(dur)}`} r={3.5} fill={C.sky} initial={{ cx: 80, cy: 50 }}
                  animate={{ cx: [80, 440, 440, 80, 80], cy: [50, 50, 210, 210, 50] }}
                  transition={{ repeat: Infinity, ease: "linear", duration: dur, times: [0, 0.35, 0.5, 0.85, 1], delay: (i * dur) / 8 }} />
              );
            })}
          </g>
        ),
        readouts: [["I = V / R", `${fx(I)} A`], ["Power P = VI", `${fx(V * I)} W`], ["Brightness", glow > 0.66 ? "bright" : glow > 0.25 ? "medium" : "dim"]],
      };
    },
  },
  {
    id: "lens", en: "Convex lens images", hi: "उत्तल लेंस प्रतिबिंब", area: "physics", grades: [8, 10],
    about: "Move the candle: 1/v − 1/u = 1/f decides where the image forms.", aboutHi: "मोमबत्ती खिसकाइए: 1/v − 1/u = 1/f तय करता है प्रतिबिंब कहाँ बनेगा।",
    params: [{ k: "u", en: "Object distance |u|", hi: "वस्तु दूरी |u|", min: 5, max: 60, step: 1, init: 30, unit: "cm" }, { k: "f", en: "Focal length f", hi: "फ़ोकस दूरी f", min: 5, max: 25, step: 1, init: 10, unit: "cm" }],
    predict: { en: "Object at 2F of a convex lens — the image is…", hi: "उत्तल लेंस के 2F पर वस्तु — प्रतिबिंब…", options: [["at 2F, same size", "2F पर, समान आकार"], ["at F, tiny", "F पर, बहुत छोटा"], ["virtual, magnified", "आभासी, बड़ा"]], answer: 0, why: "u = −2f gives v = +2f and m = −1: real, inverted, same size.", whyHi: "u = −2f से v = +2f, m = −1: वास्तविक, उल्टा, समान आकार।" },
    view: ({ u, f }) => {
      const s = 3.6, cx = W / 2, ax = 140, h = 34;
      const U = -u, v = u === f ? Infinity : 1 / (1 / f + 1 / U), m = v / U;
      const ox = cx + U * s, real = Number.isFinite(v) && v > 0;
      const ix = Number.isFinite(v) ? cx + v * s : NaN, iy = ax - m * h;
      // Ray 1: parallel to the axis, then through F. Ray 2: straight through the optical centre.
      const r1y = ax - h + ((W - cx) * h) / (f * s), r2y = ax + ((W - cx) * h) / (cx - ox);
      return {
        svg: (
          <g>
            <line x1={0} x2={W} y1={ax} y2={ax} stroke={C.ink3} />
            <ellipse cx={cx} cy={ax} rx={9} ry={95} fill="var(--sky-100)" stroke={C.sky} strokeWidth={2} />
            {[-2, -1, 1, 2].map((k) => <g key={k}><circle cx={cx + k * f * s} cy={ax} r={3} fill={C.ink} /><Txt x={cx + k * f * s} y={ax + 18} size={10} fill={C.ink3}>{Math.abs(k) === 2 ? "2F" : "F"}</Txt></g>)}
            <line x1={ox} y1={ax} x2={ox} y2={ax - h} stroke={C.gold} strokeWidth={4} /><circle cx={ox} cy={ax - h - 5} r={5} fill={C.gold} />
            <polyline points={`${ox},${ax - h} ${cx},${ax - h} ${W},${r1y}`} fill="none" stroke={C.rose} strokeWidth={1.5} />
            <line x1={ox} y1={ax - h} x2={W} y2={r2y} stroke={C.sky} strokeWidth={1.5} />
            {Number.isFinite(v) && !real && <g stroke={C.ink3} strokeDasharray="4 4"><line x1={cx} y1={ax - h} x2={ix} y2={iy} /><line x1={cx} y1={ax} x2={ix} y2={iy} /></g>}
            {Number.isFinite(v) && ix > -20 && ix < W + 20 && <line x1={ix} y1={ax} x2={ix} y2={Math.max(5, Math.min(H - 5, iy))} stroke={real ? C.sage : C.ink3} strokeWidth={4} strokeDasharray={real ? undefined : "5 4"} />}
          </g>
        ),
        readouts: [["Image distance v", Number.isFinite(v) ? `${fx(v, 1)} cm` : "∞ (at infinity)"], ["Magnification m", Number.isFinite(v) ? fx(m) : "∞"], ["Nature", !Number.isFinite(v) ? "no image" : real ? `real, inverted, ${Math.abs(m) > 1 ? "magnified" : Math.abs(m) < 1 ? "diminished" : "same size"}` : "virtual, erect, magnified"]],
      };
    },
  },
  {
    id: "motion", en: "Speed & motion graphs", hi: "चाल और गति ग्राफ़", area: "physics", grades: [7, 9],
    about: "An auto-rickshaw speeds up: see distance–time and velocity–time graphs.", aboutHi: "ऑटो-रिक्शा तेज़ होता है: दूरी–समय और वेग–समय ग्राफ़ देखें।",
    params: [{ k: "u", en: "Initial speed u", hi: "प्रारंभिक चाल u", min: 0, max: 20, step: 1, init: 5, unit: "m/s" }, { k: "a", en: "Acceleration a", hi: "त्वरण a", min: -2, max: 4, step: 0.5, init: 1, unit: "m/s²" }],
    predict: { en: "For uniform speed, the distance–time graph is…", hi: "एकसमान चाल के लिए दूरी–समय ग्राफ़…", options: [["a straight line", "सीधी रेखा"], ["a curve", "वक्र"], ["flat", "समतल"]], answer: 0, why: "Set a = 0: equal distances in equal times give a straight line.", whyHi: "a = 0 रखें: समान समय में समान दूरी से सीधी रेखा बनती है।" },
    view: ({ u, a }) => {
      const T = 10, s = (t: number) => Math.max(0, u * t + 0.5 * a * t * t), v = (t: number) => Math.max(0, u + a * t);
      const sm = Math.max(10, s(T)), vm = Math.max(5, v(T), u);
      const ps = Array.from({ length: 41 }, (_, i) => (i / 40) * T).map((t) => `${30 + (t / T) * 210},${H - 30 - (s(t) / sm) * 190}`).join(" ");
      const pv = Array.from({ length: 41 }, (_, i) => (i / 40) * T).map((t) => `${280 + (t / T) * 210},${H - 30 - (v(t) / vm) * 190}`).join(" ");
      return {
        svg: (
          <g>
            <Axes x0={30} x1={250} /><Axes x0={280} x1={500} />
            <polyline points={ps} fill="none" stroke={C.sky} strokeWidth={3} /><polyline points={pv} fill="none" stroke={C.gold} strokeWidth={3} />
            <Txt x={140} y={18} size={12} fill={C.sky}>distance–time</Txt><Txt x={390} y={18} size={12} fill={C.gold}>velocity–time</Txt>
          </g>
        ),
        readouts: [["v after 10 s = u + at", `${fx(v(T))} m/s`], ["s in 10 s = ut + ½at²", `${fx(s(T))} m`], ["Motion", a === 0 ? "uniform" : a > 0 ? "accelerating" : "slowing down"]],
      };
    },
  },
  {
    id: "density", en: "Float or sink?", hi: "तैरेगा या डूबेगा?", area: "physics", grades: [8, 9],
    about: "Archimedes in a bucket: compare the object's density with the liquid's.", aboutHi: "बाल्टी में आर्किमिडीज़: वस्तु और द्रव के घनत्व की तुलना करें।",
    params: [{ k: "d", en: "Object density", hi: "वस्तु घनत्व", min: 0.1, max: 3, step: 0.05, init: 0.6, unit: "g/cm³" }, { k: "L", en: "Liquid density", hi: "द्रव घनत्व", min: 0.7, max: 1.5, step: 0.05, init: 1, unit: "g/cm³" }],
    predict: { en: "Ice (0.92 g/cm³) in water floats with how much under water?", hi: "पानी में बर्फ़ (0.92) का कितना भाग डूबा रहता है?", options: [["about 92%", "लगभग 92%"], ["about 50%", "लगभग 50%"], ["all of it", "पूरा"]], answer: 0, why: "Fraction submerged = ρ_object / ρ_liquid = 0.92.", whyHi: "डूबा भाग = ρ वस्तु / ρ द्रव = 0.92।" },
    view: ({ d, L }) => {
      const frac = Math.min(1, d / L), sinks = d > L, top = 90, size = 70;
      const y = sinks ? H - 40 - size : top - size * (1 - frac);
      return {
        svg: (
          <g>
            <rect x={140} y={top} width={240} height={H - 30 - top} fill="var(--sky-100)" stroke={C.sky} />
            <motion.rect x={225} width={size} height={size} rx={6} fill={C.gold2} stroke={C.gold} strokeWidth={2} animate={{ y }} transition={{ type: "spring", stiffness: 60, damping: 12 }} />
            <line x1={140} x2={380} y1={top} y2={top} stroke={C.sky} strokeWidth={2} />
          </g>
        ),
        readouts: [["Result", sinks ? "sinks" : d === L ? "floats fully under" : "floats"], ["Submerged", `${Math.round(frac * 100)}%`], ["Rule", "floats if ρ object < ρ liquid"]],
      };
    },
  },
  {
    id: "pendulum", en: "Simple pendulum", hi: "सरल लोलक", area: "physics", grades: [7, 9], animated: true,
    about: "Time period depends on length — not on how heavy the bob is.", aboutHi: "आवर्तकाल लंबाई पर निर्भर है — गोलक के भार पर नहीं।",
    params: [{ k: "L", en: "Length", hi: "लंबाई", min: 0.2, max: 2, step: 0.1, init: 1, unit: "m" }, { k: "amp", en: "Swing", hi: "आयाम", min: 5, max: 30, step: 1, init: 20, unit: "°" }],
    predict: { en: "Make the string 4× longer — the period becomes…", hi: "धागा 4 गुना लंबा — आवर्तकाल…", options: [["4×", "4×"], ["2×", "2×"], ["same", "वही"]], answer: 1, why: "T = 2π√(L/g), so T grows with √L: √4 = 2.", whyHi: "T = 2π√(L/g), इसलिए √4 = 2 गुना।" },
    view: ({ L, amp }, _hi, t) => {
      const T = 2 * Math.PI * Math.sqrt(L / 9.8), th = ((amp * Math.PI) / 180) * Math.cos((2 * Math.PI * t) / T);
      const px = W / 2, py = 20, len = 60 + L * 90, bx = px + len * Math.sin(th), by = py + len * Math.cos(th);
      return {
        svg: (
          <g>
            <line x1={px - 80} x2={px + 80} y1={py} y2={py} stroke={C.ink} strokeWidth={4} />
            <line x1={px} y1={py} x2={bx} y2={by} stroke={C.ink3} strokeWidth={2} />
            <circle cx={bx} cy={by} r={16} fill={C.gold} stroke={C.ink} strokeWidth={1.5} />
          </g>
        ),
        readouts: [["T = 2π√(L/g)", `${fx(T)} s`], ["Oscillations / min", fx(60 / T, 1)], ["Frequency", `${fx(1 / T)} Hz`]],
      };
    },
  },
  {
    id: "lever", en: "Lever & moments", hi: "उत्तोलक और आघूर्ण", area: "physics", grades: [6, 9, 10],
    about: "Balance a see-saw: load × load arm = effort × effort arm.", aboutHi: "सी-सॉ संतुलित करें: भार × भार भुजा = प्रयास × प्रयास भुजा।",
    params: [{ k: "load", en: "Load", hi: "भार", min: 10, max: 100, step: 5, init: 60, unit: "N" }, { k: "la", en: "Load arm", hi: "भार भुजा", min: 0.5, max: 3, step: 0.25, init: 1, unit: "m" }, { k: "ea", en: "Effort arm", hi: "प्रयास भुजा", min: 0.5, max: 3, step: 0.25, init: 2, unit: "m" }],
    predict: { en: "A longer effort arm means you need…", hi: "लंबी प्रयास भुजा का अर्थ है आपको चाहिए…", options: [["less effort", "कम प्रयास"], ["more effort", "अधिक प्रयास"], ["same effort", "समान प्रयास"]], answer: 0, why: "Effort = load × load arm ÷ effort arm.", whyHi: "प्रयास = भार × भार भुजा ÷ प्रयास भुजा।" },
    view: ({ load, la, ea }) => {
      const E = (load * la) / ea, s = 70, fx0 = W / 2;
      return {
        svg: (
          <g>
            <polygon points={`${fx0},150 ${fx0 - 18},190 ${fx0 + 18},190`} fill={C.ink3} />
            <line x1={fx0 - la * s} x2={fx0 + ea * s} y1={150} y2={150} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
            <rect x={fx0 - la * s - 22} y={106} width={44} height={44} rx={6} fill={C.gold2} stroke={C.gold} /><Txt x={fx0 - la * s} y={133} size={12}>{load}N</Txt>
            <line x1={fx0 + ea * s} x2={fx0 + ea * s} y1={70} y2={146} stroke={C.sky} strokeWidth={3} /><polygon points={`${fx0 + ea * s - 7},136 ${fx0 + ea * s + 7},136 ${fx0 + ea * s},148`} fill={C.sky} />
            <Txt x={fx0 + ea * s} y={62} size={12} fill={C.sky}>{fx(E, 1)} N</Txt>
          </g>
        ),
        readouts: [["Effort needed", `${fx(E, 1)} N`], ["Mechanical advantage", fx(load / E)], ["Moment (each side)", `${fx(load * la)} N·m`]],
      };
    },
  },
  {
    id: "sound", en: "Pitch & loudness", hi: "तारत्व और प्रबलता", area: "physics", grades: [8, 9, 10],
    about: "Frequency sets pitch; amplitude sets loudness.", aboutHi: "आवृत्ति तारत्व तय करती है; आयाम प्रबलता।",
    params: [{ k: "f", en: "Frequency", hi: "आवृत्ति", min: 1, max: 10, step: 0.5, init: 3, unit: "×100 Hz" }, { k: "A", en: "Amplitude", hi: "आयाम", min: 10, max: 100, step: 5, init: 50 }],
    predict: { en: "A flute vs a drum: the flute has a higher…", hi: "बाँसुरी बनाम ढोल: बाँसुरी में अधिक होता है…", options: [["amplitude", "आयाम"], ["frequency", "आवृत्ति"], ["speed", "चाल"]], answer: 1, why: "Shriller sound = higher frequency = higher pitch.", whyHi: "तीखी ध्वनि = अधिक आवृत्ति = ऊँचा तारत्व।" },
    view: ({ f, A }) => {
      const pts = Array.from({ length: 401 }, (_, i) => i).map((i) => `${10 + i * 1.25},${H / 2 - A * Math.sin((i / 400) * 2 * Math.PI * f * 2)}`).join(" ");
      return {
        svg: <g><line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke={C.line} /><polyline points={pts} fill="none" stroke={C.sky} strokeWidth={2.5} /></g>,
        readouts: [["Frequency", `${f * 100} Hz`], ["Pitch", f > 6 ? "high (shrill)" : f > 3 ? "medium" : "low (deep)"], ["Loudness", A > 70 ? "loud" : A > 35 ? "moderate" : "soft"]],
      };
    },
  },

  /* ── Chemistry ───────────────────────────────────────────────────── */
  {
    id: "ph", en: "The pH scale", hi: "pH पैमाना", area: "chemistry", grades: [7, 10],
    about: "From lemon juice to soap: universal indicator colours across pH 0–14.", aboutHi: "नींबू रस से साबुन तक: pH 0–14 में सार्वत्रिक सूचक के रंग।",
    params: [{ k: "ph", en: "pH", hi: "pH", min: 0, max: 14, step: 0.5, init: 7 }],
    predict: { en: "Turmeric turns red with…", hi: "हल्दी लाल हो जाती है…", options: [["an acid", "अम्ल से"], ["a base", "क्षार से"], ["water", "पानी से"]], answer: 1, why: "Turmeric is a natural indicator: yellow in acids, red-brown in bases like soap.", whyHi: "हल्दी प्राकृतिक सूचक है: क्षार (जैसे साबुन) में लाल-भूरी।" },
    view: ({ ph }) => {
      const col = `hsl(${Math.round(ph * 19)}, 75%, 52%)`;
      const ex = ph < 2 ? "stomach acid" : ph < 3.5 ? "lemon juice" : ph < 5 ? "vinegar / tomato" : ph < 6.5 ? "milk / rain" : ph < 7.5 ? "pure water" : ph < 9 ? "baking soda" : ph < 11 ? "soap / milk of magnesia" : ph < 13 ? "washing soda" : "sodium hydroxide";
      return {
        svg: (
          <g>
            {Array.from({ length: 15 }, (_, i) => <rect key={i} x={30 + i * 31} y={190} width={31} height={26} fill={`hsl(${i * 19}, 75%, 52%)`} />)}
            {Array.from({ length: 15 }, (_, i) => <Txt key={i} x={45 + i * 31} y={232} size={10} fill={C.ink3}>{i}</Txt>)}
            <polygon points={`${30 + ph * 31 + 15},184 ${30 + ph * 31 + 7},172 ${30 + ph * 31 + 23},172`} fill={C.ink} />
            <path d="M 210 30 L 210 120 Q 210 160 260 160 Q 310 160 310 120 L 310 30" fill="none" stroke={C.ink3} strokeWidth={3} />
            <motion.path d="M 212 70 L 212 120 Q 212 158 260 158 Q 308 158 308 120 L 308 70 Z" animate={{ fill: col }} />
          </g>
        ),
        readouts: [["Nature", ph < 7 ? "acidic" : ph === 7 ? "neutral" : "basic (alkaline)"], ["Like", ex], ["[H⁺] vs pH 7", ph === 7 ? "same" : `${fx(10 ** (7 - ph), ph > 7 ? 6 : 0)}×`]],
      };
    },
  },
  {
    id: "states", en: "States of matter", hi: "पदार्थ की अवस्थाएँ", area: "chemistry", grades: [6, 8, 9], animated: true,
    about: "Heat water and watch particles break free: ice → water → steam.", aboutHi: "पानी गरम करें और कणों को आज़ाद होते देखें: बर्फ़ → पानी → भाप।",
    params: [{ k: "T", en: "Temperature", hi: "तापमान", min: -20, max: 130, step: 1, init: 25, unit: "°C" }],
    predict: { en: "At 100 °C, water at sea level…", hi: "समुद्र तल पर 100 °C पर पानी…", options: [["freezes", "जमता है"], ["boils", "उबलता है"], ["melts", "पिघलता है"]], answer: 1, why: "100 °C is water's boiling point; 0 °C its melting point.", whyHi: "100 °C पानी का क्वथनांक है; 0 °C गलनांक।" },
    view: ({ T }, _hi, t) => {
      const state = T < 0 ? "solid" : T < 100 ? "liquid" : "gas";
      const jiggle = state === "solid" ? 2 : state === "liquid" ? 10 : 0;
      const parts = Array.from({ length: 36 }, (_, i) => {
        const gx = 160 + (i % 6) * 34, gy = 60 + Math.floor(i / 6) * 30;
        if (state === "gas") {
          const sx = (i * 73) % 460 + 30, sy = (i * 41) % 200 + 30;
          return [30 + ((sx + t * (60 + (i % 5) * 20)) % 460), 30 + ((sy + t * (40 + (i % 7) * 15)) % 200)];
        }
        const ly = state === "liquid" ? gy + 40 + Math.sin(i) * 4 : gy;
        return [gx + Math.sin(t * 6 + i) * jiggle, ly + Math.cos(t * 5 + i * 2) * jiggle];
      });
      return {
        svg: <g><rect x={20} y={20} width={W - 40} height={H - 40} rx={14} fill="none" stroke={C.line} />{parts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} fill={state === "solid" ? "var(--sky-300)" : state === "liquid" ? C.sky : "var(--sky-200)"} />)}</g>,
        readouts: [["State", state], ["Particles", state === "solid" ? "fixed, vibrating" : state === "liquid" ? "close, sliding past" : "far apart, fast"], ["Next change", state === "solid" ? "melts at 0 °C" : state === "liquid" ? "boils at 100 °C" : "condenses below 100 °C"]],
      };
    },
  },

  /* ── Biology ─────────────────────────────────────────────────────── */
  {
    id: "photosynthesis", en: "Photosynthesis rate", hi: "प्रकाश संश्लेषण की दर", area: "biology", grades: [7, 10],
    about: "The rate is held back by whichever factor is in shortest supply.", aboutHi: "दर उस कारक से रुकती है जो सबसे कम उपलब्ध हो।",
    params: [{ k: "light", en: "Light", hi: "प्रकाश", min: 0, max: 100, step: 5, init: 60, unit: "%" }, { k: "co2", en: "CO₂", hi: "CO₂", min: 0, max: 100, step: 5, init: 40, unit: "%" }, { k: "temp", en: "Temperature", hi: "तापमान", min: 0, max: 50, step: 1, init: 25, unit: "°C" }],
    predict: { en: "Bright light, but very little CO₂ — the rate is…", hi: "तेज़ रोशनी, पर बहुत कम CO₂ — दर…", options: [["high", "अधिक"], ["low", "कम"], ["zero always", "हमेशा शून्य"]], answer: 1, why: "CO₂ becomes the limiting factor: more light doesn't help.", whyHi: "CO₂ सीमित कारक बन जाता है: अधिक रोशनी से मदद नहीं।" },
    view: ({ light, co2, temp }) => {
      const tf = Math.max(0, 1 - Math.abs(temp - 30) / 25) * 100;
      const rate = Math.min(light, co2, tf);
      const lim = rate === light ? "light" : rate === co2 ? "CO₂" : "temperature";
      return {
        svg: (
          <g>
            <circle cx={70} cy={60} r={30} fill={`rgba(240, 195, 90, ${0.2 + light / 125})`} />
            <path d="M 260 230 C 255 160 250 120 260 80" stroke="var(--sage)" strokeWidth={6} fill="none" />
            <ellipse cx={220} cy={120} rx={46} ry={18} fill="var(--sage)" transform="rotate(-25 220 120)" />
            <ellipse cx={300} cy={100} rx={46} ry={18} fill="var(--sage)" transform="rotate(25 300 100)" />
            {Array.from({ length: Math.round(rate / 10) }, (_, i) => (
              <motion.circle key={i} cx={240 + (i % 5) * 14} r={4} fill="var(--sky-300)" initial={{ cy: 100 }} animate={{ cy: [100, 20], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }} />
            ))}
            {[["Light", light], ["CO₂", co2], ["Temp fit", tf]].map(([k, v], i) => (
              <g key={k as string}><Txt x={380} y={70 + i * 50} size={12} anchor="start">{k}</Txt><rect x={380} y={76 + i * 50} width={120} height={10} rx={5} fill={C.paper} /><rect x={380} y={76 + i * 50} width={(v as number) * 1.2} height={10} rx={5} fill={(v as number) === rate ? C.rose : C.sage} /></g>
            ))}
          </g>
        ),
        readouts: [["Rate (O₂ bubbles)", `${Math.round(rate)}%`], ["Limiting factor", lim], ["Equation", "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂"]],
      };
    },
  },
  {
    id: "foodchain", en: "Energy in a food chain", hi: "आहार शृंखला में ऊर्जा", area: "biology", grades: [7, 8, 10],
    about: "Only about 10% of energy passes to the next level.", aboutHi: "अगले स्तर तक केवल लगभग 10% ऊर्जा पहुँचती है।",
    params: [{ k: "E", en: "Energy in grass", hi: "घास में ऊर्जा", min: 1000, max: 100000, step: 1000, init: 10000, unit: "kJ" }, { k: "eff", en: "Transfer %", hi: "स्थानांतरण %", min: 5, max: 20, step: 1, init: 10, unit: "%" }],
    predict: { en: "10,000 kJ in grass — how much reaches the snake (3rd consumer step)?", hi: "घास में 10,000 kJ — साँप तक कितनी?", options: [["1,000 kJ", "1,000 kJ"], ["10 kJ", "10 kJ"], ["100 kJ", "100 kJ"]], answer: 1, why: "Grass → grasshopper (1,000) → frog (100) → snake (10).", whyHi: "घास → टिड्डा (1,000) → मेंढक (100) → साँप (10)।" },
    view: ({ E, eff }) => {
      const lv = [["🌾 Grass", E], ["🦗 Grasshopper", E * eff / 100], ["🐸 Frog", E * (eff / 100) ** 2], ["🐍 Snake", E * (eff / 100) ** 3], ["🦅 Eagle", E * (eff / 100) ** 4]] as Array<[string, number]>;
      return {
        svg: (
          <g>
            {lv.map(([name, e], i) => {
              const w = 420 - i * 80;
              return <g key={name}><rect x={(W - w) / 2} y={H - 30 - (i + 1) * 44} width={w} height={40} rx={8} fill={i === 0 ? "var(--sage-100)" : `hsl(${40 - i * 8}, 85%, ${88 - i * 6}%)`} stroke={C.line} /><Txt x={W / 2} y={H - 30 - (i + 1) * 44 + 25} size={12}>{name} · {fx(e, 1)} kJ</Txt></g>;
            })}
          </g>
        ),
        readouts: [["Reaches the eagle", `${fx(lv[4][1], 3)} kJ`], ["Lost at each step", `${100 - eff}% (heat, life processes)`]],
      };
    },
  },

  /* ── Geography ───────────────────────────────────────────────────── */
  {
    id: "daylength", en: "Day length & seasons", hi: "दिन की लंबाई और ऋतुएँ", area: "geography", grades: [6, 8, 9],
    about: "Because Earth's axis tilts 23.5°, day length changes with latitude and month.", aboutHi: "पृथ्वी की धुरी 23.5° झुकी है, इसलिए दिन की लंबाई अक्षांश और महीने से बदलती है।",
    params: [{ k: "lat", en: "Latitude", hi: "अक्षांश", min: -66, max: 66, step: 1, init: 28, unit: "°" }, { k: "month", en: "Month", hi: "महीना", min: 1, max: 12, step: 1, init: 6 }],
    predict: { en: "On 21 June, Delhi (28°N) has…", hi: "21 जून को दिल्ली (28°N) में…", options: [["its longest day", "सबसे लंबा दिन"], ["its shortest day", "सबसे छोटा दिन"], ["equal day and night", "बराबर दिन-रात"]], answer: 0, why: "The Sun is overhead the Tropic of Cancer — the northern summer solstice.", whyHi: "सूर्य कर्क रेखा पर सीधा — उत्तरी ग्रीष्म संक्रांति।" },
    view: ({ lat, month }) => {
      const day = (month - 1) * 30.4 + 15, dec = 23.44 * Math.sin(((2 * Math.PI) / 365) * (day - 81));
      const x = -Math.tan((lat * Math.PI) / 180) * Math.tan((dec * Math.PI) / 180);
      const hours = (2 * Math.acos(Math.max(-1, Math.min(1, x))) * 180) / Math.PI / 15;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        svg: (
          <g>
            <circle cx={150} cy={130} r={90} fill="var(--sky-100)" stroke={C.sky} strokeWidth={2} />
            <path d={`M 150 40 A 90 90 0 0 1 150 220`} fill="rgba(30,41,66,0.18)" transform={`rotate(${-dec} 150 130)`} />
            <line x1={150} y1={30} x2={150} y2={230} stroke={C.ink3} strokeDasharray="4 4" transform="rotate(23.5 150 130)" />
            <line x1={60} x2={240} y1={130 - lat * 1.36} y2={130 - lat * 1.36} stroke={C.rose} strokeWidth={2.5} />
            <circle cx={60 - 40} cy={130} r={14} fill="#f0c35a" />
            <rect x={300} y={70} width={200} height={26} rx={13} fill={C.paper} /><rect x={300} y={70} width={(hours / 24) * 200} height={26} rx={13} fill="#f0c35a" />
            <Txt x={400} y={88} size={12} weight={700}>{fx(hours, 1)} h daylight</Txt>
            <Txt x={400} y={140} size={14}>{months[month - 1]} · {Math.abs(lat)}°{lat >= 0 ? "N" : "S"}</Txt>
          </g>
        ),
        readouts: [["Daylight", `${fx(hours, 1)} h`], ["Night", `${fx(24 - hours, 1)} h`], ["Sun overhead at", `${fx(Math.abs(dec), 1)}°${dec >= 0 ? "N" : "S"}`]],
      };
    },
  },
  {
    id: "population", en: "Population growth", hi: "जनसंख्या वृद्धि", area: "geography", grades: [8, 9],
    about: "Birth rate minus death rate (plus migration) sets how fast a population grows.", aboutHi: "जन्म दर − मृत्यु दर (और प्रवास) तय करती है जनसंख्या कितनी तेज़ बढ़ेगी।",
    params: [{ k: "b", en: "Birth rate /1000", hi: "जन्म दर /1000", min: 5, max: 45, step: 1, init: 20 }, { k: "d", en: "Death rate /1000", hi: "मृत्यु दर /1000", min: 5, max: 30, step: 1, init: 8 }, { k: "m", en: "Net migration /1000", hi: "शुद्ध प्रवास /1000", min: -10, max: 10, step: 1, init: 0 }],
    predict: { en: "Birth rate 20, death rate 8: growth per year is about…", hi: "जन्म दर 20, मृत्यु दर 8: वार्षिक वृद्धि लगभग…", options: [["12%", "12%"], ["1.2%", "1.2%"], ["28%", "28%"]], answer: 1, why: "(20 − 8) per 1000 = 12/1000 = 1.2% a year.", whyHi: "(20 − 8) प्रति 1000 = 1.2% प्रति वर्ष।" },
    view: ({ b, d, m }) => {
      const r = (b - d + m) / 1000, P = (y: number) => 100 * Math.exp(r * y);
      const max = Math.max(P(50), 100) * 1.1, min = Math.min(P(50), 100) * 0.8;
      const pts = Array.from({ length: 51 }, (_, y) => `${40 + y * 9},${H - 30 - ((P(y) - min) / (max - min)) * 200}`).join(" ");
      return {
        svg: <g><Axes /><polyline points={pts} fill="none" stroke={r >= 0 ? C.sage : C.rose} strokeWidth={3} /><Txt x={W - 60} y={H - 10} size={11} fill={C.ink3}>50 yrs</Txt></g>,
        readouts: [["Growth rate", `${fx(r * 100)}% / yr`], ["Doubling time", r > 0 ? `${fx(Math.log(2) / r, 0)} yrs` : "never"], ["After 50 yrs", `${fx(P(50) / 100)}× today`]],
      };
    },
  },
];

/* ── runner ────────────────────────────────────────────────────────────── */

function useClock(on: boolean) {
  const [t, setT] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    start.current = performance.now();
    const tick = (now: number) => { setT((now - start.current) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return t;
}

export function SchoolLab({ sim }: { sim: Sim }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const init = useMemo(() => Object.fromEntries(sim.params.map((p) => [p.k, p.init])), [sim]);
  const [v, setV] = useState<Record<string, number>>(init);
  const [pick, setPick] = useState<number | null>(null);
  const t = useClock(!!sim.animated);
  const view = sim.view(v, hi, t);
  const answered = pick != null && sim.predict;

  return (
    <div className="space-y-4">
      {sim.predict && (
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{hi ? "पहले अनुमान लगाइए" : "Predict first"}</p>
          <p className="mt-1 font-medium text-ink">{hi ? sim.predict.hi : sim.predict.en}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sim.predict.options.map((o, i) => (
              <button key={i} onClick={() => setPick(i)} disabled={pick != null}
                className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", pick === i ? "border-sky-500 bg-sky-50 font-medium text-ink" : "border-line text-ink-2 hover:border-sky-300",
                  answered && i === sim.predict!.answer && "border-sage bg-sage-100 text-ink")}>{hi ? o[1] : o[0]}</button>
            ))}
          </div>
          {answered && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-3 flex gap-2 rounded-xl p-3 text-sm", pick === sim.predict!.answer ? "bg-sage-100" : "bg-marigold-100")}>
              {pick === sim.predict!.answer ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-marigold-600" />}
              <div>{pick === sim.predict!.answer ? (hi ? "सही! " : "Spot on! ") : (hi ? "इस बार नहीं। " : "Not quite. ")}{hi ? sim.predict!.whyHi : sim.predict!.why} {hi ? "नीचे स्लाइडर से जाँचिए।" : "Check it with the sliders below."}</div>
            </motion.div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {sim.params.map((p) => (
          <label key={p.k} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-sm">
            <span className="w-28 shrink-0 text-ink-2">{hi ? p.hi : p.en}</span>
            <input type="range" min={p.min} max={p.max} step={p.step} value={v[p.k]} onChange={(e) => setV((x) => ({ ...x, [p.k]: Number(e.target.value) }))} className="min-w-0 flex-1 accent-[var(--sky-600)]" />
            <span className="w-16 text-right font-mono text-ink">{v[p.k]}{p.unit && p.unit.length < 4 ? p.unit : ""}</span>
          </label>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl border border-line bg-surface">{view.svg}</svg>

      <div className="flex flex-wrap gap-2">
        {view.readouts.map(([k, val]) => (
          <span key={k} className="rounded-xl bg-paper-2 px-3 py-2 text-sm"><span className="text-ink-3">{k}: </span><span className="font-semibold text-ink">{val}</span></span>
        ))}
        <button onClick={() => { setV(init); setPick(null); }} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-ink-2 hover:text-ink">
          {sim.id === "probability" ? <Dices className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}{hi ? "फिर से" : "Reset"}
        </button>
      </div>
    </div>
  );
}

/** Sims for a class and (optionally) one subject name from the board syllabus. */
export function simsFor(grade: number | null, subject?: string | null) {
  return SIMS.filter((s) => (grade == null || s.grades.includes(grade)) && (!subject || AREA_SUBJECTS[s.area].includes(subject)));
}

/** Sims whose subject matches some text (a lesson's concepts or title). */
export function simsMatching(text: string) {
  const low = (text || "").toLowerCase();
  const words = (s: Sim) => `${s.en} ${s.id}`.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 3 && !["graph", "rate", "with", "your", "types"].includes(w));
  return SIMS.filter((s) => words(s).some((w) => low.includes(w.replace(/'s$/, ""))));
}
