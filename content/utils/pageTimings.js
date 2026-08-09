function getPageTimings() {
  const resources = performance.getEntriesByType("resource");
  const navTiming = performance.getEntriesByType("navigation")[0];

  const grouped = {};
  resources.forEach(entry => {
    const type = entry.initiatorType || "other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({
      name: entry.name.split("/").pop().split("?")[0] || "unknown",
      duration: Math.round(entry.duration),
      renderBlocking: entry.renderBlockingStatus === "blocking",
      size: entry.transferSize || 0,
    });
  });

  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => b.duration - a.duration);
  });

  const renderBlockingCount = resources.filter(
    r => r.renderBlockingStatus === "blocking"
  ).length;

  const pageTiming = navTiming ? {
    domContentLoaded: Math.round(navTiming.domContentLoadedEventEnd),
    fullyLoaded: Math.round(navTiming.loadEventEnd),
  } : null;

  return {
    pageTiming,
    totalResources: resources.length,
    renderBlockingCount,
    grouped,
    scripts: (grouped["script"] || []).slice(0, 3),
    stylesheets: (grouped["css"] || []).slice(0, 3),
  };
}
