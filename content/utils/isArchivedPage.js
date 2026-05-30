function isArchivedPage() {
  const url = window.location.href;
  return url.includes("/web/") && url.match(/web\.archive\.org\/web\/\d{14}\//);
}