// Rules shared by the deck editor (client) and /api/decks (server) so public decks stay
// consistent and high quality — consistent subjects build strong subject pages on Google.

export const MIN_PUBLIC_CARDS = 10;

// Standard subject names students pick from (they can still type their own).
export const STANDARD_SUBJECTS = [
  // Sciences
  "Biology", "AP Biology", "Chemistry", "AP Chemistry", "Organic Chemistry", "Physics", "AP Physics",
  "Anatomy & Physiology", "Earth Science", "Environmental Science", "Microbiology", "Astronomy",
  // Math
  "Algebra", "Geometry", "Precalculus", "Calculus", "AP Calculus", "Statistics", "AP Statistics",
  // Social studies
  "U.S. History", "AP U.S. History", "World History", "AP World History", "European History",
  "U.S. Government", "Economics", "Geography", "Psychology", "AP Psychology", "Sociology", "Philosophy",
  // English & languages
  "English", "AP English Language", "AP English Literature", "Vocabulary", "SAT Vocabulary",
  "Spanish", "French", "German", "Italian", "Japanese", "Chinese", "Korean", "Latin", "ASL",
  // Health & careers
  "Nursing", "NCLEX", "Pharmacology", "Medical Terminology", "MCAT", "Nutrition", "Kinesiology",
  "Real Estate", "Accounting", "Business", "Marketing", "Law", "Criminal Justice",
  // Tech & arts
  "Computer Science", "AP Computer Science", "Programming", "Information Technology",
  "Art", "Art History", "Music", "Music Theory", "Religion", "Other",
];

// Common ways students type a subject → the standard name.
const ALIASES = {
  bio: "Biology", "biology 101": "Biology", "intro biology": "Biology", "ap bio": "AP Biology",
  chem: "Chemistry", "chemistry 101": "Chemistry", "ap chem": "AP Chemistry", "o chem": "Organic Chemistry", "ochem": "Organic Chemistry",
  "a&p": "Anatomy & Physiology", "a & p": "Anatomy & Physiology", anatomy: "Anatomy & Physiology", physiology: "Anatomy & Physiology",
  "anatomy and physiology": "Anatomy & Physiology", calc: "Calculus", "ap calc": "AP Calculus", stats: "Statistics", "ap stats": "AP Statistics",
  "pre calc": "Precalculus", "pre-calc": "Precalculus", precalc: "Precalculus",
  "us history": "U.S. History", "american history": "U.S. History", apush: "AP U.S. History", "ap us history": "AP U.S. History",
  "ap world": "AP World History", "world hist": "World History", government: "U.S. Government", "us government": "U.S. Government", gov: "U.S. Government",
  econ: "Economics", psych: "Psychology", "psychology 101": "Psychology", "psych 101": "Psychology", "ap psych": "AP Psychology",
  "ap lang": "AP English Language", "ap lit": "AP English Literature", vocab: "Vocabulary", "sat vocab": "SAT Vocabulary",
  espanol: "Spanish", "español": "Spanish", francais: "French", "français": "French", "sign language": "ASL",
  "med term": "Medical Terminology", "medical terms": "Medical Terminology", pharm: "Pharmacology", "cs": "Computer Science", "comp sci": "Computer Science",
  "apcs": "AP Computer Science", coding: "Programming", it: "Information Technology",
};

const LOWER = new Map(STANDARD_SUBJECTS.map((s) => [s.toLowerCase(), s]));

// Returns the standard name when one matches, otherwise the student's text in Title Case.
export function normalizeSubject(raw) {
  const t = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!t) return "Other";
  const k = t.toLowerCase();
  if (LOWER.has(k)) return LOWER.get(k);
  if (ALIASES[k]) return ALIASES[k];
  return t.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function completeCards(cards) {
  return (cards || []).filter((c) => String(c?.term || "").trim() && String(c?.definition || "").trim()).length;
}
