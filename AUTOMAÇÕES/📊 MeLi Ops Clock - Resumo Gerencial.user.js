// ==UserScript==
// @name         📊 MeLi Ops Clock - Resumo Gerencial (Completo)
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Gera um relatório gerencial rápido com o status atual E todos os dados granulares dos indicadores (Tempos, Volumes, Taxas e Ondas).
// @author       V1 AI Assistant
// @match        https://envios.adminml.com/logistics/ops-clock/metrics*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // INJEÇÃO DE ESTILOS CSS (UI/UX)
    // ==========================================
    const styles = `
        .ml-ops-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #009ee3, #006eb4);
            color: #fff;
            font-size: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 158, 227, 0.4);
            z-index: 99999;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s;
        }
        .ml-ops-fab:hover {
            transform: scale(1.1) translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 158, 227, 0.6);
        }

        .ml-ops-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(10, 10, 10, 0.65);
            backdrop-filter: blur(8px);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .ml-ops-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        .ml-ops-modal {
            background: #1e1e1e;
            width: 95%;
            max-width: 1000px;
            max-height: 90vh;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.08);
            color: #fff;
            font-family: 'Proxima Nova', -apple-system, system-ui, Roboto, sans-serif;
            transform: translateY(20px) scale(0.98);
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .ml-ops-overlay.active .ml-ops-modal {
            transform: translateY(0) scale(1);
        }

        .ml-ops-header {
            padding: 16px 24px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255,255,255,0.02);
            flex-shrink: 0;
        }
        .ml-ops-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #e5e5e5;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .ml-ops-close {
            background: none;
            border: none;
            color: #999;
            font-size: 28px;
            cursor: pointer;
            transition: color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
        }
        .ml-ops-close:hover { 
            color: #fff; 
            background: rgba(255,255,255,0.1);
        }

        .ml-ops-body {
            padding: 24px;
            overflow-y: auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .ml-ops-body::-webkit-scrollbar { width: 8px; }
        .ml-ops-body::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .ml-ops-body::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .ml-ops-body::-webkit-scrollbar-thumb:hover { background: #555; }

        .ml-ops-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: background 0.2s;
        }
        .ml-ops-card:hover { 
            background: rgba(255,255,255,0.06);
        }
        .ml-ops-card-full {
             grid-column: 1 / -1; 
        }

        .ml-ops-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px dashed rgba(255,255,255,0.1);
            padding-bottom: 10px;
            margin-bottom: 4px;
        }
        .ml-ops-title {
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.3px;
        }
        .ml-ops-pill {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .ml-ops-pill.green {
            background: rgba(0, 200, 83, 0.15);
            color: #00e676;
            border: 1px solid rgba(0, 200, 83, 0.3);
        }
        .ml-ops-pill.red {
            background: rgba(213, 0, 0, 0.15);
            color: #ff5252;
            border: 1px solid rgba(213, 0, 0, 0.3);
        }

        .ml-ops-info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #bbb;
        }
        .ml-ops-metric-value {
            font-weight: 600;
            color: #fff;
        }
        
        .ml-ops-alert-container {
            margin-top: 2px;
            margin-bottom: 6px;
            padding: 8px 12px;
            background: rgba(213, 0, 0, 0.08);
            border-radius: 6px;
            border-left: 3px solid #ff5252;
        }
        .ml-ops-alert-text {
            color: #ff5252;
            font-weight: 600;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* 
         * GRADE DE DETALHES (Novo Módulo Dinâmico)
         */
        .ml-ops-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 8px;
            margin-top: 8px;
        }
        .ml-ops-detail-box {
            display: flex;
            flex-direction: column;
            background: rgba(0,0,0,0.25);
            padding: 8px 10px;
            border-radius: 8px;
            border-left: 2px solid #009ee3;
        }
        .ml-ops-detail-box .lbl {
            font-size: 11px;
            color: #aaa;
            text-transform: uppercase;
        }
        .ml-ops-detail-box .val {
            font-size: 14px;
            font-weight: 700;
            color: #e5e5e5;
            margin-top: 4px;
        }

        /* Ondas */
        .ml-ops-wave-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 12px;
            margin-top: 12px;
        }
        .ml-ops-wave-item {
            background: rgba(0,0,0,0.25);
            padding: 14px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            border-left: 3px solid #ff5252;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }
        .ml-ops-wave-item.ok {
            border-left: 3px solid #00e676;
        }
        .ml-ops-wave-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        @media (max-width: 768px) {
            .ml-ops-body { grid-template-columns: 1fr; }
            .ml-ops-wave-list { grid-template-columns: 1fr; }
        }
    `;

    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(styles);
    } else {
        const style = document.createElement('style');
        style.innerText = styles;
        document.head.appendChild(style);
    }

    // ==========================================
    // LOGICA DE SCRAPING GRANULAR DE DADOS
    // ==========================================
    function scrapePageMetrics() {
        const report = [];

        // Extraí detlahes semânticos e previne duplicatas
        const getKeyValueDetails = (el) => {
            let details = [];
            
            // 1. Extrair Horários (Divs como .sections, .container-time)
            const timeSections = el.querySelectorAll('.sections, .container-time');
            timeSections.forEach(sec => {
                const texts = Array.from(sec.querySelectorAll('span, strong'))
                    .filter(n => n.children.length === 0 && n.textContent.trim() !== '')
                    .map(n => n.textContent.trim());
                const uTexts = [...new Set(texts)];
                if(uTexts.length >= 2) {
                    details.push({ label: uTexts[0], value: uTexts[uTexts.length-1] });
                }
            });

            // 2. Extrair "Desempenho real" ou "Final estimado" (Títulos soltos .title)
            const prodTitles = el.querySelectorAll('.prod-per-minute .container-title .title, .time-per-minute .container-title .title');
            prodTitles.forEach(tNode => {
                 const container = tNode.closest('.prod-per-minute, .time-per-minute');
                 if(container) {
                     let text = container.innerText.replace(tNode.innerText, '').replace(/\n/g, '').trim();
                     if(text) details.push({ label: tNode.textContent.trim(), value: text });
                 }
            });

            // 3. Extrair Volumes Base (Planejados, etc) localizados em .estimated-count
            const countWrappers = el.querySelectorAll('.estimated-count');
            countWrappers.forEach(w => {
                const subtitle = w.querySelector('.subtitle');
                const count = w.querySelector('.count, strong');
                if(subtitle && count) {
                    details.push({ label: subtitle.textContent.trim(), value: count.textContent.trim() });
                }
            });

            // 4. Extrair Progressões (Expedidos, Pendentes, Separáveis, Buffer)
            const statContainers = el.querySelectorAll('.container, .container-buffer, .container-stats'); // Tenta abranger o máximo de variações
            statContainers.forEach(c => {
                const spans = Array.from(c.querySelectorAll('.container-stats span, .container-stats strong'))
                                    .map(n => n.textContent.trim())
                                    .filter(Boolean);
                const pct = c.querySelector('.stats-percentage, .stats-percentage span');
                let pctText = pct ? pct.textContent.trim() : '';
                
                if(spans.length >= 2) {
                    // Evita aninhar os mesmos textos recursivamente. 
                    // O spans[0] geralmente é o titulo ("Expedidos") e spans[1] o valor ("18.544")
                    let val = spans[1]; 
                    if(pctText && !val.includes(pctText)) val += ` (${pctText})`;
                    details.push({ label: spans[0], value: val });
                }
            });

            // Limpa Duplicadas Logicas
            const cleanDetails = [];
            const seen = new Set();
            details.forEach(d => {
                // Filtra textos estranhos ou sujeiras
                if(!seen.has(d.label) && d.label.length > 2 && d.label !== d.value && !d.label.includes('delay')) {
                    seen.add(d.label);
                    cleanDetails.push(d);
                }
            });

            return cleanDetails;
        };

        const extractCardData = (selector, defaultTitle) => {
            const el = document.querySelector(selector);
            if (!el) return null;
            
            // Titulo
            let title = defaultTitle;
            const titleEl = el.querySelector('.andes-card__header-title, .title-metrics');
            if (titleEl) {
                const rawName = titleEl.textContent.trim().split(/(OOT|Início)/)[0].trim();
                if (rawName) title = rawName;
            }

            // Status Primários
            const hasDelay = el.querySelector('.andes-badge--red') !== null;
            const hasOnTime = el.querySelector('.andes-badge--green') !== null;
            
            const badges = Array.from(el.querySelectorAll('.andes-badge__content')).map(b => b.textContent.trim());
            const ootBadges = badges.filter(b => b.includes('OOT'));

            // Alerta "X Pacotes/Rotas com Delay"
            const delaySpan = el.querySelector('span[id^="informative-"]');
            let delayMsg = '';
            if (delaySpan) {
                delayMsg = delaySpan.textContent.trim();
            } else if (hasDelay) {
                const delayBadge = badges.find(b => b.includes('% delay'));
                if (delayBadge) delayMsg = delayBadge;
            }

            // Percentual Global
            const pctNode = el.querySelector('.stats-percentage');
            let progress = pctNode ? pctNode.textContent.trim() : 'N/A';
            
            // Dados Granulares
            let detailedInfo = getKeyValueDetails(el);

            return {
                title,
                status: hasDelay ? 'DELAY' : (hasOnTime ? 'ON TIME' : 'UNKNOWN'),
                oots: ootBadges,
                delayMsg,
                progress,
                details: detailedInfo
            };
        };

        const expedicao = extractCardData('.card-dispatch-metrics', 'Expedição');
        const separacao = extractCardData('.card-sorting-metrics', 'Separação');
        const etiquetagem = extractCardData('.card-labelling-metrics', 'Etiquetagem');
        
        if(expedicao) report.push(expedicao);
        if(separacao) report.push(separacao);
        if(etiquetagem) report.push(etiquetagem);

        // Sub-métricas das Ondas
        const wavesItems = [];
        const wavesNodes = document.querySelectorAll('.wave-metrics');
        
        wavesNodes.forEach(w => {
            const tEl = w.querySelector('.title-waves');
            let wTitle = 'Onda Detalhada';
            if (tEl) wTitle = tEl.textContent.split('OOT')[0].trim();
            
            const wHasDelay = w.querySelector('.andes-badge--red') !== null;
            const wBadges = Array.from(w.querySelectorAll('.andes-badge__content')).map(b => b.textContent.trim());
            const wOot = wBadges.find(b => b.includes('OOT')) || '';
            const wDelaySpan = w.querySelector('span[id^="informative-"]');
            let wDelayMsg = wDelaySpan ? wDelaySpan.textContent.trim() : '';

            let wDetails = getKeyValueDetails(w);

            wavesItems.push({
                title: wTitle,
                status: wHasDelay ? 'DELAY' : 'ON TIME',
                oot: wOot,
                delayMsg: wDelayMsg,
                details: wDetails
            });
        });

        return { main: report, waves: wavesItems };
    }

    // ==========================================
    // RENDERIZAÇÃO DA INTERFACE (Módulo Total)
    // ==========================================
    function parseTimeStrToMins(timeStr) {
        if(!timeStr || !timeStr.includes(':')) return null;
        let parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    function buildExecutiveDigest(data) {
        const main = data.main;
        if (!main || main.length === 0) return '';
        
        // Isola as massas
        let expedicao = main.find(m => m.title.toLowerCase().includes('expedi'));
        let separacao = main.find(m => m.title.toLowerCase().includes('separ'));

        if(!expedicao) return '';

        const findVal = (arr, lbl) => {
            if(!arr) return null;
            const f = arr.find(d => d.label.toLowerCase().includes(lbl.toLowerCase()));
            return f ? f.value : null;
        };
        const parseIntVal = (str) => {
            if(!str) return 0;
            const match = str.replace(/\./g, '').match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        };

        // Extrai Valores Nominais
        const planejadosStr = findVal(expedicao.details, 'Planejados');
        const expedidosStr = findVal(expedicao.details, 'Expedidos');
        const pendentesStr = findVal(expedicao.details, 'Pendentes');
        
        const planejados = parseIntVal(planejadosStr);
        const expedidos = parseIntVal(expedidosStr);
        const pendentes = parseIntVal(pendentesStr);

        let volumeExpedidoPct = 0;
        if(planejados > 0 && expedidos > 0) volumeExpedidoPct = Math.round((expedidos/planejados)*100);
        else if (expedicao.progress && expedicao.progress !== 'N/A') volumeExpedidoPct = expedicao.progress;

        // Extrai Timings Reais
        const iniPlanStr = findVal(expedicao.details, 'Início plan');
        const iniRealStr = findVal(expedicao.details, 'Início real');
        const fimPlanStr = findVal(expedicao.details, 'Final plan');
        const fimRealStr = findVal(expedicao.details, 'Final real');
        
        let timeTxt = '';
        if(iniPlanStr && iniRealStr) {
            let pMin = parseTimeStrToMins(iniPlanStr);
            let rMin = parseTimeStrToMins(iniRealStr);
            if(pMin && rMin) {
                let diff = rMin - pMin;
                if(diff < 0) timeTxt += "🟢 O turno antecipou seu início em <b>" + Math.abs(diff) + " min</b> frente ao planejado. ";
                else if(diff > 0) timeTxt += "🔴 O turno iniciou com <b>atraso de " + diff + " min</b>. ";
            }
        }
        if(fimPlanStr && fimRealStr) {
            let pMin = parseTimeStrToMins(fimPlanStr);
            let rMin = parseTimeStrToMins(fimRealStr);
            if(pMin && rMin) {
                let diff = rMin - pMin;
                if(diff < 0) timeTxt += "🟢 O fechamento de docas foi sustentado em <b>-" + Math.abs(diff) + " min</b> do Cut-off. ";
                else if(diff > 0) timeTxt += "🔴 Confirmado estrangulamento no fim do ciclo resultando em <b>+" + diff + " min de excesso</b> no limite SLA. ";
            }
        }

        // Fila Separáveis Central
        let sepInfo = '';
        if(separacao) {
            const separaveisStr = findVal(separacao.details, 'Separáveis');
            if(separaveisStr) {
                sepInfo = "<div style='margin-top:8px;'>⚠️ <strong>Atenção ao Gargalo de Fila:</strong> Foram mapeadas <strong>" + separaveisStr + " unidades separáveis</strong> retidas aguardando buffer na esteira principal.</div>";
            }
        }

        // Gráfico Barra CSS Progressiva
        let barChartHTML = '';
        if(planejados > 0 && expedidos > 0) {
            const pctExp = (expedidos / planejados) * 100;
            const pctPen = (pendentes / planejados) * 100;
            
            barChartHTML = `
                <div style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px;">
                    <div style="font-size: 13px; color: #ccc; margin-bottom: 6px;"><strong>Gráfico de Volumetria Logística Base</strong> (Total Plano: ${planejadosStr})</div>
                    <div style="width: 100%; height: 24px; background: rgba(0,0,0,0.5); border-radius: 6px; display: flex; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
                        <div style="width: ${pctExp}%; background: linear-gradient(90deg, #00c853, #00e676); display: flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; color:#000; text-shadow: 0 1px 2px rgba(255,255,255,0.3);" title="Expedidos">
                            ${pctExp > 5 ? expedidosStr + ' (' + Math.round(pctExp) + '%)' : ''}
                        </div>
                        <div style="width: ${pctPen}%; background: linear-gradient(90deg, #ff8f00, #ffb300); display: flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; color:#000;" title="Pendentes / Delay">
                            ${pctPen > 5 ? Math.round(pctPen) + '%' : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:15px; font-size:11px; color:#aaa; margin-top:8px; justify-content:center;">
                        <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block;width:12px;height:12px;background:#00e676;border-radius:2px;"></span> Processados e Expedidos</span>
                        <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block;width:12px;height:12px;background:#ffb300;border-radius:2px;"></span> Retenção na Planta</span>
                    </div>
                </div>
            `;
        }

        // Render Final do Painel Executivo
        let html = `
            <div class="ml-ops-card ml-ops-card-full" style="background: linear-gradient(135deg, rgba(0, 158, 227, 0.08), rgba(0,0,0,0.25)); border: 1px solid rgba(0, 158, 227, 0.4); box-shadow: 0 4px 15px rgba(0,158,227,0.1);">
                <div class="ml-ops-card-header" style="border-bottom: 1px dashed rgba(0, 158, 227, 0.3);">
                    <span class="ml-ops-title" style="display:flex; gap:8px; align-items:center; color: #fff;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#009ee3" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        Resumo Analítico IA 360º
                    </span>
                </div>
                <div style="font-size: 14px; color: #ddd; line-height: 1.6; margin-top: 12px;">
                    <p style="margin:0 0 10px 0;">A operação conta com aprox. <strong>${volumeExpedidoPct}% da volumetria base já despachada</strong>. OOT Master (Global) oscila a <strong>${expedicao.progress || 'N/A'}</strong>.</p>
                    
                    ${expedicao.delayMsg ? `
                    <div style="background: rgba(213,0,0,0.15); border-left: 4px solid #ff5252; padding: 12px; border-radius: 4px; margin: 12px 0;">
                        <strong style="color: #ff5252; font-size:15px;">ALERTA CRÍTICO DE QUEBRA CRONOLÓGICA (SLA):</strong><br>
                        O rastreamento detectou impacto irreversível para <strong>${expedicao.delayMsg}</strong>.
                    </div>` : ''}

                    ${timeTxt ? `<div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 4px; margin: 12px 0;"><strong>Análise de Tempos Funcionais:</strong><br>${timeTxt}</div>` : ''}
                    
                    ${sepInfo}
                    
                    ${barChartHTML}
                </div>
            </div>
        `;

        return html;
    }

    function renderManagementModal(data) {
        const existing = document.getElementById('ml-ops-overlay');
        if (existing) existing.remove();

        const mainCardsHTML = data.main.map(item => `
            <div class="ml-ops-card">
                <div class="ml-ops-card-header">
                    <span class="ml-ops-title">${item.title}</span>
                    <span class="ml-ops-pill ${item.status === 'DELAY' ? 'red' : 'green'}">
                        ${item.status === 'DELAY' ? '🔥 Atrasado' : '✅ No Prazo'}
                    </span>
                </div>
                
                ${item.delayMsg ? `
                    <div class="ml-ops-alert-container">
                        <span class="ml-ops-alert-text">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            ${item.delayMsg}
                        </span>
                    </div>
                ` : ''}

                <div class="ml-ops-info-row" style="margin-top: 4px;">
                    <span>Métricas Master (OOT):</span>
                    <span class="ml-ops-metric-value">${item.oots.join(', ') || '-'}</span>
                </div>
                
                <!-- Grade Detalhada de Informações (Tudo Extraído) -->
                <div class="ml-ops-details-grid">
                    ${item.details.map(d => `
                        <div class="ml-ops-detail-box">
                            <span class="lbl">${d.label}</span>
                            <span class="val">${d.value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        const wavesHTML = data.waves.length > 0 ? `
            <div class="ml-ops-card ml-ops-card-full" style="background: rgba(0,0,0,0.15)">
                <div class="ml-ops-card-header" style="border:none; padding-bottom: 0;">
                    <span class="ml-ops-title" style="color: #009ee3;">Visão Abrangente por Ondas</span>
                </div>
                <div class="ml-ops-wave-list">
                    ${data.waves.map(w => `
                        <div class="ml-ops-wave-item ${w.status === 'ON TIME' ? 'ok' : ''}">
                            <div class="ml-ops-wave-header">
                                <strong style="color:#fff; font-size:16px;">${w.title}</strong>
                                ${w.delayMsg ? 
                                    `<span style="color:#ff5252; font-size:12px; font-weight:bold; display:flex; gap:4px; align-items:center;">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                        ${w.delayMsg.split('Pacotes')[0].trim()}
                                     </span>` 
                                  : `<span style="color:#00e676; font-size: 12px; font-weight:bold;">✅ Em dia</span>`
                                }
                            </div>
                            
                            <!-- OOT Master das Ondas -->
                            <div style="font-size: 13px; color:#bbb;">
                                OOT Master: <span style="color:#fff; font-weight: 600;">${w.oot || '-'}</span>
                            </div>

                            <!-- O Grid das Ondas -->
                            <div class="ml-ops-details-grid" style="margin-top: 4px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 8px;">
                                ${w.details.map(d => `
                                    <div class="ml-ops-detail-box" style="background: rgba(255,255,255,0.02)">
                                        <span class="lbl">${d.label}</span>
                                        <span class="val">${d.value}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const executiveHTML = buildExecutiveDigest(data);

        const modalHTML = `
            <div id="ml-ops-overlay" class="ml-ops-overlay">
                <div class="ml-ops-modal">
                    <div class="ml-ops-header">
                        <h2>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#009ee3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            Análise Gerencial: Dados 360º
                        </h2>
                        <button id="ml-ops-close" class="ml-ops-close">&times;</button>
                    </div>
                    <div class="ml-ops-body">
                        ${executiveHTML}
                        ${mainCardsHTML || '<div style="color:#999; grid-column:1/-1; text-align:center; padding: 30px;">Nenhum painel principal (Expedição/Separação) encontrado vista atual.</div>'}
                        ${wavesHTML}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        setTimeout(() => {
            const overlay = document.getElementById('ml-ops-overlay');
            overlay.classList.add('active');

            document.getElementById('ml-ops-close').addEventListener('click', () => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
            });
            overlay.addEventListener('click', (e) => {
                if(e.target === overlay) {
                    overlay.classList.remove('active');
                    setTimeout(() => overlay.remove(), 300);
                }
            });
        }, 50);
    }

    function initFAB() {
        if(document.getElementById('ml-ops-fab')) return;

        const fab = document.createElement('div');
        fab.id = 'ml-ops-fab';
        fab.className = 'ml-ops-fab';
        fab.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>';
        fab.title = "Gerar Relatório Executivo 360º";
        
        fab.addEventListener('click', () => {
            const metricsConfigData = scrapePageMetrics();
            console.log("[ML Ops Relatório 360] Dados Coletados:", metricsConfigData);
            renderManagementModal(metricsConfigData);
        });

        document.body.appendChild(fab);
    }

    window.addEventListener('load', () => setTimeout(initFAB, 2500));

    const stateCheck = setInterval(() => {
        if (document.readyState === 'complete') {
            clearInterval(stateCheck);
            setTimeout(initFAB, 1500); 
        }
    }, 100);

})();
