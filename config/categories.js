// Topic categories. An item is scored against every category: each keyword
// found in its title or excerpt counts 1, each keyword found in the feed's
// own <category> tags counts 3. The highest score wins; ties go to the
// category listed first. Items that match nothing land in "national".
//
// English keywords match whole words, case-insensitively. Nepali keywords
// match anywhere in the text, so suffixes such as "सरकारले" still match
// "सरकार".

export const categories = [
  {
    slug: 'politics',
    label: { np: 'राजनीति', en: 'Politics' },
    en: ['politics', 'political', 'parliament', 'minister', 'ministers', 'government', 'election', 'elections', 'cabinet', 'prime minister', 'president', 'congress', 'uml', 'maoist', 'cpn', 'rsp', 'rpp', 'party', 'opposition', 'coalition', 'lawmaker', 'lawmakers', 'speaker', 'constitution', 'protest'],
    np: ['राजनीति', 'संसद', 'मन्त्री', 'सरकार', 'निर्वाचन', 'चुनाव', 'पार्टी', 'कांग्रेस', 'काँग्रेस', 'एमाले', 'माओवादी', 'प्रधानमन्त्री', 'राष्ट्रपति', 'मन्त्रिपरिषद्', 'सभामुख', 'गठबन्धन', 'सांसद', 'संविधान', 'रास्वपा', 'राप्रपा', 'आन्दोलन', 'राजनीतिक दल'],
  },
  {
    slug: 'business',
    label: { np: 'अर्थ', en: 'Business' },
    en: ['business', 'economy', 'economic', 'market', 'markets', 'bank', 'banks', 'banking', 'nepse', 'stock', 'stocks', 'shares', 'budget', 'tax', 'trade', 'inflation', 'remittance', 'investment', 'investors', 'rupee', 'gold', 'industry', 'loan', 'loans', 'interest rate', 'finance', 'gdp', 'tourism'],
    np: ['अर्थतन्त्र', 'अर्थमन्त्री', 'आर्थिक', 'बजार', 'बैंक', 'नेप्से', 'सेयर', 'बजेट', 'राजस्व', 'व्यापार', 'मुद्रास्फीति', 'महँगी', 'रेमिट्यान्स', 'विप्रेषण', 'लगानी', 'सुनको मूल्य', 'उद्योग', 'वाणिज्य', 'कर्जा', 'ब्याजदर', 'पर्यटन', 'वित्त'],
  },
  {
    slug: 'sports',
    label: { np: 'खेलकुद', en: 'Sports' },
    en: ['sport', 'sports', 'cricket', 'football', 'match', 'tournament', 'league', 'olympic', 'olympics', 'player', 'players', 'wicket', 'wickets', 'anfa', 'world cup', 'coach', 'medal', 'athlete', 'npl', 'innings'],
    np: ['खेलकुद', 'क्रिकेट', 'फुटबल', 'खेलाडी', 'प्रतियोगिता', 'लिग', 'विकेट', 'विश्वकप', 'प्रशिक्षक', 'पदक', 'एन्फा', 'म्याच', 'इनिङ्स'],
  },
  {
    slug: 'entertainment',
    label: { np: 'मनोरञ्जन', en: 'Entertainment' },
    en: ['entertainment', 'film', 'films', 'movie', 'movies', 'music', 'song', 'songs', 'actor', 'actress', 'celebrity', 'bollywood', 'kollywood', 'hollywood', 'concert', 'singer', 'album', 'box office'],
    np: ['मनोरञ्जन', 'चलचित्र', 'फिल्म', 'गीत', 'सङ्गीत', 'संगीत', 'अभिनेता', 'अभिनेत्री', 'कलाकार', 'गायक', 'गायिका', 'कन्सर्ट', 'बलिउड', 'कलिउड'],
  },
  {
    slug: 'tech',
    label: { np: 'प्रविधि', en: 'Tech' },
    en: ['technology', 'tech', 'internet', 'mobile', 'smartphone', 'smartphones', 'app', 'apps', 'ai', 'artificial intelligence', 'cyber', 'software', 'startup', 'startups', 'digital', 'ncell', 'ntc', 'telecom', 'iphone', 'android', 'electric vehicle', 'ev'],
    np: ['प्रविधि', 'इन्टरनेट', 'मोबाइल', 'स्मार्टफोन', 'एप', 'कृत्रिम बौद्धिकता', 'एआई', 'साइबर', 'सफ्टवेयर', 'डिजिटल', 'टेलिकम', 'एनसेल', 'आईफोन', 'एन्ड्रोइड', 'विद्युतीय सवारी'],
  },
  {
    slug: 'health',
    label: { np: 'स्वास्थ्य', en: 'Health' },
    en: ['health', 'hospital', 'hospitals', 'disease', 'doctor', 'doctors', 'dengue', 'covid', 'vaccine', 'vaccination', 'medical', 'medicine', 'patients', 'outbreak', 'cholera'],
    np: ['स्वास्थ्य', 'अस्पताल', 'चिकित्सक', 'डाक्टर', 'डेंगु', 'कोभिड', 'खोप', 'उपचार', 'बिरामी', 'औषधि', 'हैजा', 'महामारी'],
  },
  {
    // Nepalis living and working outside Nepal. Listed before "world" so a
    // story such as "Nepalis in America ..." lands here, not in World.
    slug: 'diaspora',
    label: { np: 'प्रवास', en: 'Nepalis Abroad' },
    description: {
      np: 'विदेशमा रहेका नेपालीका ताजा समाचार: वैदेशिक रोजगार, भिसा, एनआरएनए र प्रवासी समुदाय, प्रमुख अनलाइन पत्रिकाबाट एकै ठाउँमा। हरेक ३० मिनेटमा अपडेट।',
      en: 'Latest news for Nepalis abroad: foreign employment, visas and immigration, NRNA and Nepali communities around the world. Updated every 30 minutes.',
    },
    en: ['diaspora', 'nrn', 'nrna', 'non-resident nepali', 'non-resident nepalis', 'migrant', 'migrants', 'migrant worker', 'migrant workers', 'foreign employment', 'labour permit', 'labor permit', 'manpower', 'visa', 'visas', 'immigration', 'immigrants', 'deported', 'deportation', 'green card', 'dv lottery', 'tps', 'h-1b', 'work permit', 'abroad', 'overseas', 'nepali community', 'nepalis in', 'malaysia', 'qatar', 'saudi', 'uae', 'dubai', 'kuwait', 'gulf'],
    np: ['प्रवास', 'गैरआवासीय', 'एनआरएन', 'वैदेशिक रोजगार', 'श्रम स्वीकृति', 'म्यानपावर', 'मेनपावर', 'आप्रवासन', 'अध्यागमन', 'भिसा', 'डीभी', 'ग्रिनकार्ड', 'ग्रीनकार्ड', 'टीपीएस', 'विदेशमा', 'विदेशबाट', 'अमेरिकामा', 'अस्ट्रेलियामा', 'बेलायतमा', 'जापानमा', 'कोरियामा', 'क्यानडामा', 'मलेसिया', 'कतार', 'साउदी', 'दुबई', 'युएई', 'यूएई', 'कुवेत', 'खाडी', 'नेपाली समुदाय'],
  },
  {
    slug: 'world',
    label: { np: 'विश्व', en: 'World' },
    en: ['world', 'international', 'india', 'china', 'united states', 'america', 'washington', 'united nations', 'russia', 'ukraine', 'israel', 'gaza', 'pakistan', 'bangladesh', 'global', 'europe', 'trump', 'beijing', 'delhi'],
    np: ['विश्व', 'अन्तर्राष्ट्रिय', 'अन्तराष्ट्रिय', 'भारत', 'चीन', 'अमेरिका', 'राष्ट्रसंघ', 'रुस', 'युक्रेन', 'इजरायल', 'पाकिस्तान', 'बंगलादेश', 'बङ्गलादेश', 'ट्रम्प', 'बेइजिङ', 'दिल्ली'],
  },
];

// Everything that matches no keyword.
export const fallbackCategory = {
  slug: 'national',
  label: { np: 'देश', en: 'Nepal' },
};

export const allCategories = [...categories, fallbackCategory];
