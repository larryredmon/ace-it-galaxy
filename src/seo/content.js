// Search-engine content shared by the app (client) and the build step that writes
// a ready-made HTML page for every route (vite.config.js → seoPrerender).
export const SITE = "https://www.aceitgalaxy.com";

// Title (≈50–60 characters) and description (≈150–160) for each route.
export const PAGE_META = {
  "/":          { title: "Ace It Galaxy — Free AI Study Tools for Students", description: "Free AI study tools in one place: flashcard generator, AI notes, mind maps, an AI study assistant, planner and live study rooms. No paywalls, built for students." },
  flashcards:   { title: "Free AI Flashcard Generator for Students | Ace It Galaxy", description: "Turn notes, textbook pages or PDFs into flashcards in seconds with AI, then study with spaced repetition. Free for students, no card limits or paywalls." },
  notes:        { title: "AI Note Taker for Students — Free | Ace It Galaxy", description: "Record lectures, upload slides or paste notes and AI turns them into clean, organized study notes you can review or turn into flashcards. Free for students." },
  brainmap:     { title: "Free Mind Map Maker for Studying | Ace It Galaxy", description: "Build visual mind maps that connect ideas, let AI expand a topic for you, and attach flashcard decks to any node. A free brain map tool for students." },
  simplifier:   { title: "AI Text Simplifier & Summarizer — Free | Ace It Galaxy", description: "Paste a hard reading or a YouTube link and get a clear, simple explanation, summary or key terms at your reading level. Free AI text simplifier for students." },
  tracker:      { title: "Free Student Planner & Assignment Tracker | Ace It Galaxy", description: "Track assignments, exams and due dates for every class in one free student planner. Snap a syllabus and AI adds the deadlines for you." },
  assistant:    { title: "Free AI Study Assistant & Tutor | Ace It Galaxy", description: "Meet Ace, a free AI study buddy that explains concepts, quizzes you, builds study plans and keeps you on track. Made for high school and college students." },
  studybuddy:   { title: "Online Study Rooms with Friends — Free | Ace It Galaxy", description: "Study live with classmates in free video study rooms with a shared timer, chat and screen sharing. Stay focused together on Ace It Galaxy." },
  coursehub:    { title: "Course Organizer for Students — Free | Ace It Galaxy", description: "Upload your syllabus and course materials once and AI organizes every class in one place. A free course hub for students." },
  journal:      { title: "Study Journal for Students — Free | Ace It Galaxy", description: "Reflect on what you learned, track your mood and progress, and build better study habits with a free guided student journal." },
  settings:     { title: "Settings | Ace It Galaxy", description: "Manage your Ace It Galaxy account.", noindex: true },
  privacy:      { title: "Privacy Policy | Ace It Galaxy", description: "How Ace It Galaxy collects, uses and protects student data. We never sell your data or show ads." },
  terms:        { title: "Terms of Service | Ace It Galaxy", description: "The rules for using Ace It Galaxy, the free AI study platform for students." },
};

// Shown on the landing page and marked up for Google (FAQPage).
export const LANDING_FAQS = [
  { q: "Is Ace It Galaxy really free?", a: "Yes. Every study tool is free for students, with no ads and no paywalls. AI features have a generous daily limit so the site stays free for everyone." },
  { q: "Is Ace It Galaxy a free Quizlet alternative?", a: "Yes. You can make flashcards by hand or let AI build a deck from your notes, study with spaced repetition, and browse decks other students shared, all free." },
  { q: "What can I make flashcards from?", a: "Paste notes or a textbook passage, upload a PDF or document, or snap a photo. AI turns it into a study-ready deck in seconds." },
  { q: "Who is Ace It Galaxy for?", a: "High school and college students (13 and up) who want one place for flashcards, notes, mind maps, planning and an AI study assistant." },
  { q: "Do I need to make an account?", a: "You can look around without one. A free account saves your work and syncs it across your phone and computer, and is needed for AI features." },
  { q: "Can I use it on my phone?", a: "Yes. Ace It Galaxy works in any phone browser, and you can add it to your home screen so it opens like an app." },
];

export const SEO_CONTENT = {
  flashcards: {
    name: "Flash Cards", color: "#C8B8FF", kicker: "AI FLASHCARDS",
    h1: "Free AI Flashcard Generator",
    tagline: "Turn any notes, textbook chapter, or PDF into a complete flashcard deck in seconds — then study it with spaced repetition until it sticks. No card limits, no paywalls, free for students.",
    features: [
      { t: "Generate decks instantly", d: "Paste text or upload a file and AI writes accurate question-and-answer cards for you — no more typing decks by hand." },
      { t: "Spaced repetition built in", d: "Cards you miss come back more often, so your time goes to what you haven't mastered yet." },
      { t: "Organized by class", d: "Group decks into folders by course, and pull them into brain maps or notes whenever you need them." },
    ],
    steps: [
      { t: "Upload your material", d: "Drop in notes, a textbook passage, or a PDF." },
      { t: "AI builds the deck", d: "A full set of study-ready cards appears in seconds." },
      { t: "Study until mastered", d: "Quiz yourself with spaced repetition and watch your mastery climb." },
    ],
    faqs: [
      { q: "Is the flashcard generator really free?", a: "Yes. Every study tool on Ace It Galaxy is free for students, with no card limits or paywalls." },
      { q: "What can I make flashcards from?", a: "Paste your notes or a textbook passage, or upload a PDF or document — AI turns any of it into a study-ready deck." },
      { q: "Do I need an account?", a: "You can try it without signing up. Create a free account to save your decks and sync them across devices." },
    ],
  },
  notes: {
    name: "Notes", color: "#F0D080", kicker: "AI NOTES",
    h1: "AI Note-Taking for Students",
    tagline: "Record lectures, upload slides, or paste your own notes and let AI turn them into clean, organized study notes — structured, summarized, and ready to review.",
    features: [
      { t: "Record & transcribe lectures", d: "Capture a lecture live and get an organized transcript you can actually study from." },
      { t: "Clean up any input", d: "Messy notes, slides, or uploads become clear, structured study notes automatically." },
      { t: "Send notes to flashcards", d: "Turn any note into a flashcard deck with one click and study it right away." },
    ],
    steps: [
      { t: "Capture anything", d: "Record, upload, or paste your material." },
      { t: "AI organizes it", d: "Everything becomes clean, structured notes." },
      { t: "Review and reuse", d: "Study your notes or turn them into cards." },
    ],
    faqs: [
      { q: "Is it free?", a: "Yes — AI note-taking is free for students on Ace It Galaxy, with no subscription." },
      { q: "Can it record and transcribe lectures?", a: "Yes. Record a lecture in the app and AI turns it into organized notes you can review later." },
      { q: "Can I turn notes into flashcards?", a: "Absolutely — send any note straight to the flashcard generator in one click." },
    ],
  },
  brainmap: {
    name: "Brain Map", color: "#F0A8C0", kicker: "BRAIN MAP",
    h1: "Free Online Mind Map Maker",
    tagline: "Build visual mind maps that connect ideas and reveal the big picture. Attach flashcard decks to any node and study straight from the map.",
    features: [
      { t: "Unlimited nodes & nesting", d: "Branch out as far as your subject goes — there are no limits on how deep your map gets." },
      { t: "Attach decks to concepts", d: "Pin a flashcard deck to any node and study a topic without leaving the map." },
      { t: "Works on any device", d: "Pinch-to-zoom and drag on your phone, tablet, or laptop." },
    ],
    steps: [
      { t: "Start a central idea", d: "Drop your main topic in the middle." },
      { t: "Branch out concepts", d: "Add and connect related ideas visually." },
      { t: "Attach decks and study", d: "Pin flashcards to nodes and review from the map." },
    ],
    faqs: [
      { q: "Is the mind map maker free?", a: "Yes — building brain maps is completely free for students, with unlimited nodes." },
      { q: "Can I attach flashcards to a node?", a: "Yes. Attach any deck to any concept and study it directly from your map." },
      { q: "Does it work on a phone or tablet?", a: "Yes — the map supports pinch-to-zoom and touch, so it works on any device." },
    ],
  },
  simplifier: {
    name: "Text Simplifier", color: "#6ED9B8", kicker: "TEXT SIMPLIFIER",
    h1: "AI Text Simplifier & YouTube Summarizer",
    tagline: "Paste a dense passage or a YouTube link and get a clear, structured version you can actually understand — at the reading level that works for you.",
    features: [
      { t: "Simplify any passage", d: "Turn confusing academic text into plain language without losing the meaning." },
      { t: "Summarize YouTube videos", d: "Drop in a video link and get a structured summary of what it covers." },
      { t: "Adjustable reading level", d: "Choose how simple you want it — from quick overview to detailed breakdown." },
    ],
    steps: [
      { t: "Paste text or a link", d: "Add any passage or a YouTube URL." },
      { t: "AI simplifies it", d: "Get a clear, structured version in seconds." },
      { t: "Read and understand", d: "Study it at a level that makes sense to you." },
    ],
    faqs: [
      { q: "Is it free?", a: "Yes — the text simplifier is free for students on Ace It Galaxy." },
      { q: "Does it work on YouTube videos?", a: "Yes. Paste a YouTube link and AI returns a structured summary of the video." },
      { q: "Can I change how simple the output is?", a: "Yes — pick a reading level so the result matches how much detail you want." },
    ],
  },
  tracker: {
    name: "Tracker", color: "#7FB8F0", kicker: "TRACKER",
    h1: "Free Student Planner & Assignment Tracker",
    tagline: "Your planner, calendar, and to-do list in one place. Track assignments, deadlines, and exams so nothing slips through the cracks.",
    features: [
      { t: "Every deadline in one view", d: "See all your assignments and due dates across every class at a glance." },
      { t: "Calendar + to-do together", d: "Plan on a calendar and check items off a list in the same place." },
      { t: "Never miss an assignment", d: "Keep due dates front and center so nothing sneaks up on you." },
    ],
    steps: [
      { t: "Add your assignments", d: "Enter due dates for every class." },
      { t: "See what's due", d: "View everything on a calendar or list." },
      { t: "Check it off", d: "Mark work done and stay ahead." },
    ],
    faqs: [
      { q: "Is the planner free?", a: "Yes — the student planner and assignment tracker are free on Ace It Galaxy." },
      { q: "Can I see a calendar view?", a: "Yes. Your assignments show up on a calendar and as a to-do list." },
      { q: "Does it sync across devices?", a: "With a free account, your tracker syncs everywhere you log in." },
    ],
  },
  assistant: {
    name: "Personal Assistant", color: "#90C8F8", kicker: "PERSONAL ASSISTANT",
    h1: "Your Personal AI Study Assistant",
    tagline: "An AI tutor that knows what you're working on. Ask questions, build study plans, and get help staying on track across every tool in the platform.",
    features: [
      { t: "Answers your questions", d: "Get clear explanations for anything you're studying, any time." },
      { t: "Builds study plans", d: "Tell it your goals and it maps out what to study and when." },
      { t: "Knows your work", d: "It sees your decks, notes, and coursework, so its help is actually about your classes." },
    ],
    steps: [
      { t: "Ask anything", d: "Bring a question, a topic, or a goal." },
      { t: "Get a plan", d: "Receive a personalized study plan or answer." },
      { t: "Stay on track", d: "Check in across every app as you go." },
    ],
    faqs: [
      { q: "Is it free?", a: "Yes — your AI study assistant is free for students on Ace It Galaxy." },
      { q: "How is it different from a generic chatbot?", a: "It's connected to your own decks, notes, and coursework, so its answers and study plans are tailored to what you're actually studying." },
      { q: "Can it build me a study plan?", a: "Yes. Share your goals and deadlines and it will lay out a plan to get you there." },
    ],
  },
  studybuddy: {
    name: "Study Buddy", color: "#FFA8D0", kicker: "STUDY BUDDY",
    h1: "Live Study Rooms for Students",
    tagline: "Study live with classmates over video. Share documents, sync study timers, and work through material together in real time.",
    features: [
      { t: "Video study rooms", d: "Jump on camera with classmates and study together from anywhere." },
      { t: "Shared document viewer", d: "Open the same PDF or notes so everyone's on the same page." },
      { t: "Synced study timers", d: "Run focus timers together to keep the whole group on rhythm." },
    ],
    steps: [
      { t: "Start a room", d: "Create a study room in one click." },
      { t: "Invite classmates", d: "Share the room with up to five friends." },
      { t: "Study together", d: "Share docs, sync timers, and focus as a group." },
    ],
    faqs: [
      { q: "Is it free?", a: "Yes — live study rooms are free for students on Ace It Galaxy." },
      { q: "How many people can join a room?", a: "Up to six people can study together in a single room." },
      { q: "Can we share documents?", a: "Yes. Open a shared PDF or notes so everyone sees the same material." },
    ],
  },
  coursehub: {
    name: "Course Hub", color: "#6ED9B8", kicker: "COURSE HUB",
    h1: "Organize All Your Course Materials in One Place",
    tagline: "Upload your syllabus and course materials once. AI organizes everything into folders and pushes content straight to your flashcards, notes, and simplifier.",
    features: [
      { t: "Unlimited nested folders", d: "Organize every class, unit, and topic exactly how your courses are structured." },
      { t: "Upload anything", d: "Add files, pasted text, links, or audio — it all lives in one hub." },
      { t: "Send to any tool", d: "Push a document into flashcards, notes, or the simplifier in one click." },
    ],
    steps: [
      { t: "Upload your syllabus", d: "Add your course files and materials." },
      { t: "AI organizes it", d: "Everything sorts into clean, nested folders." },
      { t: "Study from one hub", d: "Send materials to any study tool instantly." },
    ],
    faqs: [
      { q: "Is Course Hub free?", a: "Yes — organizing your courses is free for students on Ace It Galaxy." },
      { q: "What can I upload?", a: "Files, pasted text, links, and audio recordings all live together in one hub." },
      { q: "Can I send materials to other tools?", a: "Yes. Push any document to flashcards, notes, or the text simplifier in one click." },
    ],
  },
  journal: {
    name: "Journal", color: "#E8C4F0", kicker: "JOURNAL",
    h1: "A Reflection Journal for Students",
    tagline: "Reflect on what you've learned, track your progress, and build the habit of thinking deeply about your studies — with gentle AI prompts whenever you want them.",
    features: [
      { t: "Reflection prompts", d: "Optional AI prompts help you think through what you learned each day." },
      { t: "Track your progress", d: "Look back over time and see how far you've come." },
      { t: "Private and yours", d: "Your journal is personal — write freely and keep it to yourself." },
    ],
    steps: [
      { t: "Write a reflection", d: "Jot down what you learned or struggled with." },
      { t: "Look back", d: "Revisit past entries and see your growth." },
      { t: "Build the habit", d: "Make deep thinking part of how you study." },
    ],
    faqs: [
      { q: "Is the journal free?", a: "Yes — the student journal is free on Ace It Galaxy." },
      { q: "Is my journal private?", a: "Yes. Your entries are personal to your account and aren't shared." },
      { q: "Do I have to write every day?", a: "Not at all — journal whenever it helps. The prompts are there when you want them." },
    ],
  },
};

export const SEO_APP_ORDER = ["flashcards","notes","brainmap","simplifier","tracker","assistant","studybuddy","coursehub","journal"];
