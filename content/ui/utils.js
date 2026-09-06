const LANGUAGES = [
  { code: "hi", name: "हिन्दी" },
  { code: "bn", name: "বাংলা" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
  { code: "ko", name: "한국어" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
  { code: "it", name: "Italiano" },
  { code: "nl", name: "Nederlands" },
  { code: "tr", name: "Türkçe" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "th", name: "ไทย" }
];

function getLanguageDisplayName(lang) {
  const found = LANGUAGES.find(l => l.code === lang);
  return found ? found.name : lang;
}

function formatCompareDate(ts) {
  if (!ts) return "";
  if (ts === "live") return "Live";
  if (ts.length < 8) return ts;
  const y = ts.substring(0, 4), m = ts.substring(4, 6), d = ts.substring(6, 8);
  const date = new Date(+y, +m - 1, +d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
