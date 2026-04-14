// ==UserScript==
// @name         QR Code Printer - Package ID
// @namespace    https://debugzone.com.br/
// @version      2.1.0
// @description  Alt+P imprime pelo sistema do site; Alt+I seleciona impressora
// @author       LucasWG
// @match        https://envios.adminml.com/logistics/package-management/package/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=adminml.com
// @grant        none
// ==/UserScript==

;(function () {
	'use strict'

	const packageId = window.location.pathname.split('/').pop()
	const LS_KEY = 'qrprinter_selected_printer'

	// =========================================================================
	// TOKENS DE ELEMENTOS DO SITE
	// =========================================================================
	const PAGE_TOKENS = {
		BTN_CANCEL: 'BTN_CANCEL',
		BTN_SAVE: 'BTN_SAVE',
		LINK_BACKOFFICE: 'LINK_BACKOFFICE',
		LINK_AUDIT_TRAIL: 'LINK_AUDIT_TRAIL',
		LINK_GOOGLE_MAPS: 'LINK_GOOGLE_MAPS',
		ACCORDION_ROUTE: 'ACCORDION_ROUTE',
		ACCORDION_BUYER: 'ACCORDION_BUYER',
		ACCORDION_ADDRESS: 'ACCORDION_ADDRESS',
		ACCORDION_PACKAGE: 'ACCORDION_PACKAGE',
		LINK_HIST_LABEL: 'LINK_HIST_LABEL',
		LINK_HIST_INVENTORY: 'LINK_HIST_INVENTORY',
		LINK_VIEW_UPDATE: 'LINK_VIEW_UPDATE_*',
		BTN_REPRINT_ROUTE_LABEL: 'BTN_REPRINT_ROUTE_LABEL',
		BTN_REPRINT_LABEL: 'BTN_REPRINT_LABEL', // PRINCIPAL
		SIDEBAR_COPY_ID: 'SIDEBAR_COPY_ID',
		SIDEBAR_PANEL: 'SIDEBAR_PANEL',
		SIDEBAR_BACKOFFICE: 'SIDEBAR_BACKOFFICE',
		SIDEBAR_AUDIT_TRAIL: 'SIDEBAR_AUDIT_TRAIL',
		SIDEBAR_COPY_URL: 'SIDEBAR_COPY_URL',
		MODAL_CONTAINER: 'MODAL_CONTAINER',
		MODAL_OVERLAY: 'MODAL_OVERLAY',
		MODAL_CLOSE: 'MODAL_CLOSE',
		MODAL_HEADER: 'MODAL_HEADER',
		MODAL_BODY: 'MODAL_BODY',
		MODAL_CONFIRM: 'MODAL_CONFIRM',
		MODAL_CANCEL: 'MODAL_CANCEL',
		MODAL_SELECT: 'MODAL_SELECT'
	}

	// =========================================================================
	// UTILITÁRIOS
	// =========================================================================
	function waitFor(fn, timeoutMs = 6000, intervalMs = 100) {
		return new Promise((resolve, reject) => {
			const start = Date.now()
			const iv = setInterval(() => {
				const r = fn()
				if (r) {
					clearInterval(iv)
					resolve(r)
				} else if (Date.now() - start > timeoutMs) {
					clearInterval(iv)
					reject(new Error('Timeout'))
				}
			}, intervalMs)
		})
	}

	function sleep(ms) {
		return new Promise(r => setTimeout(r, ms))
	}

	// Clique simulando usuário real com coordenadas
	function realClick(el) {
		const rect = el.getBoundingClientRect()
		const cx = rect.left + rect.width / 2
		const cy = rect.top + rect.height / 2
		const opts = {
			bubbles: true,
			cancelable: true,
			clientX: cx,
			clientY: cy,
			screenX: cx,
			screenY: cy,
			view: window
		}
		el.dispatchEvent(new MouseEvent('mouseover', opts))
		el.dispatchEvent(new MouseEvent('mouseenter', opts))
		el.dispatchEvent(new MouseEvent('mousemove', opts))
		el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1 }))
		el.dispatchEvent(new MouseEvent('mousedown', opts))
		el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1 }))
		el.dispatchEvent(new MouseEvent('mouseup', opts))
		el.dispatchEvent(new MouseEvent('click', opts))
	}

	function showToast(message, type = 'info') {
		const colors = {
			success: '#10B981', // Emerald
			warn: '#F59E0B', // Amber
			error: '#EF4444', // Red
			info: '#3B82F6' // Blue
		}

		const icons = {
			success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #10B981"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
			warn: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #F59E0B"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
			error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #EF4444"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
			info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #3B82F6"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
		}

		document.getElementById('qrprinter-toast')?.remove()
		const toast = document.createElement('div')
		toast.id = 'qrprinter-toast'

		toast.innerHTML = `
			<div style="display: flex; align-items: center; gap: 14px;">
				<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: ${colors[type]}20;">
					${icons[type] || icons.info}
				</div>
				<span style="font-weight: 500;">${message}</span>
			</div>
		`

		Object.assign(toast.style, {
			position: 'fixed',
			bottom: '32px',
			right: '32px',
			zIndex: '999999',
			padding: '16px 24px',
			background: 'rgba(17, 24, 39, 0.95)',
			backdropFilter: 'blur(10px)',
			color: '#F9FAFB',
			fontSize: '15px',
			borderRadius: '16px',
			boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
			border: '1px solid rgba(255, 255, 255, 0.1)',
			opacity: '0',
			transform: 'translateY(20px) scale(0.95)',
			transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
			maxWidth: '400px',
			fontFamily: 'system-ui, -apple-system, sans-serif',
			letterSpacing: '0.2px'
		})

		document.body.appendChild(toast)

		requestAnimationFrame(() => {
			toast.style.opacity = '1'
			toast.style.transform = 'translateY(0) scale(1)'
		})

		setTimeout(() => {
			toast.style.opacity = '0'
			toast.style.transform = 'translateY(10px) scale(0.95)'
		}, 3200)
		setTimeout(() => {
			toast.remove()
		}, 3600)
	}

	// =========================================================================
	// DOM QUERIES E MODAL
	// =========================================================================
	function getActiveModal() {
		// Busca pelo data-testid preferencialmente
		const modalByDataId = document.querySelector(
			`[data-testid="${PAGE_TOKENS.MODAL_CONTAINER}"]`
		)
		if (modalByDataId && modalByDataId.offsetParent !== null) return modalByDataId

		// Fallback restrito (garante que só busca elementos que parecam ser um modal visualmente)
		const dialogs = Array.from(
			document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="dialog"]')
		)
		return dialogs.find(
			el =>
				el.textContent &&
				el.textContent.includes('Selecione uma impressora') &&
				el.offsetParent !== null &&
				el.offsetWidth > 200
		) || null
	}

	async function waitForModal() {
		return waitFor(() => {
			const modal = getActiveModal()
			if (!modal) return null
			const btn = getConfirmButtonInsideModal(modal)
			return btn ? modal : null
		}, 8000)
	}

	function getConfirmButtonInsideModal(modal) {
		if (!modal) return null

		const btnByDataId = modal.querySelector(`[data-testid="${PAGE_TOKENS.MODAL_CONFIRM}"]`)
		if (btnByDataId) return btnByDataId

		return Array.from(modal.querySelectorAll('button')).find(btn => {
			const rect = btn.getBoundingClientRect()
			return (
				(btn.textContent.trim() === 'Reimprimir etiqueta' ||
					btn.textContent.trim() === 'Confirmar') &&
				rect.width > 50 &&
				rect.height > 20 &&
				rect.top > 0
			)
		})
	}

	function getCancelButtonInsideModal(modal) {
		if (!modal) return null
		const btnByDataId = modal.querySelector(`[data-testid="${PAGE_TOKENS.MODAL_CANCEL}"]`)
		if (btnByDataId) return btnByDataId
		return Array.from(modal.querySelectorAll('button')).find(
			b => b.textContent.trim() === 'Cancelar' || b.textContent.trim() === 'Cancelar'
		)
	}

	function getPageReimprimirBtn() {
		// Estratégia 1: Busca baseada no data-testid
		const btnByDataId = document.querySelector(
			`[data-testid="${PAGE_TOKENS.BTN_REPRINT_LABEL}"]`
		)
		if (btnByDataId && btnByDataId.offsetParent !== null) {
			const rect = btnByDataId.getBoundingClientRect()
			if (rect.width > 0 && rect.height > 0) return btnByDataId
		}

		// Estratégia 2: Busca por texto exato
		const candidates = Array.from(
			document.querySelectorAll('button, a, [role="button"], [class*="button"]')
		)

		const found = candidates.find(el => {
			// Normalizar texto: colapsar espaços e trim
			const text = el.textContent.replace(/\s+/g, ' ').trim()

			// Queremos botões EXATAMENTE iguais a "Reimprimir etiqueta"
			if (text !== 'Reimprimir etiqueta') return false

			// O botão principal da página NUNCA vai estar dentro de um modal.
			// O botão DE DENTRO do modal de impressão é filtrado por essa regra.
			if (el.closest('[role="dialog"], [class*="modal"], .andes-modal')) return false

			// Checa se está renderizado
			const rect = el.getBoundingClientRect()
			return rect.width > 0 && rect.height > 0
		})

		if (found) return found

		// Estratégia de Fallback final: folhas de texto (span interno)
		const leaves = Array.from(document.querySelectorAll('*')).filter(el => {
			if (el.children.length > 0) return false
			return el.textContent.trim() === 'Reimprimir etiqueta'
		})

		for (const leaf of leaves) {
			let target = leaf
			// Sobe no DOM até 6 vezes para achar o <button> ou <a> pai
			for (let i = 0; i < 6; i++) {
				if (!target.parentElement) break
				target = target.parentElement
				
				const tag = target.tagName.toLowerCase()
				const role = target.getAttribute('role')
				const isClickable = tag === 'button' || tag === 'a' || role === 'button'
				
				if (isClickable) {
					if (target.closest('[role="dialog"], [class*="modal"], .andes-modal')) continue
					const rect = target.getBoundingClientRect()
					if (rect.width > 0 && rect.height > 0) return target
				}
			}
		}

		return null
	}

	function getCurrentSelectedPrinter() {
		const modal = getActiveModal()
		if (!modal) return null
		const allLeaf = Array.from(modal.querySelectorAll('*')).filter(
			el => el.children.length === 0 && el.offsetParent !== null
		)
		const printerEl = allLeaf.find(el => /^[A-Z]{2,6}\d{3,}/i.test(el.textContent.trim()))
		return printerEl?.textContent.trim() || null
	}

	// =========================================================================
	// AGUARDA TOAST DO SITE — SOMENTE NOVOS (após o clique)
	// =========================================================================
	function waitForSiteResponseAfterClick() {
		return new Promise(resolve => {
			const timeout = setTimeout(() => {
				observer.disconnect()
				resolve({ ok: null, msg: null })
			}, 9000)

			const SUCCESS_PATTERNS = ['etiqueta foi impressa', 'sucesso']
			const ERROR_PATTERNS = [
				'ocorreu um erro',
				'tente novamente',
				'falhou',
				'não foi possível'
			]

			const observer = new MutationObserver(mutations => {
				for (const mutation of mutations) {
					for (const node of mutation.addedNodes) {
						if (node.nodeType !== 1) continue

						const allTexts = [node, ...node.querySelectorAll('*')].map(
							el => el.textContent?.trim().toLowerCase() || ''
						)

						for (const txt of allTexts) {
							if (SUCCESS_PATTERNS.some(p => txt.includes(p))) {
								clearTimeout(timeout)
								observer.disconnect()
								return resolve({
									ok: true,
									msg: 'A etiqueta foi impressa com sucesso.'
								})
							}
							if (ERROR_PATTERNS.some(p => txt.includes(p))) {
								clearTimeout(timeout)
								observer.disconnect()
								return resolve({
									ok: false,
									msg: 'Ocorreu um erro ao imprimir. Tente novamente.'
								})
							}
						}
					}
				}
			})

			observer.observe(document.body, { childList: true, subtree: true })
		})
	}

	// =========================================================================
	// DROPDOWN
	// =========================================================================
	async function openDropdownAndGetOptions() {
		const modal = getActiveModal()
		if (!modal) throw new Error('Modal não encontrado')

		let trigger = null
		const selectTrigger = modal.querySelector(`[data-testid="${PAGE_TOKENS.MODAL_SELECT}"]`)

		if (selectTrigger) {
			trigger = selectTrigger
		} else {
			const allLeaf = Array.from(modal.querySelectorAll('*')).filter(
				el => el.children.length === 0 && el.offsetParent !== null
			)

			const labelEl = allLeaf.find(el => el.textContent.trim().includes('Impressora'))
			if (!labelEl) throw new Error('Label "Impressora" não encontrado')

			let node = labelEl.parentElement
			for (let i = 0; i < 8; i++) {
				if (!node || node === modal) break
				const cands = Array.from(node.querySelectorAll('div, span, button, select')).filter(
					el => {
						const rect = el.getBoundingClientRect()
						return rect.width > 100 && rect.height > 25 && el !== labelEl
					}
				)
				if (cands.length > 0) {
					trigger = cands[cands.length - 1]
					break
				}
				node = node.parentElement
			}
		}

		if (!trigger) throw new Error('Trigger do dropdown não encontrado')
		realClick(trigger)

		return waitFor(() => {
			const opts = Array.from(document.querySelectorAll('li, [role="option"]')).filter(
				el => el.offsetParent !== null && /^[A-Z]{2,6}\d{3,}/i.test(el.textContent.trim())
			)
			return opts.length > 0 ? opts : null
		}, 4000)
	}

	async function ensurePrinterSelected(printerName) {
		const current = getCurrentSelectedPrinter()
		if (current === printerName) return

		let options
		try {
			options = await openDropdownAndGetOptions()
		} catch (e) {
			throw new Error('Não abriu dropdown: ' + e.message)
		}

		const target = options.find(el => el.textContent.trim() === printerName)
		if (!target) {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
			throw new Error(`Impressora "${printerName}" não encontrada`)
		}

		realClick(target)
		await sleep(350)
	}

	// =========================================================================
	// Alt+I — SELETOR DE IMPRESSORA
	// =========================================================================
	async function openPrinterSelector() {
		const pageBtn = getPageReimprimirBtn()
		if (!pageBtn) {
			showToast('Botão principal de impressão não encontrado.', 'warn')
			return
		}

		realClick(pageBtn)

		let modal
		try {
			modal = await waitForModal()
		} catch {
			showToast('Modal de impressão não abriu.', 'warn')
			return
		}

		let options
		try {
			options = await openDropdownAndGetOptions()
		} catch (e) {
			showToast(e.message, 'warn')
			const cb = getCancelButtonInsideModal(modal)
			cb && realClick(cb)
			return
		}

		const names = [...new Set(options.map(o => o.textContent.trim()))]
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
		await sleep(150)

		const cb =
			getCancelButtonInsideModal(modal) ||
			Array.from(document.querySelectorAll('button')).find(
				b => b.textContent.trim() === 'Cancelar' && b.offsetParent !== null
			)
		cb && realClick(cb)

		if (!names.length) {
			showToast('Nenhuma impressora detectada.', 'warn')
			return
		}
		showCustomSelector(names)
	}

	function showCustomSelector(names) {
		const saved = localStorage.getItem(LS_KEY) || ''

		const overlay = document.createElement('div')
		Object.assign(overlay.style, {
			position: 'fixed',
			top: '0',
			left: '0',
			width: '100%',
			height: '100%',
			background: 'rgba(17, 24, 39, 0.6)',
			backdropFilter: 'blur(6px)',
			zIndex: '999998',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			opacity: '0',
			transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
		})

		const modal = document.createElement('div')
		Object.assign(modal.style, {
			background: '#FFFFFF',
			borderRadius: '20px',
			padding: '32px',
			width: '100%',
			maxWidth: '420px',
			boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 15px rgba(0,0,0,0.05)',
			fontFamily: 'system-ui, -apple-system, sans-serif',
			transform: 'scale(0.95) translateY(10px)',
			transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
		})

		// Header
		const headerContainer = document.createElement('div')
		headerContainer.style.marginBottom = '24px'

		const title = document.createElement('h2')
		title.textContent = 'Selecionar Impressora'
		Object.assign(title.style, {
			fontSize: '22px',
			fontWeight: '600',
			color: '#111827',
			margin: '0 0 8px 0',
			letterSpacing: '-0.01em'
		})

		const subtitle = document.createElement('p')
		subtitle.textContent = 'Escolha sua impressora padrão para agilizar os próximos envios.'
		Object.assign(subtitle.style, {
			fontSize: '14px',
			color: '#6B7280',
			margin: '0',
			lineHeight: '1.5'
		})

		headerContainer.appendChild(title)
		headerContainer.appendChild(subtitle)
		modal.appendChild(headerContainer)

		// List
		const listDiv = document.createElement('div')
		Object.assign(listDiv.style, {
			display: 'flex',
			flexDirection: 'column',
			gap: '10px',
			marginBottom: '28px',
			maxHeight: '340px',
			overflowY: 'auto',
			paddingRight: '6px'
		})

		// Custom Scrollbar
		const style = document.createElement('style')
		style.textContent = `
			::-webkit-scrollbar { width: 6px; }
			::-webkit-scrollbar-track { background: transparent; }
			::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
			::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
		`
		modal.appendChild(style)

		names.forEach(name => {
			const btn = document.createElement('button')
			const isSel = name === saved

			const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`

			btn.innerHTML = `<span style="display:flex; align-items:center; gap:12px; color: ${isSel ? '#2563EB' : '#374151'};">${iconSvg} ${name}</span>`

			if (isSel) {
				btn.innerHTML += `<div style="width:8px; height:8px; border-radius:50%; background-color:#3B82F6; box-shadow:0 0 6px #3B82F680;"></div>`
			}

			Object.assign(btn.style, {
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				width: '100%',
				padding: '16px',
				backgroundColor: isSel ? '#EFF6FF' : '#F9FAFB',
				border: isSel ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
				borderRadius: '14px',
				fontSize: '15px',
				fontWeight: isSel ? '600' : '500',
				cursor: 'pointer',
				transition: 'all 0.2s ease'
			})

			btn.onmouseenter = () => {
				if (!isSel) btn.style.backgroundColor = '#F3F4F6'
			}
			btn.onmouseleave = () => {
				if (!isSel) btn.style.backgroundColor = '#F9FAFB'
			}

			btn.addEventListener('click', () => {
				localStorage.setItem(LS_KEY, name)
				showToast(`Impressora configurada: ${name}`, 'success')

				overlay.style.opacity = '0'
				modal.style.transform = 'scale(0.95) translateY(10px)'
				setTimeout(() => overlay.remove(), 300)
			})
			listDiv.appendChild(btn)
		})
		modal.appendChild(listDiv)

		// Actions
		const cancelBtn = document.createElement('button')
		cancelBtn.textContent = 'Cancelar'
		Object.assign(cancelBtn.style, {
			display: 'block',
			width: '100%',
			padding: '14px',
			background: '#FFFFFF',
			border: '1px solid #E5E7EB',
			borderRadius: '14px',
			fontSize: '15px',
			fontWeight: '600',
			cursor: 'pointer',
			color: '#374151',
			transition: 'all 0.2s ease'
		})
		cancelBtn.onmouseenter = () => {
			cancelBtn.style.backgroundColor = '#F9FAFB'
		}
		cancelBtn.onmouseleave = () => {
			cancelBtn.style.backgroundColor = '#FFFFFF'
		}

		cancelBtn.addEventListener('click', () => {
			overlay.style.opacity = '0'
			modal.style.transform = 'scale(0.95) translateY(10px)'
			setTimeout(() => overlay.remove(), 300)
		})

		modal.appendChild(cancelBtn)
		overlay.appendChild(modal)
		document.body.appendChild(overlay)

		// Animate in
		requestAnimationFrame(() => {
			overlay.style.opacity = '1'
			modal.style.transform = 'scale(1) translateY(0)'
		})
	}

	// =========================================================================
	// Alt+P — IMPRIMIR PELO SITE
	// =========================================================================
	async function tryPrintViaSite() {
		const savedPrinter = localStorage.getItem(LS_KEY)
		if (!savedPrinter) {
			showToast('Nenhuma impressora configurada. Use Alt+I para selecionar.', 'warn')
			fallbackQRPrint()
			return
		}

		const pageBtn = getPageReimprimirBtn()
		if (!pageBtn) {
			showToast('Botão de imprimir não encontrado. Abrindo QR Code...', 'warn')
			fallbackQRPrint()
			return
		}

		showToast('Abrindo portal de impressão...', 'info')
		realClick(pageBtn)

		let modal
		try {
			modal = await waitForModal()
		} catch {
			showToast('Conexão lenta. Abrindo fallback de QR Code...', 'warn')
			fallbackQRPrint()
			return
		}

		try {
			await ensurePrinterSelected(savedPrinter)
		} catch (err) {
			showToast(`${err.message}. Abrindo QR Code...`, 'warn')
			const cb = getCancelButtonInsideModal(modal)
			cb && realClick(cb)
			fallbackQRPrint()
			return
		}

		const confirmBtn = getConfirmButtonInsideModal(getActiveModal())
		if (!confirmBtn) {
			showToast('Não foi possível confirmar. Abrindo QR Code...', 'warn')
			fallbackQRPrint()
			return
		}

		showToast(`Enviando ordem para: ${savedPrinter}...`, 'info')

		// ── Inicia observador ANTES de clicar para não perder o toast ──
		const responsePromise = waitForSiteResponseAfterClick()
		realClick(confirmBtn)

		const res = await responsePromise

		if (res.ok === true) {
			showToast(res.msg, 'success')
		} else if (res.ok === false) {
			showToast(res.msg, 'error')
			await sleep(500)
			fallbackQRPrint()
		} else {
			// Sem resposta clara — verifica se modal fechou (sinal de sucesso silencioso)
			await sleep(500)
			const stillOpen = !!getActiveModal()
			if (!stillOpen) showToast(`Impresso com sucesso em: ${savedPrinter}`, 'success')
			else {
				showToast('Sem resposta do painel. Gerando QR Code...', 'warn')
				fallbackQRPrint()
			}
		}
	}

	// =========================================================================
	// FALLBACK: QR CODE
	// =========================================================================
	function fallbackQRPrint() {
		const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&ecc=H&data=${encodeURIComponent(packageId)}`
		const w = window.open('', '_blank', 'width=640,height=760')

		w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>QR Code - ${packageId}</title>
<style>
  :root { --bg: #F3F4F6; --card: #FFFFFF; --text: #111827; --gray: #6B7280; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    display:flex; justify-content:center; align-items:center; min-height:100vh;
    background: var(--bg); font-family: system-ui, -apple-system, sans-serif;
  }
  .card {
    display:flex; flex-direction:column; align-items:center; gap:24px;
    padding:40px; background: var(--card); border-radius:24px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    max-width: 480px; width: 100%;
  }
  .header { text-align: center; width: 100%; border-bottom: 2px dashed #E5E7EB; padding-bottom: 24px; }
  .header h1 { font-size: 16px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 2px; }
  .qr-container { background: #fff; padding: 16px; border-radius: 16px; border: 1px solid #E5E7EB; }
  .qr-container img { width: 380px; height: 380px; display:block; }
  .label { font-size: 38px; font-weight: 800; letter-spacing: 2px; color: var(--text); text-align:center; font-family: 'Courier New', monospace; }

  @media print {
    body { background: #fff; }
    .card { box-shadow: none; border: 2px solid #000; border-radius: 12px; padding: 32px; margin: auto; }
    .header { border-bottom: 2px dashed #000; }
    .qr-container { border: none; padding: 0; }
    @page { margin: 0; size: auto; }
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
      <h1>Código do Pacote</h1>
  </div>
  <div class="qr-container">
    <img id="q" src="${qrUrl}" alt="QR Code"/>
  </div>
  <div class="label">${packageId}</div>
</div>
<script>
  document.getElementById('q').onload = () => setTimeout(() => { window.print(); window.close(); }, 500);
  document.getElementById('q').onerror = () => {
      document.body.innerHTML = '<div style="text-align:center; padding:40px; color:#EF4444; font-size:20px; font-family:sans-serif; background:#fff; border-radius:12px; margin:auto; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">Erro ao carregar o QR Code. Tente novamente.</div>';
  };
</script>
</body>
</html>`)
		w.document.close()
	}

	// =========================================================================
	// DEBUG MODAL (Alt + D)
	// =========================================================================
	function showDebugModal() {
		const debugData = []
		debugData.push(`URL: ${window.location.href}`)
		debugData.push(`Time: ${new Date().toISOString()}`)
		
		const testIdBtn = document.querySelector(`[data-testid="${PAGE_TOKENS.BTN_REPRINT_LABEL}"]`)
		debugData.push(`\n[data-testid="BTN_REPRINT_LABEL"]: ${testIdBtn ? 'Encontrado' : 'NÃO ENCONTRADO'}`)
		if (testIdBtn) {
			const rect = testIdBtn.getBoundingClientRect()
			debugData.push(` - Rect: w=${rect.width}, h=${rect.height}, t=${rect.top}`)
			debugData.push(` - Text: "${testIdBtn.textContent.trim()}"`)
		}

		debugData.push(`\nBotões (<button>, <a>, [role="button"]) na tela:`)
		const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], [class*="button"], [class*="btn"]'))
		debugData.push(`Total de botões/links encontrados: ${candidates.length}`)
		
		const filtered = candidates.filter(el => {
			const txt = el.textContent.trim()
			return txt && txt.length > 0 && txt.length < 50
		})
		
		filtered.forEach((el, index) => {
			const rect = el.getBoundingClientRect()
			const text = el.textContent.replace(/\s+/g, ' ').trim()
			const tag = el.tagName.toLowerCase()
			const classes = el.className?.toString?.() || ''
			debugData.push(`[${index}] <${tag}> | text: "${text}" | classes: "${classes}" | w:${rect.width} h:${rect.height}`)
		})

		const textToCopy = debugData.join('\n')

		const overlay = document.createElement('div')
		Object.assign(overlay.style, {
			position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
			background: 'rgba(0,0,0,0.8)', zIndex: '9999999',
			display: 'flex', justifyContent: 'center', alignItems: 'center'
		})
		
		const modal = document.createElement('div')
		Object.assign(modal.style, {
			background: '#fff', padding: '24px', borderRadius: '12px',
			width: '90%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '12px'
		})

		const title = document.createElement('h2')
		title.textContent = 'Modo de Debug - Elementos na Tela'
		title.style.margin = '0'

		const textarea = document.createElement('textarea')
		textarea.value = textToCopy
		Object.assign(textarea.style, {
			width: '100%', height: '400px', fontFamily: 'monospace',
			fontSize: '12px', padding: '8px', border: '1px solid #ccc', borderRadius: '8px'
		})

		const btnRow = document.createElement('div')
		btnRow.style.display = 'flex'
		btnRow.style.gap = '12px'
		btnRow.style.justifyContent = 'flex-end'

		const copyBtn = document.createElement('button')
		copyBtn.textContent = 'Copiar Resultados'
		Object.assign(copyBtn.style, {
			padding: '10px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer'
		})
		copyBtn.onclick = () => {
			navigator.clipboard.writeText(textToCopy).then(() => {
				copyBtn.textContent = 'Copiado!'
				setTimeout(() => copyBtn.textContent = 'Copiar Resultados', 2000)
			})
		}

		const closeBtn = document.createElement('button')
		closeBtn.textContent = 'Fechar'
		Object.assign(closeBtn.style, {
			padding: '10px 16px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer'
		})
		closeBtn.onclick = () => overlay.remove()

		btnRow.appendChild(copyBtn)
		btnRow.appendChild(closeBtn)
		
		modal.appendChild(title)
		modal.appendChild(textarea)
		modal.appendChild(btnRow)
		overlay.appendChild(modal)
		document.body.appendChild(overlay)
	}

	// =========================================================================
	// ATALHOS
	// =========================================================================
	document.addEventListener('keydown', e => {
		if (!e.altKey) return
		if (e.key.toLowerCase() === 'p') {
			e.preventDefault()
			tryPrintViaSite()
		}
		if (e.key.toLowerCase() === 'i') {
			e.preventDefault()
			openPrinterSelector()
		}
		if (e.key.toLowerCase() === 'd') {
			e.preventDefault()
			showDebugModal()
		}
	})
})()
