/**
 * Question sources for Practice Lab games, picked by subject + chapter/topic.
 * Mathematics is generated (endless, always checkable); other subjects come
 * from a curated bank tagged by chapter keywords and class band.
 */

export type GameQ = { q: string; a: string; wrong: string[] };
type Fact = GameQ & { tags: string[]; g: [number, number] };

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const uniq = (right: string, cands: Array<string | number>) => [...new Set(cands.map(String))].filter((x) => x !== right).slice(0, 3);
function num(q: string, ans: number, near: number[] = []): GameQ {
  const a = String(ans);
  const pool = [...near, ans + 1, ans - 1, ans + 2, ans * 2, ans + 10, ans - 10].filter((x) => Number.isFinite(x));
  return { q, a, wrong: uniq(a, pool) };
}

/* ── Maths generators ──────────────────────────────────────────────────── */

const MATH: Array<{ keys: string[]; make: (grade: number) => GameQ }> = [
  { keys: ["integer", "zero", "negative"], make: () => { const a = ri(-20, 20), b = ri(-20, 20); return num(`${a} + (${b}) = ?`, a + b, [a - b, -(a + b)]); } },
  { keys: ["fraction"], make: () => { const d = ri(2, 9), a = ri(1, d - 1), b = ri(1, d - 1); const n = a + b, g = gcd(n, d); return { q: `${a}/${d} + ${b}/${d} = ?`, a: `${n / g}/${d / g}`, wrong: uniq(`${n / g}/${d / g}`, [`${n}/${2 * d}`, `${a * b}/${d}`, `${n + 1}/${d}`, `${n}/${d + 1}`]) }; } },
  { keys: ["decimal", "point"], make: () => { const a = ri(11, 99) / 10, b = ri(11, 99) / 10; const s = Math.round((a + b) * 10) / 10; return { q: `${a} + ${b} = ?`, a: String(s), wrong: uniq(String(s), [Math.round((s + 0.1) * 10) / 10, Math.round((s - 1) * 10) / 10, Math.round((a * b) * 10) / 10, Math.round((s + 1) * 10) / 10]) }; } },
  { keys: ["percent", "profit", "discount", "disguise"], make: () => { const p = [5, 10, 20, 25, 50][ri(0, 4)], n = ri(2, 20) * 20; return num(`${p}% of ${n} = ?`, (p * n) / 100, [(p * n) / 10, n - p, p + n / 10]); } },
  { keys: ["interest"], make: () => { const P = ri(1, 10) * 1000, R = ri(2, 12), T = ri(1, 5); return num(`Simple interest on ₹${P} at ${R}% for ${T} years = ₹?`, (P * R * T) / 100, [(P * R) / 100, P * R * T, (P * T) / 100]); } },
  { keys: ["square", "root", "cube"], make: (g) => { if (g >= 8 && Math.random() < 0.4) { const n = ri(2, 10); return num(`∛${n ** 3} = ?`, n, [n * n, n + 1, 3 * n]); } const n = ri(4, 25); return num(`√${n * n} = ?`, n, [n * 2, n + 2, n - 1]); } },
  { keys: ["exponent", "power", "indices"], make: () => { const b = ri(2, 5), m = ri(2, 4), n = ri(1, 3); return { q: `${b}^${m} × ${b}^${n} = ${b}^?`, a: String(m + n), wrong: uniq(String(m + n), [m * n, m - n, m + n + 1]) }; } },
  { keys: ["prime", "factor", "multiple", "hcf", "lcm", "common ground"], make: () => { const a = ri(2, 12) * ri(1, 4), b = ri(2, 12) * ri(1, 4); return Math.random() < 0.5 ? num(`HCF of ${a} and ${b} = ?`, gcd(a, b), [Math.min(a, b), 1, gcd(a, b) * 2]) : num(`LCM of ${a} and ${b} = ?`, (a * b) / gcd(a, b), [a * b, a + b, Math.max(a, b)]); } },
  { keys: ["equation", "unknown", "variable", "letter", "algebra", "linear"], make: () => { const x = ri(-9, 12), a = ri(2, 9), b = ri(-15, 15); return num(`Solve: ${a}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${a * x + b}. x = ?`, x, [-x, x + a, a * x]); } },
  { keys: ["quadratic"], make: () => { const p = ri(1, 7), q = ri(1, 7); return { q: `Roots of x² − ${p + q}x + ${p * q} = 0?`, a: `${Math.min(p, q)} and ${Math.max(p, q)}`, wrong: uniq(`${Math.min(p, q)} and ${Math.max(p, q)}`, [`−${p} and −${q}`, `${p + q} and ${p * q}`, `${p} and ${p * q}`]) }; } },
  { keys: ["progression", "sequence", "pattern"], make: () => { const a = ri(1, 20), d = ri(2, 9), n = ri(5, 15); return num(`AP: ${a}, ${a + d}, ${a + 2 * d}, … What is term ${n}?`, a + (n - 1) * d, [a + n * d, a * n, a + (n - 2) * d]); } },
  { keys: ["angle", "lines", "triangle", "intersecting", "parallel"], make: () => { const A = ri(30, 80), B = ri(30, 80); return num(`A triangle has angles ${A}° and ${B}°. Third angle = ?°`, 180 - A - B, [180 - A, A + B, 90 - A]); } },
  { keys: ["area", "perimeter", "mensuration", "trapezium", "polygon"], make: () => { const l = ri(3, 20), w = ri(2, 15); return Math.random() < 0.5 ? num(`Area of a ${l} m × ${w} m rectangle = ? m²`, l * w, [2 * (l + w), l + w, l * w + l]) : num(`Perimeter of a ${l} m × ${w} m rectangle = ? m`, 2 * (l + w), [l * w, l + w, 4 * l]); } },
  { keys: ["pythagoras", "baudhayana", "right"], make: () => { const k = ri(1, 4), [a, b, c] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10]][ri(0, 3)]; return num(`Right triangle with legs ${a * k} and ${b * k}. Hypotenuse = ?`, c * k, [(a + b) * k, c * k + 1, b * k + 1]); } },
  { keys: ["trigonometr", "heights", "distances"], make: () => { const t = [["sin 30°", "1/2"], ["cos 60°", "1/2"], ["tan 45°", "1"], ["sin 90°", "1"], ["cos 0°", "1"], ["sin 60°", "√3/2"], ["tan 60°", "√3"], ["cos 30°", "√3/2"], ["tan 30°", "1/√3"]][ri(0, 8)]; return { q: `${t[0]} = ?`, a: t[1], wrong: uniq(t[1], ["1/2", "1", "√3/2", "√3", "0", "1/√3", "√2"]) }; } },
  { keys: ["probability", "chance"], make: () => { const n = [6, 52, 2][ri(0, 2)]; return n === 6 ? { q: "P(getting an even number on a die) = ?", a: "1/2", wrong: ["1/6", "1/3", "2/3"] } : n === 2 ? { q: "P(head) when tossing a fair coin = ?", a: "1/2", wrong: ["1", "0", "1/4"] } : { q: "P(drawing an ace from 52 cards) = ?", a: "1/13", wrong: ["1/52", "4/13", "1/4"] }; } },
  { keys: ["ratio", "proportion", "proportional", "variation"], make: () => { const a = ri(2, 9), b = ri(2, 9), k = ri(2, 8); return num(`If ${a} pens cost ₹${a * b * k}, ${b} pens cost ₹?`, b * b * k, [a * b * k, b * k, a * k]); } },
  { keys: ["data", "mean", "statistic", "median", "dots"], make: () => { const xs = Array.from({ length: 5 }, () => ri(1, 20)); const s = xs.reduce((p, c) => p + c, 0); const m = s / 5; return Number.isInteger(m) ? num(`Mean of ${xs.join(", ")} = ?`, m, [Math.max(...xs), s, Math.min(...xs)]) : num(`Sum of ${xs.join(", ")} = ?`, s, [s + 5, s - 3, s * 2]); } },
];

function mathQ(text: string, grade: number): GameQ {
  const low = text.toLowerCase();
  const pool = MATH.filter((m) => m.keys.some((k) => low.includes(k)));
  const pick = (pool.length ? pool : MATH.slice(0, 8))[ri(0, (pool.length ? pool : MATH.slice(0, 8)).length - 1)];
  return pick.make(grade);
}

/* ── curated bank for other subjects ──────────────────────────────────── */

const F = (q: string, a: string, wrong: string[], tags: string[], g: [number, number]): Fact => ({ q, a, wrong, tags, g });
const BANK: Record<string, Fact[]> = {
  physics: [
    F("SI unit of force", "newton", ["joule", "watt", "pascal"], ["force", "motion", "laws"], [6, 10]),
    F("SI unit of length", "metre", ["kilogram", "second", "litre"], ["measure", "length", "quantit"], [6, 9]),
    F("Ohm's law", "V = IR", ["P = VI", "F = ma", "V = I/R"], ["electric", "current", "circuit"], [7, 10]),
    F("Unit of resistance", "ohm", ["ampere", "volt", "coulomb"], ["electric", "resist"], [8, 10]),
    F("Speed of light in vacuum", "3 × 10⁸ m/s", ["3 × 10⁵ m/s", "340 m/s", "3 × 10⁶ m/s"], ["light", "reflect", "refract"], [8, 10]),
    F("Image in a plane mirror is", "virtual and erect", ["real and inverted", "real and erect", "magnified"], ["light", "mirror", "reflect", "shadow"], [6, 10]),
    F("A convex lens is also called a", "converging lens", ["diverging lens", "plane lens", "prism"], ["lens", "light", "refract"], [8, 10]),
    F("Sound cannot travel through", "vacuum", ["water", "steel", "air"], ["sound"], [8, 10]),
    F("Human audible range", "20 Hz – 20 kHz", ["2 Hz – 2 kHz", "200 Hz – 200 kHz", "20 kHz – 2 MHz"], ["sound"], [8, 10]),
    F("Acceleration due to gravity on Earth", "9.8 m/s²", ["98 m/s²", "1.6 m/s²", "0.98 m/s²"], ["gravit", "force"], [8, 10]),
    F("Work = ", "force × displacement", ["mass × velocity", "power × force", "force ÷ time"], ["work", "energy", "power"], [9, 10]),
    F("Momentum = ", "mass × velocity", ["mass × acceleration", "force × time²", "velocity ÷ mass"], ["motion", "laws", "force"], [9, 10]),
    F("Like magnetic poles", "repel", ["attract", "cancel", "do nothing"], ["magnet"], [6, 10]),
    F("A fuse works on the", "heating effect of current", ["magnetic effect", "chemical effect", "lighting effect"], ["electric", "household", "fuse"], [8, 10]),
    F("Pressure = ", "force ÷ area", ["force × area", "mass ÷ volume", "area ÷ force"], ["pressure", "fluid", "force"], [8, 10]),
    F("Heat transfer in solids is mainly by", "conduction", ["convection", "radiation", "evaporation"], ["heat", "temperature"], [7, 10]),
  ],
  chemistry: [
    F("pH of pure water", "7", ["0", "14", "1"], ["acid", "base", "substance", "ph"], [7, 10]),
    F("Lemon juice is", "acidic", ["basic", "neutral", "salty"], ["acid", "substance"], [7, 10]),
    F("Chemical symbol of sodium", "Na", ["S", "So", "Sd"], ["element", "symbol", "language", "atom"], [7, 10]),
    F("Rusting of iron needs", "oxygen and water", ["only heat", "only light", "nitrogen"], ["change", "rust", "metal", "corrosion"], [7, 10]),
    F("Gas that turns lime water milky", "carbon dioxide", ["oxygen", "hydrogen", "nitrogen"], ["air", "carbon", "reaction"], [7, 10]),
    F("Most abundant gas in air", "nitrogen", ["oxygen", "carbon dioxide", "argon"], ["air", "atmosphere"], [6, 9]),
    F("Separating salt from sea water uses", "evaporation", ["filtration", "magnetism", "winnowing"], ["separat", "mixture"], [6, 9]),
    F("Valency of carbon", "4", ["2", "1", "3"], ["carbon", "atom", "bond", "valency"], [8, 10]),
    F("Atomic number = number of", "protons", ["neutrons", "nucleons", "molecules"], ["atom", "structure"], [8, 10]),
    F("Ethanoic acid is found in", "vinegar", ["lemon", "curd", "soap"], ["carbon", "acid", "compound"], [10, 10]),
    F("Metals are generally", "good conductors", ["brittle", "insulators", "dull"], ["metal"], [7, 10]),
    F("A mixture of two liquids that mix completely forms a", "solution", ["suspension", "colloid", "compound"], ["solution", "solute", "mixture", "pure"], [8, 9]),
    F("Melting point of ice", "0 °C", ["100 °C", "−10 °C", "4 °C"], ["matter", "state", "water"], [6, 9]),
  ],
  biology: [
    F("Powerhouse of the cell", "mitochondria", ["nucleus", "ribosome", "vacuole"], ["cell", "unit of life"], [8, 10]),
    F("Green pigment in leaves", "chlorophyll", ["haemoglobin", "melanin", "keratin"], ["photosynth", "plant", "leaf", "life process"], [6, 10]),
    F("Plants make food by", "photosynthesis", ["respiration", "transpiration", "digestion"], ["plant", "photosynth", "nutrition"], [6, 10]),
    F("Vitamin C deficiency causes", "scurvy", ["rickets", "night blindness", "beriberi"], ["food", "eating", "nutrition", "health"], [6, 8]),
    F("Blood is pumped by the", "heart", ["lungs", "kidney", "liver"], ["circulat", "life process", "transport"], [7, 10]),
    F("Filtering unit of the kidney", "nephron", ["neuron", "alveolus", "villus"], ["excret", "kidney"], [7, 10]),
    F("Basic unit of the nervous system", "neuron", ["nephron", "cell wall", "stomata"], ["nervous", "control", "coordination"], [7, 10]),
    F("Pores on leaves for gas exchange", "stomata", ["xylem", "phloem", "roots"], ["plant", "transpir", "leaf"], [7, 10]),
    F("Father of genetics", "Gregor Mendel", ["Charles Darwin", "Robert Hooke", "Louis Pasteur"], ["hered", "genetic"], [10, 10]),
    F("Microbe used to make curd", "Lactobacillus", ["Rhizobium", "Plasmodium", "Yeast"], ["micro", "invisible"], [8, 8]),
    F("A food chain starts with a", "producer", ["herbivore", "carnivore", "decomposer"], ["ecosystem", "food chain", "environment", "harmony"], [6, 10]),
    F("Vaccines help build", "immunity", ["muscle", "fat", "bones"], ["health", "disease"], [8, 10]),
  ],
  history: [
    F("Harappan city with the Great Bath", "Mohenjo-daro", ["Lothal", "Kalibangan", "Delhi"], ["harappa", "civilisation", "beginnings"], [6, 9]),
    F("Ashoka's change of heart came after the war of", "Kalinga", ["Panipat", "Plassey", "Haldighati"], ["maurya", "empire", "ashoka"], [6, 9]),
    F("The 'Golden Age' of ancient India", "the Gupta era", ["the Mughal era", "the Vedic age", "the Maratha era"], ["gupta"], [7, 9]),
    F("Founder of the Maratha kingdom", "Shivaji", ["Akbar", "Ranjit Singh", "Tipu Sultan"], ["maratha"], [7, 8]),
    F("The First War of Independence", "1857", ["1757", "1947", "1919"], ["1857", "revolt", "colonial", "national"], [8, 10]),
    F("Dandi March was against the", "salt tax", ["partition", "Rowlatt Act", "Simon Commission"], ["gandhi", "civil disobedience", "nationalism", "national movement"], [8, 10]),
    F("The French Revolution began in", "1789", ["1857", "1917", "1776"], ["french"], [9, 9]),
    F("Leader of the Russian Revolution of 1917", "Lenin", ["Hitler", "Napoleon", "Mussolini"], ["russia", "socialism"], [9, 9]),
    F("Quit India Movement year", "1942", ["1930", "1920", "1947"], ["gandhi", "quit", "national"], [8, 10]),
    F("Akbar's policy of religious tolerance", "Sulh-i-kul", ["Doctrine of Lapse", "Subsidiary Alliance", "Zabt"], ["mughal"], [7, 9]),
  ],
  civics: [
    F("India's Constitution came into force on", "26 January 1950", ["15 August 1947", "26 November 1949", "2 October 1950"], ["constitution"], [7, 10]),
    F("Village-level local government", "Gram Panchayat", ["Municipal Corporation", "Lok Sabha", "Rajya Sabha"], ["local", "rural", "panchayat", "grassroots"], [6, 9]),
    F("Minimum voting age in India", "18 years", ["21 years", "16 years", "25 years"], ["franchise", "elect", "vote"], [8, 10]),
    F("Elections in India are conducted by the", "Election Commission", ["Supreme Court", "Parliament", "President"], ["elect", "franchise"], [8, 10]),
    F("Lower house of Parliament", "Lok Sabha", ["Rajya Sabha", "Vidhan Sabha", "Gram Sabha"], ["parliament", "legislature", "union"], [8, 10]),
    F("Sharing power between Centre and States is", "federalism", ["monarchy", "dictatorship", "communalism"], ["federal", "power sharing"], [10, 10]),
    F("Money lent by banks and co-operatives is", "formal credit", ["informal credit", "barter", "dividend"], ["money", "credit"], [7, 10]),
    F("Farming is in the", "primary sector", ["secondary sector", "tertiary sector", "service sector"], ["sector", "economic", "work"], [6, 10]),
    F("A consumer complaint goes to a", "consumer court", ["police station", "gram sabha", "bank"], ["consumer"], [10, 10]),
  ],
  geography: [
    F("Imaginary line at 0° latitude", "Equator", ["Prime Meridian", "Tropic of Cancer", "Arctic Circle"], ["latitude", "globe", "locating", "earth"], [6, 9]),
    F("India's standard meridian", "82½° E", ["0°", "90° E", "75° E"], ["longitude", "india", "location", "size"], [6, 10]),
    F("Largest ocean", "Pacific", ["Atlantic", "Indian", "Arctic"], ["ocean", "continent", "water"], [6, 9]),
    F("Rainfall in most of India comes from the", "south-west monsoon", ["western disturbances", "trade winds only", "north-east monsoon"], ["climate", "monsoon", "weather"], [7, 10]),
    F("Highest mountain range", "the Himalayas", ["the Western Ghats", "the Aravallis", "the Vindhyas"], ["landform", "physical", "mountain", "diversity"], [6, 10]),
    F("Black soil is best for", "cotton", ["tea", "rice", "coffee"], ["soil", "agriculture", "resource"], [8, 10]),
    F("Day and night are caused by Earth's", "rotation", ["revolution", "tilt only", "orbit around the Moon"], ["rotation", "revolution", "earth"], [6, 9]),
    F("A renewable energy source", "solar energy", ["coal", "petroleum", "natural gas"], ["energy", "resource", "mineral"], [8, 10]),
    F("Largest Indian state by area", "Rajasthan", ["Madhya Pradesh", "Uttar Pradesh", "Maharashtra"], ["india", "size", "location"], [6, 10]),
  ],
  english: [
    F("Plural of 'child'", "children", ["childs", "childes", "childrens"], ["noun", "number"], [6, 8]),
    F("Past tense of 'go'", "went", ["goed", "gone", "going"], ["verb", "tense"], [6, 8]),
    F("'She ___ to school every day.'", "goes", ["go", "going", "gone"], ["tense", "verb", "agreement", "concord"], [6, 10]),
    F("Passive of 'Ravi wrote a letter'", "A letter was written by Ravi", ["A letter is written by Ravi", "Ravi was written a letter", "A letter wrote Ravi"], ["voice", "passive"], [7, 10]),
    F("Comparative of 'good'", "better", ["gooder", "best", "more good"], ["adjective", "comparison", "degree"], [6, 9]),
    F("'He said, \"I am tired.\"' becomes", "He said that he was tired.", ["He said that I am tired.", "He says he is tired.", "He said that he is tired yesterday."], ["speech", "reported", "narration"], [7, 10]),
    F("Article before 'hour'", "an", ["a", "the", "no article"], ["determiner", "article"], [6, 9]),
    F("'Quickly' is a(n)", "adverb", ["adjective", "noun", "verb"], ["adverb", "parts of speech"], [6, 8]),
    F("Modal for obligation", "must", ["might", "could", "may"], ["modal"], [7, 10]),
  ],
};

const AREA_OF: Record<string, string[]> = {
  Science: ["physics", "chemistry", "biology"], Physics: ["physics"], Chemistry: ["chemistry"], Biology: ["biology"],
  "Social Science": ["history", "geography", "civics"], "History & Civics": ["history", "civics"], Geography: ["geography"], English: ["english"],
};

export function makeQuestions(subject: string, text: string, grade: number, count = 10): GameQ[] {
  if (subject === "Mathematics") {
    const out: GameQ[] = [];
    for (let i = 0; i < count * 3 && out.length < count; i++) {
      const q = mathQ(text, grade);
      if (q.wrong.length >= 2 && !out.some((x) => x.q === q.q)) out.push(q);
    }
    return out;
  }
  const low = text.toLowerCase();
  const facts = (AREA_OF[subject] ?? Object.keys(BANK)).flatMap((k) => BANK[k] ?? []);
  const inBand = facts.filter((f) => grade >= f.g[0] - 1 && grade <= f.g[1] + 1);
  const onTopic = inBand.filter((f) => f.tags.some((t) => low.includes(t)));
  const pool = [...shuffle(onTopic), ...shuffle(inBand.filter((f) => !onTopic.includes(f)))];
  return pool.slice(0, count);
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Odd one out: three true "question → answer" pairs and one false pairing. Pick the false one. */
export function makeOddOne(qs: GameQ[]): { items: string[]; odd: number; explain: string } | null {
  if (qs.length < 3) return null;
  const pool = shuffle(qs).slice(0, 3);
  const victim = pool[Math.floor(Math.random() * 3)];
  const wrong = victim.wrong[0];
  if (!wrong) return null;
  const items = pool.map((q) => (q === victim ? `${q.q} → ${wrong}` : `${q.q} → ${q.a}`));
  const fourth = qs.find((q) => !pool.includes(q));
  if (fourth) items.push(`${fourth.q} → ${fourth.a}`);
  const order = shuffle(items.map((text, i) => ({ text, i })));
  const oddIdx = order.findIndex((x) => x.i === pool.indexOf(victim));
  return { items: order.map((x) => x.text), odd: oddIdx, explain: `${victim.q} → ${victim.a}` };
}

/** Key terms for word games: one-word answers from the bank for this subject. */
export function keyTerms(subject: string, text: string, grade: number, count = 6): Array<{ word: string; clue: string }> {
  const qs = makeQuestions(subject === "Mathematics" ? "Science" : subject, text, grade, 30);
  const terms = qs.map((q) => ({ word: q.a.replace(/[^A-Za-z]/g, ""), clue: q.q }))
    .filter((t) => t.word.length >= 4 && t.word.length <= 11 && !/\s/.test(t.word));
  const seen = new Set<string>();
  return shuffle(terms).filter((t) => (seen.has(t.word.toLowerCase()) ? false : (seen.add(t.word.toLowerCase()), true))).slice(0, count);
}
