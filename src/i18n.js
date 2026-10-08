// Interface text in both languages.

export const strings = {
  np: {
    htmlLang: 'ne',
    locale: 'ne-NP',
    siteName: 'लेटेस्ट नेपाल न्युज',
    tagline: 'नेपालका प्रमुख समाचार, एकै ठाउँमा',
    description: 'नेपालका प्रमुख अनलाइन पत्रिकाका ताजा समाचार एकै ठाउँमा। राजनीति, अर्थ, खेलकुद, मनोरञ्जन, प्रविधि र अन्य, हरेक ३० मिनेटमा अपडेट।',
    home: 'गृहपृष्ठ',
    latest: 'ताजा',
    topStories: 'प्रमुख समाचार',
    latestNews: 'ताजा समाचार',
    more: 'थप',
    sources: 'स्रोतहरू',
    alsoCovered: 'अरू स्रोतमा पनि',
    sourcesCount: (n) => `${n} स्रोत`,
    updated: 'अपडेट',
    switchTo: 'English',
    about: 'हाम्रो बारेमा',
    privacy: 'गोपनीयता नीति',
    disclaimer: 'अस्वीकरण',
    empty: 'अहिले यहाँ कुनै समाचार छैन। केही बेरमा फेरि हेर्नुहोस्।',
    footerNote: 'शीर्षक र अंशहरू मूल प्रकाशकका हुन् र पूरा समाचार उनीहरूकै वेबसाइटमा छ। सारांशहरू स्वचालित रूपमा तयार गरिन्छन्।',
    sourcesIntro: 'यी प्रकाशकका सार्वजनिक RSS फिडबाट शीर्षक र छोटो अंश लिइन्छ। हरेक समाचार मूल वेबसाइटमा जोडिएको छ।',
    stories: (n) => `${n} समाचार`,
    notFound: 'पृष्ठ फेला परेन',
    notFoundBody: 'तपाईंले खोज्नुभएको पृष्ठ यहाँ छैन।',
    backHome: 'गृहपृष्ठमा फर्कनुहोस्',
    skip: 'मुख्य सामग्रीमा जानुहोस्',
    readFull: (name) => `${name} मा पूरा समाचार पढ्नुहोस्`,
    summary: 'सारांश',
    summaryNote: (n) => `यो सारांश ${n} स्रोतका समाचारबाट स्वचालित रूपमा तयार गरिएको हो।`,
    excerptFrom: (name) => `${name} बाट अंश`,
    alsoReporting: 'यो खबर अरूले पनि लेखेका छन्',
    share: 'सेयर गर्नुहोस्',
    copyLink: 'लिंक कपी गर्नुहोस्',
    copied: 'लिंक कपी भयो',
    moreNews: 'थप समाचार',
    brief: 'दैनिक सार',
    briefIntro: 'दिनभरका प्रमुख समाचार छोटकरीमा।',
    earlierBriefs: 'अघिल्ला दिनहरू',
    briefEmpty: 'यो दिनको सार अझै तयार भएको छैन।',
    briefNote: 'सारांशहरू स्वचालित रूपमा तयार गरिएका हुन्। पूरा समाचार मूल वेबसाइटमा पढ्नुहोस्।',
  },
  en: {
    htmlLang: 'en',
    locale: 'en-GB',
    siteName: 'Latest Nepal News',
    tagline: "Nepal's top headlines in one place",
    description: "Latest news from Nepal's leading publishers in one place. Politics, business, sports, entertainment, tech and more, updated every 30 minutes.",
    home: 'Home',
    latest: 'Latest',
    topStories: 'Top stories',
    latestNews: 'Latest news',
    more: 'More',
    sources: 'Sources',
    alsoCovered: 'Also covered by',
    sourcesCount: (n) => `${n} sources`,
    updated: 'Updated',
    switchTo: 'नेपाली',
    about: 'About',
    privacy: 'Privacy policy',
    disclaimer: 'Disclaimer',
    empty: 'No stories here right now. Check back shortly.',
    footerNote: 'Headlines and excerpts belong to their original publishers, and full stories are on their websites. Summaries are generated automatically.',
    sourcesIntro: 'Headlines and short excerpts come from these publishers’ public RSS feeds. Every story links to the original website.',
    stories: (n) => `${n} ${n === 1 ? 'story' : 'stories'}`,
    notFound: 'Page not found',
    notFoundBody: 'The page you were looking for is not here.',
    backHome: 'Back to the homepage',
    skip: 'Skip to main content',
    readFull: (name) => `Read the full story at ${name}`,
    summary: 'Summary',
    summaryNote: (n) => `This summary was generated automatically from ${n} news reports.`,
    excerptFrom: (name) => `Excerpt from ${name}`,
    alsoReporting: 'Also reporting this',
    share: 'Share',
    copyLink: 'Copy link',
    copied: 'Link copied',
    moreNews: 'More news',
    brief: 'Daily brief',
    briefIntro: "The day's biggest stories in short.",
    earlierBriefs: 'Earlier briefs',
    briefEmpty: 'No brief for this day yet.',
    briefNote: 'Summaries are generated automatically. Read the full stories on the original websites.',
  },
};

// Static pages. Bodies are trusted HTML written here, not feed content.
export const pages = {
  about: {
    np: `<p>लेटेस्ट नेपाल न्युजले नेपालका प्रमुख अनलाइन पत्रिकाका ताजा समाचार एकै ठाउँमा देखाउँछ, ताकि तपाईंले धेरै वेबसाइट घुम्नु नपरोस्।</p>
<p>हरेक ३० मिनेटमा हामी प्रकाशकहरूको सार्वजनिक RSS फिडबाट शीर्षक र छोटो अंश लिन्छौं र विषय अनुसार मिलाउँछौं। एउटै खबर धेरै पत्रिकाले लेखेका छन् भने हामी तिनलाई सँगै देखाउँछौं, ताकि तपाईं फरक दृष्टिकोण तुलना गर्न सक्नुहोस्।</p>
<p>धेरै पत्रिकाले लेखेका खबरको छोटो सारांश हामी AI प्रयोग गरेर स्वचालित रूपमा तयार गर्छौं। सारांश ती पत्रिकाले प्रकाशित गरेका कुरामा मात्र आधारित हुन्छ।</p>
<p>पूरा समाचार सधैं मूल प्रकाशकको वेबसाइटमा पढिन्छ। सुझाव वा गुनासोका लागि हामीलाई सम्पर्क गर्नुहोस्।</p>`,
    en: `<p>Latest Nepal News brings the newest headlines from Nepal’s leading online publishers together in one place, so you don’t have to visit a dozen websites.</p>
<p>Every 30 minutes we collect headlines and short excerpts from publishers’ public RSS feeds and sort them by topic. When several outlets report the same story, we group them so you can compare coverage.</p>
<p>For stories several outlets cover, we write a short summary automatically with AI, using only what those outlets reported.</p>
<p>Full stories are always read on the original publisher’s website. Get in touch with suggestions or concerns.</p>`,
  },
  privacy: {
    np: `<p>यो वेबसाइटले खाता बनाउन लगाउँदैन र तपाईंको व्यक्तिगत जानकारी सङ्कलन गर्दैन।</p>
<p>वेबसाइट राखिएको होस्टिङ सेवाले सुरक्षा र सञ्चालनका लागि आगन्तुकको IP ठेगाना जस्ता प्राविधिक लग राख्न सक्छ। फन्टहरू Google Fonts बाट लोड हुन्छन्। समाचारका तस्बिरहरू मूल प्रकाशकको सर्भरबाट लोड हुन्छन्।</p>
<p>भविष्यमा विश्लेषण वा विज्ञापन थपिएमा यो पृष्ठ अद्यावधिक गरिनेछ।</p>`,
    en: `<p>This website does not ask you to create an account and does not collect personal information.</p>
<p>The site’s hosting provider may keep technical logs such as visitor IP addresses for security and operations. Fonts load from Google Fonts. Story images load from the original publishers’ servers.</p>
<p>If analytics or advertising are added in future, this page will be updated.</p>`,
  },
  disclaimer: {
    np: `<p>यस वेबसाइटमा देखिने शीर्षक, अंश र तस्बिरहरू तिनका मूल प्रकाशकका हुन् र प्रकाशकको सार्वजनिक RSS फिडबाट स्वचालित रूपमा लिइएका हुन्। हरेक समाचार मूल स्रोतमा जोडिएको छ।</p>
<p>सारांशहरू AI ले स्वचालित रूपमा तयार गर्छ र तिनमा गल्ती हुन सक्छ। आधिकारिक जानकारीका लागि मूल समाचार पढ्नुहोस्।</p>
<p>समाचारको सत्यता र सामग्रीको जिम्मेवारी सम्बन्धित प्रकाशकको हो। आफ्नो सामग्री यहाँ नदेखाउन चाहने प्रकाशकले हामीलाई सम्पर्क गरेमा तुरुन्तै हटाइनेछ।</p>`,
    en: `<p>Headlines, excerpts and images shown on this website belong to their original publishers and are collected automatically from the publishers’ public RSS feeds. Every story links to its original source.</p>
<p>Summaries are generated automatically by AI and may contain mistakes. The original reports are the authoritative source.</p>
<p>Responsibility for the accuracy and content of each story lies with its publisher. Any publisher who prefers not to appear here can contact us and their content will be removed promptly.</p>`,
  },
};
