// ==UserScript==
// @name         QR Code Printer - Package ID
// @namespace    https://debugzone.com.br/
// @version      2.0.0
// @description  Alt+P imprime pelo sistema do site; Alt+I seleciona impressora
// @author       LucasWG
// @match        https://envios.adminml.com/logistics/package-management/package/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=adminml.com
// @grant        none
// ==/UserScript==

(function () {
	"use strict";

	const packageId = window.location.pathname.split("/").pop();
	const LS_KEY = "qrprinter_selected_printer";

	// =========================================================================
	// UTILITÁRIOS
	// =========================================================================
	function waitFor(fn, timeoutMs = 6000, intervalMs = 100) {
		return new Promise((resolve, reject) => {
			const start = Date.now();
			const iv = setInterval(() => {
				const r = fn();
				if (r) {
					clearInterval(iv);
					resolve(r);
				} else if (Date.now() - start > timeoutMs) {
					clearInterval(iv);
					reject(new Error("Timeout"));
				}
			}, intervalMs);
		});
	}

	function sleep(ms) {
		return new Promise((r) => setTimeout(r, ms));
	}

	// Clique simulando usuário real com coordenadas
	function realClick(el) {
		const rect = el.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const opts = {
			bubbles: true,
			cancelable: true,
			clientX: cx,
			clientY: cy,
			screenX: cx,
			screenY: cy,
			view: window,
		};
		el.dispatchEvent(new MouseEvent("mouseover", opts));
		el.dispatchEvent(new MouseEvent("mouseenter", opts));
		el.dispatchEvent(new MouseEvent("mousemove", opts));
		el.dispatchEvent(
			new PointerEvent("pointerdown", { ...opts, pointerId: 1 }),
		);
		el.dispatchEvent(new MouseEvent("mousedown", opts));
		el.dispatchEvent(
			new PointerEvent("pointerup", { ...opts, pointerId: 1 }),
		);
		el.dispatchEvent(new MouseEvent("mouseup", opts));
		el.dispatchEvent(new MouseEvent("click", opts));
	}

	function showToast(message, type = "info") {
		const colors = {
			success: "#2ecc71",
			warn: "#f39c12",
			error: "#e74c3c",
			info: "#3498db",
		};
		document.getElementById("qrprinter-toast")?.remove();
		const toast = document.createElement("div");
		toast.id = "qrprinter-toast";
		toast.textContent = message;
		Object.assign(toast.style, {
			position: "fixed",
			bottom: "28px",
			right: "28px",
			zIndex: "999999",
			padding: "14px 20px",
			background: colors[type] || colors.info,
			color: "#fff",
			fontWeight: "bold",
			fontSize: "14px",
			borderRadius: "10px",
			boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
			opacity: "1",
			transition: "opacity 0.4s ease",
			maxWidth: "380px",
			fontFamily: "sans-serif",
			lineHeight: "1.4",
		});
		document.body.appendChild(toast);
		setTimeout(() => {
			toast.style.opacity = "0";
		}, 3200);
		setTimeout(() => {
			toast.remove();
		}, 3700);
	}

	// =========================================================================
	// MODAL
	// =========================================================================
	function getActiveModal() {
		return Array.from(document.querySelectorAll("*")).find(
			(el) =>
				el.children.length > 0 &&
				el.textContent.includes("Selecione uma impressora") &&
				el.offsetParent !== null &&
				el.offsetWidth > 200,
		);
	}

	async function waitForModal() {
		return waitFor(() => {
			const modal = getActiveModal();
			if (!modal) return null;
			const btn = getConfirmButtonInsideModal(modal);
			return btn ? modal : null;
		}, 8000);
	}

	function getConfirmButtonInsideModal(modal) {
		if (!modal) return null;
		return Array.from(modal.querySelectorAll("button")).find((btn) => {
			const rect = btn.getBoundingClientRect();
			return (
				btn.textContent.trim() === "Reimprimir etiqueta" &&
				rect.width > 50 &&
				rect.height > 20 &&
				rect.top > 0
			);
		});
	}

	function getPageReimprimirBtn() {
		const modal = getActiveModal();
		return Array.from(document.querySelectorAll("button")).find((btn) => {
			if (btn.textContent.trim() !== "Reimprimir etiqueta") return false;
			if (modal && modal.contains(btn)) return false;
			const rect = btn.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		});
	}

	function getCurrentSelectedPrinter() {
		const modal = getActiveModal();
		if (!modal) return null;
		const allLeaf = Array.from(modal.querySelectorAll("*")).filter(
			(el) => el.children.length === 0 && el.offsetParent !== null,
		);
		const printerEl = allLeaf.find((el) =>
			/^[A-Z]{2,6}\d{3,}/i.test(el.textContent.trim()),
		);
		return printerEl?.textContent.trim() || null;
	}

	// =========================================================================
	// AGUARDA TOAST DO SITE — SOMENTE NOVOS (após o clique)
	// Usa MutationObserver para capturar apenas elementos inseridos DEPOIS do clique
	// =========================================================================
	function waitForSiteResponseAfterClick() {
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				observer.disconnect();
				resolve({ ok: null, msg: null });
			}, 9000);

			const SUCCESS_PATTERNS = ["etiqueta foi impressa"];
			const ERROR_PATTERNS = [
				"ocorreu um erro",
				"tente novamente",
				"falhou",
				"não foi possível",
			];

			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					for (const node of mutation.addedNodes) {
						if (node.nodeType !== 1) continue;

						// Verifica o próprio nó e todos os seus filhos
						const allTexts = [
							node,
							...node.querySelectorAll("*"),
						].map(
							(el) => el.textContent?.trim().toLowerCase() || "",
						);

						for (const txt of allTexts) {
							if (SUCCESS_PATTERNS.some((p) => txt.includes(p))) {
								clearTimeout(timeout);
								observer.disconnect();
								return resolve({
									ok: true,
									msg: "✅ A etiqueta foi impressa.",
								});
							}
							if (ERROR_PATTERNS.some((p) => txt.includes(p))) {
								clearTimeout(timeout);
								observer.disconnect();
								return resolve({
									ok: false,
									msg: "❌ Ocorreu um erro. Tente novamente.",
								});
							}
						}
					}
				}
			});

			observer.observe(document.body, { childList: true, subtree: true });
		});
	}

	// =========================================================================
	// DROPDOWN
	// =========================================================================
	async function openDropdownAndGetOptions() {
		const modal = getActiveModal();
		if (!modal) throw new Error("Modal não encontrado");

		const allLeaf = Array.from(modal.querySelectorAll("*")).filter(
			(el) => el.children.length === 0 && el.offsetParent !== null,
		);

		const labelEl = allLeaf.find(
			(el) => el.textContent.trim() === "Impressora",
		);
		if (!labelEl) throw new Error('Label "Impressora" não encontrado');

		let trigger = null;
		let node = labelEl.parentElement;
		for (let i = 0; i < 8; i++) {
			if (!node || node === modal) break;
			const cands = Array.from(
				node.querySelectorAll("div, span, button, select"),
			).filter((el) => {
				const rect = el.getBoundingClientRect();
				return rect.width > 100 && rect.height > 25 && el !== labelEl;
			});
			if (cands.length > 0) {
				trigger = cands[cands.length - 1];
				break;
			}
			node = node.parentElement;
		}

		if (!trigger) throw new Error("Trigger do dropdown não encontrado");
		realClick(trigger);

		return waitFor(() => {
			const opts = Array.from(
				document.querySelectorAll('li, [role="option"]'),
			).filter(
				(el) =>
					el.offsetParent !== null &&
					/^[A-Z]{2,6}\d{3,}/i.test(el.textContent.trim()),
			);
			return opts.length > 0 ? opts : null;
		}, 4000);
	}

	async function ensurePrinterSelected(printerName) {
		const current = getCurrentSelectedPrinter();
		if (current === printerName) return;

		let options;
		try {
			options = await openDropdownAndGetOptions();
		} catch (e) {
			throw new Error("Não abriu dropdown: " + e.message);
		}

		const target = options.find(
			(el) => el.textContent.trim() === printerName,
		);
		if (!target) {
			document.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
			throw new Error(`Impressora "${printerName}" não encontrada`);
		}

		realClick(target);
		await sleep(350);
	}

	// =========================================================================
	// Alt+I — SELETOR DE IMPRESSORA
	// =========================================================================
	async function openPrinterSelector() {
		const pageBtn = getPageReimprimirBtn();
		if (!pageBtn) {
			showToast('⚠️ Botão "Reimprimir etiqueta" não encontrado.', "warn");
			return;
		}

		realClick(pageBtn);

		let modal;
		try {
			modal = await waitForModal();
		} catch {
			showToast("⚠️ Modal não abriu.", "warn");
			return;
		}

		let options;
		try {
			options = await openDropdownAndGetOptions();
		} catch (e) {
			showToast(`⚠️ ${e.message}`, "warn");
			const cb = Array.from(modal.querySelectorAll("button")).find(
				(b) => b.textContent.trim() === "Cancelar",
			);
			cb && realClick(cb);
			return;
		}

		const names = [...new Set(options.map((o) => o.textContent.trim()))];
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		await sleep(150);
		const cb = Array.from(document.querySelectorAll("button")).find(
			(b) =>
				b.textContent.trim() === "Cancelar" && b.offsetParent !== null,
		);
		cb && realClick(cb);

		if (!names.length) {
			showToast("⚠️ Nenhuma impressora detectada.", "warn");
			return;
		}
		showCustomSelector(names);
	}

	function showCustomSelector(names) {
		const saved = localStorage.getItem(LS_KEY) || "";
		const overlay = document.createElement("div");
		Object.assign(overlay.style, {
			position: "fixed",
			top: "0",
			left: "0",
			width: "100vw",
			height: "100vh",
			background: "rgba(0,0,0,0.55)",
			zIndex: "999998",
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
		});
		const modal = document.createElement("div");
		Object.assign(modal.style, {
			background: "#fff",
			borderRadius: "14px",
			padding: "28px 32px",
			minWidth: "320px",
			maxWidth: "460px",
			boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
			fontFamily: "sans-serif",
		});
		const title = document.createElement("h2");
		title.textContent = "🖨️ Selecionar Impressora";
		Object.assign(title.style, {
			marginBottom: "18px",
			fontSize: "18px",
			color: "#333",
		});
		modal.appendChild(title);
		names.forEach((name) => {
			const btn = document.createElement("button");
			btn.textContent = name;
			const isSel = name === saved;
			Object.assign(btn.style, {
				display: "block",
				width: "100%",
				padding: "12px",
				marginBottom: "10px",
				background: isSel ? "#FFE600" : "#f5f5f5",
				border: isSel ? "2px solid #333" : "2px solid #ddd",
				borderRadius: "8px",
				fontSize: "16px",
				fontWeight: "bold",
				cursor: "pointer",
				letterSpacing: "1px",
			});
			btn.addEventListener("click", () => {
				localStorage.setItem(LS_KEY, name);
				showToast(`✅ Impressora salva: ${name}`, "success");
				overlay.remove();
			});
			modal.appendChild(btn);
		});
		const cancelBtn = document.createElement("button");
		cancelBtn.textContent = "Cancelar";
		Object.assign(cancelBtn.style, {
			display: "block",
			width: "100%",
			padding: "10px",
			marginTop: "4px",
			background: "transparent",
			border: "1px solid #ccc",
			borderRadius: "8px",
			fontSize: "14px",
			cursor: "pointer",
			color: "#888",
		});
		cancelBtn.addEventListener("click", () => overlay.remove());
		modal.appendChild(cancelBtn);
		overlay.appendChild(modal);
		document.body.appendChild(overlay);
	}

	// =========================================================================
	// Alt+P — IMPRIMIR PELO SITE
	// =========================================================================
	async function tryPrintViaSite() {
		const savedPrinter = localStorage.getItem(LS_KEY);
		if (!savedPrinter) {
			showToast(
				"⚠️ Nenhuma impressora configurada. Use Alt+I para selecionar.",
				"warn",
			);
			fallbackQRPrint();
			return;
		}

		const pageBtn = getPageReimprimirBtn();
		if (!pageBtn) {
			showToast("⚠️ Botão não encontrado. Abrindo QR Code...", "warn");
			fallbackQRPrint();
			return;
		}

		showToast("🖨️ Abrindo modal...", "info");
		realClick(pageBtn);

		let modal;
		try {
			modal = await waitForModal();
		} catch {
			showToast("⚠️ Modal não abriu. Abrindo QR Code...", "warn");
			fallbackQRPrint();
			return;
		}

		try {
			await ensurePrinterSelected(savedPrinter);
		} catch (err) {
			showToast(`⚠️ ${err.message}. Abrindo QR Code...`, "warn");
			const cb = Array.from(modal.querySelectorAll("button")).find(
				(b) => b.textContent.trim() === "Cancelar",
			);
			cb && realClick(cb);
			fallbackQRPrint();
			return;
		}

		const confirmBtn = getConfirmButtonInsideModal(getActiveModal());
		if (!confirmBtn) {
			showToast(
				"⚠️ Botão de confirmação não encontrado. Abrindo QR Code...",
				"warn",
			);
			fallbackQRPrint();
			return;
		}

		showToast(`🖨️ Enviando para: ${savedPrinter}...`, "info");

		// ── Inicia observador ANTES de clicar para não perder o toast ──
		const responsePromise = waitForSiteResponseAfterClick();
		realClick(confirmBtn);

		const res = await responsePromise;

		if (res.ok === true) {
			showToast(res.msg, "success");
		} else if (res.ok === false) {
			showToast(res.msg, "error");
			await sleep(500);
			fallbackQRPrint();
		} else {
			// Sem resposta clara — verifica se modal fechou (sinal de sucesso silencioso)
			await sleep(500);
			const stillOpen = !!getActiveModal();
			if (!stillOpen)
				showToast(`✅ Impresso em: ${savedPrinter}`, "success");
			else {
				showToast("⚠️ Sem resposta. Abrindo QR Code...", "warn");
				fallbackQRPrint();
			}
		}
	}

	// =========================================================================
	// FALLBACK: QR CODE
	// =========================================================================
	function fallbackQRPrint() {
		const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&ecc=H&data=${encodeURIComponent(packageId)}`;
		const w = window.open("", "_blank", "width=620,height=720");
		w.document
			.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>QR - ${packageId}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff;font-family:'Courier New',monospace}
  .card{display:flex;flex-direction:column;align-items:center;gap:24px;padding:40px 48px;border:3px solid #222;border-radius:16px}
  .card img{width:420px;height:420px;display:block}
  .label{font-size:36px;font-weight:bold;letter-spacing:5px;color:#111;text-align:center}
  @media print{body{background:#fff}.card{border:3px solid #000;page-break-inside:avoid}}
</style></head><body>
<div class="card">
  <img id="q" src="${qrUrl}" alt="QR"/>
  <div class="label">${packageId}</div>
</div>
<script>
  document.getElementById('q').onload=()=>setTimeout(()=>{window.print();window.close();},300);
  document.getElementById('q').onerror=()=>{document.body.innerHTML='<p style="color:red;padding:20px">Erro ao carregar QR Code.</p>'};
<\/script></body></html>`);
		w.document.close();
	}

	// =========================================================================
	// ATALHOS
	// =========================================================================
	document.addEventListener("keydown", (e) => {
		if (!e.altKey) return;
		if (e.key.toLowerCase() === "p") {
			e.preventDefault();
			tryPrintViaSite();
		}
		if (e.key.toLowerCase() === "i") {
			e.preventDefault();
			openPrinterSelector();
		}
	});
})();
