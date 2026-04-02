// ==UserScript==
// @name         Automador de Devoluções MeLi (Completo v5.0)
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Automação inteligente com UI nativa MeLi — HUD discreto, animações suaves, dark overlay, toast notifications.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
	"use strict";

	// ==========================================
	// INJEÇÃO DE ESTILOS GLOBAIS (MeLi Design System)
	// ==========================================
	const STYLE_ID = "meli-auto-styles";
	if (!document.getElementById(STYLE_ID)) {
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = `
            @keyframes meli-fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes meli-fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(8px); }
            }
            @keyframes meli-overlayIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes meli-overlayOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes meli-slideUp {
                from { opacity: 0; transform: translateY(24px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes meli-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            @keyframes meli-progressIndeterminate {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
            }
            @keyframes meli-spinnerRotate {
                to { transform: rotate(360deg); }
            }

            .meli-auto * {
                font-family: "Proxima Nova", -apple-system, "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif;
                box-sizing: border-box;
            }

            /* Overlay */
            .meli-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.48);
                z-index: 9999990; display: flex; align-items: center; justify-content: center;
                animation: meli-overlayIn 0.2s ease-out;
                backdrop-filter: blur(2px);
            }
            .meli-overlay.closing {
                animation: meli-overlayOut 0.18s ease-in forwards;
            }

            /* Card / Modal base */
            .meli-card {
                background: #fff; border-radius: 8px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12);
                overflow: hidden; display: flex; flex-direction: column;
                animation: meli-slideUp 0.25s ease-out;
            }

            /* Botões */
            .meli-btn {
                display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;
                border: none; cursor: pointer; transition: all 0.15s ease;
                line-height: 1; white-space: nowrap; user-select: none;
            }
            .meli-btn:active { transform: scale(0.97); }
            .meli-btn-primary {
                background: #3483fa; color: #fff;
            }
            .meli-btn-primary:hover { background: #2968c8; }
            .meli-btn-primary:disabled {
                background: #d2d2d2; color: #999; cursor: not-allowed; transform: none;
            }
            .meli-btn-secondary {
                background: transparent; color: #3483fa;
            }
            .meli-btn-secondary:hover { background: rgba(52, 131, 250, 0.06); }
            .meli-btn-danger-outline {
                background: transparent; color: #f23d4f; border: 1px solid #f23d4f;
            }
            .meli-btn-danger-outline:hover { background: rgba(242, 61, 79, 0.06); }
            .meli-btn-success {
                background: #00a650; color: #fff;
            }
            .meli-btn-success:hover { background: #008c44; }
            .meli-btn-stop {
                background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3);
                padding: 6px 14px; font-size: 12px; border-radius: 4px;
            }
            .meli-btn-stop:hover { background: rgba(255,255,255,0.25); }

            /* HUD Toast (canto inferior direito) */
            .meli-hud {
                position: fixed; bottom: 20px; right: 20px; z-index: 9999998;
                background: #fff; border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.10);
                animation: meli-fadeIn 0.25s ease-out;
                overflow: hidden; min-width: 220px; max-width: 300px;
            }
            .meli-hud.closing {
                animation: meli-fadeOut 0.18s ease-in forwards;
            }

            /* Checkbox custom */
            .meli-checkbox-wrap {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 12px; border-radius: 6px; cursor: pointer;
                background: #f5f5f5; border: 1px solid transparent;
                transition: all 0.15s ease; user-select: none;
            }
            .meli-checkbox-wrap:hover { border-color: #d5d5d5; }
            .meli-checkbox-wrap.active {
                background: #e6f7ee; border-color: #00a650;
            }
            .meli-checkbox-wrap input[type="checkbox"] {
                width: 16px; height: 16px; accent-color: #00a650; cursor: pointer; margin: 0;
            }
            .meli-checkbox-wrap label {
                font-size: 13px; color: #333; font-weight: 500; cursor: pointer;
            }

            /* Input file estilizado */
            .meli-file-zone {
                border: 2px dashed #d5d5d5; border-radius: 6px; padding: 20px;
                text-align: center; cursor: pointer; transition: all 0.15s ease;
                position: relative;
            }
            .meli-file-zone:hover, .meli-file-zone.dragover {
                border-color: #3483fa; background: rgba(52,131,250,0.03);
            }
            .meli-file-zone input[type="file"] {
                position: absolute; inset: 0; opacity: 0; cursor: pointer;
            }
            .meli-file-zone .meli-file-icon {
                font-size: 24px; margin-bottom: 6px; display: block; color: #999;
            }
            .meli-file-zone .meli-file-text {
                font-size: 13px; color: #999;
            }
            .meli-file-zone .meli-file-text strong { color: #3483fa; }

            /* Textarea */
            .meli-textarea {
                width: 100%; height: 110px; padding: 10px 12px; border: 1px solid #d5d5d5;
                border-radius: 6px; resize: none; font-family: "SF Mono", "Fira Code", monospace;
                font-size: 12px; color: #333; line-height: 1.5;
                transition: border-color 0.15s;
            }
            .meli-textarea:focus { outline: none; border-color: #3483fa; }

            /* Spinner */
            .meli-spinner {
                width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
                border-top-color: #fff; border-radius: 50%;
                animation: meli-spinnerRotate 0.6s linear infinite;
                display: inline-block;
            }

            /* Tags / badges */
            .meli-badge {
                display: inline-flex; align-items: center; gap: 4px;
                padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600;
            }
            .meli-badge-success { background: #e6f7ee; color: #00a650; }
            .meli-badge-error { background: #fce4e4; color: #f23d4f; }
            .meli-badge-info { background: #e8f2ff; color: #3483fa; }
        `;
		document.head.appendChild(style);
	}

	// ==========================================
	// ATALHO DE TECLADO Alt + W
	// ==========================================
	document.addEventListener("keydown", function (e) {
		if (e.altKey && e.key.toLowerCase() === "w") {
			e.preventDefault();
			abrirMenuPrincipal();
		}
	});

	// ==========================================
	// UTILITÁRIOS DE ANIMAÇÃO
	// ==========================================
	function fecharComAnimacao(element, callback) {
		element.classList.add("closing");
		setTimeout(() => {
			element.remove();
			if (callback) callback();
		}, 180);
	}

	// ==========================================
	// SISTEMA DE HUD — PROGRESSO (Toast discreto)
	// ==========================================
	function criarHUD() {
		if (document.getElementById("meli-hud-progresso")) return;
		const hud = document.createElement("div");
		hud.id = "meli-hud-progresso";
		hud.className = "meli-auto meli-hud";
		hud.innerHTML = `
            <div style="padding: 14px 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span style="font-size: 11px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Processando</span>
                    <span class="meli-badge meli-badge-info" id="hud-badge">0%</span>
                </div>
                <div style="font-size: 15px; color: #333; font-weight: 600; margin-bottom: 10px;" id="hud-status">0 / 0</div>
                <div style="width: 100%; background: #eee; height: 4px; border-radius: 2px; overflow: hidden;">
                    <div id="hud-barra" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3483fa, #2968c8); border-radius: 2px; transition: width 0.4s ease-out;"></div>
                </div>
            </div>
        `;
		document.body.appendChild(hud);
	}

	function atualizarHUD(atual, total) {
		const status = document.getElementById("hud-status");
		const barra = document.getElementById("hud-barra");
		const badge = document.getElementById("hud-badge");
		if (status && barra) {
			const pct = Math.round((atual / total) * 100);
			status.innerText = `${atual} / ${total}`;
			barra.style.width = `${pct}%`;
			if (badge) badge.innerText = `${pct}%`;
		}
	}

	function removerHUD() {
		const hud = document.getElementById("meli-hud-progresso");
		if (hud) fecharComAnimacao(hud);
	}

	// ==========================================
	// HUD MODO OBSERVADOR
	// ==========================================
	let observadorAtivo = false;

	function criarHUDObservador() {
		if (document.getElementById("meli-hud-observador")) return;
		const hud = document.createElement("div");
		hud.id = "meli-hud-observador";
		hud.className = "meli-auto meli-hud";
		hud.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px;">
                <div style="width: 8px; height: 8px; background: #00a650; border-radius: 50%; animation: meli-pulse 1.5s ease-in-out infinite; flex-shrink: 0;"></div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; color: #00a650; font-weight: 600;">Observador Ativo</div>
                    <div style="font-size: 11px; color: #999; margin-top: 1px;">Aguardando inputs manuais</div>
                </div>
                <button class="meli-btn meli-btn-stop" id="btn-parar-observador">Parar</button>
            </div>
        `;
		document.body.appendChild(hud);

		document.getElementById("btn-parar-observador").onclick = () => {
			observadorAtivo = false;
			fecharComAnimacao(hud);
		};
	}

	// ==========================================
	// AVISO SONORO
	// ==========================================
	function tocarBipDuplo() {
		try {
			const ctx = new (
				window.AudioContext || window.webkitAudioContext
			)();
			function tocarBip(delay) {
				setTimeout(() => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.type = "sine";
					osc.frequency.setValueAtTime(800, ctx.currentTime);
					osc.frequency.exponentialRampToValueAtTime(
						400,
						ctx.currentTime + 0.3,
					);
					gain.gain.setValueAtTime(0.1, ctx.currentTime);
					gain.gain.exponentialRampToValueAtTime(
						0.01,
						ctx.currentTime + 0.3,
					);
					osc.start();
					osc.stop(ctx.currentTime + 0.3);
				}, delay);
			}
			tocarBip(0);
			tocarBip(400);
		} catch (e) {
			console.warn("Áudio bloqueado pelo navegador.");
		}
	}

	// ==========================================
	// EXPORTAÇÃO DE ERROS
	// ==========================================
	function baixarErros(idsArray) {
		const blob = new Blob([idsArray.join("\n")], { type: "text/plain" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ids_com_erro_${new Date().getTime()}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}

	// ==========================================
	// MODAL FINAL (RESULTADO)
	// ==========================================
	function mostrarModalFinal(total, sucesso, idsComErro) {
		const overlay = document.createElement("div");
		overlay.className = "meli-auto meli-overlay";

		const modal = document.createElement("div");
		modal.className = "meli-card";
		modal.style.width = "380px";

		const temErros = idsComErro.length > 0;
		const iconSvg = temErros
			? `<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ff7733" stroke-width="2"/><path d="M12 8v4m0 4h.01" stroke="#ff7733" stroke-width="2" stroke-linecap="round"/></svg>`
			: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#00a650" stroke-width="2"/><path d="M8 12l3 3 5-5" stroke="#00a650" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

		modal.innerHTML = `
            <div style="padding: 28px 24px 20px; text-align: center;">
                <div style="margin-bottom: 12px;">${iconSvg}</div>
                <div style="font-size: 17px; font-weight: 600; color: #333; margin-bottom: 4px;">
                    ${temErros ? "Processo concluído com ressalvas" : "Tudo certo!"}
                </div>
                <div style="font-size: 13px; color: #999;">
                    ${temErros ? "Alguns IDs não foram processados" : "Todos os IDs foram processados com sucesso"}
                </div>
            </div>
            <div style="display: flex; justify-content: center; gap: 20px; padding: 0 24px 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 22px; font-weight: 700; color: #333;">${total}</div>
                    <div style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.3px;">Total</div>
                </div>
                <div style="width: 1px; background: #eee;"></div>
                <div style="text-align: center;">
                    <div style="font-size: 22px; font-weight: 700; color: #00a650;">${sucesso}</div>
                    <div style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.3px;">Sucesso</div>
                </div>
                <div style="width: 1px; background: #eee;"></div>
                <div style="text-align: center;">
                    <div style="font-size: 22px; font-weight: 700; color: ${temErros ? "#f23d4f" : "#ccc"};">${idsComErro.length}</div>
                    <div style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.3px;">Falhas</div>
                </div>
            </div>
            <div style="padding: 14px 20px; display: flex; gap: 8px; border-top: 1px solid #f0f0f0; background: #fafafa;">
                ${temErros ? '<button class="meli-btn meli-btn-danger-outline" id="btn-baixar-erros" style="flex:1;">Baixar erros</button>' : ""}
                <button class="meli-btn meli-btn-primary" id="btn-fechar-alerta" style="flex:1;">Fechar</button>
            </div>
        `;

		overlay.appendChild(modal);
		document.body.appendChild(overlay);

		document.getElementById("btn-fechar-alerta").onclick = () =>
			fecharComAnimacao(overlay);
		if (temErros) {
			document.getElementById("btn-baixar-erros").onclick = () =>
				baixarErros(idsComErro);
		}
	}

	// ==========================================
	// MENU PRINCIPAL
	// ==========================================
	function abrirMenuPrincipal() {
		if (document.getElementById("meli-macro-menu")) return;

		const overlay = document.createElement("div");
		overlay.id = "meli-macro-menu";
		overlay.className = "meli-auto meli-overlay";

		const menu = document.createElement("div");
		menu.className = "meli-card";
		menu.style.width = "420px";

		menu.innerHTML = `
            <div style="padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#3483fa" stroke-width="2"/>
                        <path d="M8 12l3 3 5-5" stroke="#3483fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div>
                        <div style="font-size: 16px; font-weight: 600; color: #333;">Automação de Devoluções</div>
                        <div style="font-size: 11px; color: #bbb; margin-top: 1px;">v5.0 · Alt+W para abrir</div>
                    </div>
                </div>
            </div>

            <div style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;">

                <div class="meli-checkbox-wrap" id="wrap-observador">
                    <input type="checkbox" id="chk-modo-observador">
                    <label for="chk-modo-observador">Modo Observador — aguardar inputs manuais</label>
                </div>

                <div id="container-lista" style="transition: opacity 0.2s ease;">
                    <div style="font-size: 12px; color: #999; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.3px;">Carregar IDs</div>
                    <div class="meli-file-zone" id="file-zone">
                        <input type="file" id="input-arquivo-ids" accept=".txt,.csv">
                        <span class="meli-file-icon">📄</span>
                        <div class="meli-file-text">Arraste um arquivo ou <strong>clique aqui</strong></div>
                        <div style="font-size: 11px; color: #ccc; margin-top: 4px;">.txt ou .csv — um ID por linha</div>
                    </div>
                </div>

                <div id="container-preview" style="display: none; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">IDs carregados</span>
                        <span class="meli-badge meli-badge-info" id="contador-ids">0</span>
                    </div>
                    <textarea class="meli-textarea" id="textarea-ids" placeholder="Cole os IDs aqui, um por linha..."></textarea>
                </div>
            </div>

            <div style="padding: 14px 20px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #f0f0f0; background: #fafafa;">
                <button class="meli-btn meli-btn-secondary" id="btn-cancelar">Cancelar</button>
                <button class="meli-btn meli-btn-primary" id="btn-iniciar" disabled>Iniciar</button>
            </div>
        `;

		overlay.appendChild(menu);
		document.body.appendChild(overlay);

		// --- Referências ---
		const inputArquivo = document.getElementById("input-arquivo-ids");
		const fileZone = document.getElementById("file-zone");
		const containerPreview = document.getElementById("container-preview");
		const textareaIds = document.getElementById("textarea-ids");
		const contadorIds = document.getElementById("contador-ids");
		const btnIniciar = document.getElementById("btn-iniciar");
		const btnCancelar = document.getElementById("btn-cancelar");
		const chkObservador = document.getElementById("chk-modo-observador");
		const wrapObservador = document.getElementById("wrap-observador");
		const containerLista = document.getElementById("container-lista");

		// --- Fechar modal ---
		btnCancelar.onclick = () => fecharComAnimacao(overlay);
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) fecharComAnimacao(overlay);
		});

		// --- Drag & Drop visual ---
		fileZone.addEventListener("dragover", (e) => {
			e.preventDefault();
			fileZone.classList.add("dragover");
		});
		fileZone.addEventListener("dragleave", () =>
			fileZone.classList.remove("dragover"),
		);
		fileZone.addEventListener("drop", (e) => {
			e.preventDefault();
			fileZone.classList.remove("dragover");
			const file = e.dataTransfer.files[0];
			if (file) lerArquivo(file);
		});

		// --- Checkbox Modo Observador ---
		wrapObservador.addEventListener("click", (e) => {
			if (e.target.tagName !== "INPUT")
				chkObservador.checked = !chkObservador.checked;
			toggleObservador();
		});
		chkObservador.addEventListener("change", toggleObservador);

		function toggleObservador() {
			const ativo = chkObservador.checked;
			wrapObservador.classList.toggle("active", ativo);

			if (ativo) {
				containerLista.style.opacity = "0.35";
				containerLista.style.pointerEvents = "none";
				containerPreview.style.display = "none";
				btnIniciar.disabled = false;
				btnIniciar.innerText = "Iniciar Observador";
				btnIniciar.classList.remove("meli-btn-primary");
				btnIniciar.classList.add("meli-btn-success");
			} else {
				containerLista.style.opacity = "1";
				containerLista.style.pointerEvents = "auto";
				btnIniciar.innerText = "Iniciar";
				btnIniciar.classList.remove("meli-btn-success");
				btnIniciar.classList.add("meli-btn-primary");
				validarTextarea();
			}
		}

		// --- Input Arquivo ---
		inputArquivo.addEventListener("change", (e) => {
			const file = e.target.files[0];
			if (file) lerArquivo(file);
		});

		function lerArquivo(file) {
			const reader = new FileReader();
			reader.onload = function (evento) {
				const ids = evento.target.result
					.split("\n")
					.map((l) => l.trim())
					.filter((l) => l !== "");
				textareaIds.value = ids.join("\n");
				validarTextarea();
			};
			reader.readAsText(file);
		}

		// --- Validação do textarea ---
		textareaIds.addEventListener("input", validarTextarea);

		function validarTextarea() {
			if (chkObservador.checked) return;
			const ids = textareaIds.value
				.split("\n")
				.map((l) => l.trim())
				.filter((l) => l !== "");
			contadorIds.innerText = ids.length;
			containerPreview.style.display = "flex";
			btnIniciar.disabled = ids.length === 0;
		}

		// --- Botão Iniciar ---
		btnIniciar.onclick = async () => {
			if (btnIniciar.disabled) return;
			fecharComAnimacao(overlay, async () => {
				if (chkObservador.checked) {
					iniciarModoObservador();
				} else {
					const ids = textareaIds.value
						.split("\n")
						.map((l) => l.trim())
						.filter((l) => l !== "");
					await processarIds(ids);
				}
			});
		};
	}

	// ==========================================
	// UTILITÁRIOS E INTELIGÊNCIA DA PÁGINA
	// ==========================================
	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function encontrarBotaoPorTexto(textoDesejado) {
		const botoes = document.querySelectorAll("button.andes-button");
		for (let btn of botoes) {
			const texto = btn.textContent || btn.innerText;
			if (
				texto &&
				texto.trim().toLowerCase() === textoDesejado.toLowerCase() &&
				!btn.disabled
			) {
				return btn;
			}
		}
		return null;
	}

	async function aguardarAparecer(seletor, timeoutMs = 5000) {
		const start = Date.now();
		while (Date.now() - start < timeoutMs) {
			if (document.querySelector(seletor)) return true;
			await sleep(100);
		}
		return false;
	}

	async function aguardarDesaparecer(seletor) {
		while (document.querySelector(seletor)) {
			await sleep(300);
		}
	}

	// ==========================================
	// MODO OBSERVADOR (IDs Manuais)
	// ==========================================
	async function iniciarModoObservador() {
		if (observadorAtivo) return;
		observadorAtivo = true;
		criarHUDObservador();

		console.log(
			"[Script] Modo Observador Iniciado. Aguardando interações...",
		);

		const TELA_SUCESSO = ".tetris-feedback-screen__container--positive";
		const TELA_SUGESTAO = ".tetris-feedback-screen__container--caution";
		const INPUT_FORA_COBERTURA = "input#outside_coverage";

		while (observadorAtivo) {
			await sleep(800);
			if (!observadorAtivo) break;

			if (document.querySelector(TELA_SUCESSO)) continue;

			const sugestao = document.querySelector(TELA_SUGESTAO);
			const selecao = document.querySelector(INPUT_FORA_COBERTURA);

			if (sugestao) {
				console.log(
					"[Script] Tela de sugestão detectada no modo manual.",
				);
				const btn = encontrarBotaoPorTexto("Confirmar");
				if (btn) {
					btn.click();
					await aguardarAparecer(TELA_SUCESSO, 3000);
				}
			} else if (selecao) {
				console.log(
					"[Script] Tela fora de cobertura detectada no modo manual.",
				);
				const labelForaCobertura = document.querySelector(
					'label[for="outside_coverage"]',
				);
				if (labelForaCobertura) labelForaCobertura.click();
				else selecao.click();

				await sleep(200);
				const btnConfirma = encontrarBotaoPorTexto("Confirmar");
				if (btnConfirma) {
					btnConfirma.click();
					await aguardarAparecer(TELA_SUCESSO, 3000);
				}
			}
		}
		console.log("[Script] Modo Observador Encerrado.");
	}

	// ==========================================
	// LÓGICA PRINCIPAL DO LOOP (MÚLTIPLOS IDs)
	// ==========================================
	async function processarIds(ids) {
		const TELA_SUCESSO = ".tetris-feedback-screen__container--positive";
		const TELA_SUGESTAO = ".tetris-feedback-screen__container--caution";
		const INPUT_FORA_COBERTURA = "input#outside_coverage";

		let processadosComSucesso = 0;
		let idsComErro = [];

		criarHUD();

		for (let i = 0; i < ids.length; i++) {
			const currentId = ids[i];
			atualizarHUD(i + 1, ids.length);
			console.log(`[Script] === Processando ID: ${currentId} ===`);

			// --- 1. COLAR ID ---
			let input = document.activeElement;
			if (!input || input.tagName !== "INPUT") {
				input =
					document.querySelector('input[type="text"]') ||
					document.querySelector("input");
			}

			if (input) {
				input.focus();
				const nativeSetter = Object.getOwnPropertyDescriptor(
					window.HTMLInputElement.prototype,
					"value",
				);
				if (nativeSetter && nativeSetter.set)
					nativeSetter.set.call(input, currentId);
				else input.value = currentId;

				input.dispatchEvent(new Event("input", { bubbles: true }));
				input.dispatchEvent(new Event("change", { bubbles: true }));

				const pasteEvent = new ClipboardEvent("paste", {
					bubbles: true,
					cancelable: true,
					clipboardData: new DataTransfer(),
				});
				pasteEvent.clipboardData.setData("text/plain", currentId);
				input.dispatchEvent(pasteEvent);
				input.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "Enter",
						keyCode: 13,
						bubbles: true,
					}),
				);
			}

			// --- 2. VERIFICAR TELA ---
			let estadoAtual = null;
			let tentativas = 0;

			while (tentativas < 40) {
				if (document.querySelector(TELA_SUCESSO)) {
					estadoAtual = "SUCESSO";
					break;
				}
				if (document.querySelector(TELA_SUGESTAO)) {
					estadoAtual = "SUGESTAO";
					break;
				}
				if (document.querySelector(INPUT_FORA_COBERTURA)) {
					estadoAtual = "SELECAO";
					break;
				}
				await sleep(100);
				tentativas++;
			}

			// --- 3. AGIR CONFORME A TELA ---
			let sucessoNoPacote = false;

			if (estadoAtual === "SUGESTAO") {
				const btn = encontrarBotaoPorTexto("Confirmar");
				if (btn) {
					btn.click();
					if (await aguardarAparecer(TELA_SUCESSO, 3000)) {
						await aguardarDesaparecer(TELA_SUCESSO);
						sucessoNoPacote = true;
					}
				}
			} else if (estadoAtual === "SELECAO") {
				const labelForaCobertura = document.querySelector(
					'label[for="outside_coverage"]',
				);
				if (labelForaCobertura) labelForaCobertura.click();
				else document.querySelector(INPUT_FORA_COBERTURA).click();

				let btnConfirma = null;
				for (let k = 0; k < 20; k++) {
					btnConfirma = encontrarBotaoPorTexto("Confirmar");
					if (btnConfirma) break;
					await sleep(100);
				}

				if (btnConfirma) {
					btnConfirma.click();
					if (await aguardarAparecer(TELA_SUCESSO, 3000)) {
						await aguardarDesaparecer(TELA_SUCESSO);
						sucessoNoPacote = true;
					}
				}
			} else if (estadoAtual === "SUCESSO") {
				await aguardarDesaparecer(TELA_SUCESSO);
				sucessoNoPacote = true;
			}

			// --- 4. TRATAMENTO DE ERROS NO LOTE ---
			if (sucessoNoPacote) {
				processadosComSucesso++;
				await sleep(500);
			} else {
				console.warn(
					`[Script] ID ${currentId} não confirmou corretamente.`,
				);
				idsComErro.push(currentId);
				await sleep(2500);
			}
		}

		// Finaliza processo
		removerHUD();
		tocarBipDuplo();
		mostrarModalFinal(ids.length, processadosComSucesso, idsComErro);
	}
})();
