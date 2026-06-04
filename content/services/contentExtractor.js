function extractPageContent() {
  /*  
      TODO: Replace manual extraction with Readability.js
      Current approach is site-specific and doesn't scale
      Readability.js uses content density scoring like Firefox Reader Mode
      Demo: https://web.archive.org/web/20260224073754/https://www.wikipedia.org/
      Extracted content: ` 
        Wikipedia The Free Encyclopedia
        Wikipedia 25 years of the free encyclopedia
        Unlock birthday surprises on Wikipedia
        Learn how to turn on Birthday mode so you and Baby Globe can explore Wikipedia together!
        Learn how to turn on Birthday mode so you and Baby Globe can explore Wikipedia together!
        Search Wikipedia 
        en
        Afrikaans
        Shqip
        العربية
        Asturianu
        Azərbaycanca
        Български
        閩南語 / Bân-lâm-gú
        বাংলা
        Беларуская
        Catal�?
        Čeština
        Cymraeg
        Dansk
        Deutsch
        Eesti
        Ελληνικά
        English
        Español
        Esperanto
        Euskara
        فارس?� 
      `
  */

  const toolbar = document.getElementById("wm-ipp-base");
  if (toolbar) toolbar.remove();

  const noiseSelectors = [
    "nav", "header", "footer", "aside",
    "section.sidebar", "section.related",
    "section.advertisement", "section.newsletter",
    ".sidebar", ".navigation", ".menu",
    ".ads", ".advertisement", ".banner",
    "script", "style", "noscript"
  ];

  noiseSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.remove());
  });


  const contentElements = document.querySelectorAll(
    "article, main, p"
  );
  
  let text = "";
  contentElements.forEach((el) => {
    text += el.innerText + " ";
  });

  if (text.trim().length < 100) {
    text = document.body.innerText;
  }

  console.log("Extracted content preview:", text.slice(0, 500));

  return text.trim().slice(0, 4000);
}
