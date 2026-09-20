import { formatMoney, localHour, type Persona } from "./personas";
import { between, chance, hashString, mulberry32, pick, shuffle, weighted, type Rand } from "./random";
import {
  AILMENTS,
  CUE_RE,
  EMOJI,
  EN,
  KEYWORDS,
  NATIVE,
  NEEDS,
  RELATIVES,
  SCRIPTURES,
  SCRIPTURE_RE,
  type Topic,
} from "./templates";

export type Focus = "auto" | "blessing" | "healing" | "miracle" | "offering" | "prayer";
export type Pace = "calm" | "normal" | "lively";
export type WaveKind = "arrival" | "ambient" | "reaction" | "cue" | "reply";

export type SimState = {
  recentTemplates: string[];
  recentPersonas: string[];
  clearedAtId?: number;
  lastReplyAt?: number;
};

export type SimInput = {
  now: number;
  hostName: string;
  brandName: string;
  title: string;
  tagline: string | null;
  topicText: string | null;
  transcript: string | null;
  focus: Focus;
  /** newest first */
  hostMessages: { body: string; at: number }[];
  /** newest first */
  realMessages: { name: string; body: string; at: number }[];
};

export type PlannedComment = {
  personaId: string;
  name: string;
  avatar: string;
  body: string;
  kind: "chat" | "reaction";
  offset: number;
  templateKey: string;
  meta: {
    sim: true;
    flag: string;
    country: string;
    code: string;
    city: string;
    personaId: string;
  };
};

export const PACES: Record<Pace, { min: number; max: number; burst: [number, number]; gap: [number, number] }> = {
  calm: { min: 12, max: 28, burst: [4, 10], gap: [2, 8] },
  normal: { min: 6, max: 16, burst: [8, 16], gap: [1, 4] },
  lively: { min: 3, max: 8, burst: [12, 24], gap: [1, 3] },
};

export function nextWaveDelay(pace: Pace, rand: Rand = Math.random) {
  const p = PACES[pace] ?? PACES.normal;
  return between(rand, p.min, p.max);
}

/* ------------------------------------------------------------ analysis */

type Analysis = {
  weights: Record<Topic, number>;
  cue: string | null;
  scripture: string | null;
  quote: string | null;
  hostRecent: boolean;
};

function extractQuote(text: string, rand: Rand): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 12) return null;
  const sentences = cleaned
    .split(/(?<=[.!?])\s+|\n+|\s+[—–-]\s+/)
    .map((s) => s.replace(/^["'“”]+|["'“”]+$/g, "").trim())
    .filter((s) => s.length >= 12 && !/^(type|say|shout|comment)\b/i.test(s));
  const source = sentences.length > 0 ? pick(rand, sentences) : cleaned;
  let quote = source.replace(/[.!?,;:]+$/g, "");
  if (quote.length > 72) {
    const cut = quote.slice(0, 72);
    quote = `${cut.slice(0, Math.max(30, cut.lastIndexOf(" ")))}…`;
  }
  return quote;
}

function formatScripture(match: RegExpMatchArray) {
  const book = match[1].replace(/\s+/g, " ").trim();
  const chapter = match[2];
  const verse = match[3] ? `:${match[3]}${match[4] ? `-${match[4]}` : ""}` : "";
  return `${book[0].toUpperCase()}${book.slice(1)} ${chapter}${verse}`;
}

export function analyze(input: SimInput, rand: Rand): Analysis {
  const weights: Record<Topic, number> = {
    greeting: 12,
    worship: 22,
    blessing: 20,
    healing: 10,
    miracle: 9,
    offering: 8,
    prayer: 8,
    scripture: 4,
    echo: 0,
    reply: 0,
    cue: 0,
  };

  const recentHost = input.hostMessages.filter((m) => input.now - m.at < 6 * 60_000);
  const hostRecent = recentHost.length > 0;
  const contextBlob = [
    input.topicText ?? "",
    input.transcript ?? "",
    input.tagline ?? "",
    input.title,
    ...recentHost.slice(0, 4).map((m) => m.body),
  ]
    .join(" \n ")
    .trim();

  for (const [topic, re] of Object.entries(KEYWORDS) as [Topic, RegExp][]) {
    const hits = contextBlob.match(new RegExp(re.source, "gi"))?.length ?? 0;
    if (hits === 0) continue;
    const boost = topic === "offering" ? 3.5 : topic === "healing" ? 3 : topic === "miracle" ? 3 : 2;
    weights[topic] *= Math.min(boost * 1.4, boost + hits * 0.35);
  }

  if (input.focus !== "auto") {
    // Make the chosen theme roughly 55% of everything that is said.
    const others = (Object.keys(weights) as Topic[])
      .filter((t) => t !== input.focus)
      .reduce((sum, t) => sum + weights[t], 0);
    weights[input.focus] = others * 1.25;
  }

  const quoteSource =
    recentHost[0]?.body ??
    (input.topicText && input.topicText.length >= 12 ? input.topicText : null) ??
    (input.transcript && input.transcript.length >= 40
      ? input.transcript.slice(-220)
      : null);
  const quote = quoteSource ? extractQuote(quoteSource, rand) : null;
  if (quote) weights.echo = hostRecent ? 16 : 5;

  const cueMatch = (recentHost[0]?.body ?? "").match(CUE_RE);
  const cue = cueMatch ? cueMatch[1].trim().replace(/\s+/g, " ") : null;

  const scriptureMatch = contextBlob.match(SCRIPTURE_RE);
  const scripture = scriptureMatch ? formatScripture(scriptureMatch) : null;
  if (scripture) weights.scripture = 12;

  return { weights, cue, scripture, quote, hostRecent };
}

/* ------------------------------------------------------------ fillers */

function honorifics(hostName: string, brandName: string) {
  const blob = `${brandName} ${hostName}`;
  const titleMatch = blob.match(/\b(Apostle|Prophet(?:ess)?|Bishop|Pastor|Evangelist|Reverend|Rev\.?|Dr\.?|Archbishop|Overseer)\b/i);
  const title = titleMatch
    ? titleMatch[1].replace(/\.$/, "").replace(/^rev$/i, "Rev").replace(/^\w/, (c) => c.toUpperCase())
    : "Pastor";
  const firstName =
    hostName
      .split(/\s+/)
      .filter((w) => w && !/^(Apostle|Prophet(?:ess)?|Bishop|Pastor|Evangelist|Reverend|Rev\.?|Dr\.?|Archbishop|Overseer)$/i.test(w))[0] ?? "";
  const list = [title, title, title, "Papa", "Man of God", "Daddy", "Sir", "Man of God"];
  if (firstName) list.push(`${title} ${firstName}`, `${title} ${firstName}`, `Papa ${firstName}`);
  return list;
}

function dayPart(hour: number) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function clockTime(hour: number) {
  const h = Math.floor(hour) % 24;
  const suffix = h >= 12 ? "pm" : "am";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
}

function fill(
  template: string,
  persona: Persona,
  input: SimInput,
  analysis: Analysis,
  rand: Rand,
  extra: { name?: string } = {},
) {
  const hon = honorifics(input.hostName, input.brandName);
  const honorific = hon[persona.style.honorific % hon.length];
  const hour = localHour(persona, input.now);
  return template
    .replace(/\{A\}/g, honorific)
    .replace(/\{city\}/g, persona.city)
    .replace(/\{country\}/g, persona.country)
    .replace(/\{amount\}/g, formatMoney(persona, rand))
    .replace(/\{relative\}/g, pick(rand, RELATIVES))
    .replace(/\{ailment\}/g, pick(rand, AILMENTS))
    .replace(/\{need\}/g, pick(rand, NEEDS))
    .replace(/\{years\}/g, String(between(rand, 2, 12)))
    .replace(/\{n\}/g, String(between(rand, 2, 9)))
    .replace(/\{time\}/g, clockTime(hour))
    .replace(/\{daypart\}/g, dayPart(hour))
    .replace(/\{scripture\}/g, analysis.scripture && chance(rand, 0.7) ? analysis.scripture : pick(rand, SCRIPTURES))
    .replace(/\{quote\}/g, analysis.quote ?? "this word")
    .replace(/\{name\}/g, extra.name ?? "friend");
}

/* ------------------------------------------------------------ humanize */

function addTypo(text: string, rand: Rand) {
  const words = text.split(" ");
  const candidates = words
    .map((w, i) => [w, i] as const)
    .filter(([w]) => /^[a-z]{5,}$/i.test(w) && !w.includes("@"));
  if (candidates.length === 0) return text;
  const [word, index] = pick(rand, candidates);
  const pos = between(rand, 1, word.length - 2);
  const swapped = word.slice(0, pos) + word[pos + 1] + word[pos] + word.slice(pos + 2);
  words[index] = swapped;
  return words.join(" ");
}

function humanize(text: string, persona: Persona, topic: Topic, rand: Rand) {
  let out = text;
  if (persona.style.emoji > 0 && !/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(out.slice(-3))) {
    const count = between(rand, 1, persona.style.emoji);
    if (chance(rand, 0.7)) {
      out += ` ${Array.from({ length: count }, () => pick(rand, EMOJI[topic])).join("")}`;
    }
  }
  if (chance(rand, 0.12)) out = out.replace(/\bamen\b/i, (m) => (m[0] === "A" ? "Ameeen" : "ameeen"));
  if (chance(rand, 0.15) && /!$/.test(out)) out += "!".repeat(between(rand, 1, 3));
  if (persona.style.typo && chance(rand, 0.5)) out = addTypo(out, rand);
  if (persona.style.caps && chance(rand, 0.7)) out = out.toUpperCase();
  else if (persona.style.lower && chance(rand, 0.8)) out = out.toLowerCase();
  return out.slice(0, 220);
}

/* ------------------------------------------------------------ compose */

function templateFor(
  topic: Topic,
  persona: Persona,
  analysis: Analysis,
  recent: Set<string>,
  rand: Rand,
): { text: string; key: string } | null {
  const native = NATIVE[persona.lang]?.[topic];
  const useNative = Boolean(native && native.length > 0 && persona.style.native && chance(rand, 0.75));
  const pool = useNative && native ? native : EN[topic];
  const prefix = useNative ? `${persona.lang}:${topic}` : `en:${topic}`;
  if (!pool || pool.length === 0) return null;
  const order = shuffle(rand, pool.map((_, i) => i));
  const fresh = order.find((i) => !recent.has(`${prefix}:${i}`)) ?? order[0];
  return { text: pool[fresh], key: `${prefix}:${fresh}` };
}

function cueVariants(cue: string, persona: Persona, input: SimInput, analysis: Analysis, rand: Rand) {
  const hon = honorifics(input.hostName, input.brandName);
  const honorific = hon[persona.style.honorific % hon.length];
  const base = cue.replace(/\s+/g, " ").trim();
  const variants = [
    base,
    base.toUpperCase(),
    `${base}!!!`,
    `${base} 🙏`,
    `${base.toUpperCase()}!!`,
    `${base} ${base}`,
    `${base} ${honorific}!`,
    `${base} 🔥🔥`,
    `${base} for my family`,
    `${base}!! I receive it`,
    `${base} from ${persona.city}`,
  ];
  void analysis;
  return pick(rand, variants);
}

function pickPersona(roster: Persona[], recent: string[], used: Set<string>, rand: Rand) {
  if (roster.length === 0) return undefined;
  const avoid = new Set([...recent, ...used]);
  const fresh = roster.filter((p) => !avoid.has(p.id));
  if (fresh.length > 0) return pick(rand, fresh);
  const unused = roster.filter((p) => !used.has(p.id));
  if (unused.length > 0) return pick(rand, unused);
  return pick(rand, roster);
}

export function composeWave(
  input: SimInput,
  roster: Persona[],
  state: SimState,
  opts: { kind: WaveKind; pace: Pace; count?: number; replyTo?: { name: string; body: string }; rand?: Rand },
): { comments: PlannedComment[]; state: SimState } {
  const rand = opts.rand ?? mulberry32((hashString(`${input.now}`) ^ (Date.now() >>> 0)) >>> 0);
  const analysis = analyze(input, rand);
  const pace = PACES[opts.pace] ?? PACES.normal;
  const recentTemplates = new Set(state.recentTemplates ?? []);
  const recentPersonas = state.recentPersonas ?? [];
  const used = new Set<string>();
  const comments: PlannedComment[] = [];

  let count = opts.count ?? between(rand, pace.burst[0], pace.burst[1]);
  let topics: Topic[] = [];

  if (opts.kind === "cue" && analysis.cue) {
    count = opts.count ?? between(rand, 3, 6);
    topics = Array.from({ length: count }, () => "cue" as Topic);
  } else if (opts.kind === "reaction") {
    count = opts.count ?? between(rand, 1, 3);
    topics = Array.from({ length: count }, () =>
      weighted(rand, [
        ["echo", analysis.quote ? 55 : 0],
        ["worship", 25],
        [weighted(rand, (Object.keys(analysis.weights) as Topic[]).filter((t) => !["echo", "reply", "cue", "greeting"].includes(t)).map((t) => [t, analysis.weights[t]] as const)), 20],
      ] as const),
    );
  } else if (opts.kind === "reply" && opts.replyTo) {
    count = 1;
    topics = ["reply"];
  } else if (opts.kind === "arrival") {
    count = opts.count ?? between(rand, 2, 3);
    topics = Array.from({ length: count }, (_, i) => (i === 0 ? "greeting" : weighted(rand, [["greeting", 40], ["worship", 30], ["blessing", 30]] as const)));
  } else {
    const entries = (Object.keys(analysis.weights) as Topic[])
      .filter((t) => t !== "reply" && t !== "cue")
      .map((t) => [t, analysis.weights[t]] as const);
    topics = Array.from({ length: count }, () => weighted(rand, entries));
  }

  let offset =
    opts.kind === "reaction"
      ? between(rand, 5, 25)
      : opts.kind === "reply"
        ? between(rand, 8, 45)
        : opts.kind === "cue"
          ? between(rand, 3, 9)
          : between(rand, 2, 10);

  for (const topic of topics) {
    const persona = pickPersona(roster, recentPersonas, used, rand);
    if (!persona) break;
    used.add(persona.id);

    let body: string;
    let key: string;
    if (topic === "cue" && analysis.cue) {
      body = cueVariants(analysis.cue, persona, input, analysis, rand);
      key = `cue:${analysis.cue.toLowerCase()}`;
    } else {
      const chosen = templateFor(topic, persona, analysis, recentTemplates, rand);
      if (!chosen) continue;
      body = fill(chosen.text, persona, input, analysis, rand, { name: opts.replyTo?.name });
      key = chosen.key;
      body = humanize(body, persona, topic, rand);
    }
    recentTemplates.add(key);

    comments.push({
      personaId: persona.id,
      name: persona.name,
      avatar: persona.avatar,
      body,
      kind: "chat",
      offset,
      templateKey: key,
      meta: {
        sim: true,
        flag: persona.flag,
        country: persona.country,
        code: persona.code,
        city: persona.city,
        personaId: persona.id,
      },
    });
    offset += opts.kind === "cue" ? between(rand, 2, 8) : between(rand, pace.gap[0], pace.gap[1]);
  }

  // A floating reaction now and then makes the wave feel alive.
  if (opts.kind !== "reply" && chance(rand, 0.35)) {
    const persona = pickPersona(roster, recentPersonas, used, rand);
    if (persona) {
      comments.push({
        personaId: persona.id,
        name: persona.name,
        avatar: persona.avatar,
        body: pick(rand, ["❤️", "🔥", "🙏", "👏", "🎉"]),
        kind: "reaction",
        offset: between(rand, 1, Math.max(2, offset)),
        templateKey: "reaction",
        meta: {
          sim: true,
          flag: persona.flag,
          country: persona.country,
          code: persona.code,
          city: persona.city,
          personaId: persona.id,
        },
      });
    }
  }

  const nextState: SimState = {
    ...state,
    recentTemplates: Array.from(recentTemplates).slice(-60),
    recentPersonas: [...recentPersonas, ...comments.map((c) => c.personaId)].slice(-14),
  };
  return { comments, state: nextState };
}

export function detectCue(text: string) {
  const match = text.match(CUE_RE);
  return match ? match[1].trim() : null;
}
