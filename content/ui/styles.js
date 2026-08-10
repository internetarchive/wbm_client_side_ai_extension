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
        transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        background: rgba(255, 255, 255, 0.45);
        backdrop-filter: blur(40px) saturate(200%);
        -webkit-backdrop-filter: blur(40px) saturate(200%);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 18px;
        box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.15),
            0 4px 16px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(0, 0, 0, 0.04);

        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        font-size: 14px;
        line-height: 1.6;
        letter-spacing: -0.01em;

        animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #wbm-ai-minimize {
        background: rgba(0, 0, 0, 0.07);
        border: none;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 14px;
        font-weight: 600;
        color: #6e6e73;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, color 0.15s ease, transform 0.2s ease;
        line-height: 1;
    }

    #wbm-ai-minimize:hover {
        background: rgba(0, 0, 0, 0.13);
        color: #1c1c1e;
        transform: scale(1.05);
    }

    @media (prefers-color-scheme: dark) {
        #wbm-ai-minimize {
            background: rgba(255, 255, 255, 0.07);
            color: #98989d;
        }
        #wbm-ai-minimize:hover {
            background: rgba(255, 255, 255, 0.13);
            color: #f2f2f7;
        }
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
        opacity: 0.4;
        transition: opacity 0.2s ease;
    }

    .wbm-resize-handle:hover svg {
        opacity: 0.8;
    }

    #wbm-ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.3);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        border-top-left-radius: 18px;
        border-top-right-radius: 18px;

        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #3a3a3c;
    }

    #wbm-ai-content {
        padding: 14px 16px;
        max-height: 400px;
        overflow-y: auto;
        font-size: 13.5px;
        color: #1c1c1e;
        line-height: 1.7;
        letter-spacing: -0.01em;
    }

    #wbm-ai-content::-webkit-scrollbar {
        width: 3px;
    }
    #wbm-ai-content::-webkit-scrollbar-track {
        background: transparent;
    }
    #wbm-ai-content::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.12);
        border-radius: 3px;
    }

    #wbm-ai-content p {
        margin-bottom: 8px;
    }
    #wbm-ai-content ul {
        padding-left: 16px;
        margin-bottom: 8px;
    }
    #wbm-ai-content li {
        margin-bottom: 5px;
    }
    #wbm-ai-content strong {
        font-weight: 600;
        color: #000000;
    }
    #wbm-ai-content h1,
    #wbm-ai-content h2,
    #wbm-ai-content h3 {
        font-weight: 600;
        margin-bottom: 6px;
        margin-top: 10px;
        color: #1c1c1e;
        letter-spacing: -0.02em;
    }

    #wbm-ai-close {
        background: rgba(0, 0, 0, 0.07);
        border: none;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 13px;
        color: #6e6e73;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, color 0.15s ease;
        line-height: 1;
    }

    #wbm-ai-close:hover {
        background: rgba(0, 0, 0, 0.13);
        color: #1c1c1e;
    }

    .thinking-dots {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 0;
    }

    .thinking-dots span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #6e6e73;
        animation: thinking-bounce 1.4s ease-in-out infinite;
    }

    .thinking-dots span:nth-child(1) { animation-delay: 0s; }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes thinking-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
    }

    @media (prefers-color-scheme: dark) {
        .thinking-dots span { background: #98989d; }
        .wbm-resize-handle svg {
            filter: invert(1);
        }
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-16px) scale(0.96);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .wbm-divider {
        height: 1px;
        background: rgba(0, 0, 0, 0.06);
        margin: 0 16px;
    }

    .wbm-insights-section {
        padding: 12px 16px;
    }

    .wbm-insights-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #3a3a3c;
        margin-bottom: 10px;
    }

    .wbm-faq-item {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }

    .wbm-faq-item:last-child {
        border-bottom: none;
    }

    .wbm-faq-question {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        color: #1c1c1e;
        user-select: none;
        transition: color 0.2s ease;
    }

    .wbm-faq-question:hover {
        color: #007aff;
    }

    .wbm-faq-icon {
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.05);
        font-size: 14px;
        font-weight: 600;
        color: #6e6e73;
        transition: all 0.25s ease;
        flex-shrink: 0;
    }

    .wbm-faq-question:hover .wbm-faq-icon {
        background: rgba(0, 122, 255, 0.1);
        color: #007aff;
    }

    .wbm-faq-icon-open {
        background: rgba(0, 122, 255, 0.1) !important;
        color: #007aff !important;
    }

    .wbm-faq-answer {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-size: 13px;
        color: #6e6e73;
        line-height: 1.6;
    }

    .wbm-faq-answer.wbm-faq-open {
        max-height: 500px;
        padding-bottom: 12px;
    }

    .wbm-faq-answer p {
        margin-bottom: 6px;
    }

    .wbm-famous-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .wbm-famous-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 14px;
        background: rgba(0, 0, 0, 0.03);
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 100px;
        font-size: 12px;
        font-weight: 500;
        color: #6e6e73;
        transition: all 0.2s ease;
    }

    .wbm-famous-chip:hover {
        background: rgba(0, 0, 0, 0.06);
        transform: translateY(-1px);
    }

    .wbm-loading-blur {
        filter: blur(6px);
        opacity: 0.5;
        transition: filter 0.3s ease, opacity 0.3s ease;
        pointer-events: none;
    }

    .wbm-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        z-index: 100;
        border-radius: 18px;
    }

    .wbm-spinner {
        width: 24px;
        height: 24px;
        border: 2.5px solid rgba(255, 255, 255, 0.25);
        border-top-color: #fff;
        border-radius: 50%;
        animation: wbm-spin 0.7s linear infinite;
    }

    @keyframes wbm-spin {
        to { transform: rotate(360deg); }
    }

    .wbm-tab-bar {
        display: flex;
        gap: 2px;
        padding: 8px 16px 0;
        background: rgba(0, 0, 0, 0.02);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .wbm-tab {
        flex: 1;
        padding: 6px 12px;
        border: none;
        background: transparent;
        font-size: 12px;
        font-weight: 600;
        color: #8e8e93;
        cursor: pointer;
        border-radius: 6px 6px 0 0;
        transition: all 0.2s ease;
    }

    .wbm-tab:hover {
        color: #1c1c1e;
        background: rgba(0, 0, 0, 0.03);
    }

    .wbm-tab-active {
        color: #007aff;
        background: rgba(255, 255, 255, 0.6);
    }

    .wbm-tab-active:hover {
        color: #007aff;
        background: rgba(255, 255, 255, 0.6);
    }

    .wbm-tab-panel {
        display: block;
    }

    .wbm-accordion {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }

    .wbm-accordion:last-child {
        border-bottom: none;
    }

    .wbm-accordion-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        color: #3a3a3c;
        user-select: none;
        transition: color 0.2s ease;
    }

    .wbm-accordion-header:hover {
        color: #007aff;
    }

    .wbm-accordion-icon {
        font-size: 10px;
        color: #aeaeb2;
        transition: transform 0.2s ease, color 0.2s ease;
        flex-shrink: 0;
    }

    .wbm-accordion-header:hover .wbm-accordion-icon {
        color: #007aff;
    }

    .wbm-accordion-body {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .wbm-accordion-body.wbm-accordion-open {
        max-height: 600px;
        overflow-y: auto;
    }

    .wbm-accordion-body .wbm-streaming-text {
        display: block;
        padding: 0 16px 12px;
        font-size: 13.5px;
        line-height: 1.7;
        color: #1c1c1e;
    }

    .wbm-loading-container {
        display: flex;
        justify-content: center;
        padding: 20px;
    }

    @media (prefers-color-scheme: dark) {
        #wbm-ai-popup {
            background: rgba(28, 28, 30, 0.72);
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow: 
                0 20px 60px rgba(0, 0, 0, 0.5),
                0 4px 16px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.07),
                inset 0 -1px 0 rgba(0, 0, 0, 0.2);
        }

        #wbm-ai-header {
            background: rgba(255, 255, 255, 0.04);
            border-bottom-color: rgba(255, 255, 255, 0.07);
            color: #aeaeb2;
        }

        #wbm-ai-minimize,
        #wbm-ai-close {
            background: rgba(255, 255, 255, 0.07);
            color: #98989d;
        }

        #wbm-ai-minimize:hover,
        #wbm-ai-close:hover {
            background: rgba(255, 255, 255, 0.13);
            color: #f2f2f7;
        }

        #wbm-ai-content {
            color: #e5e5ea;
        }

        #wbm-ai-content strong {
            color: #ffffff;
        }

        #wbm-ai-content h1,
        #wbm-ai-content h2,
        #wbm-ai-content h3 {
            color: #f2f2f7;
        }

        #wbm-ai-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
        }

        .wbm-resize-handle svg {
            filter: invert(1);
        }

        .thinking-dots span { 
            background: #98989d; 
        }

        .wbm-divider { 
            background: rgba(255, 255, 255, 0.06); 
        }

        .wbm-insights-title { 
            color: #AEAEB2; 
        }

        .wbm-faq-item {
            border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .wbm-faq-question { 
            color: #e5e5ea; 
        }

        .wbm-faq-question:hover { 
            color: #0a84ff; 
        }

        .wbm-faq-icon { 
            background: rgba(255, 255, 255, 0.08); 
            color: #98989d; 
        }

        .wbm-faq-question:hover .wbm-faq-icon { 
            background: rgba(10, 132, 255, 0.15); 
            color: #0a84ff; 
        }

        .wbm-faq-icon-open { 
            background: rgba(10, 132, 255, 0.15) !important; 
            color: #0a84ff !important; 
        }

        .wbm-faq-answer { 
            color: #AEAEB2; 
        }

        .wbm-famous-chip {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.1);
            color: #e5e5ea;
        }

        .wbm-famous-chip:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .wbm-loading-overlay {
            background: rgba(0, 0, 0, 0.2);
        }

        .wbm-tab-bar {
            background: rgba(255, 255, 255, 0.03);
            border-bottom-color: rgba(255, 255, 255, 0.07);
        }

        .wbm-tab {
            color: #98989d;
        }

        .wbm-tab:hover {
            color: #f2f2f7;
            background: rgba(255, 255, 255, 0.04);
        }

        .wbm-tab-active {
            color: #0a84ff;
            background: rgba(255, 255, 255, 0.06);
        }

        .wbm-tab-active:hover {
            color: #0a84ff;
            background: rgba(255, 255, 255, 0.06);
        }

        .wbm-accordion {
            border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .wbm-accordion-header {
            color: #AEAEB2;
        }

        .wbm-accordion-header:hover {
            color: #0a84ff;
        }

        .wbm-accordion-icon {
            color: #636366;
        }

        .wbm-accordion-header:hover .wbm-accordion-icon {
            color: #0a84ff;
        }

        .wbm-accordion-body .wbm-streaming-text {
            color: #e5e5ea;
        }
    }
`;

const qualityStyle = `
      .wbm-section {
        padding: 12px 16px;
      }
      .wbm-section-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #3a3a3c;;
        margin-bottom: 10px;
      }
      .wbm-stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 13px;
      }
      .wbm-stat-label {
        color: #3a3a3c;;
      }
      .wbm-stat-value {
        font-weight: 600;
        color: #1c1c1e;
        font-variant-numeric: tabular-nums;
      }
      .wbm-bars {
        margin: 10px 0;
      }
      .wbm-bar-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .wbm-bar-label {
        font-size: 11px;
        font-weight: 600;
        color: #3a3a3c;;
        width: 32px;
        text-align: right;
      }
      .wbm-bar-track {
        flex: 1;
        height: 6px;
        background: rgba(0,0,0,0.06);
        border-radius: 3px;
        overflow: hidden;
      }
      .wbm-bar {
        height: 100%;
        border-radius: 3px;
        min-width: 4px;
        transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .wbm-bar-script { background: #007aff; }
      .wbm-bar-css { background: #ff9f0a; }
      .wbm-bar-img { background: #30d158; }
      .wbm-bar-other { background: #bf5af2; }
      .wbm-bar-count {
        font-size: 11px;
        font-weight: 600;
        color: #1c1c1e;
        width: 20px;
        font-variant-numeric: tabular-nums;
      }
      .wbm-warning {
        font-size: 12px;
        color: #ff9f0a;
        font-weight: 500;
        margin-top: 8px;
        padding: 6px 10px;
        background: rgba(255, 159, 10, 0.1);
        border-radius: 6px;
      }
      .wbm-success {
        font-size: 12px;
        color: #30d158;
        font-weight: 500;
        margin-top: 8px;
        padding: 6px 10px;
        background: rgba(48, 209, 88, 0.1);
        border-radius: 6px;
      }
      .wbm-subsection {
        margin-top: 10px;
      }
      .wbm-subsection-title {
        font-size: 11px;
        font-weight: 800;
        color: #3a3a3c;
        margin-bottom: 6px;
      }
      .wbm-resource-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 4px;
        gap: 8px;
      }
      .wbm-resource-name {
        color: #1c1c1e;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .wbm-resource-time {
        font-weight: 600;
        color: #30d158;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .wbm-slow {
        color: #ff453a !important;
      }
      .wbm-divider {
        height: 1px;
        background: rgba(0,0,0,0.06);
        margin: 0 16px;
      }
      .wbm-ai-result {
        font-size: 13.5px;
        line-height: 1.7;
        color: #1c1c1e;
      }
      .wbm-ai-result ul {
        padding-left: 16px;
      }
      .wbm-ai-result li {
        margin-bottom: 5px;
      }
      .wbm-ai-result strong {
        font-weight: 600;
        color: #000;
      }

      @media (prefers-color-scheme: dark) {
        .wbm-stat-label { color: #c7c7cc; }
        .wbm-bar-label { color: #c7c7cc; }
        .wbm-section-title { color: #c7c7cc; }
        .wbm-subsection-title { color: #c7c7cc; }
      }
      @media (prefers-color-scheme: dark) {
        .wbm-stat-value { color: #f2f2f7; }
        .wbm-bar-track { background: rgba(255,255,255,0.1); }
        .wbm-bar-count { color: #f2f2f7; }
        .wbm-resource-name { color: #e5e5ea; }
        .wbm-ai-result { color: #e5e5ea; }
        .wbm-ai-result strong { color: #fff; }
        .wbm-divider { background: rgba(255,255,255,0.08); }
      }
`;
