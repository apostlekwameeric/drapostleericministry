import type { Lang } from "./personas";

export type Topic =
  | "greeting"
  | "worship"
  | "blessing"
  | "healing"
  | "miracle"
  | "offering"
  | "prayer"
  | "scripture"
  | "echo"
  | "reply"
  | "cue";

/**
 * Slots: {A} honorific · {city} · {country} · {amount} · {relative} · {ailment}
 * {need} · {n} small number · {years} · {time} · {daypart} · {scripture} · {quote} · {name}
 */
export const EN: Record<Topic, string[]> = {
  greeting: [
    "Watching from {city}, {country} 🙏",
    "Good {daypart} {A}, joining from {city}!",
    "Connected from {country}! God bless you {A}",
    "It's {time} here in {city} but I can't miss this",
    "Greetings from {city} {A}, my whole family is watching",
    "First time joining from {country}. Wow!",
    "Streaming from my shop in {city} 🙌",
    "{country} is here {A}!",
    "Joining late from {city}, what did I miss??",
    "Watching with my {relative} from {city} ❤️",
    "Hello from {city}, praying along with you all",
    "{A} we are watching from {country} on the big screen",
    "Tuned in from {city} 🙏 God bless everyone here",
    "Just got back from work in {city}, glad I caught this",
  ],
  worship: [
    "AMEN!!!",
    "Ameeen 🙏",
    "Glory!!!",
    "Hallelujah 🙌🙌",
    "I receive it!!",
    "Yes Lord 🔥",
    "Jesus!!!",
    "Preach {A}!!",
    "Amen and Amen",
    "🔥🔥🔥🔥",
    "Say it again {A}!",
    "Wow!!!",
    "Thank you Jesus 😭",
    "Glory to God in the highest",
    "Halleluyah ooo",
    "My God my God!!",
    "Nobody can stop this word 🔥",
    "I feel the presence of God right here in {city}",
    "Worthy is the Lamb 🙌",
    "Amen amen amen 🙏🙏🙏",
  ],
  blessing: [
    "{A} I'm blessed by your word 🙏🙏",
    "This word is for me!! I receive it {A}",
    "God bless you {A}, this message has lifted my spirit",
    "I decree and declare this over my family in {city} 🔥",
    "Every word is hitting home, glory to God",
    "{A} my breakthrough is here, I can feel it",
    "Speak {A}, we are receiving it in {country}",
    "This is the word I needed today. Thank you Jesus",
    "I receive the blessing for my children 🙏",
    "God bless your ministry {A}, from {city} with love ❤️",
    "This message is confirming what God told me this morning",
    "{A} you are a true man of God, I am blessed",
    "My doors are opening as you speak, I believe it!!",
    "I have been waiting for this word for {years} years",
    "Favour is following me from today {A}",
    "I am the head and not the tail 🙌",
    "I am so blessed I had to pause and just say thank you God",
    "Somebody shout favour!!!",
    "{A} this word is meat, not milk 🔥",
    "I'm taking notes {A}, this is deep",
  ],
  healing: [
    "I receive my healing right now in Jesus name 🙏",
    "{A} pray for my {relative}, {ailment} for {years} years",
    "The {ailment} is leaving my body NOW 🔥",
    "Praying along for my {relative} in hospital in {city}, God please 😭",
    "My {relative} was healed after last week's prayer, {A} God is real!!",
    "I lay my hand on my phone {A}, healing is mine",
    "By His stripes I am healed. Isaiah 53:5 🙌",
    "{A} please remember my {relative}, {ailment}",
    "I felt heat all over my body when you prayed {A}!!",
    "No more {ailment} in Jesus name",
    "Pray for my {relative}'s surgery tomorrow {A} 🙏",
    "{A} the {ailment} I have carried since {years} years ago must go tonight",
    "I am standing in for my {relative} in {city}, receive your healing!",
    "Doctors said it's chronic but God has the final say",
    "I command every sickness in my house to bow 🔥",
    "{A} my {relative} just said the pain has reduced!! Glory",
  ],
  miracle: [
    "TESTIMONY!! I got the job in {city} after the prayer last week 🙌🙌",
    "{A} the visa came out today!!! God is faithful 😭🙏",
    "My {relative} called me after {years} years of silence. Miracle!!",
    "I have received a miracle {A}, the debt is cleared!!!",
    "My landlord just told me not to worry about rent this month. Only God",
    "{A} my daughter passed her exams after your prayer 🎉",
    "I was told it's impossible but God did it, glory!!",
    "The doctors are confused {A}, the scan is clear ✝️",
    "Last month I had nothing, today I signed a contract in {city}!!",
    "My {relative} came back home {A}, thank you Jesus 😭",
    "I prayed with you last time and the {need} came through!!",
    "Testimony loading... God is working in {city} 🔥",
    "Unexpected money entered my account this morning. God!!",
    "{A} they called me back for the {need} I gave up on",
    "My marriage is restored after {years} years of trouble. Glory to God",
    "God turned my situation around in {n} days 🙌",
  ],
  offering: [
    "Sowing my seed today {A}, expecting my harvest 🙏",
    "I have sown my seed via offering, God bless this ministry",
    "Just gave my offering from {city}, receive it Lord",
    "{A} where can we give? I want to sow into this word",
    "Sowed {amount} today, God multiply it for the work",
    "My tithe is in {A}, I honour God with my first fruits",
    "Giving my thanksgiving offering for my new {need} 🙌",
    "I am sowing {amount} for my {relative}'s healing",
    "Offering done from {country} 🙏 God bless the ministry",
    "I don't have much but I gave my widow's mite today",
    "{A} we will support this ministry from {city}, count on us",
    "Seed sown, harvest guaranteed 🌱🙏",
    "Gave my {amount} with joy, God loves a cheerful giver",
    "Partnering with this ministry every month from now on 🙏",
  ],
  prayer: [
    "{A} please pray for my marriage 😔",
    "Pray for my {relative} writing exams tomorrow in {city}",
    "Remember my business {A}, things are hard in {country}",
    "Pray for my visa interview on Monday please 🙏",
    "{A} I need a {need}, I have been waiting for {n} months",
    "Please pray for my {relative}, they don't know Christ yet",
    "Pray for peace in my home {A}",
    "I need prayers for my {need} {A} 🙏",
    "{A} remember me in prayer, {city} is not easy",
    "Pray for my {relative} travelling tonight",
    "Please pray for my rent, the landlord gave me {n} days",
    "{A} pray for my children's school fees 🙏",
    "Pray for my {relative}'s deliverance {A}",
  ],
  scripture: [
    "{scripture} 🙏",
    "Reading along, {scripture} 📖",
    "{scripture} — this is my portion",
    "Turning to {scripture} now 📖",
    "{scripture}!! I hold on to this",
    "Meditating on {scripture} tonight",
  ],
  echo: [
    "\"{quote}\" 🔥🔥 I receive it {A}",
    "Amen to that {A}! \"{quote}\"",
    "\"{quote}\" — this is my word for the season",
    "Wow \"{quote}\" 😭🙏",
    "{A} said \"{quote}\". Somebody type amen!!",
    "\"{quote}\" I claim it for my family in {city}",
    "Did you hear that? \"{quote}\" 🙌",
    "\"{quote}\"!!! Screenshot this",
    "I am writing this down: \"{quote}\"",
    "\"{quote}\" — yes Lord, yes!",
  ],
  reply: [
    "Amen @{name} 🙏",
    "@{name} God bless you",
    "Praying with you @{name} ❤️",
    "@{name} I receive it too!!",
    "Welcome @{name} 🙌",
    "@{name} amen o!",
    "@{name} God will do it 🙏",
    "Standing with you @{name}",
  ],
  cue: [],
};

export const NATIVE: Partial<Record<Lang, Partial<Record<Topic, string[]>>>> = {
  es: {
    greeting: ["Bendiciones desde {city} 🙏", "Viendo desde {country}!", "Saludos {A} desde {city}"],
    worship: ["Amén {A} 🙏", "Gloria a Dios!!", "Aleluya 🙌", "Amén amén", "Sí Señor 🔥"],
    blessing: ["Dios te bendiga {A}, esta palabra es para mí", "Recibo esta palabra en {city} 🙏", "Qué palabra tan poderosa {A}"],
    healing: ["Recibo mi sanidad en el nombre de Jesús 🙏", "{A} ore por mi {relative} por favor", "Ya no más {ailment}, amén"],
    miracle: ["Testimonio!! Dios me dio el {need} 🙌", "Dios hizo el milagro {A}, gloria!!"],
    offering: ["Sembrando mi semilla hoy 🙏", "Ya di mi ofrenda desde {city}, Dios lo multiplique"],
    prayer: ["Oren por mi familia por favor 🙏", "{A} ore por mi {relative}"],
  },
  pt: {
    greeting: ["Assistindo de {city}! 🙏", "Bênçãos desde {country}", "Boa {daypart} {A}, aqui é {city}"],
    worship: ["Amém {A} 🙏", "Glória a Deus!!!", "Aleluia 🙌", "Amém amém amém"],
    blessing: ["Deus abençoe o senhor {A}", "Essa palavra é para mim!! Recebo em {city}", "Que palavra forte {A} 🔥"],
    healing: ["Recebo a minha cura agora em nome de Jesus 🙏", "{A} ore pela minha {relative}, {ailment}"],
    miracle: ["Testemunho!! Consegui o {need} 🙌", "Deus fez o milagre {A}, glória!!"],
    offering: ["Semeando hoje, creio na colheita 🙏", "Ofertei de {city}, Deus multiplique"],
    prayer: ["Ore pela minha família {A} 🙏", "Preciso de oração pelo meu {need}"],
  },
  fr: {
    greeting: ["Je regarde depuis {city} 🙏", "Bonsoir {A}, {country} est connecté!", "Salutations de {city}"],
    worship: ["Amen {A} 🙏", "Gloire à Dieu !!", "Alléluia 🙌", "Amen amen"],
    blessing: ["Que Dieu vous bénisse {A}", "Cette parole est pour moi !! Je la reçois à {city}", "Quelle parole puissante {A} 🔥"],
    healing: ["Je reçois ma guérison au nom de Jésus 🙏", "{A} priez pour ma {relative} svp, {ailment}"],
    miracle: ["Témoignage !! J'ai eu le {need} 🙌", "Dieu a fait le miracle {A}, gloire !!"],
    offering: ["J'ai semé ma semence aujourd'hui 🙏", "Offrande envoyée depuis {city}, que Dieu multiplie"],
    prayer: ["Priez pour ma famille svp 🙏", "{A} priez pour mon {need}"],
  },
  sw: {
    greeting: ["Natazama kutoka {city} 🙏", "Salamu kutoka {country} {A}"],
    worship: ["Amina! 🙏", "Bwana asifiwe!!", "Haleluya 🙌", "Amina amina"],
    blessing: ["Asante {A}, neno hili ni langu", "Mungu akubariki {A} 🙏"],
    healing: ["Napokea uponyaji wangu kwa jina la Yesu 🙏", "{A} omba kwa ajili ya {relative} yangu"],
    prayer: ["Naomba maombi kwa familia yangu 🙏", "{A} nikumbuke katika maombi"],
  },
  tw: {
    greeting: ["Yɛwɔ {city} ha {A} 🙏", "Akwaaba from {city} ooo"],
    worship: ["Amen ooo!!", "Nyame yɛ 🔥", "Onyame nhyira wo {A}", "Ayeyi nka Nyame 🙌"],
    blessing: ["Medaase {A} 🙏", "Eii this word is for me paa", "Onyame nhyira wo {A}, this word dey touch me"],
    healing: ["Awurade sa me yare 🙏", "{A} bɔ mpae ma me {relative}"],
    offering: ["Me de me afɔrebɔ aba {A} 🙏", "I have sown my seed ooo, Nyame nhyira"],
  },
  pcm: {
    greeting: ["{A} I dey watch from {city} o 🙏", "Naija don land!! {city} is here"],
    worship: ["God go bless you {A}!!", "I don receive am!!", "Na so!! 🔥🔥", "Ameen oooo"],
    blessing: ["{A} this word don enter my body o 🔥", "God go bless you {A}, this one na for me", "Chai this message sweet die"],
    healing: ["Every sickness for my body, comot now!! 🙏", "Abeg pray for my {relative} {A}, {ailment}"],
    miracle: ["Na my miracle be this o!! I get the {need} 🙌", "God don do am for me {A}!!!"],
    offering: ["I don sow my seed {A}, God go multiply am 🙏", "Offering don enter from {city} o"],
    prayer: ["Abeg pray for my {relative} {A} 🙏", "{A} remember me for prayer, {city} no easy"],
  },
  tl: {
    greeting: ["Nanonood mula sa {city}! 🙏", "Magandang {daypart} po {A} mula {country}"],
    worship: ["Amen po {A} 🙏", "Purihin ang Panginoon!!", "Hallelujah 🙌", "Amen amen"],
    blessing: ["Pagpalain po kayo {A}", "Ito ang salita para sa akin!! 🙏", "Salamat po {A}, blessed ako ngayon"],
    healing: ["Tinatanggap ko ang healing ko sa pangalan ni Jesus 🙏", "{A} ipagdasal po ang aking {relative}"],
    prayer: ["Ipagdasal po ang pamilya ko 🙏", "{A} dasal po para sa {need} ko"],
  },
  ko: {
    greeting: ["{city}에서 보고 있어요! 🙏", "Watching from {city}, Korea 🙏"],
    worship: ["아멘 🙏", "할렐루야!!", "아멘 아멘", "Amen from {city} 🙏"],
    blessing: ["{A} 말씀에 은혜 받았습니다 🙏", "This word is for me, 감사합니다 {A}"],
    prayer: ["가족을 위해 기도해주세요 🙏"],
  },
  de: {
    greeting: ["Grüße aus {city}! 🙏", "Wir schauen aus {country} zu {A}"],
    worship: ["Amen {A} 🙏", "Halleluja!!", "Gott sei die Ehre 🙌"],
    blessing: ["Gott segne Sie {A}", "Dieses Wort ist für mich!! 🙏"],
    prayer: ["Bitte beten Sie für meine Familie 🙏"],
  },
  it: {
    greeting: ["Vi seguo da {city}! 🙏", "Saluti da {country} {A}"],
    worship: ["Amen {A} 🙏", "Gloria a Dio!!", "Alleluia 🙌"],
    blessing: ["Dio ti benedica {A}", "Questa parola è per me!! 🙏"],
    prayer: ["Pregate per la mia famiglia 🙏"],
  },
  nl: {
    greeting: ["Kijk mee vanuit {city}! 🙏", "Groeten uit {country} {A}"],
    worship: ["Amen {A} 🙏", "Halleluja!!", "Glorie aan God 🙌"],
    blessing: ["God zegene u {A}", "Dit woord is voor mij!! 🙏"],
  },
};

export const RELATIVES = [
  "mother",
  "father",
  "son",
  "daughter",
  "husband",
  "wife",
  "sister",
  "brother",
  "grandmother",
  "auntie",
  "uncle",
  "baby",
  "mum",
  "dad",
];

export const AILMENTS = [
  "back pain",
  "migraine",
  "high blood pressure",
  "diabetes",
  "insomnia",
  "kidney problem",
  "chest pain",
  "stroke",
  "fibroids",
  "asthma",
  "waist pain",
  "ulcer",
  "knee pain",
  "eye problem",
];

export const NEEDS = [
  "job",
  "visa",
  "house",
  "contract",
  "promotion",
  "scholarship",
  "business breakthrough",
  "school fees",
  "car",
  "shop",
  "admission",
  "healing",
];

export const SCRIPTURES = [
  "Jeremiah 29:11 — I know the plans I have for you",
  "Isaiah 53:5 — by His stripes we are healed",
  "Psalm 23:1 — the Lord is my shepherd",
  "Philippians 4:13 — I can do all things through Christ",
  "Malachi 3:10 — bring the whole tithe into the storehouse",
  "Luke 6:38 — give and it shall be given unto you",
  "Isaiah 60:1 — arise, shine, for your light has come",
  "Romans 8:28 — all things work together for good",
  "Psalm 91:1 — he that dwelleth in the secret place",
  "Mark 11:24 — believe that ye receive them",
  "Joel 2:25 — I will restore the years",
  "2 Corinthians 9:7 — God loveth a cheerful giver",
  "Exodus 15:26 — I am the Lord that healeth thee",
  "Psalm 118:17 — I shall not die but live",
  "Deuteronomy 28:13 — the head and not the tail",
  "3 John 1:2 — prosper and be in health",
];

export const EMOJI: Record<Topic, string[]> = {
  greeting: ["🙏", "👋", "❤️", "🙌", "😊"],
  worship: ["🙏", "🔥", "🙌", "😭", "❤️", "✝️"],
  blessing: ["🙏", "🔥", "🙌", "❤️", "😭", "✨"],
  healing: ["🙏", "😭", "🔥", "✝️", "🙌"],
  miracle: ["🙌", "🎉", "😭", "🔥", "🙏", "✝️"],
  offering: ["🙏", "🌱", "🙌", "❤️", "✝️"],
  prayer: ["🙏", "😔", "❤️", "🙌"],
  scripture: ["📖", "🙏", "✝️"],
  echo: ["🔥", "🙏", "🙌", "😭"],
  reply: ["🙏", "❤️", "🙌"],
  cue: ["🙏", "🔥", "🙌"],
};

export const KEYWORDS: Partial<Record<Topic, RegExp>> = {
  healing:
    /\b(heal|healing|healed|sick|sickness|pain|hospital|doctor|cancer|stripes|disease|infirmit|surgery|medic|deliver|affliction|body)/i,
  offering:
    /\b(offering|offerings|seed|sow|sowing|give|giving|gave|tithe|tithes|first ?fruits?|harvest|momo|mobile money|account|donat|partner|pledge|honou?r god)/i,
  miracle:
    /\b(miracle|miracles|testimon|breakthrough|signs? and wonders|impossible|suddenly|turnaround|open heaven)/i,
  blessing:
    /\b(bless|blessing|blessed|favou?r|prosper|increase|promotion|elevat|open doors?|abundance|overflow|next level|season)/i,
  prayer:
    /\b(pray|prayer|praying|interce|fasting|warfare|deliverance|bind|loose|declare|decree|altar)/i,
  worship: /\b(worship|praise|glory|hallelujah|thank you jesus|lift your hands|magnify)/i,
};

const BOOKS =
  "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation";

export const SCRIPTURE_RE = new RegExp(
  `\\b((?:[1-3]\\s?)?(?:${BOOKS}))\\s+(\\d{1,3})(?::(\\d{1,3})(?:-(\\d{1,3}))?)?`,
  "i",
);

export const CUE_RE =
  /\b(?:type|say|shout|comment|write|declare)\s+(?:the words?\s+)?["'“‘]?([A-Za-z][A-Za-z' ]{1,28}?)["'”’]?(?=[.!?,;]|\s+(?:if|in|to|and|for|now|right|with|three|3|7|seven|times|when|as)\b|$)/i;
