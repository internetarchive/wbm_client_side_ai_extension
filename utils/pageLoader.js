export function waitForPageLoad() {
  return new Promise(resolve => {
    if (document.readyState === "complete") {
      resolve();
    } else {
      window.addEventListener("load", resolve, { once: true });
    }
  });
}
