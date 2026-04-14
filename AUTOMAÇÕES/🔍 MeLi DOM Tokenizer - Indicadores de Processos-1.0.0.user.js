// ==UserScript==
// @name         🔍 MeLi DOM Tokenizer - Indicadores de Processos
// @namespace    https://envios.adminml.com/
// @version      2.0.0
// @description  Tokeniza e mapeia todas as tags HTML, IDs, classes, atributos data-* e seletores úteis para automação
// @author       MeliTools
// @match        https://envios.adminml.com/logistics/ops-clock/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ══════════════════════════════════════════════════════════════
    //  CONFIGURAÇÃO
    // ══════════════════════════════════════════════════════════════
    const CONFIG = {
        SCAN_DELAY: 2000,
        RESCAN_DELAY: 1500,
        OBSERVE_MUTATIONS: true,
        PANEL_WIDTH: 460,
        PANEL_Z_INDEX: 99999,
        SEARCH_DEBOUNCE: 200,
        TOAST_DURATION: 2800,
        ANIM_DURATION: 380,
    };

    // ══════════════════════════════════════════════════════════════
    //  DESIGN SYSTEM — CSS Variables & Global Styles
    // ══════════════════════════════════════════════════════════════
    GM_addStyle(`
        /* ── Google Font ── */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        /* ── Design Tokens ── */
        :root {
            --dt-bg:              hsla(220, 25%, 7%, 0.92);
            --dt-bg-solid:        hsl(220, 25%, 7%);
            --dt-surface:         hsla(220, 20%, 12%, 0.65);
            --dt-surface-hover:   hsla(220, 20%, 16%, 0.75);
            --dt-header-bg:       hsla(220, 22%, 10%, 0.85);
            --dt-accent:          hsl(217, 91%, 60%);
            --dt-accent-soft:     hsla(217, 91%, 60%, 0.12);
            --dt-accent-ring:     hsla(217, 91%, 60%, 0.25);
            --dt-accent-hover:    hsl(217, 91%, 70%);
            --dt-border:          hsla(220, 15%, 25%, 0.55);
            --dt-border-hover:    hsla(220, 15%, 35%, 0.7);
            --dt-text:            hsl(210, 25%, 92%);
            --dt-text-secondary:  hsl(215, 15%, 58%);
            --dt-text-tertiary:   hsl(215, 10%, 42%);
            --dt-success:         hsl(142, 71%, 45%);
            --dt-success-soft:    hsla(142, 71%, 45%, 0.12);
            --dt-warning:         hsl(38, 92%, 52%);
            --dt-warning-soft:    hsla(38, 92%, 52%, 0.12);
            --dt-danger:          hsl(0, 84%, 60%);
            --dt-danger-soft:     hsla(0, 84%, 60%, 0.12);
            --dt-radius-sm:       6px;
            --dt-radius:          10px;
            --dt-radius-lg:       14px;
            --dt-radius-xl:       18px;
            --dt-shadow-sm:       0 2px 8px hsla(0,0%,0%,0.25);
            --dt-shadow:          0 8px 32px hsla(0,0%,0%,0.45), 0 2px 8px hsla(0,0%,0%,0.2);
            --dt-shadow-lg:       0 16px 64px hsla(0,0%,0%,0.55), 0 4px 16px hsla(0,0%,0%,0.3);
            --dt-font:            'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --dt-mono:            'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
            --dt-ease:            cubic-bezier(0.22, 1, 0.36, 1);
            --dt-ease-bounce:     cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* ── Panel Root ── */
        #dt-root {
            position: fixed;
            top: 16px;
            right: 16px;
            width: ${CONFIG.PANEL_WIDTH}px;
            max-height: calc(100vh - 32px);
            background: var(--dt-bg);
            backdrop-filter: blur(24px) saturate(1.4);
            -webkit-backdrop-filter: blur(24px) saturate(1.4);
            color: var(--dt-text);
            border: 1px solid var(--dt-border);
            border-radius: var(--dt-radius-xl);
            z-index: ${CONFIG.PANEL_Z_INDEX};
            font-family: var(--dt-font);
            font-size: 13px;
            line-height: 1.5;
            box-shadow: var(--dt-shadow);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: translateY(12px) scale(0.97);
            animation: dt-panel-in ${CONFIG.ANIM_DURATION}ms var(--dt-ease) forwards;
        }
        #dt-root.dt-hidden {
            animation: dt-panel-out 260ms var(--dt-ease) forwards;
            pointer-events: none;
        }

        @keyframes dt-panel-in {
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dt-panel-out {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to   { opacity: 0; transform: translateY(8px) scale(0.97); }
        }

        /* ── Minimized ── */
        #dt-root.dt-minimized {
            width: 220px;
            max-height: 46px;
            border-radius: var(--dt-radius-lg);
        }

        /* ── Body wrapper (everything below header) ── */
        .dt-body {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
            min-height: 0;
        }

        /* ── Header ── */
        .dt-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: var(--dt-header-bg);
            border-bottom: 1px solid var(--dt-border);
            cursor: grab;
            user-select: none;
            flex-shrink: 0;
        }
        .dt-header:active { cursor: grabbing; }

        .dt-brand {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .dt-brand-icon {
            width: 26px;
            height: 26px;
            border-radius: var(--dt-radius-sm);
            background: linear-gradient(135deg, var(--dt-accent), hsl(250, 80%, 60%));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            flex-shrink: 0;
            box-shadow: 0 2px 8px hsla(217, 91%, 60%, 0.3);
        }
        .dt-brand-label {
            font-weight: 700;
            font-size: 13px;
            letter-spacing: -0.3px;
            color: #fff;
            white-space: nowrap;
        }
        .dt-brand-version {
            font-size: 10px;
            color: var(--dt-text-tertiary);
            font-weight: 500;
            background: var(--dt-surface);
            padding: 1px 6px;
            border-radius: 99px;
            margin-left: -2px;
        }

        .dt-header-actions {
            display: flex;
            gap: 4px;
        }
        .dt-icon-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: 1px solid transparent;
            border-radius: var(--dt-radius-sm);
            color: var(--dt-text-secondary);
            cursor: pointer;
            font-size: 13px;
            transition: all 180ms var(--dt-ease);
            position: relative;
        }
        .dt-icon-btn:hover {
            background: var(--dt-surface-hover);
            color: var(--dt-text);
            border-color: var(--dt-border);
        }
        .dt-icon-btn.dt-btn-close:hover {
            background: var(--dt-danger-soft);
            color: var(--dt-danger);
            border-color: hsla(0, 84%, 60%, 0.3);
        }

        /* ── Tooltip ── */
        .dt-icon-btn[data-tooltip]::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%) scale(0.9);
            background: hsl(220, 20%, 15%);
            color: var(--dt-text);
            font-size: 11px;
            font-weight: 500;
            padding: 4px 8px;
            border-radius: var(--dt-radius-sm);
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: all 160ms var(--dt-ease);
            border: 1px solid var(--dt-border);
            box-shadow: var(--dt-shadow-sm);
        }
        .dt-icon-btn[data-tooltip]:hover::after {
            opacity: 1;
            transform: translateX(-50%) scale(1);
        }

        /* ── Tabs ── */
        .dt-tabs {
            display: flex;
            overflow-x: auto;
            gap: 1px;
            background: hsla(220, 20%, 8%, 0.6);
            border-bottom: 1px solid var(--dt-border);
            padding: 6px 8px 0;
            scrollbar-width: none;
            flex-shrink: 0;
        }
        .dt-tabs::-webkit-scrollbar { display: none; }

        .dt-tab {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 7px 10px;
            cursor: pointer;
            color: var(--dt-text-tertiary);
            font-size: 11.5px;
            font-weight: 500;
            white-space: nowrap;
            border-radius: var(--dt-radius-sm) var(--dt-radius-sm) 0 0;
            border: 1px solid transparent;
            border-bottom: none;
            margin-bottom: -1px;
            transition: all 180ms var(--dt-ease);
            position: relative;
        }
        .dt-tab:hover {
            color: var(--dt-text-secondary);
            background: var(--dt-surface);
        }
        .dt-tab.dt-active {
            color: var(--dt-accent);
            background: var(--dt-bg);
            border-color: var(--dt-border);
            font-weight: 600;
        }
        .dt-tab-icon { font-size: 12px; }
        .dt-tab-badge {
            font-size: 10px;
            font-weight: 700;
            background: var(--dt-accent-soft);
            color: var(--dt-accent);
            padding: 0 5px;
            border-radius: 99px;
            min-width: 18px;
            text-align: center;
            line-height: 17px;
            transition: all 180ms var(--dt-ease);
        }
        .dt-tab.dt-active .dt-tab-badge {
            background: var(--dt-accent);
            color: #fff;
        }

        /* ── Search Bar ── */
        .dt-search-wrap {
            padding: 10px 12px;
            background: hsla(220, 20%, 8%, 0.4);
            border-bottom: 1px solid var(--dt-border);
            flex-shrink: 0;
        }
        .dt-search-inner {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--dt-surface);
            border: 1px solid var(--dt-border);
            border-radius: var(--dt-radius);
            padding: 0 10px;
            transition: all 200ms var(--dt-ease);
        }
        .dt-search-inner:focus-within {
            border-color: var(--dt-accent);
            box-shadow: 0 0 0 3px var(--dt-accent-ring);
            background: var(--dt-surface-hover);
        }
        .dt-search-icon {
            color: var(--dt-text-tertiary);
            font-size: 13px;
            flex-shrink: 0;
        }
        .dt-search-input {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--dt-text);
            font-family: var(--dt-font);
            font-size: 12.5px;
            padding: 8px 0;
            outline: none;
        }
        .dt-search-input::placeholder {
            color: var(--dt-text-tertiary);
        }
        .dt-search-count {
            font-size: 10.5px;
            color: var(--dt-text-tertiary);
            font-weight: 500;
            white-space: nowrap;
        }
        .dt-search-clear {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: var(--dt-surface-hover);
            border: none;
            color: var(--dt-text-secondary);
            cursor: pointer;
            font-size: 11px;
            flex-shrink: 0;
            transition: all 150ms;
        }
        .dt-search-clear:hover {
            background: var(--dt-danger-soft);
            color: var(--dt-danger);
        }

        /* ── Content ── */
        .dt-content {
            overflow-y: auto;
            overflow-x: hidden;
            flex: 1;
            padding: 12px;
            scroll-behavior: smooth;
        }
        .dt-content::-webkit-scrollbar { width: 5px; }
        .dt-content::-webkit-scrollbar-track { background: transparent; }
        .dt-content::-webkit-scrollbar-thumb {
            background: hsla(220, 15%, 30%, 0.5);
            border-radius: 99px;
        }
        .dt-content::-webkit-scrollbar-thumb:hover {
            background: hsla(220, 15%, 40%, 0.6);
        }

        /* ── Stat Cards (Overview) ── */
        .dt-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 14px;
        }
        .dt-stat {
            background: var(--dt-surface);
            border: 1px solid var(--dt-border);
            border-radius: var(--dt-radius);
            padding: 12px 10px;
            text-align: center;
            transition: all 220ms var(--dt-ease);
            cursor: default;
        }
        .dt-stat:hover {
            border-color: var(--dt-accent);
            background: var(--dt-accent-soft);
            transform: translateY(-2px);
            box-shadow: 0 4px 16px hsla(217, 91%, 60%, 0.1);
        }
        .dt-stat-value {
            font-size: 22px;
            font-weight: 700;
            font-family: var(--dt-mono);
            color: var(--dt-accent);
            letter-spacing: -0.5px;
            line-height: 1.2;
        }
        .dt-stat-label {
            font-size: 10px;
            font-weight: 600;
            color: var(--dt-text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-top: 4px;
        }

        /* ── Secondary stats row ── */
        .dt-stats-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-bottom: 14px;
        }
        .dt-stat-mini {
            background: var(--dt-surface);
            border: 1px solid var(--dt-border);
            border-radius: var(--dt-radius-sm);
            padding: 8px 6px;
            text-align: center;
            transition: all 180ms var(--dt-ease);
        }
        .dt-stat-mini:hover {
            border-color: var(--dt-border-hover);
            background: var(--dt-surface-hover);
        }
        .dt-stat-mini-value {
            font-size: 15px;
            font-weight: 700;
            font-family: var(--dt-mono);
            color: var(--dt-text);
        }
        .dt-stat-mini-label {
            font-size: 9.5px;
            color: var(--dt-text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-top: 2px;
        }

        /* ── Section / Group ── */
        .dt-section {
            margin-bottom: 12px;
            border: 1px solid var(--dt-border);
            border-radius: var(--dt-radius);
            background: var(--dt-surface);
            overflow: hidden;
            transition: border-color 200ms;
        }
        .dt-section:hover {
            border-color: var(--dt-border-hover);
        }
        .dt-section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 12px;
            background: hsla(220, 15%, 14%, 0.5);
            border-bottom: 1px solid var(--dt-border);
            cursor: pointer;
            user-select: none;
            transition: background 150ms;
        }
        .dt-section-head:hover {
            background: hsla(220, 15%, 18%, 0.6);
        }
        .dt-section-title {
            font-weight: 600;
            font-size: 12px;
            color: var(--dt-text);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .dt-section-title-icon {
            font-size: 13px;
        }
        .dt-section-meta {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .dt-badge {
            font-size: 10px;
            font-weight: 700;
            background: var(--dt-accent-soft);
            color: var(--dt-accent);
            padding: 2px 7px;
            border-radius: 99px;
            line-height: 1.4;
        }
        .dt-badge-success {
            background: var(--dt-success-soft);
            color: var(--dt-success);
        }
        .dt-badge-warning {
            background: var(--dt-warning-soft);
            color: var(--dt-warning);
        }

        .dt-section-body {
            max-height: 380px;
            overflow-y: auto;
        }
        .dt-section-body::-webkit-scrollbar { width: 3px; }
        .dt-section-body::-webkit-scrollbar-thumb {
            background: hsla(220, 15%, 30%, 0.4);
            border-radius: 99px;
        }

        .dt-section.dt-collapsed .dt-section-body {
            display: none;
        }
        .dt-section.dt-collapsed .dt-chevron {
            transform: rotate(-90deg);
        }
        .dt-chevron {
            font-size: 10px;
            color: var(--dt-text-tertiary);
            transition: transform 200ms var(--dt-ease);
        }

        /* ── Row Item ── */
        .dt-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 8px 12px;
            border-bottom: 1px solid hsla(220, 15%, 20%, 0.3);
            transition: background 120ms;
            cursor: pointer;
            gap: 8px;
        }
        .dt-row:last-child { border-bottom: none; }
        .dt-row:hover { background: var(--dt-accent-soft); }

        .dt-row-body {
            flex: 1;
            min-width: 0;
        }
        .dt-row-selector {
            font-family: var(--dt-mono);
            font-size: 11.5px;
            font-weight: 500;
            color: hsl(30, 60%, 68%);
            word-break: break-all;
            line-height: 1.45;
        }
        .dt-row-sub {
            font-size: 11px;
            color: var(--dt-text-tertiary);
            margin-top: 2px;
            line-height: 1.3;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .dt-row-actions {
            display: flex;
            gap: 3px;
            flex-shrink: 0;
            opacity: 0;
            transition: opacity 150ms;
        }
        .dt-row:hover .dt-row-actions { opacity: 1; }

        .dt-action-btn {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--dt-radius-sm);
            background: transparent;
            border: 1px solid transparent;
            color: var(--dt-text-secondary);
            cursor: pointer;
            font-size: 11px;
            transition: all 150ms;
        }
        .dt-action-btn:hover {
            background: var(--dt-surface-hover);
            border-color: var(--dt-border);
            color: var(--dt-text);
        }
        .dt-action-btn.dt-act-highlight:hover {
            background: hsla(217, 91%, 60%, 0.12);
            color: var(--dt-accent);
            border-color: hsla(217, 91%, 60%, 0.3);
        }
        .dt-action-btn.dt-act-copy:hover {
            background: var(--dt-success-soft);
            color: var(--dt-success);
            border-color: hsla(142, 71%, 45%, 0.3);
        }

        /* ── Copy-All button (inside section header) ── */
        .dt-btn-copy-all {
            font-size: 10.5px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: var(--dt-radius-sm);
            background: transparent;
            border: 1px solid var(--dt-border);
            color: var(--dt-text-secondary);
            cursor: pointer;
            transition: all 150ms;
        }
        .dt-btn-copy-all:hover {
            background: var(--dt-accent);
            color: #fff;
            border-color: var(--dt-accent);
        }

        /* ── Empty state ── */
        .dt-empty {
            padding: 28px 14px;
            text-align: center;
            color: var(--dt-text-tertiary);
            font-size: 12px;
        }
        .dt-empty-icon {
            font-size: 28px;
            margin-bottom: 8px;
            opacity: 0.5;
        }

        /* ── Reliability Dot ── */
        .dt-rel {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10.5px;
            font-weight: 600;
        }
        .dt-rel-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .dt-rel-high  .dt-rel-dot { background: var(--dt-success); box-shadow: 0 0 6px var(--dt-success); }
        .dt-rel-med   .dt-rel-dot { background: var(--dt-warning); box-shadow: 0 0 6px var(--dt-warning); }
        .dt-rel-low   .dt-rel-dot { background: var(--dt-danger);  box-shadow: 0 0 6px var(--dt-danger); }
        .dt-rel-high  { color: var(--dt-success); }
        .dt-rel-med   { color: var(--dt-warning); }
        .dt-rel-low   { color: var(--dt-danger); }

        /* ── Export Buttons ── */
        .dt-export-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 4px;
        }
        .dt-export-btn {
            width: 100%;
            padding: 11px 14px;
            border: 1px solid var(--dt-border);
            border-radius: var(--dt-radius);
            cursor: pointer;
            font-family: var(--dt-font);
            font-weight: 600;
            font-size: 12.5px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 200ms var(--dt-ease);
            background: var(--dt-surface);
            color: var(--dt-text);
        }
        .dt-export-btn:hover {
            transform: translateY(-1px);
            box-shadow: var(--dt-shadow-sm);
            border-color: var(--dt-border-hover);
        }
        .dt-export-icon {
            width: 32px;
            height: 32px;
            border-radius: var(--dt-radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            flex-shrink: 0;
        }
        .dt-export-icon-json  { background: var(--dt-accent-soft); }
        .dt-export-icon-snip  { background: var(--dt-warning-soft); }
        .dt-export-icon-file  { background: var(--dt-success-soft); }
        .dt-export-text {
            flex: 1;
            text-align: left;
        }
        .dt-export-title {
            font-weight: 600;
            font-size: 12.5px;
        }
        .dt-export-desc {
            font-size: 10.5px;
            color: var(--dt-text-tertiary);
            font-weight: 400;
            margin-top: 1px;
        }
        .dt-export-btn:hover .dt-export-icon-json { background: var(--dt-accent); }
        .dt-export-btn:hover .dt-export-icon-json ~ .dt-export-text .dt-export-title { color: var(--dt-accent); }
        .dt-export-btn:hover .dt-export-icon-snip { background: var(--dt-warning); }
        .dt-export-btn:hover .dt-export-icon-snip ~ .dt-export-text .dt-export-title { color: var(--dt-warning); }
        .dt-export-btn:hover .dt-export-icon-file { background: var(--dt-success); }
        .dt-export-btn:hover .dt-export-icon-file ~ .dt-export-text .dt-export-title { color: var(--dt-success); }
        .dt-export-btn:hover .dt-export-icon { color: #fff; }

        /* ── Code Block ── */
        .dt-code {
            background: hsla(220, 25%, 5%, 0.8);
            border: 1px solid var(--dt-border);
            border-radius: var(--dt-radius);
            padding: 12px 14px;
            margin-top: 12px;
            font-family: var(--dt-mono);
            font-size: 11.5px;
            line-height: 1.65;
            color: hsl(210, 60%, 75%);
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
            position: relative;
        }
        .dt-code-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .dt-code-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--dt-text-tertiary);
            font-family: var(--dt-font);
        }

        /* ── Toast Notifications ── */
        .dt-toast-stack {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column-reverse;
            gap: 8px;
            z-index: ${CONFIG.PANEL_Z_INDEX + 1};
            pointer-events: none;
        }
        .dt-toast {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border-radius: var(--dt-radius);
            font-family: var(--dt-font);
            font-size: 12.5px;
            font-weight: 500;
            color: #fff;
            box-shadow: var(--dt-shadow);
            backdrop-filter: blur(12px);
            opacity: 0;
            transform: translateY(10px) scale(0.95);
            animation: dt-toast-in 280ms var(--dt-ease-bounce) forwards;
        }
        .dt-toast.dt-toast-exit {
            animation: dt-toast-out 220ms var(--dt-ease) forwards;
        }
        .dt-toast-success { background: hsla(142, 71%, 35%, 0.92); }
        .dt-toast-info    { background: hsla(217, 70%, 45%, 0.92); }
        .dt-toast-warning { background: hsla(38, 80%, 42%, 0.92); }

        @keyframes dt-toast-in {
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dt-toast-out {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to   { opacity: 0; transform: translateY(-12px) scale(0.95); }
        }

        /* ── Highlight Overlay ── */
        .dt-highlight {
            position: absolute;
            border: 2px solid var(--dt-accent);
            border-radius: 4px;
            pointer-events: none;
            z-index: ${CONFIG.PANEL_Z_INDEX - 1};
            box-shadow: 0 0 0 4px var(--dt-accent-ring), inset 0 0 20px var(--dt-accent-ring);
            animation: dt-highlight-pulse 1.2s ease-in-out infinite alternate;
        }
        @keyframes dt-highlight-pulse {
            from { box-shadow: 0 0 0 4px var(--dt-accent-ring), inset 0 0 20px var(--dt-accent-ring); }
            to   { box-shadow: 0 0 0 8px hsla(217, 91%, 60%, 0.1), inset 0 0 30px hsla(217, 91%, 60%, 0.08); }
        }
        .dt-highlight-label {
            position: absolute;
            top: -24px;
            left: 0;
            background: var(--dt-accent);
            color: #fff;
            font-size: 10px;
            font-weight: 600;
            font-family: var(--dt-mono);
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: var(--dt-shadow-sm);
        }

        /* ── Keyboard Shortcut Hints ── */
        .dt-kbd {
            display: inline-flex;
            align-items: center;
            padding: 1px 5px;
            border-radius: 4px;
            background: var(--dt-surface);
            border: 1px solid var(--dt-border);
            font-family: var(--dt-mono);
            font-size: 10px;
            font-weight: 500;
            color: var(--dt-text-tertiary);
            line-height: 1.6;
        }

        /* ── Info banner ── */
        .dt-info {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 10px 12px;
            border-radius: var(--dt-radius);
            background: var(--dt-accent-soft);
            border: 1px solid hsla(217, 91%, 60%, 0.15);
            margin-bottom: 12px;
            font-size: 11.5px;
            line-height: 1.5;
            color: var(--dt-text-secondary);
        }
        .dt-info-icon {
            font-size: 14px;
            flex-shrink: 0;
            margin-top: 1px;
        }

        /* ── Footer status ── */
        .dt-footer {
            padding: 7px 14px;
            border-top: 1px solid var(--dt-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 10.5px;
            color: var(--dt-text-tertiary);
            background: hsla(220, 20%, 8%, 0.4);
            flex-shrink: 0;
        }
        .dt-footer-left {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .dt-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--dt-success);
            box-shadow: 0 0 6px var(--dt-success);
            animation: dt-pulse 2s ease-in-out infinite;
        }
        @keyframes dt-pulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.4; }
        }
        .dt-footer-shortcuts {
            display: flex;
            gap: 4px;
        }

        /* ── Tag pills (overview) ── */
        .dt-tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            padding: 10px 12px;
        }
        .dt-tag-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: var(--dt-radius-sm);
            background: var(--dt-surface);
            border: 1px solid var(--dt-border);
            font-size: 11px;
            cursor: pointer;
            transition: all 150ms;
        }
        .dt-tag-pill:hover {
            border-color: var(--dt-accent);
            background: var(--dt-accent-soft);
        }
        .dt-tag-pill-name {
            font-family: var(--dt-mono);
            font-weight: 500;
            color: hsl(30, 60%, 68%);
            font-size: 11px;
        }
        .dt-tag-pill-count {
            font-size: 10px;
            font-weight: 700;
            color: var(--dt-text-tertiary);
        }

        /* ── Scan progress animation ── */
        .dt-scanning-bar {
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--dt-accent), transparent);
            background-size: 200% 100%;
            animation: dt-scan-sweep 1.2s ease-in-out infinite;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
        }
        @keyframes dt-scan-sweep {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
    `);


    // ══════════════════════════════════════════════════════════════
    //  SCANNER ENGINE (DOM Tokenizer logic — unchanged core)
    // ══════════════════════════════════════════════════════════════
    class DOMTokenizer {
        constructor() {
            this.tokens = this._emptyTokens();
            this.scanTime = 0;
        }

        _emptyTokens() {
            return {
                tags: {}, ids: [], classes: {}, dataAttrs: {}, ariaAttrs: {},
                roles: [], inputs: [], buttons: [], links: [], textNodes: [], selectors: [],
            };
        }

        scan(root = document.body) {
            const t0 = performance.now();
            this.tokens = this._emptyTokens();
            // Identify our own UI elements to exclude from scan
            const panelEl = document.getElementById('dt-root');
            const toastEl = document.querySelector('.dt-toast-stack');
            const hlEl = document.querySelector('.dt-highlight');
            const all = root.querySelectorAll('*');

            all.forEach(el => {
                // Skip our own panel, toast stack, and highlight overlay
                if (panelEl && (el === panelEl || panelEl.contains(el))) return;
                if (toastEl && (el === toastEl || toastEl.contains(el))) return;
                if (hlEl && (el === hlEl || hlEl.contains(el))) return;

                const tag = el.tagName.toLowerCase();

                // Tags
                this.tokens.tags[tag] = (this.tokens.tags[tag] || 0) + 1;

                // IDs
                if (el.id) {
                    this.tokens.ids.push({
                        id: el.id, tag, selector: `#${el.id}`,
                        fullSelector: `${tag}#${el.id}`,
                        text: this._vis(el),
                    });
                }

                // Classes
                if (el.classList.length > 0) {
                    el.classList.forEach(cls => {
                        if (!this.tokens.classes[cls]) {
                            this.tokens.classes[cls] = { count: 0, tags: new Set(), sample: null };
                        }
                        this.tokens.classes[cls].count++;
                        this.tokens.classes[cls].tags.add(tag);
                        if (!this.tokens.classes[cls].sample) {
                            this.tokens.classes[cls].sample = this._vis(el);
                        }
                    });
                }

                // data-* / aria-*
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('data-')) {
                        const k = attr.name;
                        if (!this.tokens.dataAttrs[k]) this.tokens.dataAttrs[k] = { values: new Set(), count: 0, tag };
                        this.tokens.dataAttrs[k].count++;
                        if (attr.value && this.tokens.dataAttrs[k].values.size < 10) this.tokens.dataAttrs[k].values.add(attr.value);
                    }
                    if (attr.name.startsWith('aria-')) {
                        const k = attr.name;
                        if (!this.tokens.ariaAttrs[k]) this.tokens.ariaAttrs[k] = { values: new Set(), count: 0 };
                        this.tokens.ariaAttrs[k].count++;
                        if (attr.value && this.tokens.ariaAttrs[k].values.size < 10) this.tokens.ariaAttrs[k].values.add(attr.value);
                    }
                });

                // Roles
                if (el.getAttribute('role')) {
                    this.tokens.roles.push({
                        role: el.getAttribute('role'), tag,
                        selector: `[role="${el.getAttribute('role')}"]`,
                        text: this._vis(el),
                    });
                }

                // Inputs
                if (['input', 'select', 'textarea'].includes(tag)) {
                    this.tokens.inputs.push({
                        tag, type: el.type || '', name: el.name || '',
                        id: el.id || '', placeholder: el.placeholder || '',
                        selector: this._best(el),
                    });
                }

                // Buttons
                if (tag === 'button' || (tag === 'a' && el.getAttribute('role') === 'button') ||
                    el.getAttribute('type') === 'button' || el.getAttribute('type') === 'submit') {
                    this.tokens.buttons.push({
                        tag, text: this._vis(el), id: el.id || '',
                        classes: Array.from(el.classList).join(' '),
                        selector: this._best(el),
                    });
                }

                // Links
                if (tag === 'a' && el.href) {
                    this.tokens.links.push({
                        text: this._vis(el), href: el.href,
                        selector: this._best(el),
                    });
                }
            });

            // Text nodes
            root.querySelectorAll('h1,h2,h3,h4,h5,h6,label,span,p,td,th').forEach(el => {
                // Skip our own UI
                if (panelEl && panelEl.contains(el)) return;
                if (toastEl && toastEl.contains(el)) return;

                const text = el.textContent?.trim();
                if (text && text.length > 0 && text.length < 100) {
                    if (!this.tokens.textNodes.find(t => t.text === text)) {
                        this.tokens.textNodes.push({
                            text, tag: el.tagName.toLowerCase(),
                            selector: this._best(el),
                            xpath: this._xpath(el),
                        });
                    }
                }
            });

            this._genSelectors();
            this.scanTime = Math.round(performance.now() - t0);
            return this.tokens;
        }

        /* ── helpers ── */
        _vis(el) {
            const t = el.textContent?.trim() || '';
            return t.length > 80 ? t.substring(0, 80) + '…' : t;
        }

        _best(el) {
            if (el.id) return `#${el.id}`;
            const tag = el.tagName.toLowerCase();
            const tid = el.getAttribute('data-testid');
            if (tid) return `[data-testid="${tid}"]`;
            const did = el.getAttribute('data-id');
            if (did) return `[data-id="${did}"]`;
            if (el.classList.length > 0) {
                const cls = Array.from(el.classList).slice(0, 3).map(c => `.${c}`).join('');
                const m = document.querySelectorAll(`${tag}${cls}`);
                if (m.length <= 5) return `${tag}${cls}`;
            }
            return this._cssPath(el);
        }

        _cssPath(el) {
            const parts = [];
            let cur = el;
            while (cur && cur !== document.body && parts.length < 5) {
                let sel = cur.tagName.toLowerCase();
                if (cur.id) { parts.unshift(`#${cur.id}`); break; }
                if (cur.classList.length > 0) sel += '.' + Array.from(cur.classList).slice(0, 2).join('.');
                const parent = cur.parentElement;
                if (parent) {
                    const sibs = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
                    if (sibs.length > 1) sel += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
                }
                parts.unshift(sel);
                cur = cur.parentElement;
            }
            return parts.join(' > ');
        }

        _xpath(el) {
            const parts = [];
            let cur = el;
            while (cur && cur.nodeType === Node.ELEMENT_NODE && parts.length < 6) {
                let part = cur.tagName.toLowerCase();
                if (cur.id) { parts.unshift(`//${part}[@id="${cur.id}"]`); return parts.join('/'); }
                const parent = cur.parentElement;
                if (parent) {
                    const sibs = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
                    if (sibs.length > 1) part += `[${sibs.indexOf(cur) + 1}]`;
                }
                parts.unshift(part);
                cur = cur.parentElement;
            }
            return '/' + parts.join('/');
        }

        _genSelectors() {
            const out = [];
            this.tokens.ids.forEach(i => {
                out.push({ type: 'ID', selector: i.selector, description: i.text || i.fullSelector, reliability: 'high' });
            });
            Object.entries(this.tokens.dataAttrs).forEach(([attr, info]) => {
                if (attr.includes('testid') || attr.includes('test-id')) {
                    info.values.forEach(val => {
                        out.push({ type: 'data-testid', selector: `[${attr}="${val}"]`, description: `${info.tag} com ${attr}`, reliability: 'high' });
                    });
                }
            });
            this.tokens.buttons.forEach(btn => {
                if (btn.text) {
                    out.push({ type: 'Button', selector: btn.selector, description: `Botão: "${btn.text}"`, reliability: btn.id ? 'high' : 'med' });
                }
            });
            this.tokens.inputs.forEach(inp => {
                out.push({ type: 'Input', selector: inp.selector, description: `${inp.tag}[type=${inp.type}] ${inp.placeholder || inp.name || ''}`, reliability: inp.id ? 'high' : 'med' });
            });
            this.tokens.selectors = out;
        }

        exportJSON() {
            const t = this.tokens;
            return JSON.stringify({
                url: location.href,
                timestamp: new Date().toISOString(),
                scanTimeMs: this.scanTime,
                summary: {
                    totalElements: Object.values(t.tags).reduce((a, b) => a + b, 0),
                    uniqueTags: Object.keys(t.tags).length, ids: t.ids.length,
                    uniqueClasses: Object.keys(t.classes).length, dataAttrs: Object.keys(t.dataAttrs).length,
                    buttons: t.buttons.length, inputs: t.inputs.length, links: t.links.length,
                },
                tags: t.tags,
                ids: t.ids,
                classes: Object.fromEntries(Object.entries(t.classes).map(([k, v]) => [k, { count: v.count, tags: [...v.tags], sample: v.sample }])),
                dataAttributes: Object.fromEntries(Object.entries(t.dataAttrs).map(([k, v]) => [k, { count: v.count, values: [...v.values], tag: v.tag }])),
                ariaAttributes: Object.fromEntries(Object.entries(t.ariaAttrs).map(([k, v]) => [k, { count: v.count, values: [...v.values] }])),
                roles: t.roles, buttons: t.buttons, inputs: t.inputs, links: t.links,
                automationSelectors: t.selectors, textNodes: t.textNodes,
            }, null, 2);
        }
    }


    // ══════════════════════════════════════════════════════════════
    //  UI CONTROLLER — Professional-grade panel
    //  Architecture: Shell rendered ONCE, only content area updates.
    //  MutationObserver ignores our own panel to prevent loops.
    // ══════════════════════════════════════════════════════════════
    class TokenizerUI {
        constructor() {
            this.engine = new DOMTokenizer();
            this.root = null;
            this.toastStack = null;
            this.highlightEl = null;
            this.isMinimized = false;
            this.activeTab = 'overview';
            this.query = '';
            this._searchDebounce = null;
            this._shellBuilt = false;
            this._mutationPaused = false;  // flag to pause observer during our DOM writes
        }

        // ── Bootstrap ──────────────────────────────────────────
        init() {
            this._createRoot();
            this._createToastStack();
            this._createHighlight();
            this._bindKeyboard();

            setTimeout(() => {
                this._scan(true); // initial scan, build shell
                this.toast('Scan concluído — painel pronto', 'info');
            }, CONFIG.SCAN_DELAY);

            if (CONFIG.OBSERVE_MUTATIONS) this._observeDOM();
        }

        _createRoot() {
            this.root = document.createElement('div');
            this.root.id = 'dt-root';
            document.body.appendChild(this.root);
            this._makeDraggable();
        }

        _createToastStack() {
            this.toastStack = document.createElement('div');
            this.toastStack.className = 'dt-toast-stack';
            document.body.appendChild(this.toastStack);
        }

        _createHighlight() {
            this.highlightEl = document.createElement('div');
            this.highlightEl.className = 'dt-highlight';
            this.highlightEl.style.display = 'none';
            document.body.appendChild(this.highlightEl);
        }

        // ── Scan ───────────────────────────────────────────────
        _scan(buildShell = false) {
            this.engine.scan();
            if (buildShell || !this._shellBuilt) {
                this._buildShell();
            }
            this._updateContent();
            this._updateBadges();
            this._updateFooter();
        }

        // ── Toast ──────────────────────────────────────────────
        toast(msg, type = 'success') {
            const el = document.createElement('div');
            el.className = `dt-toast dt-toast-${type}`;
            const icons = { success: '✓', info: '●', warning: '⚠' };
            el.innerHTML = `<span>${icons[type] || '●'}</span><span>${msg}</span>`;
            this.toastStack.appendChild(el);
            setTimeout(() => { el.classList.add('dt-toast-exit'); }, CONFIG.TOAST_DURATION);
            setTimeout(() => el.remove(), CONFIG.TOAST_DURATION + 250);
        }

        // ── Highlight ──────────────────────────────────────────
        highlightElement(selector) {
            try {
                const el = document.querySelector(selector);
                if (!el) return;
                const rect = el.getBoundingClientRect();
                Object.assign(this.highlightEl.style, {
                    display: 'block',
                    left: (rect.left + window.scrollX - 3) + 'px',
                    top: (rect.top + window.scrollY - 3) + 'px',
                    width: (rect.width + 6) + 'px',
                    height: (rect.height + 6) + 'px',
                });
                this.highlightEl.innerHTML = `<span class="dt-highlight-label">${selector.length > 50 ? selector.slice(0, 47) + '…' : selector}</span>`;
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => { this.highlightEl.style.display = 'none'; }, 3000);
            } catch { /* invalid selector */ }
        }

        // ── Clipboard ──────────────────────────────────────────
        _copy(text, rowEl, msg = 'Copiado!') {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(text, 'text');
            } else {
                navigator.clipboard.writeText(text).catch(() => {});
            }
            this.toast(msg);
            if (rowEl) {
                rowEl.style.background = 'hsla(142, 71%, 45%, 0.12)';
                setTimeout(() => { rowEl.style.background = ''; }, 350);
            }
        }

        // ── Drag ───────────────────────────────────────────────
        _makeDraggable() {
            let drag = false, ox, oy, sl, st;
            this.root.addEventListener('mousedown', e => {
                if (!e.target.closest('.dt-header')) return;
                if (e.target.closest('.dt-icon-btn')) return; // don't drag on buttons
                drag = true;
                const r = this.root.getBoundingClientRect();
                ox = e.clientX; oy = e.clientY; sl = r.left; st = r.top;
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!drag) return;
                this.root.style.left = (sl + e.clientX - ox) + 'px';
                this.root.style.top = (st + e.clientY - oy) + 'px';
                this.root.style.right = 'auto';
            });
            document.addEventListener('mouseup', () => { drag = false; });
        }

        // ── Keyboard ──────────────────────────────────────────
        _bindKeyboard() {
            document.addEventListener('keydown', e => {
                if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                    e.preventDefault();
                    if (this.root.style.display === 'none') {
                        this.root.style.display = '';
                        this.root.classList.remove('dt-hidden');
                    } else {
                        this.root.classList.toggle('dt-hidden');
                    }
                }
                if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                    e.preventDefault();
                    this._scan();
                    this.toast('Re-scan concluído');
                }
                if (e.key === 'Escape' && !this.root.classList.contains('dt-hidden')) {
                    this.root.classList.add('dt-hidden');
                }
            });
        }

        // ── DOM Observer ──────────────────────────────────────
        // KEY FIX: ignores any mutation that originates from inside our own UI
        _observeDOM() {
            let t;
            const obs = new MutationObserver((mutations) => {
                // Skip if paused (we are updating our own DOM)
                if (this._mutationPaused) return;

                // Check if ALL mutations are from our panel — if so, skip
                const fromUs = mutations.every(m => {
                    const target = m.target;
                    return target === this.root || this.root.contains(target)
                        || target === this.toastStack || this.toastStack.contains(target)
                        || target === this.highlightEl || this.highlightEl.contains(target);
                });
                if (fromUs) return;

                clearTimeout(t);
                t = setTimeout(() => { this._scan(); }, CONFIG.RESCAN_DELAY);
            });
            obs.observe(document.body, { childList: true, subtree: true });
        }

        // ── Filtering helpers ─────────────────────────────────
        _filter(items, keyOrFn) {
            if (!this.query) return items;
            return items.filter(item => {
                const v = typeof keyOrFn === 'function' ? keyOrFn(item) : item[keyOrFn];
                return v?.toLowerCase().includes(this.query);
            });
        }
        _filterObj(obj) {
            if (!this.query) return obj;
            return Object.fromEntries(Object.entries(obj).filter(([k]) => k.toLowerCase().includes(this.query)));
        }

        // ══════════════════════════════════════════════════════
        //  SHELL — built ONCE, never destroyed
        // ══════════════════════════════════════════════════════

        /** Tab config, reusable */
        _tabDefs() {
            const t = this.engine.tokens;
            return [
                { id: 'overview',    icon: '◉', label: 'Radar',   count: null },
                { id: 'ids',         icon: '#', label: 'IDs',     count: t.ids.length },
                { id: 'classes',     icon: '◆', label: 'Classes', count: Object.keys(t.classes).length },
                { id: 'data-attrs',  icon: '⬡', label: 'Attrs',  count: Object.keys(t.dataAttrs).length },
                { id: 'buttons',     icon: '▣', label: 'Ações',  count: t.buttons.length },
                { id: 'inputs',      icon: '▤', label: 'Forms',  count: t.inputs.length },
                { id: 'text',        icon: '≡', label: 'Textos', count: t.textNodes.length },
                { id: 'selectors',   icon: '◎', label: 'Smart',  count: t.selectors.length },
                { id: 'export',      icon: '↗', label: 'Export', count: null },
            ];
        }

        /** Build the shell structure once — header, tabs, search, content container, footer */
        _buildShell() {
            this._mutationPaused = true;

            const tabs = this._tabDefs();

            this.root.innerHTML = `
                <!-- HEADER -->
                <div class="dt-header">
                    <div class="dt-brand">
                        <div class="dt-brand-icon">🔍</div>
                        <span class="dt-brand-label">DOM Tokenizer</span>
                        <span class="dt-brand-version">v2.0</span>
                    </div>
                    <div class="dt-header-actions">
                        <button class="dt-icon-btn" id="dt-act-rescan" data-tooltip="Re-scan (Ctrl+Shift+R)">⟳</button>
                        <button class="dt-icon-btn" id="dt-act-minimize" data-tooltip="Minimizar">▬</button>
                        <button class="dt-icon-btn dt-btn-close" id="dt-act-close" data-tooltip="Fechar (Esc)">✕</button>
                    </div>
                </div>

                <!-- BODY (hidden when minimized) -->
                <div class="dt-body" id="dt-body">
                    <!-- TABS -->
                    <div class="dt-tabs" id="dt-tabs">
                        ${tabs.map(tab => `
                            <div class="dt-tab ${this.activeTab === tab.id ? 'dt-active' : ''}" data-tab="${tab.id}">
                                <span class="dt-tab-icon">${tab.icon}</span>
                                <span>${tab.label}</span>
                                ${tab.count !== null ? `<span class="dt-tab-badge" data-tab-badge="${tab.id}">${tab.count}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>

                    <!-- SEARCH -->
                    <div class="dt-search-wrap">
                        <div class="dt-search-inner">
                            <span class="dt-search-icon">⌕</span>
                            <input class="dt-search-input" id="dt-search" placeholder="Filtrar nesta aba…" />
                            <span class="dt-search-count" id="dt-search-count" style="display:none"></span>
                            <button class="dt-search-clear" id="dt-search-clear" style="display:none">✕</button>
                        </div>
                    </div>

                    <!-- CONTENT -->
                    <div class="dt-content" id="dt-content"></div>

                    <!-- FOOTER -->
                    <div class="dt-footer">
                        <div class="dt-footer-left">
                            <span class="dt-status-dot"></span>
                            <span id="dt-footer-text">Último scan: ${this.engine.scanTime}ms</span>
                        </div>
                        <div class="dt-footer-shortcuts">
                            <span class="dt-kbd">Ctrl+Shift+T</span>
                        </div>
                    </div>
                </div>
            `;

            this._shellBuilt = true;
            this._bindShell();
            this._mutationPaused = false;
        }

        /** Bind persistent events on the shell (called once) */
        _bindShell() {
            const $ = sel => this.root.querySelector(sel);

            // Close
            $('#dt-act-close').addEventListener('click', () => {
                this.root.classList.add('dt-hidden');
                setTimeout(() => { this.root.style.display = 'none'; }, 280);
            });

            // Minimize
            $('#dt-act-minimize').addEventListener('click', () => {
                this.isMinimized = !this.isMinimized;
                this.root.classList.toggle('dt-minimized', this.isMinimized);
                const body = $('#dt-body');
                if (body) body.style.display = this.isMinimized ? 'none' : '';
                const minBtn = $('#dt-act-minimize');
                if (minBtn) {
                    minBtn.textContent = this.isMinimized ? '◻' : '▬';
                    minBtn.dataset.tooltip = this.isMinimized ? 'Expandir' : 'Minimizar';
                }
            });

            // Rescan
            $('#dt-act-rescan').addEventListener('click', () => {
                this._scan();
                this.toast('Re-scan concluído');
            });

            // Tabs — use event delegation on the tabs container
            $('#dt-tabs').addEventListener('click', e => {
                const tabEl = e.target.closest('.dt-tab');
                if (!tabEl) return;
                const tabId = tabEl.dataset.tab;
                if (tabId === this.activeTab) return;

                // Update active class
                this.root.querySelectorAll('.dt-tab').forEach(t => t.classList.toggle('dt-active', t.dataset.tab === tabId));
                this.activeTab = tabId;
                this.query = '';

                // Clear search input without re-rendering shell
                const searchInput = $('#dt-search');
                if (searchInput) searchInput.value = '';
                this._updateSearchUI();

                // Update only content
                this._updateContent();
            });

            // Search — input event with debounce, NEVER re-renders the shell
            const searchInput = $('#dt-search');
            searchInput.addEventListener('input', e => {
                clearTimeout(this._searchDebounce);
                const val = e.target.value;
                this._searchDebounce = setTimeout(() => {
                    this.query = val.toLowerCase();
                    this._updateSearchUI();
                    this._updateContent();
                    // Focus is automatically preserved since we don't touch the input element
                }, CONFIG.SEARCH_DEBOUNCE);
            });

            // Search clear
            $('#dt-search-clear').addEventListener('click', () => {
                this.query = '';
                const input = $('#dt-search');
                if (input) { input.value = ''; input.focus(); }
                this._updateSearchUI();
                this._updateContent();
            });

            // Export buttons + rows + pills — use delegation on the content container
            $('#dt-content').addEventListener('click', e => {
                this._handleContentClick(e);
            });
        }

        // ══════════════════════════════════════════════════════
        //  TARGETED UPDATES — only touch what changed
        // ══════════════════════════════════════════════════════

        /** Update only the content area inside .dt-content */
        _updateContent() {
            this._mutationPaused = true;

            const contentEl = this.root.querySelector('#dt-content');
            if (!contentEl) return;

            // Save scroll position
            const scrollTop = contentEl.scrollTop;

            contentEl.innerHTML = this._renderTab();

            // Restore scroll position (unless tab changed — then reset)
            // We use a tiny raf to let layout settle
            requestAnimationFrame(() => {
                contentEl.scrollTop = scrollTop;
            });

            this._mutationPaused = false;
        }

        /** Update tab badge counts without re-rendering */
        _updateBadges() {
            this._mutationPaused = true;
            const tabs = this._tabDefs();
            tabs.forEach(tab => {
                if (tab.count !== null) {
                    const badge = this.root.querySelector(`[data-tab-badge="${tab.id}"]`);
                    if (badge) badge.textContent = tab.count;
                }
            });
            this._mutationPaused = false;
        }

        /** Update footer scan time */
        _updateFooter() {
            const el = this.root.querySelector('#dt-footer-text');
            if (el) el.textContent = `Último scan: ${this.engine.scanTime}ms`;
        }

        /** Update search result count + clear button visibility */
        _updateSearchUI() {
            const countEl = this.root.querySelector('#dt-search-count');
            const clearEl = this.root.querySelector('#dt-search-clear');
            if (this.query) {
                if (countEl) { countEl.style.display = ''; countEl.textContent = `${this._getFilteredCount()} result.`; }
                if (clearEl) clearEl.style.display = '';
            } else {
                if (countEl) countEl.style.display = 'none';
                if (clearEl) clearEl.style.display = 'none';
            }
        }

        /** Delegated click handler for dynamic content inside #dt-content */
        _handleContentClick(e) {
            // Section collapse/expand
            const toggleHead = e.target.closest('[data-toggle-section]');
            if (toggleHead && !e.target.closest('.dt-btn-copy-all')) {
                toggleHead.closest('.dt-section')?.classList.toggle('dt-collapsed');
                return;
            }

            // Copy-All button
            const copyAllBtn = e.target.closest('.dt-btn-copy-all');
            if (copyAllBtn) {
                e.stopPropagation();
                this._handleCopyAll();
                return;
            }

            // Row highlight button
            const highlightBtn = e.target.closest('.dt-act-highlight');
            if (highlightBtn) {
                const row = highlightBtn.closest('.dt-row');
                if (row?.dataset.selector) this.highlightElement(row.dataset.selector);
                return;
            }

            // Row copy button
            const copyBtn = e.target.closest('.dt-act-copy');
            if (copyBtn) {
                const row = copyBtn.closest('.dt-row');
                if (row?.dataset.selector) this._copy(row.dataset.selector, row);
                return;
            }

            // Row click (not on a button) = copy selector
            const row = e.target.closest('.dt-row');
            if (row?.dataset.selector) {
                this._copy(row.dataset.selector, row);
                return;
            }

            // Tag pills
            const pill = e.target.closest('.dt-tag-pill');
            if (pill?.dataset.selector) {
                this._copy(pill.dataset.selector, pill, `Copiado: <${pill.dataset.selector}>`);
                return;
            }

            // Export buttons
            if (e.target.closest('#dt-exp-json')) {
                this._copy(this.engine.exportJSON(), null, 'JSON exportado para clipboard');
                return;
            }
            if (e.target.closest('#dt-exp-snippets')) {
                const snippets = this.engine.tokens.selectors
                    .map(s => `// ${s.description}\nconst el_${Math.random().toString(36).substr(2, 5)} = document.querySelector('${s.selector}');`)
                    .join('\n\n');
                this._copy(snippets, null, 'Snippets JS copiados');
                return;
            }
            if (e.target.closest('#dt-exp-download')) {
                const blob = new Blob([this.engine.exportJSON()], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `meli-dom-${Date.now()}.json`; a.click();
                URL.revokeObjectURL(url);
                this.toast('Download iniciado', 'success');
                return;
            }
        }

        /** Handle copy-all for the active tab */
        _handleCopyAll() {
            const t = this.engine.tokens;
            let items = [];
            switch (this.activeTab) {
                case 'ids':        items = this._filter(t.ids, 'id').map(i => i.selector); break;
                case 'classes':    items = Object.keys(this._filterObj(t.classes)).map(c => `.${c}`); break;
                case 'data-attrs': items = Object.keys(this._filterObj(t.dataAttrs)).map(a => `[${a}]`); break;
                case 'buttons':    items = this._filter(t.buttons, b => b.text + b.selector).map(b => b.selector); break;
                case 'inputs':     items = this._filter(t.inputs, i => `${i.name} ${i.selector} ${i.placeholder}`).map(i => i.selector); break;
                case 'text':       items = this._filter(t.textNodes, n => n.text).map(n => n.selector); break;
                case 'selectors':  items = this._filter(t.selectors, s => `${s.description} ${s.selector}`).map(s => s.selector); break;
            }
            if (items.length > 0) {
                this._copy(items.join('\n'), null, `${items.length} itens copiados`);
            }
        }

        // ══════════════════════════════════════════════════════
        //  RENDER HELPERS — produce HTML strings for content
        // ══════════════════════════════════════════════════════

        _escHtml(s) { return s.replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
        _escAttr(s) { return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        _fmtNum(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString(); }

        _getFilteredCount() {
            const t = this.engine.tokens;
            switch (this.activeTab) {
                case 'ids':        return this._filter(t.ids, 'id').length;
                case 'classes':    return Object.keys(this._filterObj(t.classes)).length;
                case 'data-attrs': return Object.keys(this._filterObj(t.dataAttrs)).length;
                case 'buttons':    return this._filter(t.buttons, b => b.text + b.selector).length;
                case 'inputs':     return this._filter(t.inputs, i => `${i.name} ${i.selector} ${i.placeholder}`).length;
                case 'text':       return this._filter(t.textNodes, n => n.text).length;
                case 'selectors':  return this._filter(t.selectors, s => `${s.description} ${s.selector}`).length;
                default:           return '—';
            }
        }

        _renderTab() {
            const t = this.engine.tokens;
            switch (this.activeTab) {
                case 'overview':   return this._renderOverview(t);
                case 'ids':        return this._renderListSection(this._filter(t.ids, 'id'), 'IDs', '#', i => i.selector, i => i.text);
                case 'classes':    return this._renderClasses(t);
                case 'data-attrs': return this._renderDataAttrs(t);
                case 'buttons':    return this._renderListSection(this._filter(t.buttons, b => b.text + b.selector), 'Botões & Ações', '▣', b => b.selector, b => b.text || '(sem texto)');
                case 'inputs':     return this._renderListSection(this._filter(t.inputs, i => `${i.name} ${i.selector} ${i.placeholder}`), 'Campos', '▤', i => i.selector, i => `[${i.type}] ${i.placeholder || i.name || '(sem name)'}`);
                case 'text':       return this._renderListSection(this._filter(t.textNodes, n => n.text).slice(0, 120), 'Nós de Texto', '≡', n => n.selector, n => n.text);
                case 'selectors':  return this._renderSelectors(t);
                case 'export':     return this._renderExport();
                default:           return '';
            }
        }

        _renderOverview(t) {
            const total = Object.values(t.tags).reduce((a, b) => a + b, 0);
            const topTags = Object.entries(this._filterObj(t.tags)).sort((a, b) => b[1] - a[1]).slice(0, 25);
            return `
                <div class="dt-stats-grid">
                    <div class="dt-stat"><div class="dt-stat-value">${this._fmtNum(total)}</div><div class="dt-stat-label">Elementos</div></div>
                    <div class="dt-stat"><div class="dt-stat-value">${t.ids.length}</div><div class="dt-stat-label">IDs</div></div>
                    <div class="dt-stat"><div class="dt-stat-value">${Object.keys(t.classes).length}</div><div class="dt-stat-label">Classes</div></div>
                </div>
                <div class="dt-stats-row">
                    <div class="dt-stat-mini"><div class="dt-stat-mini-value">${t.buttons.length}</div><div class="dt-stat-mini-label">Botões</div></div>
                    <div class="dt-stat-mini"><div class="dt-stat-mini-value">${t.inputs.length}</div><div class="dt-stat-mini-label">Inputs</div></div>
                    <div class="dt-stat-mini"><div class="dt-stat-mini-value">${t.links.length}</div><div class="dt-stat-mini-label">Links</div></div>
                    <div class="dt-stat-mini"><div class="dt-stat-mini-value">${Object.keys(t.dataAttrs).length}</div><div class="dt-stat-mini-label">Data-*</div></div>
                </div>
                <div class="dt-section">
                    <div class="dt-section-head" data-toggle-section>
                        <div class="dt-section-title"><span class="dt-section-title-icon">◈</span> Tags Populares</div>
                        <div class="dt-section-meta"><span class="dt-badge">${Object.keys(t.tags).length} únicas</span><span class="dt-chevron">▼</span></div>
                    </div>
                    <div class="dt-section-body">
                        <div class="dt-tag-list">
                            ${topTags.map(([tag, count]) => `
                                <span class="dt-tag-pill" data-selector="${tag}">
                                    <span class="dt-tag-pill-name">&lt;${tag}&gt;</span>
                                    <span class="dt-tag-pill-count">×${count}</span>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="dt-section">
                    <div class="dt-section-head" data-toggle-section>
                        <div class="dt-section-title"><span class="dt-section-title-icon">◎</span> Top Selectors</div>
                        <div class="dt-section-meta"><span class="dt-badge">${t.selectors.filter(s => s.reliability === 'high').length} confiáveis</span><span class="dt-chevron">▼</span></div>
                    </div>
                    <div class="dt-section-body">
                        ${t.selectors.filter(s => s.reliability === 'high').slice(0, 8).map(sel => `
                            <div class="dt-row" data-selector="${this._escAttr(sel.selector)}">
                                <div class="dt-row-body">
                                    <div class="dt-row-selector">${this._escHtml(sel.selector)}</div>
                                    <div class="dt-row-sub">${this._escHtml(sel.description)}</div>
                                </div>
                                <div class="dt-row-actions">
                                    <button class="dt-action-btn dt-act-highlight" title="Localizar">👁</button>
                                    <button class="dt-action-btn dt-act-copy" title="Copiar">⎘</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        _renderListSection(items, title, icon, selFn, subFn) {
            return `
                <div class="dt-section">
                    <div class="dt-section-head" data-toggle-section>
                        <div class="dt-section-title"><span class="dt-section-title-icon">${icon}</span> ${title}</div>
                        <div class="dt-section-meta">
                            <span class="dt-badge">${items.length}</span>
                            ${items.length > 0 ? `<button class="dt-btn-copy-all">Copiar</button>` : ''}
                            <span class="dt-chevron">▼</span>
                        </div>
                    </div>
                    <div class="dt-section-body">
                        ${items.length === 0 ? `<div class="dt-empty"><div class="dt-empty-icon">∅</div>Nenhum item encontrado.</div>` :
                        items.map(item => {
                            const sel = selFn(item);
                            return `
                                <div class="dt-row" data-selector="${this._escAttr(sel)}">
                                    <div class="dt-row-body">
                                        <div class="dt-row-selector">${this._escHtml(sel)}</div>
                                        <div class="dt-row-sub">${this._escHtml(subFn(item) || '')}</div>
                                    </div>
                                    <div class="dt-row-actions">
                                        <button class="dt-action-btn dt-act-highlight" title="Localizar">👁</button>
                                        <button class="dt-action-btn dt-act-copy" title="Copiar">⎘</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        _renderClasses(t) {
            const filtered = this._filterObj(t.classes);
            const sorted = Object.entries(filtered).sort((a, b) => b[1].count - a[1].count);
            return `
                <div class="dt-section">
                    <div class="dt-section-head" data-toggle-section>
                        <div class="dt-section-title"><span class="dt-section-title-icon">◆</span> Classes CSS</div>
                        <div class="dt-section-meta">
                            <span class="dt-badge">${sorted.length}</span>
                            ${sorted.length > 0 ? `<button class="dt-btn-copy-all">Copiar</button>` : ''}
                            <span class="dt-chevron">▼</span>
                        </div>
                    </div>
                    <div class="dt-section-body">
                        ${sorted.length === 0 ? `<div class="dt-empty"><div class="dt-empty-icon">∅</div>Nenhum resultado.</div>` :
                        sorted.map(([cls, info]) => `
                            <div class="dt-row" data-selector=".${cls}">
                                <div class="dt-row-body">
                                    <div class="dt-row-selector">.${this._escHtml(cls)}</div>
                                    <div class="dt-row-sub">${[...info.tags].join(', ')} · ×${info.count}</div>
                                </div>
                                <div class="dt-row-actions">
                                    <button class="dt-action-btn dt-act-copy" title="Copiar">⎘</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        _renderDataAttrs(t) {
            const filtered = this._filterObj(t.dataAttrs);
            const entries = Object.entries(filtered);
            return `
                <div class="dt-section">
                    <div class="dt-section-head" data-toggle-section>
                        <div class="dt-section-title"><span class="dt-section-title-icon">⬡</span> Data Attributes</div>
                        <div class="dt-section-meta">
                            <span class="dt-badge">${entries.length}</span>
                            ${entries.length > 0 ? `<button class="dt-btn-copy-all">Copiar</button>` : ''}
                            <span class="dt-chevron">▼</span>
                        </div>
                    </div>
                    <div class="dt-section-body">
                        ${entries.length === 0 ? `<div class="dt-empty"><div class="dt-empty-icon">∅</div>Nenhum resultado.</div>` :
                        entries.map(([attr, info]) => `
                            <div class="dt-row" data-selector="[${attr}]">
                                <div class="dt-row-body">
                                    <div class="dt-row-selector">[${this._escHtml(attr)}]</div>
                                    <div class="dt-row-sub">${[...info.values].slice(0, 3).join(', ') || 'sem valor fixo'} · ×${info.count}</div>
                                </div>
                                <div class="dt-row-actions">
                                    <button class="dt-action-btn dt-act-copy" title="Copiar">⎘</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        _renderSelectors(t) {
            const filtered = this._filter(t.selectors, s => `${s.description} ${s.selector}`);
            const byRel = { high: [], med: [], low: [] };
            filtered.forEach(s => (byRel[s.reliability] || byRel.med).push(s));

            const renderGroup = (items, label, relClass) => {
                if (items.length === 0) return '';
                return `
                    <div class="dt-section">
                        <div class="dt-section-head" data-toggle-section>
                            <div class="dt-section-title">
                                <span class="dt-rel ${relClass}"><span class="dt-rel-dot"></span></span>
                                ${label}
                            </div>
                            <div class="dt-section-meta">
                                <span class="dt-badge">${items.length}</span>
                                <button class="dt-btn-copy-all">Copiar</button>
                                <span class="dt-chevron">▼</span>
                            </div>
                        </div>
                        <div class="dt-section-body">
                            ${items.map(sel => `
                                <div class="dt-row" data-selector="${this._escAttr(sel.selector)}">
                                    <div class="dt-row-body">
                                        <div class="dt-row-selector">${this._escHtml(sel.selector)}</div>
                                        <div class="dt-row-sub">
                                            <span class="dt-badge" style="font-size:9.5px;padding:1px 5px;">${sel.type}</span>
                                            ${this._escHtml(sel.description)}
                                        </div>
                                    </div>
                                    <div class="dt-row-actions">
                                        <button class="dt-action-btn dt-act-highlight" title="Localizar">👁</button>
                                        <button class="dt-action-btn dt-act-copy" title="Copiar">⎘</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            };

            return `
                <div class="dt-info">
                    <span class="dt-info-icon">◎</span>
                    <span>Seletores ranqueados por estabilidade. Priorize <strong>alta confiabilidade</strong> para automações robustas.</span>
                </div>
                ${renderGroup(byRel.high, 'Alta Confiabilidade', 'dt-rel-high')}
                ${renderGroup(byRel.med, 'Média Confiabilidade', 'dt-rel-med')}
                ${renderGroup(byRel.low, 'Baixa Confiabilidade', 'dt-rel-low')}
                ${filtered.length === 0 ? `<div class="dt-empty"><div class="dt-empty-icon">∅</div>Nenhum seletor encontrado.</div>` : ''}
            `;
        }

        _renderExport() {
            return `
                <div class="dt-info">
                    <span class="dt-info-icon">↗</span>
                    <span>Exporte os dados mapeados para scripts de automação ou documentação técnica.</span>
                </div>
                <div class="dt-export-group">
                    <button class="dt-export-btn" id="dt-exp-json">
                        <div class="dt-export-icon dt-export-icon-json">📋</div>
                        <div class="dt-export-text">
                            <div class="dt-export-title">Copiar JSON Estruturado</div>
                            <div class="dt-export-desc">Todos os tokens em formato JSON para clipboard</div>
                        </div>
                    </button>
                    <button class="dt-export-btn" id="dt-exp-snippets">
                        <div class="dt-export-icon dt-export-icon-snip">⚡</div>
                        <div class="dt-export-text">
                            <div class="dt-export-title">Copiar Snippets JS</div>
                            <div class="dt-export-desc">querySelector prontos para usar</div>
                        </div>
                    </button>
                    <button class="dt-export-btn" id="dt-exp-download">
                        <div class="dt-export-icon dt-export-icon-file">💾</div>
                        <div class="dt-export-text">
                            <div class="dt-export-title">Baixar .json</div>
                            <div class="dt-export-desc">Download do arquivo completo</div>
                        </div>
                    </button>
                </div>
                <div class="dt-code">
                    <div class="dt-code-header"><span class="dt-code-label">Exemplo de uso</span></div>
<span style="color:hsl(215,15%,42%)">// Tip: Use o JSON para criar bots robustos</span>
<span style="color:hsl(207,82%,66%)">const</span> tokens = <span style="color:hsl(207,82%,66%)">JSON</span>.parse(<span style="color:hsl(207,82%,66%)">await</span> navigator.clipboard.readText());
<span style="color:hsl(207,82%,66%)">const</span> target = document.querySelector(tokens.automationSelectors[0].selector);
<span style="color:hsl(207,82%,66%)">if</span> (target) target.click();
                </div>
            `;
        }
    }


    // ══════════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════════
    const app = new TokenizerUI();
    app.init();

    console.log('%c🔍 MeLi DOM Tokenizer v2.0', 'color:#3b82f6;font-size:14px;font-weight:bold;');
    console.log('%cCtrl+Shift+T → toggle | Ctrl+Shift+R → rescan | Esc → fechar', 'color:#848d97;');

})();