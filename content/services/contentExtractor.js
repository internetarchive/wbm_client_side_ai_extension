/**
 * Extracts the main content from an archived page using Mozilla's Readability.js
 * Readability.js is the same library Firefox uses for Reader Mode.
 * It automatically identifies and extracts the main article content,
 * filtering out noise like ads, navbars, sidebars and footers.
 * 
 * @returns {string} cleaned main content of the page, limited to 4000 chars
 */
function extractPageContent() {
  try {
    const documentClone = document.cloneNode(true);

    const toolbar = documentClone.getElementById("wm-ipp-base");
    if (toolbar) toolbar.remove();

    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 100) {
      console.log("Readability extraction successful!");
      console.log("Extracted title:", article.title);
      console.log("Content preview:", article.textContent.slice(0, 500));
      
      const content = `Title: ${article.title}\n\n${article.textContent}`;
      return content.trim().slice(0, 4000);
    }

    console.log("Readability failed, falling back to manual extraction");
    return fallbackExtraction();

  } catch (error) {
    console.error("Readability extraction error:", error);
    return fallbackExtraction();
  }
}

/**
 * Fallback content extraction using manual DOM parsing
 * Used when Readability.js fails to parse the page
 * 
 * @returns {string} extracted text content
 */
function fallbackExtraction() {
  const toolbar = document.getElementById("wm-ipp-base");
  if (toolbar) toolbar.remove();

  const contentElements = document.querySelectorAll("article, main, p");
  let text = "";
  
  contentElements.forEach((el) => {
    const cleaned = el.innerText.trim();
    if (cleaned.length > 50) {
      text += cleaned + "\n\n";
    }
  });

  if (text.trim().length < 100) {
    text = document.body.innerText;
  }

  console.log("Fallback content preview:", text.slice(0, 500));
  return text.trim().slice(0, 4000);
}
