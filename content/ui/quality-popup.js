function qualityPopup(timings) {
    const totalRes = timings?.totalResources;
    const scriptCount = (timings?.grouped["script"] || []).length;
    const cssCount = (timings?.grouped["css"] || []).length;
    const imgCount = (timings?.grouped["img"] || []).length;
    const otherCount = totalRes - scriptCount - cssCount - imgCount;

    const barWidth = (count) => Math.round((count / Math.max(totalRes, 1)) * 100);

    const timingHTML = `
      <div class="wbm-section">
        
        <div class="wbm-section-title">📊 Resource Breakdown</div>
        
        <div class="wbm-stat-row">
          <span class="wbm-stat-label">Total Resources</span>
          <span class="wbm-stat-value">${totalRes}</span>
        </div>

        ${timings.pageTiming ? `
        <div class="wbm-stat-row">
          <span class="wbm-stat-label">DOM Content Loaded</span>
          <span class="wbm-stat-value">${timings.pageTiming.domContentLoaded}ms</span>
        </div>
        <div class="wbm-stat-row">
          <span class="wbm-stat-label">Fully Loaded</span>
          <span class="wbm-stat-value">${timings.pageTiming.fullyLoaded}ms</span>
        </div>
        ` : ''}

        <div class="wbm-bars">
          <div class="wbm-bar-row">
            <span class="wbm-bar-label">JS</span>
            <div class="wbm-bar-track">
              <div class="wbm-bar wbm-bar-script" style="width: ${barWidth(scriptCount)}%"></div>
            </div>
            <span class="wbm-bar-count">${scriptCount}</span>
          </div>
          <div class="wbm-bar-row">
            <span class="wbm-bar-label">CSS</span>
            <div class="wbm-bar-track">
              <div class="wbm-bar wbm-bar-css" style="width: ${barWidth(cssCount)}%"></div>
            </div>
            <span class="wbm-bar-count">${cssCount}</span>
          </div>
          <div class="wbm-bar-row">
            <span class="wbm-bar-label">IMG</span>
            <div class="wbm-bar-track">
              <div class="wbm-bar wbm-bar-img" style="width: ${barWidth(imgCount)}%"></div>
            </div>
            <span class="wbm-bar-count">${imgCount}</span>
          </div>
          <div class="wbm-bar-row">
            <span class="wbm-bar-label">Other</span>
            <div class="wbm-bar-track">
              <div class="wbm-bar wbm-bar-other" style="width: ${barWidth(otherCount)}%"></div>
            </div>
            <span class="wbm-bar-count">${otherCount}</span>
          </div>
        </div>

        ${timings.renderBlockingCount > 0 ? `
        <div class="wbm-warning">
          ⚠️ ${timings.renderBlockingCount} render-blocking resource${timings.renderBlockingCount > 1 ? 's' : ''} detected
        </div>
        ` : `
        <div class="wbm-success">
          ✅ No render-blocking resources
        </div>
        `}

        ${timings.scripts.length > 0 ? `
        <div class="wbm-subsection">
          <div class="wbm-subsection-title">Top Scripts</div>
          ${timings.scripts.map(s => `
            <div class="wbm-resource-row">
              <span class="wbm-resource-name">${s.name}</span>
              <span class="wbm-resource-time ${s.duration > 500 ? 'wbm-slow' : ''}">${s.duration}ms</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${timings.stylesheets.length > 0 ? `
        <div class="wbm-subsection">
          <div class="wbm-subsection-title">Top Stylesheets</div>
          ${timings.stylesheets.map(s => `
            <div class="wbm-resource-row">
              <span class="wbm-resource-name">${s.name}</span>
              <span class="wbm-resource-time ${s.duration > 300 ? 'wbm-slow' : ''}">${s.duration}ms</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <div class="wbm-divider"></div>
    `;
    return timingHTML;
}
