// ==UserScript==
// @name         Automador de Devoluções MeLi
// @namespace    https://debugzone.com.br/
// @version      5.3
// @description  Automação inteligente. Modo observador persistente com auto-inicialização no recarregamento da página.
// @match        https://envios.adminml.com/logistics/service-center/node/return-to-origin
// @grant        none
// ==/UserScript==

(function () {
	"use strict";

	// ==========================================
	// INJEÇÃO DE ESTILOS GLOBAIS (Design System)
	// ==========================================
	const STYLE_ID = "meli-auto-styles";
	if (!document.getElementById(STYLE_ID)) {
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = `
            :root {
                --meli-blue: #3483fa;
                --meli-blue-hover: #2968c8;
                --meli-green: #00a650;
                --meli-green-hover: #008c44;
                --meli-red: #f23d4f;
                --meli-text-main: #333333;
                --meli-text-muted: #999999;
                --meli-bg-light: #f5f5f5;
                --meli-border: #d5d5d5;
                --meli-shadow-sm: 0 2px 4px rgba(0,0,0,0.08);
                --meli-shadow-lg: 0 10px 30px rgba(0,0,0,0.15);
            }

            @keyframes meli-fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes meli-fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(12px); } }
            @keyframes meli-overlayIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(3px); } }
            @keyframes meli-overlayOut { from { opacity: 1; backdrop-filter: blur(3px); } to { opacity: 0; backdrop-filter: blur(0px); } }
            @keyframes meli-slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes meli-pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0, 166, 80, 0.4); } 50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(0, 166, 80, 0); } }

            .meli-auto * { font-family: "Proxima Nova", -apple-system, "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif; box-sizing: border-box; }
            .meli-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.55); z-index: 9999990; display: flex; align-items: center; justify-content: center; animation: meli-overlayIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; outline: none; }
            .meli-overlay.closing { animation: meli-overlayOut 0.2s ease-in forwards; }
            .meli-card { background: #fff; border-radius: 12px; box-shadow: var(--meli-shadow-lg); overflow: hidden; display: flex; flex-direction: column; animation: meli-slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
            .meli-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s ease; line-height: 1; white-space: nowrap; user-select: none; outline: none; }
            .meli-btn:active:not(:disabled) { transform: scale(0.96); }
            .meli-btn-primary { background: var(--meli-blue); color: #fff; }
            .meli-btn-primary:hover:not(:disabled) { background: var(--meli-blue-hover); box-shadow: 0 4px 10px rgba(52, 131, 250, 0.3); }
            .meli-btn-primary:disabled { background: var(--meli-border); color: #888; cursor: not-allowed; }
            .meli-btn-secondary { background: transparent; color: var(--meli-blue); }
            .meli-btn-secondary:hover { background: rgba(52, 131, 250, 0.08); }
            .meli-btn-danger-outline { background: transparent; color: var(--meli-red); border: 1px solid var(--meli-red); }
            .meli-btn-danger-outline:hover { background: rgba(242, 61, 79, 0.08); }
            .meli-btn-success { background: var(--meli-green); color: #fff; }
            .meli-btn-success:hover { background: var(--meli-green-hover); box-shadow: 0 4px 10px rgba(0, 166, 80, 0.3); }
            .meli-btn-stop { background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 6px 14px; font-size: 12px; border-radius: 6px; backdrop-filter: blur(4px); }
            .meli-btn-stop:hover { background: rgba(255,255,255,0.3); }
            .meli-hud { position: fixed; bottom: 24px; right: 24px; z-index: 9999998; background: #fff; border-radius: 12px; box-shadow: var(--meli-shadow-lg); animation: meli-fadeIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); overflow: hidden; min-width: 240px; max-width: 320px; border: 1px solid rgba(0,0,0,0.05); }
            .meli-hud.closing { animation: meli-fadeOut 0.2s ease-in forwards; }
            .meli-welcome-toast { position: fixed; top: 24px; right: 24px; z-index: 9999999; background: var(--meli-blue); color: white; border-radius: 8px; padding: 12px 20px; font-size: 14px; font-weight: 500; box-shadow: var(--meli-shadow-lg); display: flex; align-items: center; gap: 10px; animation: meli-fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
            .meli-checkbox-wrap { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px; cursor: pointer; background: var(--meli-bg-light); border: 1px solid transparent; transition: all 0.2s ease; user-select: none; }
            .meli-checkbox-wrap:hover { border-color: var(--meli-border); background: #f0f0f0; }
            .meli-checkbox-wrap.active { background: #e6f7ee; border-color: var(--meli-green); }
            .meli-checkbox-wrap input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--meli-green); cursor: pointer; margin: 0; }
            .meli-checkbox-wrap label { font-size: 14px; color: var(--meli-text-main); font-weight: 500; cursor: pointer; width: 100%; }
            .meli-file-zone { border: 2px dashed var(--meli-border); border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s ease; position: relative; background: #fafafa; }
            .meli-file-zone:hover, .meli-file-zone.dragover { border-color: var(--meli-blue); background: rgba(52,131,250,0.04); }
            .meli-file-zone input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
            .meli-file-zone .meli-file-icon { font-size: 28px; margin-bottom: 8px; display: block; color: var(--meli-text-muted); transition: transform 0.2s; }
            .meli-file-zone:hover .meli-file-icon { transform: translateY(-3px); color: var(--meli-blue); }
            .meli-file-zone .meli-file-text { font-size: 14px; color: var(--meli-text-muted); }
            .meli-file-zone .meli-file-text strong { color: var(--meli-blue); }
            .meli-textarea { width: 100%; height: 120px; padding: 12px; border: 1px solid var(--meli-border); border-radius: 8px; resize: none; font-family: "SF Mono", "Fira Code", monospace; font-size: 13px; color: var(--meli-text-main); line-height: 1.5; transition: border-color 0.2s, box-shadow 0.2s; background: #fafafa; }
            .meli-textarea:focus { outline: none; border-color: var(--meli-blue); box-shadow: 0 0 0 3px rgba(52, 131, 250, 0.15); background: #fff; }
            .meli-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }
            .meli-badge-success { background: #e6f7ee; color: var(--meli-green); }
            .meli-badge-error { background: #fce4e4; color: var(--meli-red); }
            .meli-badge-info { background: #e8f2ff; color: var(--meli-blue); }
        `;
		document.head.appendChild(style);
	}

	// ==========================================
	// VARIÁVEL GLOBAL DE ESTADO
	// ==========================================
	let observadorAtivo = false;
	let modalAberto = false;

	// ==========================================
	// INICIALIZAÇÃO NO CARREGAMENTO DA PÁGINA
	// ==========================================
	window.addEventListener("load", () => {
		// Mostra toast de boas-vindas
		if (!sessionStorage.getItem("meli_auto_toast_shown")) {
			const toast = document.createElement("div");
			toast.className = "meli-auto meli-welcome-toast";
			toast.innerHTML = `<span>🤖</span><span>Automador pronto! Pressione <strong>Alt + W</strong></span>`;
			document.body.appendChild(toast);
			sessionStorage.setItem("meli_auto_toast_shown", "true");
			setTimeout(() => fecharComAnimacao(toast), 4500);
		}

		// AUTO-START: Verifica localStorage e inicia observador se estava ativo
		const observadorSalvo = localStorage.getItem("meli_auto_observador_ativo") === "true";
		if (observadorSalvo) {
			iniciarModoObservador();
		}
	});

	// ==========================================
	// ATALHOS DE TECLADO
	// ==========================================
	document.addEventListener("keydown", function (e) {
		if (e.altKey && e.key.toLowerCase() === "w") {
			e.preventDefault();
			if (!modalAberto) abrirMenuPrincipal();
		}
		if (e.key === "Escape" && modalAberto) {
			const overlay = document.getElementById("meli-macro-menu");
			if (overlay) fecharComAnimacao(overlay, () => { modalAberto = false; });
		}
	});

	// ==========================================
	// UTILITÁRIOS DE ANIMAÇÃO
	// ==========================================
	function fecharComAnimacao(element, callback) {
		element.classList.add("closing");
		setTimeout(() => {
			if (element.parentNode) element.remove();
			if (callback) callback();
		}, 200);
	}

	// ==========================================
	// SISTEMAS DE HUD
	// ==========================================
	function criarHUD() {
		if (document.getElementById("meli-hud-progresso")) return;
		const hud = document.createElement("div");
		hud.id = "meli-hud-progresso";
		hud.className = "meli-auto meli-hud";
		hud.innerHTML = `
            <div style="padding: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 12px; color: var(--meli-text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Processando</span>
                    <span class="meli-badge meli-badge-info" id="hud-badge">0%</span>
                </div>
                <div style="font-size: 18px; color: var(--meli-text-main); font-weight: 700; margin-bottom: 12px;" id="hud-status">0 / 0</div>
                <div style="width: 100%; background: var(--meli-bg-light); height: 6px; border-radius: 3px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                    <div id="hud-barra" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--meli-blue), #5eb3ff); border-radius: 3px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
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

	function criarHUDObservador() {
		if (document.getElementById("meli-hud-observador")) return;
		const hud = document.createElement("div");
		hud.id = "meli-hud-observador";
		hud.className = "meli-auto meli-hud";
		hud.style.background = "#222";
		hud.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px;">
                <div style="width: 10px; height: 10px; background: var(--meli-green); border-radius: 50%; animation: meli-pulse 2s ease-in-out infinite; flex-shrink: 0;"></div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; color: #fff; font-weight: 600;">Observador Ativo</div>
                    <div style="font-size: 12px; color: #aaa; margin-top: 2px;">Aguardando ação manual...</div>
                </div>
                <button class="meli-btn meli-btn-stop" id="btn-parar-observador">Parar</button>
            </div>
        `;
		document.body.appendChild(hud);

		// Ação ao clicar em Parar no HUD
		document.getElementById("btn-parar-observador").onclick = () => {
			observadorAtivo = false;
			localStorage.setItem("meli_auto_observador_ativo", "false"); // ATUALIZADO: Salva que foi desligado
			fecharComAnimacao(hud);
		};
	}

	// ==========================================
	// EXPORTAÇÃO E AUDIO
	// ==========================================
	function tocarBipDuplo() {
		try {
			const ctx = new (window.AudioContext || window.webkitAudioContext)();
			function tocarBip(delay) {
				setTimeout(() => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.type = "sine";
					osc.frequency.setValueAtTime(800, ctx.currentTime);
					osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
					gain.gain.setValueAtTime(0.1, ctx.currentTime);
					gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
					osc.start();
					osc.stop(ctx.currentTime + 0.3);
				}, delay);
			}
			tocarBip(0);
			tocarBip(400);
		} catch (e) { console.warn("Áudio bloqueado pelo navegador."); }
	}

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
	// MODAL FINAL
	// ==========================================
	function mostrarModalFinal(total, sucesso, idsComErro) {
		const overlay = document.createElement("div");
		overlay.className = "meli-auto meli-overlay";
		const modal = document.createElement("div");
		modal.className = "meli-card";
		modal.style.width = "400px";

		const temErros = idsComErro.length > 0;
		const iconSvg = temErros
			? `<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ff7733" stroke-width="2.5"/><path d="M12 8v4m0 4h.01" stroke="#ff7733" stroke-width="2.5" stroke-linecap="round"/></svg>`
			: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#00a650" stroke-width="2.5"/><path d="M8 12l3 3 5-5" stroke="#00a650" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

		modal.innerHTML = `
            <div style="padding: 32px 24px 24px; text-align: center;">
                <div style="margin-bottom: 16px;">${iconSvg}</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--meli-text-main); margin-bottom: 6px;">${temErros ? "Processo concluído com ressalvas" : "Tudo certo!"}</div>
                <div style="font-size: 14px; color: var(--meli-text-muted);">${temErros ? "Alguns IDs precisaram de atenção e não foram processados." : "Todos os IDs foram processados perfeitamente."}</div>
            </div>
            <div style="display: flex; justify-content: center; gap: 24px; padding: 0 24px 24px;">
                <div style="text-align: center;"><div style="font-size: 26px; font-weight: 800; color: var(--meli-text-main);">${total}</div><div style="font-size: 12px; color: var(--meli-text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Total</div></div>
                <div style="width: 1px; background: var(--meli-border);"></div>
                <div style="text-align: center;"><div style="font-size: 26px; font-weight: 800; color: var(--meli-green);">${sucesso}</div><div style="font-size: 12px; color: var(--meli-text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Sucesso</div></div>
                <div style="width: 1px; background: var(--meli-border);"></div>
                <div style="text-align: center;"><div style="font-size: 26px; font-weight: 800; color: ${temErros ? "var(--meli-red)" : "#ccc"};">${idsComErro.length}</div><div style="font-size: 12px; color: var(--meli-text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Falhas</div></div>
            </div>
            <div style="padding: 16px 24px; display: flex; gap: 12px; border-top: 1px solid rgba(0,0,0,0.05); background: var(--meli-bg-light);">
                ${temErros ? '<button class="meli-btn meli-btn-danger-outline" id="btn-baixar-erros" style="flex:1;">Baixar erros</button>' : ""}
                <button class="meli-btn meli-btn-primary" id="btn-fechar-alerta" style="flex:1; width: 100%;">Fechar Resumo</button>
            </div>
        `;
		overlay.appendChild(modal);
		document.body.appendChild(overlay);

		document.getElementById("btn-fechar-alerta").onclick = () => fecharComAnimacao(overlay);
		if (temErros) document.getElementById("btn-baixar-erros").onclick = () => baixarErros(idsComErro);
	}

	// ==========================================
	// MENU PRINCIPAL
	// ==========================================
	function abrirMenuPrincipal() {
		if (document.getElementById("meli-macro-menu")) return;
		modalAberto = true;

		const overlay = document.createElement("div");
		overlay.id = "meli-macro-menu";
		overlay.className = "meli-auto meli-overlay";
		overlay.tabIndex = -1;

		const menu = document.createElement("div");
		menu.className = "meli-card";
		menu.style.width = "460px";

		menu.innerHTML = `
            <div style="padding: 24px 28px 20px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" stroke="var(--meli-blue)" stroke-width="2.5"/><path d="M7 12l3 3 6-6" stroke="var(--meli-blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <div>
                        <div style="font-size: 18px; font-weight: 700; color: var(--meli-text-main);">Automação de Devoluções</div>
                        <div style="font-size: 12px; color: var(--meli-text-muted); margin-top: 2px;">v5.3 · Pressione <strong>ESC</strong> para fechar</div>
                    </div>
                </div>
            </div>
            <div style="padding: 24px 28px; display: flex; flex-direction: column; gap: 20px;">
                <div class="meli-checkbox-wrap" id="wrap-observador">
                    <input type="checkbox" id="chk-modo-observador">
                    <label for="chk-modo-observador"><strong>Modo Observador</strong> — aguardar inputs manuais</label>
                </div>
                <div id="container-lista" style="transition: opacity 0.3s ease;">
                    <div style="font-size: 12px; color: var(--meli-text-muted); font-weight: 700; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Carregar IDs em lote</div>
                    <div class="meli-file-zone" id="file-zone">
                        <input type="file" id="input-arquivo-ids" accept=".txt,.csv">
                        <span class="meli-file-icon">📄</span>
                        <div class="meli-file-text">Arraste um arquivo, clique ou <strong>Cole (Ctrl+V)</strong></div>
                        <div style="font-size: 12px; color: #bbb; margin-top: 6px;">Suporta arquivos .txt, .csv ou texto copiado da área de transferência</div>
                    </div>
                </div>
                <div id="container-preview" style="display: none; flex-direction: column; gap: 10px; animation: meli-fadeIn 0.2s ease-out;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: var(--meli-text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Pré-visualização de IDs</span>
                        <span class="meli-badge meli-badge-info" id="contador-ids">0</span>
                    </div>
                    <textarea class="meli-textarea" id="textarea-ids" placeholder="Cole os IDs de devolução aqui, um por linha..."></textarea>
                </div>
            </div>
            <div style="padding: 16px 28px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid rgba(0,0,0,0.05); background: var(--meli-bg-light);">
                <button class="meli-btn meli-btn-secondary" id="btn-cancelar">Cancelar</button>
                <button class="meli-btn meli-btn-primary" id="btn-iniciar" disabled>Iniciar Automação</button>
            </div>
        `;
		overlay.appendChild(menu);
		document.body.appendChild(overlay);

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

		// Sincroniza o checkbox do menu com a variável de estado real
		chkObservador.checked = observadorAtivo || localStorage.getItem("meli_auto_observador_ativo") === "true";

		setTimeout(() => overlay.focus(), 100);
		toggleObservador(false); // Inicializa a UI do menu sem disparar a lógica de stop

		btnCancelar.onclick = () => { fecharComAnimacao(overlay, () => { modalAberto = false; }); };
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) fecharComAnimacao(overlay, () => { modalAberto = false; });
		});

		overlay.addEventListener("paste", (e) => {
			if (chkObservador.checked || document.activeElement === textareaIds) return;
			const textoColado = (e.clipboardData || window.clipboardData).getData('text');
			if (textoColado) {
				e.preventDefault();
				const conteudoAtual = textareaIds.value;
				textareaIds.value = conteudoAtual ? conteudoAtual + '\n' + textoColado : textoColado;
				validarTextarea();
			}
		});

		fileZone.addEventListener("dragover", (e) => { e.preventDefault(); fileZone.classList.add("dragover"); });
		fileZone.addEventListener("dragleave", () => fileZone.classList.remove("dragover"));
		fileZone.addEventListener("drop", (e) => {
			e.preventDefault(); fileZone.classList.remove("dragover");
			const file = e.dataTransfer.files[0];
			if (file) lerArquivo(file);
		});

		wrapObservador.addEventListener("click", (e) => {
			if (e.target.tagName !== "INPUT") chkObservador.checked = !chkObservador.checked;
			toggleObservador(true); // true indica que foi uma ação do usuário
		});
		chkObservador.addEventListener("change", () => toggleObservador(true));

		function toggleObservador(acaoDoUsuario = false) {
			const ativo = chkObservador.checked;
			wrapObservador.classList.toggle("active", ativo);

			if (acaoDoUsuario) {
				localStorage.setItem("meli_auto_observador_ativo", ativo);
			}

			if (ativo) {
				containerLista.style.opacity = "0.4";
				containerLista.style.pointerEvents = "none";
				containerPreview.style.display = "none";
				btnIniciar.disabled = false;
				if (observadorAtivo) {
					btnIniciar.innerText = "Observador já em execução";
					btnIniciar.disabled = true;
				} else {
					btnIniciar.innerText = "Iniciar Observador";
				}
				btnIniciar.classList.remove("meli-btn-primary");
				btnIniciar.classList.add("meli-btn-success");
			} else {
				// ATUALIZADO: Se o usuário desmarcou no menu, paramos o observador na hora
				if (acaoDoUsuario && observadorAtivo) {
					observadorAtivo = false;
					const hudObs = document.getElementById("meli-hud-observador");
					if (hudObs) fecharComAnimacao(hudObs);
				}

				containerLista.style.opacity = "1";
				containerLista.style.pointerEvents = "auto";
				btnIniciar.innerText = "Iniciar Automação";
				btnIniciar.classList.remove("meli-btn-success");
				btnIniciar.classList.add("meli-btn-primary");
				validarTextarea();
			}
		}

		inputArquivo.addEventListener("change", (e) => {
			const file = e.target.files[0];
			if (file) lerArquivo(file);
		});

		function lerArquivo(file) {
			const reader = new FileReader();
			reader.onload = function (evento) {
				const ids = evento.target.result.split("\n").map((l) => l.trim()).filter((l) => l !== "");
				textareaIds.value = ids.join("\n");
				validarTextarea();
			};
			reader.readAsText(file);
		}

		textareaIds.addEventListener("input", validarTextarea);

		function validarTextarea() {
			if (chkObservador.checked) { containerPreview.style.display = "none"; return; }
			const ids = textareaIds.value.split("\n").map((l) => l.trim()).filter((l) => l !== "");
			contadorIds.innerText = ids.length;
			btnIniciar.disabled = ids.length === 0;
			containerPreview.style.display = ids.length > 0 ? "flex" : "none";
		}

		btnIniciar.onclick = async () => {
			if (btnIniciar.disabled) return;
			fecharComAnimacao(overlay, async () => {
				modalAberto = false;
				if (chkObservador.checked) {
					iniciarModoObservador();
				} else {
					const ids = textareaIds.value.split("\n").map((l) => l.trim()).filter((l) => l !== "");
					await processarIds(ids);
				}
			});
		};
	}

	// ==========================================
	// UTILITÁRIOS E INTELIGÊNCIA DA PÁGINA
	// ==========================================
	function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

	function encontrarBotaoPorTexto(textoDesejado) {
		const botoes = document.querySelectorAll("button.andes-button");
		for (let btn of botoes) {
			const texto = btn.textContent || btn.innerText;
			if (texto && texto.trim().toLowerCase() === textoDesejado.toLowerCase() && !btn.disabled) return btn;
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
		while (document.querySelector(seletor)) { await sleep(300); }
	}

	// ==========================================
	// MODO OBSERVADOR E LOOP
	// ==========================================
	async function iniciarModoObservador() {
		if (observadorAtivo) return;
		observadorAtivo = true;
		criarHUDObservador();

		console.log("[Script] Modo Observador Iniciado. Aguardando interações...");

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
				console.log("[Script] Tela de sugestão detectada no modo manual.");
				const btn = encontrarBotaoPorTexto("Confirmar");
				if (btn) {
					btn.click();
					await aguardarAparecer(TELA_SUCESSO, 3000);
				}
			} else if (selecao) {
				console.log("[Script] Tela fora de cobertura detectada no modo manual.");
				const labelForaCobertura = document.querySelector('label[for="outside_coverage"]');
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

			let input = document.activeElement;
			if (!input || input.tagName !== "INPUT") {
				input = document.querySelector('input[type="text"]') || document.querySelector("input");
			}

			if (input) {
				input.focus();
				const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
				if (nativeSetter && nativeSetter.set) nativeSetter.set.call(input, currentId);
				else input.value = currentId;

				input.dispatchEvent(new Event("input", { bubbles: true }));
				input.dispatchEvent(new Event("change", { bubbles: true }));

				const pasteEvent = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: new DataTransfer() });
				pasteEvent.clipboardData.setData("text/plain", currentId);
				input.dispatchEvent(pasteEvent);
				input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
			}

			let estadoAtual = null;
			let tentativas = 0;

			while (tentativas < 40) {
				if (document.querySelector(TELA_SUCESSO)) { estadoAtual = "SUCESSO"; break; }
				if (document.querySelector(TELA_SUGESTAO)) { estadoAtual = "SUGESTAO"; break; }
				if (document.querySelector(INPUT_FORA_COBERTURA)) { estadoAtual = "SELECAO"; break; }
				await sleep(100);
				tentativas++;
			}

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
				const labelForaCobertura = document.querySelector('label[for="outside_coverage"]');
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

			if (sucessoNoPacote) {
				processadosComSucesso++;
				await sleep(500);
			} else {
				console.warn(`[Script] ID ${currentId} não confirmou corretamente.`);
				idsComErro.push(currentId);
				await sleep(2500);
			}
		}

		removerHUD();
		tocarBipDuplo();
		mostrarModalFinal(ids.length, processadosComSucesso, idsComErro);
	}
})();
