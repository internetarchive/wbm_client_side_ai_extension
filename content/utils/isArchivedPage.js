/**
 * Checks if the current page is an actual archived page on the Wayback Machine.
 * Uses regex to match the standard Wayback Machine URL pattern:
 * web.archive.org/web/TIMESTAMP/ORIGINAL_URL
 * 
 * @returns {boolean} true if on an archived page, false otherwise
 */

function isArchivedPage() {
  const url = window.location.href;
  return url.includes("/web/") && url.match(/web\.archive\.org\/web\/\d{14}\//);
}
