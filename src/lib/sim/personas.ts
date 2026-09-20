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
  cities: cities.split("|"),
  first: first.split("|"),
  last: last.split("|"),
});

/* prettier-ignore */
export const REGIONS: Region[] = [
  r("GH","Ghana","🇬🇭","tw",11,0,["GH₵",""],[50,100,200,300,500,1000],"Accra|Kumasi|Takoradi|Tamale|Tema|Cape Coast|Koforidua|Sunyani|Ho|Obuasi|Kasoa","Kofi|Ama|Akosua|Yaw|Abena|Kwabena|Adwoa|Kojo|Efua|Nana|Esi|Kwesi|Afia|Yaa|Kwaku|Gifty|Patience|Emmanuel|Comfort|Richmond|Mavis|Ernest|Portia|Bismark","Mensah|Boateng|Owusu|Asante|Appiah|Osei|Darko|Agyemang|Adjei|Ofori|Amoah|Frimpong|Acheampong|Quaye|Tetteh|Sarpong|Antwi|Gyasi"),
  r("NG","Nigeria","🇳🇬","pcm",10,1,["₦",""],[5000,10000,20000,50000,100000],"Lagos|Abuja|Port Harcourt|Ibadan|Enugu|Benin City|Kaduna|Owerri|Uyo|Jos|Warri","Chinedu|Ngozi|Emeka|Adaeze|Tunde|Funke|Chioma|Ifeanyi|Blessing|Uche|Bola|Kemi|Obinna|Amaka|Segun|Yetunde|Precious|Chukwuma|Favour|Femi|Oluwaseun|Ijeoma","Okafor|Adeyemi|Okonkwo|Balogun|Eze|Adebayo|Nwosu|Ojo|Chukwu|Olawale|Umeh|Afolabi|Okoro|Nnamdi|Ogunleye|Abubakar"),
  r("KE","Kenya","🇰🇪","sw",4,3,["KSh ",""],[500,1000,2000,5000,10000],"Nairobi|Mombasa|Kisumu|Nakuru|Eldoret|Thika","Wanjiru|Kamau|Achieng|Otieno|Njeri|Mwangi|Akinyi|Wambui|Omondi|Faith|Brian|Mercy|Kevin|Purity","Kariuki|Odhiambo|Mutua|Njoroge|Wekesa|Kimani|Ochieng|Wanjala|Maina"),
  r("ZA","South Africa","🇿🇦","en",4,2,["R",""],[100,200,500,1000,2000],"Johannesburg|Cape Town|Durban|Pretoria|Soweto|Polokwane|Bloemfontein","Thabo|Nomvula|Sipho|Lerato|Bongani|Zanele|Mandla|Thandiwe|Ayanda|Precious|Siyabonga|Naledi","Dlamini|Nkosi|Mokoena|Khumalo|Ndlovu|Mahlangu|Zulu|Mthembu|Sithole"),
  r("UG","Uganda","🇺🇬","en",2,3,["USh ",""],[20000,50000,100000,200000],"Kampala|Entebbe|Jinja|Gulu|Mbarara","Nakato|Okello|Namukasa|Mugisha|Achan|Ssebunya|Brenda|Ronald|Immaculate|Joshua","Mukasa|Okot|Nabirye|Kato|Tumusiime|Namutebi|Ssemakula"),
  r("ZM","Zambia","🇿🇲","en",2,2,["K",""],[100,200,500,1000],"Lusaka|Ndola|Kitwe|Livingstone","Mutale|Chanda|Bwalya|Mwila|Natasha|Mulenga|Kondwani|Precious","Banda|Phiri|Mwansa|Zulu|Tembo|Mumba|Sakala"),
  r("ZW","Zimbabwe","🇿🇼","en",2,2,["US$",""],[10,20,50,100],"Harare|Bulawayo|Mutare|Gweru","Tendai|Rutendo|Tatenda|Farai|Nyasha|Chipo|Tinashe|Rumbidzai|Blessing","Moyo|Ncube|Chikwanda|Mutasa|Sibanda|Dube|Mapfumo"),
  r("CM","Cameroon","🇨🇲","fr",2,1,["",",000 FCFA"],[5,10,20,50],"Douala|Yaoundé|Bamenda|Buea|Bafoussam","Achille|Brenda|Emmanuel|Marie-Claire|Njoya|Bih|Clarisse|Cyrille|Larissa","Fon|Tchoupo|Nkemelu|Fotso|Ngwa|Mbah|Tanyi"),
  r("CI","Côte d'Ivoire","🇨🇮","fr",2,0,["",",000 FCFA"],[5,10,20,50],"Abidjan|Bouaké|Yamoussoukro|Daloa","Aya|Koffi|Aminata|Yao|Adjoua|Serge|Grâce|Konan|Affoué","Kouassi|Koné|N'Guessan|Bamba|Yao|Kouamé|Touré"),
  r("TG","Togo","🇹🇬","fr",1,0,["",",000 FCFA"],[5,10,20],"Lomé|Kara|Sokodé","Kossi|Afi|Komlan|Akouvi|Yawa|Kodjo","Agbeko|Mensah|Lawson|Amegah|Dossou"),
  r("LR","Liberia","🇱🇷","en",1,0,["$",""],[10,20,50,100],"Monrovia|Gbarnga|Buchanan","Musu|Prince|Hawa|Emmanuel|Korto|Varney|Decontee","Johnson|Kollie|Flomo|Tarr|Weah|Sirleaf"),
  r("SL","Sierra Leone","🇸🇱","en",1,0,["Le ",",000"],[50,100,200,500],"Freetown|Bo|Kenema|Makeni","Fatmata|Mohamed|Isatu|Abu|Mariama|Alusine|Adama","Kamara|Sesay|Conteh|Koroma|Bangura|Turay"),
  r("CD","DR Congo","🇨🇩","fr",2,1,["$",""],[10,20,50,100],"Kinshasa|Lubumbashi|Goma|Kisangani","Christian|Grâce|Dieudonné|Merveille|Patrick|Espérance|Junior|Nathalie","Kasongo|Mukendi|Ilunga|Tshibangu|Mbuyi|Kalala|Ngoy"),
  r("RW","Rwanda","🇷🇼","en",1,2,["RWF ",""],[5000,10000,20000],"Kigali|Butare|Musanze","Uwase|Niyonzima|Mugisha|Ineza|Keza|Eric|Divine","Habimana|Uwimana|Nshimiyimana|Mukamana"),
  r("TZ","Tanzania","🇹🇿","sw",1,3,["TSh ",",000"],[10,20,50,100],"Dar es Salaam|Arusha|Mwanza|Dodoma","Neema|Baraka|Zawadi|Juma|Rehema|Godfrey|Upendo","Mwakasege|Komba|Mushi|Massawe|Kimaro"),
  r("ET","Ethiopia","🇪🇹","en",1,3,["ETB ",""],[500,1000,2000],"Addis Ababa|Hawassa|Bahir Dar","Selam|Dawit|Hanna|Yonas|Meseret|Bethlehem|Abel","Tesfaye|Bekele|Alemu|Girma|Haile"),
  r("BW","Botswana","🇧🇼","en",1,2,["P",""],[100,200,500],"Gaborone|Francistown|Maun","Kagiso|Mpho|Boitumelo|Tebogo|Neo","Molefe|Sebego|Kgosi|Modise"),
  r("MW","Malawi","🇲🇼","en",1,2,["MK",",000"],[10,20,50],"Lilongwe|Blantyre|Mzuzu","Chisomo|Thoko|Mphatso|Tamanda|Limbani","Banda|Phiri|Chirwa|Mwale|Kamanga"),
  r("GB","United Kingdom","🇬🇧","en",8,0,["£",""],[20,50,100,200,500],"London|Manchester|Birmingham|Leeds|Croydon|Milton Keynes|Luton|Glasgow|Reading|Enfield|Peckham","Grace|Daniel|Abigail|Samuel|Joy|Michael|Esther|Joshua|Priscilla|Nathan|Kwame|Adjoa|Chidi|Deborah|Stephen|Rebecca","Owusu-Ansah|Adebowale|Williams|Thompson|Boakye|Okoro|Brown|Asamoah|Campbell|Addo|Bello|Yeboah"),
  r("US","United States","🇺🇸","en",8,-5,["$",""],[20,50,100,200,500,1000],"Houston|Atlanta|New York|Dallas|Chicago|Maryland|Columbus|Charlotte|Newark|Bronx|Minneapolis|Philadelphia","Latoya|Marcus|Keisha|Andre|Denise|Terrence|Vanessa|Jerome|Patricia|Kwadwo|Ebony|Darnell|Tamika|Reginald|Akua|Jasmine","Johnson|Williams|Jackson|Harris|Robinson|Osei|Okafor|Carter|Washington|Boateng|Davis|Mitchell"),
  r("CA","Canada","🇨🇦","en",3,-5,["C$",""],[20,50,100,200],"Toronto|Brampton|Calgary|Ottawa|Montreal|Winnipeg|Edmonton|Mississauga","Sarah|Kelvin|Naomi|Derrick|Amara|Josephine|Kwabena|Rachel|Emmanuel|Linda","Boateng|Mensah|Adeleke|Osei|Campbell|Wright|Agyeman|Okonjo"),
  r("DE","Germany","🇩🇪","de",2,1,["€",""],[20,50,100,200],"Hamburg|Berlin|Frankfurt|Cologne|Munich|Düsseldorf","Yaw|Ama|Sabine|Michael|Gifty|Daniel|Adwoa|Thomas","Boateng|Müller|Schmidt|Asante|Weber|Owusu"),
  r("NL","Netherlands","🇳🇱","nl",2,1,["€",""],[20,50,100],"Amsterdam|Rotterdam|The Hague|Almere|Utrecht","Kwabena|Linda|Ruben|Akua|Johan|Efua|Daniel","Owusu|de Vries|Bakker|Appiah|Jansen|Mensah"),
  r("IT","Italy","🇮🇹","it",2,1,["€",""],[20,50,100],"Milan|Rome|Brescia|Verona|Naples|Turin","Emmanuel|Gloria|Francesco|Comfort|Giulia|Kofi|Grace","Amankwah|Rossi|Osei|Bianchi|Boateng|Russo"),
  r("FR","France","🇫🇷","fr",2,1,["€",""],[20,50,100],"Paris|Lyon|Marseille|Saint-Denis|Lille|Toulouse","Aïcha|Kevin|Grâce|Christelle|Yannick|Emmanuel|Nadia|Olivier","Diallo|Kouamé|Mensah|Bernard|Traoré|Nguema"),
  r("ES","Spain","🇪🇸","es",2,1,["€",""],[20,50,100],"Madrid|Barcelona|Valencia|Sevilla|Málaga","María|José|Lucía|Carlos|Ana|Esperanza|Miguel|Rocío","García|Rodríguez|López|Martínez|Sánchez|Pérez"),
  r("PT","Portugal","🇵🇹","pt",1,0,["€",""],[20,50,100],"Lisboa|Porto|Braga|Coimbra","João|Ana|Tiago|Mariana|Rui|Sofia","Silva|Santos|Ferreira|Costa|Oliveira"),
  r("BE","Belgium","🇧🇪","fr",1,1,["€",""],[20,50,100],"Brussels|Antwerp|Liège|Ghent","Nadège|Kevin|Chantal|Jonathan|Sarah","Kabongo|Peeters|Mbala|Janssens"),
  r("IE","Ireland","🇮🇪","en",1,0,["€",""],[20,50,100],"Dublin|Cork|Limerick|Galway","Aoife|Chidi|Siobhan|Emeka|Ciara|Blessing","Murphy|Okoye|Kelly|Byrne|Adeyemi"),
  r("SE","Sweden","🇸🇪","en",1,1,["",",kr"],[200,500,1000],"Stockholm|Gothenburg|Malmö","Ebba|Kofi|Linnea|Daniel|Amanda","Andersson|Mensah|Johansson|Osei"),
  r("NO","Norway","🇳🇴","en",1,1,["",",kr"],[200,500,1000],"Oslo|Bergen|Stavanger","Ingrid|Emmanuel|Sofie|Joseph","Hansen|Nkemelu|Olsen|Boateng"),
  r("BR","Brazil","🇧🇷","pt",4,-3,["R$",""],[20,50,100,200,500],"São Paulo|Rio de Janeiro|Salvador|Belo Horizonte|Recife|Fortaleza|Curitiba|Manaus","Ana Beatriz|João Pedro|Maria Clara|Lucas|Gabriela|Rafael|Juliana|Mateus|Larissa|Thiago|Fernanda|Bruno","Silva|Santos|Oliveira|Souza|Pereira|Costa|Rodrigues|Almeida"),
  r("MX","Mexico","🇲🇽","es",2,-6,["MX$",""],[200,500,1000],"Ciudad de México|Guadalajara|Monterrey|Puebla|Tijuana","Guadalupe|Juan|Fernanda|Miguel|Rosa|Alejandro|Daniela|Jorge","Hernández|García|Martínez|López|González|Ramírez"),
  r("CO","Colombia","🇨🇴","es",2,-5,["COP ",",000"],[20,50,100,200],"Bogotá|Medellín|Cali|Barranquilla|Cartagena","Camila|Andrés|Valentina|Santiago|Daniela|Juan David|Paola","Gómez|Rodríguez|Ramírez|Torres|Vargas|Moreno"),
  r("PE","Peru","🇵🇪","es",1,-5,["S/",""],[50,100,200],"Lima|Arequipa|Trujillo|Cusco","Rosa|Luis|Milagros|Jorge|Carmen|Diego","Quispe|Flores|Huamán|Chávez|Ramos"),
  r("AR","Argentina","🇦🇷","es",1,-3,["ARS ",",000"],[5,10,20,50],"Buenos Aires|Córdoba|Rosario|Mendoza","Sofía|Mateo|Valentina|Nicolás|Martina|Lucas","Fernández|González|Rodríguez|Gómez|Díaz"),
  r("CL","Chile","🇨🇱","es",1,-4,["CLP ",",000"],[10,20,50],"Santiago|Valparaíso|Concepción","Catalina|Benjamín|Antonia|Matías|Javiera","Muñoz|Rojas|González|Díaz|Soto"),
  r("JM","Jamaica","🇯🇲","en",3,-5,["J$",""],[2000,5000,10000,20000],"Kingston|Montego Bay|Spanish Town|Mandeville|Portmore|Ocho Rios","Shanice|Dwayne|Kimberly|Andre|Monique|Damion|Latoya|Omar|Tanisha|Kemar","Brown|Campbell|Williams|Clarke|Reid|Thompson|Grant|Bailey"),
  r("TT","Trinidad and Tobago","🇹🇹","en",1,-4,["TT$",""],[100,200,500],"Port of Spain|San Fernando|Chaguanas|Arima","Keisha|Ricardo|Anisa|Marlon|Shenelle|Kevon","Ramkissoon|Mohammed|Baptiste|Charles|Joseph|Persad"),
  r("HT","Haiti","🇭🇹","fr",1,-5,["",",000 HTG"],[1,2,5],"Port-au-Prince|Cap-Haïtien|Gonaïves","Marie|Jean|Rose|Widline|Frantz|Nadège|Emmanuel","Pierre|Jean-Baptiste|Joseph|Louis|Charles"),
  r("BS","Bahamas","🇧🇸","en",1,-5,["B$",""],[20,50,100],"Nassau|Freeport","Kendra|Tavon|Shantel|Deangelo|Lakeisha","Rolle|Ferguson|Knowles|Pinder|Bethel"),
  r("BB","Barbados","🇧🇧","en",1,-4,["Bds$",""],[50,100,200],"Bridgetown|Speightstown|Oistins","Shakira|Jamal|Tia|Rashida|Andre","Alleyne|Cumberbatch|Greenidge|Brathwaite|Holder"),
  r("GY","Guyana","🇬🇾","en",1,-4,["G$",",000"],[5,10,20],"Georgetown|Linden|New Amsterdam","Devi|Marlon|Sunita|Kevin|Shonette","Persaud|Singh|Bacchus|Williams|Ramdeen"),
  r("IN","India","🇮🇳","en",3,5.5,["₹",""],[500,1000,2000,5000],"Chennai|Bengaluru|Hyderabad|Mumbai|Kochi|Dimapur|Delhi|Pune|Vijayawada","Priya|Joseph|Anitha|Samuel|Jebaraj|Blessy|Prakash|Sunita|Mercy|Vinod|Sharon|Immanuel|Reena","Thomas|Kumar|Joseph|Samuel|Fernandes|Rao|Reddy|Varghese|David|Paul"),
  r("PH","Philippines","🇵🇭","tl",3,8,["₱",""],[500,1000,2000,5000],"Manila|Cebu|Davao|Quezon City|Iloilo|Cagayan de Oro|Baguio","Maria|Joshua|Angelica|Jonathan|Kristine|Mark|Jasmine|Reynaldo|Grace|Jerome|Lovely|Christian","Santos|Reyes|Cruz|Bautista|dela Cruz|Garcia|Mendoza|Villanueva"),
  r("PK","Pakistan","🇵🇰","en",1,5,["Rs ",",000"],[2,5,10,20],"Lahore|Karachi|Faisalabad|Islamabad","Sara|Asif|Naila|Samuel|Shahzad|Nabila|Yousaf","Masih|Gill|Bhatti|Sadiq|Javed"),
  r("LK","Sri Lanka","🇱🇰","en",1,5.5,["Rs ",",000"],[2,5,10],"Colombo|Kandy|Negombo|Jaffna","Nimal|Shanika|Ruwan|Dilani|Chamara","Perera|Fernando|Silva|Jayasinghe|Dias"),
  r("MY","Malaysia","🇲🇾","en",1,8,["RM",""],[50,100,200,500],"Kuala Lumpur|Penang|Kuching|Johor Bahru|Kota Kinabalu","Grace|Daniel|Jason|Michelle|Priya|Joel|Esther","Tan|Lim|Wong|Raj|Anak Jimmy|Lee"),
  r("SG","Singapore","🇸🇬","en",1,8,["S$",""],[50,100,200],"Singapore","Wei Ling|Joshua|Mei|Samuel|Nadia|Josiah|Rachel","Tan|Lim|Ng|Chua|Goh|Koh"),
  r("ID","Indonesia","🇮🇩","en",1,7,["Rp ","0,000"],[5,10,20,50],"Jakarta|Surabaya|Manado|Medan|Ambon","Christian|Grace|Yohanes|Debora|Andreas|Maria|Daniel","Sitorus|Simanjuntak|Wijaya|Hutabarat|Tampubolon"),
  r("KR","South Korea","🇰🇷","ko",1,9,["₩","0,000"],[1,2,3,5,10],"Seoul|Busan|Incheon|Daegu","Ji-woo|Min-jun|Seo-yeon|Ha-eun|Joon|Ye-jin|Hyun-woo","Kim|Lee|Park|Choi|Jung|Kang"),
  r("JP","Japan","🇯🇵","en",1,9,["¥",",000"],[1,2,3,5],"Tokyo|Osaka|Yokohama|Nagoya","Yuki|Haruto|Aoi|Ren|Sakura|Hikari","Sato|Suzuki|Tanaka|Watanabe|Ito"),
  r("AU","Australia","🇦🇺","en",2,10,["A$",""],[20,50,100,200],"Sydney|Melbourne|Brisbane|Perth|Adelaide|Blacktown","Emily|Liam|Chloe|Samuel|Olivia|Michael|Ama|Kwame|Grace","Smith|Nguyen|Boateng|Wilson|Ansah|Taylor|Mensah"),
  r("NZ","New Zealand","🇳🇿","en",1,12,["NZ$",""],[20,50,100],"Auckland|Wellington|Christchurch|Hamilton","Aroha|Josh|Hana|Tama|Grace|Sione","Williams|Ngata|Walker|Tuilagi|Fifita"),
  r("AE","United Arab Emirates","🇦🇪","en",2,4,["AED ",""],[100,200,500,1000],"Dubai|Abu Dhabi|Sharjah|Ajman","Grace|Emmanuel|Precious|Joseph|Mary|Kelvin|Blessing|Anita","Mensah|Okeke|Fernandes|Dsouza|Boateng|Pinto|Adjei"),
  r("QA","Qatar","🇶🇦","en",1,3,["QAR ",""],[100,200,500],"Doha|Al Wakrah|Al Rayyan","Blessing|Alvin|Ruth|Jerome|Sheila","Adjei|Pinto|Nwachukwu|Gomez"),
  r("SA","Saudi Arabia","🇸🇦","en",1,3,["SAR ",""],[100,200,500],"Riyadh|Jeddah|Dammam","Marlon|Angela|Joseph|Ruth|Rowena","Santos|Cruz|Fernandes|Dela Peña"),
  r("IL","Israel","🇮🇱","en",1,2,["₪",""],[50,100,200],"Tel Aviv|Jerusalem|Haifa","Ana|Rachel|Daniel|Miriam|Blessing","Cohen|Levi|Mizrahi|Okoro"),
  r("TR","Turkey","🇹🇷","en",1,3,["₺",""],[200,500,1000],"Istanbul|Ankara|Izmir","Selin|Emre|Deniz|Elif|Emmanuel","Yılmaz|Kaya|Demir|Okafor"),
  r("FJ","Fiji","🇫🇯","en",1,12,["FJ$",""],[20,50,100],"Suva|Nadi|Lautoka","Adi|Josua|Litia|Semi|Mere","Naidu|Ratu|Tuilagi|Prasad"),
  r("PG","Papua New Guinea","🇵🇬","en",1,10,["K",""],[20,50,100],"Port Moresby|Lae|Mount Hagen","Grace|Peter|Jennifer|Mathias|Ruth","Kila|Aihi|Kaupa|Wari"),
  r("WS","Samoa","🇼🇸","en",1,13,["WS$",""],[20,50,100],"Apia|Vaitele","Sina|Tavita|Fetu|Malia|Ioane","Faleolo|Tuala|Leota|Tamasese"),
];

export type PersonaStyle = {
  caps: boolean;
  lower: boolean;
  emoji: number; // 0..3
  typo: boolean;
  native: boolean;
  honorific: number; // index into honorific list
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
  en: 0,
  es: 0.55,
  pt: 0.55,
  fr: 0.5,
  sw: 0.35,
  tw: 0.22,
  pcm: 0.35,
  tl: 0.45,
  ko: 0.6,
  de: 0.4,
  it: 0.45,
  nl: 0.35,
};

const PHOTO_COUNT = 8;

function photoAvatar(id: string, initials: string) {
  const n = hashString(id);
  // About two thirds of generated commenters get a real portrait; the rest keep a letter mark.
  if (n % 3 === 0) {
    return `/api/avatar?s=${encodeURIComponent(id)}&n=${encodeURIComponent(initials)}`;
  }
  const slot = (n % PHOTO_COUNT) + 1;
  return `/api/media/avatars/${String(slot).padStart(2, "0")}.jpg`;
}

function initialsOf(first: string, last: string) {
  const a = first.trim()[0] ?? "";
  const b = last.trim()[0] ?? "";
  return `${a}${b}`.toUpperCase();
}

function displayName(rand: Rand, first: string, last: string, code: string) {
  const style = weighted(rand, [
    ["full", 30],
    ["initial", 12],
    ["handle", 12],
    ["digits", 10],
    ["title", 10],
    ["first", 14],
    ["dotted", 6],
    ["country", 6],
  ] as const);
  const flat = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z]/g, "")
      .toLowerCase();
  const flatFirst = flat(first);
  const flatLast = flat(last);
  switch (style) {
    case "initial":
      return `${first} ${last[0]}.`;
    case "handle":
      return `${flatFirst}_${flatLast}${chance(rand, 0.4) ? between(rand, 1, 99) : ""}`;
    case "digits":
      return `${first}${last}${between(rand, 10, 2024)}`.replace(/\s+/g, "");
    case "title":
      return `${pick(rand, ["Sis", "Bro", "Mama", "Min.", "Deaconess", "Elder", "Pst"])} ${first}`;
    case "first":
      return first;
    case "dotted":
      return `${flatFirst}.${flatLast}`;
    case "country":
      return `${first}_${code}`;
    default:
      return `${first} ${last}`;
  }
}

export function makePersona(seed: number): Persona {
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
    avatar: photoAvatar(id, initials),
    style,
  };
}

/** A stable cast of recurring commenters for one stream. */
export function buildRoster(streamSeed: number, size = 72): Persona[] {
  const roster: Persona[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (roster.length < size && i < size * 3) {
    const persona = makePersona((streamSeed * 7919 + i * 104729) >>> 0);
    i += 1;
    if (seen.has(persona.name.toLowerCase())) continue;
    seen.add(persona.name.toLowerCase());
    roster.push(persona);
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
