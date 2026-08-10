const hostStyle = `
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    #wbm-ai-popup {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 360px;
        max-width: 90%;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        resize: both;
        overflow: hidden;
        min-width: 280px;
        min-height: 120px;
        max-width: 600px;
        max-height: 80vh;
        transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, transform 0.3s ease;
        
        /* Solid Premium Look */
        background: #FFFFFF;
        border: 1px solid #EAEAEA;
        border-radius: 12px;
        box-shadow: 
            0 12px 32px rgba(0, 0, 0, 0.12),
            0 4px 12px rgba(0, 0, 0, 0.04);

        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #333333;

        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #wbm-ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 18px;
        /* Wayback Machine Red */
        background: #AB2D33;
        border-bottom: 1px solid #8C242A;
        border-top-left-radius: 11px;
        border-top-right-radius: 11px;

        font-weight: 600;
        font-size: 13px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #FFFFFF;
    }

    #wbm-ai-minimize,
    #wbm-ai-close {
        background: transparent;
        border: none;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease, color 0.2s ease;
    }

    #wbm-ai-minimize:hover,
    #wbm-ai-close:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #FFFFFF;
    }

    .wbm-resize-handle {
        position: absolute;
        bottom: 4px;
        left: 4px;
        width: 16px;
        height: 16px;
        cursor: nesw-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }

    .wbm-resize-handle svg {
        width: 16px;
        height: 16px;
        opacity: 0.3;
        transition: opacity 0.2s ease;
    }

    .wbm-resize-handle:hover svg {
        opacity: 0.7;
    }

    #wbm-ai-content {
        padding: 16px 18px;
        max-height: 400px;
        overflow-y: auto;
        font-size: 14px;
        color: #333333;
        line-height: 1.6;
        background: #FFFFFF;
    }

    #wbm-ai-content::-webkit-scrollbar {
        width: 6px;
    }
    #wbm-ai-content::-webkit-scrollbar-track {
        background: #F9F9F9;
    }
    #wbm-ai-content::-webkit-scrollbar-thumb {
        background: #CCCCCC;
        border-radius: 10px;
    }
    #wbm-ai-content::-webkit-scrollbar-thumb:hover {
        background: #AAAAAA;
    }

    #wbm-ai-content p { margin-bottom: 10px; }
    #wbm-ai-content ul { padding-left: 20px; margin-bottom: 10px; }
    #wbm-ai-content li { margin-bottom: 6px; }
    #wbm-ai-content strong { font-weight: 600; color: #111111; }
    #wbm-ai-content h1, #wbm-ai-content h2, #wbm-ai-content h3 {
        font-weight: 600;
        margin-bottom: 8px;
        margin-top: 14px;
        color: #222222;
    }

    .thinking-dots {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 0;
    }

    .thinking-dots span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #AB2D33; /* Wayback Red Accent */
        animation: thinking-bounce 1.4s ease-in-out infinite;
    }

    .thinking-dots span:nth-child(1) { animation-delay: 0s; }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes thinking-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
        30% { transform: translateY(-5px); opacity: 1; }
    }

    @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .wbm-divider {
        height: 1px;
        background: #EAEAEA;
        margin: 0 18px;
    }

    .wbm-insights-section { padding: 16px 18px; }

    .wbm-insights-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #666666;
        margin-bottom: 12px;
    }

    .wbm-faq-item {
        border-bottom: 1px solid #F0F0F0;
    }
    .wbm-faq-item:last-child {
        border-bottom: none;
    }

    .wbm-faq-question {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        cursor: pointer;
        font-weight: 500;
        font-size: 13.5px;
        color: #333333;
        user-select: none;
        transition: color 0.2s ease;
    }

    .wbm-faq-question:hover {
        color: #AB2D33;
    }

    .wbm-faq-icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 400;
        color: #999999;
        transition: all 0.2s ease;
        flex-shrink: 0;
    }

    .wbm-faq-question:hover .wbm-faq-icon {
        color: #AB2D33;
    }

    .wbm-faq-icon-open {
        transform: rotate(45deg);
        color: #AB2D33 !important;
    }

    .wbm-faq-answer {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        font-size: 13.5px;
        color: #555555;
        line-height: 1.6;
    }

    .wbm-faq-answer.wbm-faq-open {
        max-height: 600px;
        padding-bottom: 16px;
    }

    .wbm-famous-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .wbm-famous-chip {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        background: #F5F5F5;
        border: 1px solid #E0E0E0;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        color: #444444;
        transition: all 0.2s ease;
    }

    .wbm-famous-chip:hover {
        background: #EAEAEA;
        border-color: #CCCCCC;
    }

    .wbm-loading-blur {
        filter: blur(4px);
        opacity: 0.6;
        pointer-events: none;
    }

    .wbm-spinner {
        width: 26px;
        height: 26px;
        border: 2px solid #EAEAEA;
        border-top-color: #AB2D33;
        border-radius: 50%;
        animation: wbm-spin 0.8s linear infinite;
    }

    @keyframes wbm-spin { to { transform: rotate(360deg); } }

    .wbm-tab-bar {
        display: flex;
        padding: 0;
        background: #FAFAFA;
        border-bottom: 1px solid #EAEAEA;
    }

    .wbm-tab {
        flex: 1;
        padding: 12px;
        border: none;
        background: transparent;
        font-size: 12.5px;
        font-weight: 600;
        color: #777777;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
    }

    .wbm-tab:hover {
        color: #333333;
        background: #F0F0F0;
    }

    .wbm-tab-active {
        color: #AB2D33;
        background: #FFFFFF;
        border-bottom: 2px solid #AB2D33;
    }

    .wbm-tab-active:hover {
        background: #FFFFFF;
    }

    .wbm-tab-panel { display: block; }

    .wbm-accordion {
        border-bottom: 1px solid #EAEAEA;
    }

    .wbm-accordion-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 18px;
        cursor: pointer;
        font-size: 13.5px;
        font-weight: 600;
        color: #222222;
        background: #FAFAFA;
        transition: background 0.2s ease;
    }

    .wbm-accordion-header:hover {
        background: #F0F0F0;
    }

    .wbm-accordion-icon {
        font-size: 10px;
        color: #888888;
        transition: transform 0.2s ease;
    }

    .wbm-accordion-body {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        background: #FFFFFF;
    }

    .wbm-accordion-body.wbm-accordion-open {
        max-height: 800px;
        overflow-y: auto;
    }

    .wbm-accordion-body .wbm-streaming-text {
        display: block;
        padding: 16px 18px;
    }

    /* === NEW: MINIMIZED BALL & VAPOR STYLES === */
    #wbm-ai-ball {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: radial-gradient(circle at 18px 18px, #FF6B70, #AB2D33);
        box-shadow: 
            0 8px 16px rgba(171, 45, 51, 0.3),
            inset -4px -4px 12px rgba(0, 0, 0, 0.25),
            inset 4px 4px 10px rgba(255, 255, 255, 0.5);
        z-index: 2147483647;
        cursor: pointer;
        display: none; /* Hidden by default */
        overflow: hidden;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
    }

    #wbm-ai-ball:hover {
        transform: scale(1.08);
        box-shadow: 
            0 12px 20px rgba(171, 45, 51, 0.4),
            inset -4px -4px 12px rgba(0, 0, 0, 0.25),
            inset 4px 4px 10px rgba(255, 255, 255, 0.5);
    }

    .wbm-vapor-particle {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%);
        filter: blur(2.5px);
        opacity: 0;
        animation: wbm-vapor-rise linear infinite;
        pointer-events: none;
    }

    .wbm-vapor-1 { width: 24px; height: 24px; left: 10%; bottom: -10px; animation-duration: 2.5s; animation-delay: 0s; }
    .wbm-vapor-2 { width: 18px; height: 18px; left: 45%; bottom: -15px; animation-duration: 3s; animation-delay: 0.8s; }
    .wbm-vapor-3 { width: 28px; height: 28px; left: 65%; bottom: -10px; animation-duration: 2.8s; animation-delay: 1.5s; }

    @keyframes wbm-vapor-rise {
        0% { transform: translateY(0) scale(0.8); opacity: 0; }
        20% { opacity: 0.7; }
        80% { opacity: 0.5; }
        100% { transform: translateY(-50px) scale(1.3); opacity: 0; }
    }
`;

const qualityStyle = `
      .wbm-section {
        padding: 16px 18px;
      }
      .wbm-section-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #666666;
        margin-bottom: 12px;
      }
      .wbm-stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13.5px;
      }
      .wbm-stat-label {
        color: #555555;
      }
      .wbm-stat-value {
        font-weight: 600;
        color: #222222;
        font-variant-numeric: tabular-nums;
      }
      .wbm-bars {
        margin: 16px 0;
        padding: 12px;
        background: #FAFAFA;
        border-radius: 8px;
        border: 1px solid #F0F0F0;
      }
      .wbm-bar-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }
      .wbm-bar-row:last-child {
        margin-bottom: 0;
      }
      .wbm-bar-label {
        font-size: 11px;
        font-weight: 600;
        color: #666666;
        width: 36px;
        text-align: right;
        text-transform: uppercase;
      }
      .wbm-bar-track {
        flex: 1;
        height: 8px;
        background: #EAEAEA;
        border-radius: 4px;
        overflow: hidden;
      }
      .wbm-bar {
        height: 100%;
        border-radius: 4px;
        min-width: 4px;
        transition: width 0.6s ease;
      }
      
      .wbm-bar-script { background: #AB2D33; } /* Wayback Red */
      .wbm-bar-css { background: #C9525A; } /* Wayback Red — light */
      .wbm-bar-img { background: #E3A0A4; } /* Wayback Red — pale */
      .wbm-bar-other { background: #9B9B9B; } /* Neutral Grey */
      
      .wbm-bar-count {
        font-size: 11px;
        font-weight: 600;
        color: #333333;
        width: 24px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .wbm-warning, .wbm-success {
        font-size: 13px;
        font-weight: 500;
        margin-top: 12px;
        padding: 10px 14px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .wbm-warning {
        color: #905B00;
        background: #FFF5E6;
        border: 1px solid #FFE5B3;
      }
      .wbm-success {
        color: #247500;
        background: #F0FAE6;
        border: 1px solid #D5F0B3;
      }
      .wbm-subsection {
        margin-top: 16px;
      }
      .wbm-subsection-title {
        font-size: 12px;
        font-weight: 700;
        color: #222222;
        margin-bottom: 10px;
      }
      .wbm-resource-row {
        display: flex;
        justify-content: space-between;
        font-size: 12.5px;
        margin-bottom: 6px;
        gap: 12px;
        padding-bottom: 6px;
        border-bottom: 1px dashed #F0F0F0;
      }
      .wbm-resource-row:last-child { border-bottom: none; }
      .wbm-resource-name {
        color: #444444;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .wbm-resource-time {
        font-weight: 600;
        color: #7ED321;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .wbm-slow { color: #D0021B !important; }
      
      .wbm-divider {
        height: 1px;
        background: #EAEAEA;
        margin: 0 18px;
      }
      .wbm-ai-result {
        font-size: 14px;
        line-height: 1.6;
        color: #333333;
      }
      .wbm-ai-result ul { padding-left: 20px; }
      .wbm-ai-result li { margin-bottom: 6px; }
      .wbm-ai-result strong { font-weight: 600; color: #111; }
`;
