function statusBadge(snapshotStatus) {
    if (!snapshotStatus) return '';
    const { status, codes } = snapshotStatus;

    if (status === 'unavailable') {
      return `
        <div class="wbm-status-bar">
          <span class="wbm-status-badge" style="color:#999; background:#F5F5F5; border:1px solid #CCC;">
            ⚫ HTTP status unavailable
          </span>
        </div>`;
    }

    if (status === 'unrecorded') {
      const hint = snapshotStatus.isRevisit
        ? 'page was recognized as unchanged from an earlier visit'
        : 'status was not recorded by the crawler';
      return `
        <div class="wbm-status-bar" style="flex-wrap:wrap;">
          <span class="wbm-status-badge" style="color:#666; background:#F5F5F5; border:1px solid #CCC;">
            ⚫ No HTTP status recorded
          </span>
          <span style="font-size:11px; color:#888; margin-left:4px; line-height:1.4;">
            — the ${hint}.
          </span>
        </div>`;
    }

    const lastCode = codes[codes.length - 1];
    let color, bg, label;
    if (lastCode.startsWith('2')) { color = '#247500'; bg = '#F0FAE6'; label = 'OK'; }
    else if (lastCode.startsWith('3')) { color = '#905B00'; bg = '#FFF5E6'; label = 'Redirect'; }
    else if (lastCode.startsWith('4')) { color = '#D0021B'; bg = '#FFF0F0'; label = 'Client Error'; }
    else if (lastCode.startsWith('5')) { color = '#D0021B'; bg = '#FFF0F0'; label = 'Server Error'; }
    else { color = '#666'; bg = '#F5F5F5'; label = 'Unknown'; }

    if (status === 'chain') {
      const chainLabel = codes.map(c => `HTTP ${c}`).join(' → ');
      return `
        <div class="wbm-status-bar" style="flex-wrap:wrap;">
          <span class="wbm-status-badge" style="color:${color}; background:${bg}; border:1px solid ${color};">
            ${chainLabel}
          </span>
          <span style="font-size:11px; color:#888; margin-left:4px;">
            — final: ${label}
          </span>
        </div>
        <div style="padding:2px 18px 10px; font-size:11px; color:#999; line-height:1.4;">
          HTTP status recorded when the page was archived — 2xx = loaded OK, 3xx = redirected, 4xx = client error, 5xx = server error.
        </div>`;
    }

    return `
      <div class="wbm-status-bar">
        <span class="wbm-status-badge" style="color:${color}; background:${bg}; border:1px solid ${color};">
          HTTP ${lastCode} · ${label}
        </span>
      </div>
      <div style="padding:2px 18px 10px; font-size:11px; color:#999; line-height:1.4;">
        HTTP status recorded when the page was archived — 2xx = loaded OK, 3xx = redirected, 4xx = client error, 5xx = server error.
      </div>`;
}

function qualityPopup(timings) {
    const totalRes = timings?.totalResources;
    const scriptCount = (timings?.grouped["script"] || []).length;
    const cssCount = (timings?.grouped["css"] || []).length;
    const imgCount = (timings?.grouped["img"] || []).length;
    const otherCount = totalRes - scriptCount - cssCount - imgCount;

    const barWidth = (count) => Math.round((count / Math.max(totalRes, 1)) * 100);

    const timingHTML = `
      ${statusBadge(timings?.httpStatus)}
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
