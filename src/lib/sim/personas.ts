import { between, chance, hashString, mulberry32, pick, weighted, type Rand } from "./random";

export type Lang =
  | "en"
  | "es"
  | "pt"
  | "fr"
  | "sw"
  | "tw"
  | "pcm"
  | "tl"
  | "ko"
  | "de"
  | "it"
  | "nl";

export type Region = {
  code: string;
  country: string;
  flag: string;
  lang: Lang;
  weight: number;
  tz: number;
  cur: [string, string];
  amounts: number[];
  cities: string[];
  first: string[];
  last: string[];
};

const r = (
  code: string,
  country: string,
  flag: string,
  lang: Lang,
  weight: number,
  tz: number,
  cur: [string, string],
  amounts: number[],
  cities: string,
  first: string,
  last: string,
): Region => ({
  code,
  country,
  flag,
  lang,
  weight,
  tz,
  cur,
  amounts,
  cities: cities.split(",").map((s) => s.trim()),
  first: first.split(",").map((s) => s.trim()),
  last: last.split(",").map((s) => s.trim()),
});

export const REGIONS: Region[] = [
  // West & Central Africa (large diaspora watching church broadcasts)
  r(
    "GH",
    "Ghana",
    "🇬🇭",
    "en",
    26,
    0,
    ["GH₵", ""],
    [50, 100, 200, 500, 1000],
    "Accra, Kumasi, Takoradi, Tema, Cape Coast, Sunyani, Koforidua, Tamale",
    "Kwame, Kofi, Kojo, Kwabena, Yaw, Kwaku, Akosua, Abena, Yaa, Afia, Ama, Nana, Bright, Emmanuel, Samuel, Daniel, Grace, Mercy, Patience, Rejoice, Faith, Isaac, Prince, Gideon",
    "Mensah, Osei, Appiah, Boateng, Frimpong, Agyemang, Owusu, Asare, Antwi, Baah, Darko, Kwarteng, Addo, Boakye, Amponsah, Acheampong, Sarpong, Twumasi",
  ),
  r(
    "NG",
    "Nigeria",
    "🇳🇬",
    "en",
    24,
    1,
    ["₦", ""],
    [2000, 5000, 10000, 25000, 50000],
    "Lagos, Abuja, Port Harcourt, Ibadan, Benin City, Enugu, Kano, Asaba",
    "Chinedu, Emeka, Ngozi, Ifeoma, Tunde, Femi, Blessing, Chioma, Praise, Miracle, Goodness, Ebuka, Olumide, Adebayo, Funke, Yetunde, Kemi, Victor, David, Esther, Joy",
    "Okonkwo, Adeleke, Balogun, Eze, Okafor, Nwosu, Adeyemi, Ibrahim, Danjuma, Chukwu, Okeke, Oladipo, Babatunde, Anyanwu, Nnamdi",
  ),
  r(
    "UK",
    "United Kingdom",
    "🇬🇧",
    "en",
    14,
    0,
    ["£", ""],
    [10, 20, 50, 100, 250],
    "London, Birmingham, Manchester, Leeds, Milton Keynes, Luton, Croydon",
    "David, James, Sarah, Rachel, Michael, Daniel, Rebecca, Hannah, Sophie, Matthew, Benjamin, Joshua, Grace, Abigail, Luke, Mary, John",
    "Smith, Jones, Taylor, Williams, Brown, Davies, Evans, Wilson, Johnson, Clark, Walker, Wright, Robinson",
  ),
  r(
    "US",
    "United States",
    "🇺🇸",
    "en",
    14,
    -5,
    ["$", ""],
    [20, 50, 100, 200, 500],
    "Atlanta, Houston, Dallas, New York, Chicago, Charlotte, Philadelphia, Miami",
    "Marcus, Darius, Anthony, Brandon, Jordan, Destiny, Tanisha, Keisha, Jasmine, Malik, Isaiah, Jeremiah, Caleb, Elijah, Faith, Hope, Charity",
    "Johnson, Washington, Williams, Jackson, Davis, Brown, Harris, Robinson, Thomas, Walker, Young, Allen, King, Wright",
  ),
  r(
    "ZA",
    "South Africa",
    "🇿🇦",
    "en",
    7,
    2,
    ["R", ""],
    [100, 250, 500, 1000, 2000],
    "Johannesburg, Cape Town, Durban, Pretoria, Soweto, Port Elizabeth",
    "Sipho, Thabo, Lerato, Nandi, Bongiwe, Mandla, Kagiso, Bongani, Zanele, Mpho, Nomsa, Khanyi, Sibusiso, Thandi",
    "Dlamini, Ndlovu, Khumalo, Sithole, Mthembu, Zulu, Buthelezi, Moeketsi, Mabaso, Van der Merwe, Botha",
  ),
  r(
    "KE",
    "Kenya",
    "🇰🇪",
    "sw",
    5,
    3,
    ["KSh", ""],
    [500, 1000, 2500, 5000, 10000],
    "Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Thika",
    "Brian, Kevin, Dennis, Wanjiku, Achieng, Mwangi, Kamau, Otieno, Ochieng, Faith, Mercy, Grace, Victor, John, Peter",
    "Mwangi, Kamau, Otieno, Kiprop, Ochieng, Waweru, Kariuki, Kimani, Mutua, Odhiambo",
  ),
  r(
    "CA",
    "Canada",
    "🇨🇦",
    "en",
    4,
    -5,
    ["CA$", ""],
    [25, 50, 100, 200, 300],
    "Toronto, Brampton, Mississauga, Ottawa, Calgary, Edmonton, Montreal",
    "Lucas, Nathan, Liam, Emma, Chloe, Jessica, Tyler, Justin, Brandon, Olivia, Ethan, Noah, Grace",
    "Tremblay, Roy, Gagnon, Lee, MacDonald, Campbell, Wilson, Anderson, Taylor, Martin",
  ),
  r(
    "EU",
    "Europe (Diaspora)",
    "🇪🇺",
    "de",
    3,
    1,
    ["€", ""],
    [20, 50, 100, 200],
    "Frankfurt, Amsterdam, Paris, Hamburg, Brussels, Rome, Vienna",
    "Christian, Patrick, Eric, Marc, Paul, Thomas, Laura, Sophie, Anna, Marie, Felix, Lukas",
    "Müller, Schmidt, Schneider, Fischer, Weber, Meyer, Wagner, Becker, Schulz, Hoffmann",
  ),
  r(
    "BR",
    "Brazil",
    "🇧🇷",
    "pt",
    3,
    -3,
    ["R$", ""],
    [50, 100, 200, 500],
    "São Paulo, Rio de Janeiro, Salvador, Belo Horizonte, Curitiba, Recife",
    "Gabriel, Lucas, Matheus, Rafael, Thiago, Beatriz, Camila, Juliana, Larissa, Mariana, Felipe, Rodrigo",
    "Silva, Santos, Oliveira, Souza, Rodrigues, Ferreira, Alves, Pereira, Lima, Gomes, Costa, Ribeiro",
  ),
];

export type PersonaStyle = {
  caps: boolean;
  lower: boolean;
  emoji: number;
  typo: boolean;
  native: boolean;
  honorific: number;
};

export type Persona = {
  id: string;
  name: string;
  first: string;
  initials: string;
  country: string;
  code: string;
  flag: string;
  city: string;
  lang: Lang;
  tz: number;
  cur: [string, string];
  amounts: number[];
  avatar: string;
  style: PersonaStyle;
};

const NATIVE_PROBABILITY: Record<Lang, number> = {
  en: 0.1,
  es: 0.5,
  pt: 0.5,
  fr: 0.45,
  sw: 0.35,
  tw: 0.35,
  pcm: 0.45,
  tl: 0.35,
  ko: 0.6,
  de: 0.35,
  it: 0.35,
  nl: 0.35,
};

const PHOTO_COUNT = 8;

/**
 * Maps a single persona to a unique portrait or stylized letter avatar.
 * Crucial rule: One persona id always gets the exact same avatar, and
 * personas in the roster are generated so that each photo avatar is uniquely
 * assigned to ONE persona name — avoiding "same picture with different names".
 */
export function photoAvatarForName(uniqueSeed: number, initials: string) {
  // Deterministic 1:1 mapping based on uniqueSeed
  const slot = (Math.abs(uniqueSeed) % PHOTO_COUNT) + 1;
  return `/api/media/avatars/${String(slot).padStart(2, "0")}.jpg`;
}

function initialsOf(first: string, last: string) {
  const a = first.trim()[0] ?? "";
  const b = last.trim()[0] ?? "";
  return `${a}${b}`.toUpperCase();
}

function displayName(rand: Rand, first: string, last: string, code: string) {
  const style = weighted(rand, [
    ["full", 50],
    ["initial", 18],
    ["firstOnly", 14],
    ["dotted", 10],
    ["country", 8],
  ] as const);

  const flatFirst = first.replace(/\s+/g, "");
  const flatLast = last.replace(/\s+/g, "");
  switch (style) {
    case "initial":
      return `${first} ${last[0]}.`;
    case "firstOnly":
      return first;
    case "dotted":
      return `${flatFirst}.${flatLast}`;
    case "country":
      return `${first}_${code}`;
    default:
      return `${first} ${last}`;
  }
}

export function makePersona(seed: number, photoSlot?: number): Persona {
  const rand = mulberry32(seed);
  const region = weighted(
    rand,
    REGIONS.map((reg) => [reg, reg.weight] as const),
  );
  const first = pick(rand, region.first);
  const last = pick(rand, region.last);
  const city = pick(rand, region.cities);
  const name = displayName(rand, first, last, region.code);
  const id = `${region.code}-${hashString(`${name}|${city}|${seed}`).toString(36)}`;
  const initials = initialsOf(first, last);
  const style: PersonaStyle = {
    caps: chance(rand, 0.04),
    lower: chance(rand, 0.22),
    emoji: weighted(rand, [
      [0, 25],
      [1, 40],
      [2, 25],
      [3, 10],
    ] as const),
    typo: chance(rand, 0.09),
    native: chance(rand, NATIVE_PROBABILITY[region.lang]),
    honorific: Math.floor(rand() * 1000),
  };

  // If a photoSlot is assigned (1..PHOTO_COUNT), that person gets that photo.
  // Otherwise, they get a clean initials avatar so no photo is duplicated on multiple names.
  let avatarUrl: string;
  if (photoSlot && photoSlot >= 1 && photoSlot <= PHOTO_COUNT) {
    avatarUrl = `/api/media/avatars/${String(photoSlot).padStart(2, "0")}.jpg`;
  } else {
    avatarUrl = `/api/avatar?s=${encodeURIComponent(id)}&n=${encodeURIComponent(initials)}`;
  }

  return {
    id,
    name,
    first,
    initials,
    country: region.country,
    code: region.code,
    flag: region.flag,
    city,
    lang: region.lang,
    tz: region.tz,
    cur: region.cur,
    amounts: region.amounts,
    avatar: avatarUrl,
    style,
  };
}

/**
 * A stable cast of commenters for one stream.
 * Exactly 1 person per real photo (Photo 01 is Person 1, Photo 02 is Person 2, ... Photo 08 is Person 8).
 * Everyone else receives their own distinct letter/monogram avatar.
 * Result: No single photo is ever shared by two or more names.
 */
export function buildRoster(streamSeed: number, size = 64): Persona[] {
  const roster: Persona[] = [];
  const seenNames = new Set<string>();

  // 1. Assign exactly 1 distinct persona to each photo (1..8)
  for (let photoId = 1; photoId <= PHOTO_COUNT; photoId += 1) {
    let attempts = 0;
    while (attempts < 20) {
      const p = makePersona((streamSeed * 7919 + photoId * 104729 + attempts * 37) >>> 0, photoId);
      attempts += 1;
      const lower = p.name.toLowerCase();
      if (!seenNames.has(lower)) {
        seenNames.add(lower);
        roster.push(p);
        break;
      }
    }
  }

  // 2. Fill remaining roster with unique names using distinct letter/symbol avatars
  let i = PHOTO_COUNT + 1;
  while (roster.length < size && i < size * 4) {
    const persona = makePersona((streamSeed * 7919 + i * 104729) >>> 0);
    i += 1;
    const lower = persona.name.toLowerCase();
    if (!seenNames.has(lower)) {
      seenNames.add(lower);
      roster.push(persona);
    }
  }

  return roster;
}

export function formatMoney(persona: Persona, rand: Rand) {
  const amount = pick(rand, persona.amounts);
  const [prefix, suffix] = persona.cur;
  return `${prefix}${amount.toLocaleString("en-US")}${suffix}`;
}

export function localHour(persona: Persona, now: number) {
  const date = new Date(now + persona.tz * 3600 * 1000);
  return date.getUTCHours() + date.getUTCMinutes() / 60;
}
