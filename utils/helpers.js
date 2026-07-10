export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export function isPlaybackPage(url) {
  return url && /web\.archive\.org\/web\/\d{14}/.test(url);
}

export function formatDate(ts) {
  if (!ts || ts.length < 8) return "Unknown";
  const year = ts.substring(0, 4);
  const month = ts.substring(4, 6);
  const day = ts.substring(6, 8);
  const date = new Date(+year, +month - 1, +day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
