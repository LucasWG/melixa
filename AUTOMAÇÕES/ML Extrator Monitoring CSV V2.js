// ==UserScript==
// @name         ML Extrator: Monitoring CSV
// @namespace    debugzone.com.br
// @version      1.2.0
// @description  Automação de extração de rotas com filtro dinâmico, paginação inteligente, deduplicação e toasts estilo ML.
// @author       LucasWG
// @match        https://envios.adminml.com/logistics/monitoring-distribution*
// @run-at       document-idle
// @grant        none
// @connect      gist.githubusercontent.com
// @updateURL    https://gist.github.com/LucasWG/c18c3baaa09139c638dc12b0f2f1f873/raw/ml_extrator_monitoring.user.js
// @downloadURL  https://gist.github.com/LucasWG/c18c3baaa09139c638dc12b0f2f1f873/raw/ml_extrator_monitoring.user.js
// ==/UserScript==

(function () {
	"use strict";

	console.info(
		"%c[Extrator de Rotas] Inicializado. Use ALT+L para abrir o painel.",
		"color: #3483FA; font-weight: bold; font-size: 14px;",
	);

	let isScraping = false;
	let allExtractedData = [];
	let currentPage = 1;

	// ==========================================
	// 1. TOAST SYSTEM — ESTILO MERCADO LIVRE
	// ==========================================
	function injectToastStyles() {
		if (document.getElementById("ml-extrator-toast-styles")) return;
		const style = document.createElement("style");
		style.id = "ml-extrator-toast-styles";
		style.textContent = `
			#ml-toast-container {
				position: fixed;
				bottom: 24px;
				right: 24px;
				z-index: 99999999;
				display: flex;
				flex-direction: column-reverse;
				gap: 10px;
				pointer-events: none;
			}
			.ml-toast {
				pointer-events: auto;
				display: flex;
				align-items: flex-start;
				gap: 12px;
				min-width: 320px;
				max-width: 420px;
				padding: 14px 18px;
				border-radius: 8px;
				background: #FFFFFF;
				box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08);
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Proxima Nova", sans-serif;
				transform: translateX(120%);
				opacity: 0;
				transition: transform 0.35s cubic-bezier(0.21,1.02,0.73,1), opacity 0.35s ease;
				position: relative;
				overflow: hidden;
			}
			.ml-toast.ml-toast--visible { transform: translateX(0); opacity: 1; }
			.ml-toast.ml-toast--exit { transform: translateX(120%); opacity: 0; }
			.ml-toast__icon {
				flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
				display: flex; align-items: center; justify-content: center;
				margin-top: 1px; font-size: 12px; font-weight: 700; color: #FFF;
			}
			.ml-toast__icon--success { background: #00A650; }
			.ml-toast__icon--error   { background: #F23D4F; }
			.ml-toast__icon--warning { background: #FF7733; }
			.ml-toast__icon--info    { background: #3483FA; }
			.ml-toast__body { flex: 1; min-width: 0; }
			.ml-toast__title { font-size: 14px; font-weight: 600; color: #333; margin: 0 0 2px; line-height: 1.3; }
			.ml-toast__message { font-size: 13px; font-weight: 400; color: #666; margin: 0; line-height: 1.4; }
			.ml-toast__close {
				flex-shrink: 0; background: none; border: none; cursor: pointer;
				color: #AAA; font-size: 18px; line-height: 1; padding: 0 0 0 8px; transition: color 0.2s;
			}
			.ml-toast__close:hover { color: #333; }
			.ml-toast__bar {
				position: absolute; bottom: 0; left: 0; height: 3px;
				border-radius: 0 0 8px 8px; transition: width linear;
			}
			.ml-toast__bar--success { background: #00A650; }
			.ml-toast__bar--error   { background: #F23D4F; }
			.ml-toast__bar--warning { background: #FF7733; }
			.ml-toast__bar--info    { background: #3483FA; }
		`;
		document.head.appendChild(style);
	}

	function getToastContainer() {
		let c = document.getElementById("ml-toast-container");
		if (!c) {
			c = document.createElement("div");
			c.id = "ml-toast-container";
			document.body.appendChild(c);
		}
		return c;
	}

	const TOAST_ICONS = { success: "✓", error: "✕", warning: "!", info: "i" };

	function showToast(type = "info", title = "", message = "", duration = 5000) {
		injectToastStyles();
		const container = getToastContainer();
		const toast = document.createElement("div");
		toast.className = "ml-toast";
		toast.innerHTML = `
			<span class="ml-toast__icon ml-toast__icon--${type}">${TOAST_ICONS[type] || "i"}</span>
			<div class="ml-toast__body">
				<p class="ml-toast__title">${title}</p>
				${message ? `<p class="ml-toast__message">${message}</p>` : ""}
			</div>
			<button class="ml-toast__close" title="Fechar">&times;</button>
			${duration > 0 ? `<div class="ml-toast__bar ml-toast__bar--${type}" style="width:100%;"></div>` : ""}
		`;
		container.appendChild(toast);
		requestAnimationFrame(() => toast.classList.add("ml-toast--visible"));
		if (duration > 0) {
			const bar = toast.querySelector(".ml-toast__bar");
			if (bar) {
				bar.style.transitionDuration = `${duration}ms`;
				requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.width = "0%")));
			}
		}
		const dismiss = () => {
			toast.classList.remove("ml-toast--visible");
			toast.classList.add("ml-toast--exit");
			setTimeout(() => toast.remove(), 400);
		};
		toast.querySelector(".ml-toast__close").addEventListener("click", dismiss);
		if (duration > 0) setTimeout(dismiss, duration);
	}

	// ==========================================
	// 2. INTERFACE: MODAL (UX)
	// ==========================================
	const modalId = "ml-extrator-modal";

	function initUI() {
		if (!document.getElementById(modalId)) criarModal();
		document.addEventListener("keydown", (e) => {
			if (e.altKey && e.key.toLowerCase() === "l") {
				e.preventDefault();
				toggleModal();
			}
		});
	}

	function criarModal() {
		const overlay = document.createElement("div");
		overlay.id = modalId;
		overlay.style.cssText =
			"display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:9999999;align-items:center;justify-content:center;backdrop-filter:blur(2px);transition:opacity 0.3s;";

		const card = document.createElement("div");
		card.style.cssText =
			"background:#fff;border-radius:12px;padding:28px 32px;width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);transform:scale(0.95);transition:transform 0.3s ease;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Proxima Nova',sans-serif;";

		card.innerHTML = `
			<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
				<h2 style="margin:0;font-size:18px;color:#333;font-weight:700;">
					<span style="color:#3483FA;">⚡</span> Extrator de Rotas
				</h2>
				<span style="font-size:11px;color:#999;background:#F5F5F5;padding:3px 8px;border-radius:4px;">v1.2.0</span>
			</div>
			<div style="margin-bottom:18px;">
				<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;color:#333;">
					<input type="checkbox" id="ml-filter-toggle" checked style="width:16px;height:16px;accent-color:#3483FA;cursor:pointer;">
					Filtrar por transportadora
				</label>
			</div>
			<div style="margin-bottom:22px;">
				<input type="text" id="ml-transportadora-input" placeholder="Nome da transportadora..." value="Kangu Logistics"
					style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #DDD;border-radius:6px;font-size:14px;outline:none;transition:border-color 0.2s;font-family:inherit;"
					onfocus="this.style.borderColor='#3483FA'" onblur="this.style.borderColor='#DDD'">
			</div>
			<div style="display:flex;gap:10px;">
				<button onclick="document.getElementById('${modalId}').style.display='none'"
					style="flex:1;padding:11px;border:1.5px solid #DDD;border-radius:6px;background:#fff;color:#333;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;font-family:inherit;"
					onmouseover="this.style.background='#F5F5F5'" onmouseout="this.style.background='#fff'">
					Cancelar
				</button>
				<button id="ml-btn-iniciar"
					style="flex:1;padding:11px;border:none;border-radius:6px;background:#3483FA;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;font-family:inherit;"
					onmouseover="this.style.background='#2968C8'" onmouseout="this.style.background='#3483FA'">
					🚀 Iniciar Extração
				</button>
			</div>
		`;

		overlay.appendChild(card);
		document.body.appendChild(overlay);

		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) toggleModal();
		});

		document.getElementById("ml-btn-iniciar").addEventListener("click", iniciarAutomacaoCompleta);
	}

	function toggleModal() {
		if (isScraping) {
			showToast("warning", "Automação em andamento", "Recarregue a página (F5) para cancelar.", 4000);
			return;
		}
		const modal = document.getElementById(modalId);
		if (modal.style.display === "none") {
			modal.style.display = "flex";
			setTimeout(() => (modal.children[0].style.transform = "scale(1)"), 10);
		} else {
			modal.style.display = "none";
			modal.children[0].style.transform = "scale(0.95)";
		}
	}

	// ==========================================
	// 3. ORQUESTRADOR DE AUTOMAÇÃO
	// ==========================================
	async function iniciarAutomacaoCompleta() {
		const wantsFilter = document.getElementById("ml-filter-toggle").checked;
		const transportadoraAlvo = document.getElementById("ml-transportadora-input").value.trim();

		if (wantsFilter && !transportadoraAlvo) {
			showToast("warning", "Transportadora não definida", "Defina uma transportadora ou desmarque a opção de filtro.", 4000);
			return;
		}

		toggleModal();
		isScraping = true;
		allExtractedData = [];
		currentPage = 1;

		console.clear();
		console.info("%c🚀 Operação de Extração Iniciada", "color: #3483FA; font-size: 14px;");

		showToast("info", "Extração iniciada", wantsFilter ? `Filtrando por: ${transportadoraAlvo}` : "Raspagem completa (sem filtro).", 3000);

		try {
			await checarELimparFiltros();

			if (wantsFilter) {
				await aplicarNovoFiltro(transportadoraAlvo);
			} else {
				console.info("Raspagem completa selecionada (Sem filtro por transportadora).");
			}

			await loopDePaginas();
		} catch (error) {
			console.error("Falha durante a execução:", error);
			showToast("error", "Erro na automação", error.message || "Verifique o console para mais detalhes.", 6000);
			isScraping = false;
		}
	}

	// ==========================================
	// 4. ROBÔ DE FILTRAGEM (Andes UI)
	// ==========================================
	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function abrirModalDeFiltros() {
		const btnFiltro = document.querySelector("button.filter-button");
		if (!btnFiltro) {
			const btnFiltroText = Array.from(
				document.querySelectorAll(".filter-button__text"),
			).find((el) => el.innerText.includes("Filtros"));
			if (!btnFiltroText) throw new Error("Botão 'Filtros' não localizado na página.");
			btnFiltroText.closest("button").click();
		} else {
			btnFiltro.click();
		}
		await sleep(1500);
	}

	async function checarELimparFiltros() {
		const filtrosAtivos = document.querySelector("ul.andes-tag-collapsed li");

		if (filtrosAtivos) {
			showToast("info", "Limpando filtros", "Removendo filtros residuais...", 2500);
			console.info("Filtros ativos detectados. Iniciando limpeza...");

			await abrirModalDeFiltros();

			const btnLimparSpan = Array.from(
				document.querySelectorAll(".andes-button__content"),
			).find((el) => el.innerText.trim() === "Limpar filtros");
			if (btnLimparSpan) {
				btnLimparSpan.closest("button").click();
				console.info("Filtros limpos. Aguardando recarregamento da tabela...");
				await sleep(4000);
			} else {
				console.warn('Botão "Limpar filtros" não encontrado dentro do modal.');
			}
		}
	}

	async function aplicarNovoFiltro(transportadora) {
		showToast("info", "Aplicando filtro", `Transportadora: ${transportadora}`, 3000);
		console.info(`Configurando filtro para: ${transportadora}`);

		await abrirModalDeFiltros();

		const btnTransportadora = document.querySelector('button[aria-label*="transportadora"]');
		if (!btnTransportadora) throw new Error("Campo de Transportadora não encontrado no modal.");

		btnTransportadora.click();
		await sleep(1000);

		const activeMenus = document.querySelectorAll(".andes-floating-menu");
		const searchInput = Array.from(activeMenus)
			.map((m) => m.querySelector("input"))
			.find((i) => i);

		if (searchInput) {
			searchInput.focus();
			searchInput.value = "";
			document.execCommand("insertText", false, transportadora);
			searchInput.dispatchEvent(new Event("input", { bubbles: true }));
			await sleep(1500);

			const labels = Array.from(
				document.querySelectorAll(".andes-checkbox__label, .andes-list__item-primary"),
			);
			const opcaoCorreta = labels.find((el) =>
				el.innerText.toLowerCase().includes(transportadora.toLowerCase()),
			);
			if (opcaoCorreta) {
				opcaoCorreta.click();
				await sleep(500);
			}
			document.body.click();
			await sleep(500);
		} else {
			const labels = Array.from(
				document.querySelectorAll(".andes-checkbox__label, .andes-list__item-primary"),
			);
			const opcaoCorreta = labels.find((el) =>
				el.innerText.toLowerCase().includes(transportadora.toLowerCase()),
			);
			if (opcaoCorreta) {
				opcaoCorreta.click();
				await sleep(500);
			}
		}

		const btnAplicarSpan = Array.from(
			document.querySelectorAll(".andes-button__content"),
		).find((el) => el.innerText.trim() === "Aplicar");
		if (btnAplicarSpan) {
			btnAplicarSpan.closest("button").click();
			console.info("Filtro aplicado. Aguardando processamento...");
			await sleep(4000);
		} else {
			throw new Error('Botão "Aplicar" não encontrado.');
		}
	}

	// ==========================================
	// 5. ROBÔ DE SCRAPING E PAGINAÇÃO
	// ==========================================
	async function loopDePaginas() {
		console.info("Iniciando varredura das páginas...");

		while (isScraping) {
			showToast("info", `Página ${currentPage}`, `Extraindo dados... ${allExtractedData.length} registros até agora.`, 2500);

			const dadosPagina = extrairDadosDaPagina();
			if (dadosPagina.length > 0) {
				allExtractedData.push(...dadosPagina);
				console.info(
					`Página ${currentPage}: ${dadosPagina.length} registros extraídos. Total: ${allExtractedData.length}`,
				);
			}

			const botaoSeguinte = document.querySelector(
				".andes-pagination__button--next a, .andes-pagination__button--next button",
			);
			if (!botaoSeguinte) {
				console.info("Botão de próxima página não encontrado. Fim.");
				break;
			}

			const estaDesabilitado =
				botaoSeguinte
					.closest(".andes-pagination__button--next")
					?.classList.contains("andes-pagination__button--disabled") ||
				botaoSeguinte.hasAttribute("disabled") ||
				botaoSeguinte.getAttribute("aria-disabled") === "true";

			if (estaDesabilitado) {
				console.info("Fim da paginação alcançado.");
				break;
			}

			botaoSeguinte.click();
			currentPage++;
			await sleep(3000);
		}

		finalizarScraping();
	}

	// ==========================================
	// 6. EXTRAÇÃO DE DADOS (LÓGICA ORIGINAL)
	// ==========================================
	function extrairDadosDaPagina() {
		const rows = document.querySelectorAll("li.monitoring-row");
		const extracoesLocais = [];

		rows.forEach((row) => {
			try {
				const safeGetText = (selector, context = row) => {
					const el = context.querySelector(selector);
					return el ? el.innerText.replace(/\s+/g, " ").trim() : "N/A";
				};

				// --- ROTA E ID ---
				const rotaRaw = safeGetText(
					".monitoring-row__promise-container p",
				);
				let rotaNome = "-",
					idRota = "-";
				if (rotaRaw !== "N/A" && rotaRaw.includes("#")) {
					const parts = rotaRaw.split("#");
					rotaNome = parts[0].replace("·", "").trim();
					idRota = parts[1].trim();
				} else if (rotaRaw !== "N/A") {
					rotaNome = rotaRaw;
				}

				// --- LOGÍSTICA ---
				let transportadora = "-",
					placa = "-",
					tipoVeiculo = "-";
				const licenseContainer = row.querySelector(
					".monitoring-row-details__license",
				);
				if (licenseContainer) {
					const transEl = licenseContainer.querySelector(
						".monitoring-row-details__license-name",
					);
					const tipoEl = licenseContainer.querySelector(
						"span.monitoring-row-details",
					);
					if (transEl) transportadora = transEl.innerText.trim();
					if (tipoEl) tipoVeiculo = tipoEl.innerText.trim();

					if (!transEl && !tipoEl) {
						tipoVeiculo = licenseContainer.innerText.replace(/\s+/g, " ").trim();
					} else {
						licenseContainer.childNodes.forEach((node) => {
							if (node.nodeType === Node.TEXT_NODE) {
								let textoLimpo = node.textContent.replace(/·/g, "").trim();
								if (textoLimpo.length > 0) placa = textoLimpo;
							}
						});
					}
				}

				// --- SVC E CICLO ---
				const cicloRaw = safeGetText(
					".monitoring-row-details__cycle p",
				);
				let svc = "-",
					cicloStr = "-";
				if (cicloRaw !== "N/A") {
					if (cicloRaw.includes("·")) {
						const parts = cicloRaw.split("·").map((p) => p.trim());
						svc = parts[0];
						cicloStr = parts[1] || "-";
					} else {
						svc = cicloRaw;
					}
				}

				// --- MOTORISTA E PROGRESSO ---
				const motorista = safeGetText(
					".monitoring-row-details__driver-name",
				);
				const progressoRaw = safeGetText(
					".sc-progress-wheel__percentage p",
				);
				const progresso =
					progressoRaw !== "N/A" ? `${progressoRaw}%` : "-";

				// --- PACOTES ---
				const pacotesSpans = row.querySelectorAll(
					".monitoring-row-shipments__packages",
				);
				const statusPacotesRaw =
					pacotesSpans.length > 1
						? pacotesSpans[1].innerText.replace(/\s+/g, " ").trim()
						: "";

				let pendentes = "0",
					naoEntregues = "0",
					bemSucedidos = "0";
				const matchPendentes =
					statusPacotesRaw.match(/(\d+)\s*pendente/i);
				const matchNaoEntregues =
					statusPacotesRaw.match(/(\d+)\s*não entregue/i);
				const matchSucesso =
					statusPacotesRaw.match(/(\d+)\s*bem-sucedido/i);

				if (matchPendentes) pendentes = matchPendentes[1];
				if (matchNaoEntregues) naoEntregues = matchNaoEntregues[1];
				if (matchSucesso) bemSucedidos = matchSucesso[1];

				// --- TOTAL DE PACOTES ---
				const totalPacotes = String(
					(parseInt(pendentes, 10) || 0) +
					(parseInt(naoEntregues, 10) || 0) +
					(parseInt(bemSucedidos, 10) || 0),
				);

				// --- MÉTRICAS (Removido o 'h') ---
				let ozh = "-",
					orh = "-";
				const metricBoxes = row.querySelectorAll(
					":scope > .row-link > .monitoring-row-details > .metric-box, :scope > .row-link .metric-box, .metric-box",
				);
				metricBoxes.forEach((box) => {
					const titulo =
						safeGetText(".andes-tooltip__trigger span", box) ||
						safeGetText(".metric-box__title-principal", box) ||
						safeGetText(".metric-box__title", box);
					const valor =
						safeGetText(".metric-box__value-principal", box) ||
						safeGetText(".metric-box__value", box);
					if (titulo && titulo.includes("OZH"))
						ozh = valor.replace(/\s*h/i, "").trim();
					if (titulo && titulo.includes("ORH"))
						orh = valor.replace(/\s*h/i, "").trim();
				});

				// --- STATUS E RECLAMAÇÃO ---
				let statusFinal = "-",
					reclamacao = "-";
				const nameContainer = row.querySelector(
					".monitoring-row-details__name-container",
				);
				if (nameContainer) {
					statusFinal = nameContainer.innerText
						.replace(/\s+/g, " ")
						.trim();
					const reclamacaoSpan = nameContainer.nextElementSibling;
					if (
						reclamacaoSpan &&
						reclamacaoSpan.tagName.toLowerCase() === "span"
					) {
						reclamacao =
							reclamacaoSpan.innerText
								.replace(/\s+/g, " ")
								.trim() || "-";
					}
				} else {
					statusFinal = safeGetText(
						".monitoring-row-details__name-container p",
					);
				}

				extracoesLocais.push({
					ROTA: rotaNome,
					ID_ROTA: idRota,
					TRANSPORTADORA: transportadora,
					PLACA_VEICULO: placa,
					TIPO_VEICULO: tipoVeiculo,
					SVC: svc,
					CICLO: cicloStr,
					MOTORISTA: motorista,
					PROGRESSO: progresso,
					PACOTES_PENDENTES: pendentes,
					PACOTES_NAO_ENTREGUES: naoEntregues,
					PACOTES_BEM_SUCEDIDOS: bemSucedidos,
					TOTAL_PACOTES: totalPacotes,
					OZH: ozh,
					ORH: orh,
					STATUS: statusFinal !== "N/A" ? statusFinal : "-",
					RECLAMACAO: reclamacao,
				});
			} catch (e) {
				// Erros locais silenciosos em produção
			}
		});

		return extracoesLocais;
	}

	// ==========================================
	// 7. FINALIZAÇÃO E EXPORTAÇÃO (COM DEDUPLICAÇÃO)
	// ==========================================
	function finalizarScraping() {
		isScraping = false;

		if (allExtractedData.length === 0) {
			console.warn("Operação concluída, mas nenhum dado foi capturado.");
			showToast("warning", "Nenhum dado extraído", "A automação finalizou sem capturar registros.", 5000);
			return;
		}

		// --- DEDUPLICAÇÃO POR ID_ROTA (fallback: ROTA) ---
		const totalBruto = allExtractedData.length;
		const seen = new Set();
		const dadosUnicos = allExtractedData.filter((item) => {
			const chave =
				item.ID_ROTA && item.ID_ROTA !== "-"
					? item.ID_ROTA
					: item.ROTA;
			if (seen.has(chave)) return false;
			seen.add(chave);
			return true;
		});

		const duplicatasRemovidas = totalBruto - dadosUnicos.length;
		if (duplicatasRemovidas > 0) {
			console.info(
				`%c🧹 Deduplicação: ${duplicatasRemovidas} registro(s) duplicado(s) removido(s).`,
				"color: #FF7733; font-weight: bold;",
			);
		}

		// --- GERAÇÃO DO CSV ---
		const chaves = Object.keys(dadosUnicos[0]);
		let csvContent = chaves.join(",") + "\n";

		dadosUnicos.forEach((item) => {
			const valoresFormatados = chaves.map((chave) => {
				let stringValor = String(item[chave]);
				if (stringValor.includes(",") || stringValor.includes('"')) {
					stringValor = `"${stringValor.replace(/"/g, '""')}"`;
				}
				return stringValor;
			});
			csvContent += valoresFormatados.join(",") + "\n";
		});

		navigator.clipboard
			.writeText(csvContent)
			.then(() => {
				console.info(
					`%c🎉 Processo concluído. ${dadosUnicos.length} registros únicos copiados.`,
					"color: #00A650; font-size: 13px; font-weight: bold;",
				);

				const msgDup =
					duplicatasRemovidas > 0
						? ` (${duplicatasRemovidas} duplicata${duplicatasRemovidas > 1 ? "s" : ""} removida${duplicatasRemovidas > 1 ? "s" : ""})`
						: "";

				showToast(
					"success",
					`${dadosUnicos.length} registros copiados`,
					`Dados prontos na área de transferência${msgDup}.`,
					6000,
				);
			})
			.catch((err) => {
				console.error("Falha na transferência para a área de transferência:", err);
				showToast("error", "Falha ao copiar", "Não foi possível acessar a área de transferência.", 5000);
			});
	}

	// ==========================================
	// 8. INICIALIZAÇÃO
	// ==========================================
	if (document.readyState === "complete") {
		initUI();
	} else {
		window.addEventListener("load", initUI);
	}
})();
