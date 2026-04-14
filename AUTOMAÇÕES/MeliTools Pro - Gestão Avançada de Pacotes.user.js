// ==UserScript==
// @name         MeliTools Pro - Gestão Avançada de Pacotes
// @namespace    https://debugzone.com.br/
// @version      3.2.2
// @description  Suite de ferramentas para gestão de pacotes no Mercado Livre: navegação rápida, alteração/verificação de status em lote, cópia inteligente de IDs, atalhos e muito mais.
// @author       LucasWG
// @match        https://envios.adminml.com/logistics/package-management*
// @match        https://shipping-bo.adminml.com/sauron/shipments/shipment/*
// @match        https://envios.adminml.com/logistics/packages/package-detail/*
// @match        https://envios.adminml.com/logistics/monitoring-distribution/detail/*
// @icon         https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/6.6.92/mercadolibre/favicon.svg
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

;(function () {
	'use strict'

	// ==========================================
	//  NAMESPACE PRINCIPAL
	// ==========================================
	const MeliTools = {
		// ==========================================
		//  CONFIGURAÇÕES GLOBAIS
		// ==========================================
		config: {
			DEBUG: false,
			VERSION: '3.2.2',
			SCRIPT_NAME: 'MeliTools Pro'
		},

		// ==========================================
		//  UTILITÁRIOS
		// ==========================================
		utils: {
			log: function (message) {
				if (MeliTools.config.DEBUG) {
					console.log(
						`%c[${MeliTools.config.SCRIPT_NAME} v${MeliTools.config.VERSION}]%c ${message}`,
						'color: #3483fa; font-weight: bold;',
						'color: inherit;'
					)
				}
			},

			sleep: function (ms) {
				return new Promise(resolve => setTimeout(resolve, ms))
			},

			isValidId: function (id) {
				return /^\d{11}$/.test(id)
			},

			copyToClipboard: async function (text, label = 'Texto') {
				try {
					if (typeof GM_setClipboard === 'function') {
						GM_setClipboard(text, 'text')
					} else {
						await navigator.clipboard.writeText(text)
					}
					MeliTools.toast.show(`${label} copiado: ${text}`, 'success')
					return true
				} catch (err) {
					try {
						const textarea = document.createElement('textarea')
						textarea.value = text
						textarea.style.cssText = 'position:fixed;opacity:0;left:-9999px'
						document.body.appendChild(textarea)
						textarea.select()
						document.execCommand('copy')
						document.body.removeChild(textarea)
						MeliTools.toast.show(`${label} copiado: ${text}`, 'success')
						return true
					} catch (e) {
						MeliTools.toast.show(`Falha ao copiar ${label}`, 'error')
						return false
					}
				}
			},

			extractIds: function (text) {
				const matches = text.match(/\b\d{11}\b/g)
				return matches ? [...new Set(matches)] : []
			}
		},

		// ==========================================
		//  SISTEMA DE TOAST / NOTIFICAÇÕES
		// ==========================================
		toast: {
			container: null,

			init: function () {
				if (this.container) return
				this.container = document.createElement('div')
				this.container.id = 'melitools-toast-container'
				document.body.appendChild(this.container)
			},

			show: function (message, type = 'info', duration = 2500) {
				this.init()
				const toast = document.createElement('div')
				toast.className = `melitools-toast melitools-toast--${type}`

				const icons = {
					success: '✅',
					error: '❌',
					info: 'ℹ️',
					warning: '⚠️'
				}

				toast.innerHTML = `
					<span class="melitools-toast__icon">${icons[type] || icons.info}</span>
					<span class="melitools-toast__message">${message}</span>
				`

				this.container.appendChild(toast)

				requestAnimationFrame(() => {
					toast.classList.add('melitools-toast--visible')
				})

				setTimeout(() => {
					toast.classList.remove('melitools-toast--visible')
					toast.classList.add('melitools-toast--exit')
					setTimeout(() => toast.remove(), 300)
				}, duration)
			}
		},

		// ==========================================
		//  SISTEMA DE MODAIS DE CONFIRMAÇÃO
		// ==========================================
		confirmModal: {
			show: function (options = {}) {
				return new Promise(resolve => {
					const {
						title = 'Confirmação',
						message = '',
						confirmText = 'Confirmar',
						cancelText = 'Cancelar',
						type = 'info',
						showCancel = true
					} = options

					const icons = {
						info: '📋',
						warning: '⚠️',
						danger: '🚨',
						success: '✅'
					}

					const overlay = document.createElement('div')
					overlay.className = 'melitools-confirm'

					overlay.innerHTML = `
						<div class="melitools-confirm__backdrop"></div>
						<div class="melitools-confirm__box melitools-confirm__box--${type}">
							<div class="melitools-confirm__header">
								<span class="melitools-confirm__icon">${icons[type] || icons.info}</span>
								<h3 class="melitools-confirm__title">${title}</h3>
							</div>
							<div class="melitools-confirm__body">${message}</div>
							<div class="melitools-confirm__footer">
								${showCancel ? `<button class="melitools-confirm__btn melitools-confirm__btn--cancel">${cancelText}</button>` : ''}
								<button class="melitools-confirm__btn melitools-confirm__btn--confirm melitools-confirm__btn--${type}">${confirmText}</button>
							</div>
						</div>
					`

					document.body.appendChild(overlay)

					requestAnimationFrame(() => {
						overlay.classList.add('melitools-confirm--visible')
					})

					const close = result => {
						overlay.classList.remove('melitools-confirm--visible')
						overlay.classList.add('melitools-confirm--closing')
						setTimeout(() => {
							overlay.remove()
							resolve(result)
						}, 200)
					}

					overlay
						.querySelector('.melitools-confirm__backdrop')
						?.addEventListener('click', () => close(false))

					const cancelBtn = overlay.querySelector('.melitools-confirm__btn--cancel')
					if (cancelBtn) cancelBtn.addEventListener('click', () => close(false))

					overlay
						.querySelector('.melitools-confirm__btn--confirm')
						?.addEventListener('click', () => close(true))

					const keyHandler = e => {
						if (e.key === 'Escape') {
							e.preventDefault()
							e.stopPropagation()
							document.removeEventListener('keydown', keyHandler, true)
							close(false)
						} else if (e.key === 'Enter') {
							e.preventDefault()
							e.stopPropagation()
							document.removeEventListener('keydown', keyHandler, true)
							close(true)
						}
					}
					document.addEventListener('keydown', keyHandler, true)

					setTimeout(() => {
						overlay.querySelector('.melitools-confirm__btn--confirm')?.focus()
					}, 100)
				})
			},

			alert: function (title, message, type = 'info') {
				return this.show({
					title,
					message,
					confirmText: 'OK',
					showCancel: false,
					type
				})
			}
		},

		// ==========================================
		//  MANIPULAÇÃO DO DOM
		// ==========================================
		dom: {
			waitForElement: function (selector, timeout = 5000) {
				return new Promise((resolve, reject) => {
					const element = document.querySelector(selector)
					if (element) {
						resolve(element)
						return
					}

					const observer = new MutationObserver((mutations, obs) => {
						const el = document.querySelector(selector)
						if (el) {
							obs.disconnect()
							clearTimeout(timer)
							resolve(el)
						}
					})

					const timer = setTimeout(() => {
						observer.disconnect()
						reject(new Error(`Elemento "${selector}" não encontrado em ${timeout}ms`))
					}, timeout)

					observer.observe(document.body, { childList: true, subtree: true })
				})
			},

			click: function (element) {
				if (!element) return
				element.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
				const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']
				events.forEach(type =>
					element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
				)
			}
		},

		// ==========================================
		//  NAVEGAÇÃO
		// ==========================================
		navigation: {
			redirectTo: function (url) {
				window.location.href = url
			}
		},

		// ==========================================
		//  MÓDULO: CONTROLE DA BARRA INFERIOR
		// ==========================================
		toolbarController: {
			config: {
				STORAGE_KEY: 'melitools_toolbar_open'
			},

			state: {
				isOpen: false,
				isScanning: false
			},

			init: function () {
				// Verifica a memória. Se não existir, define como false (fechada por padrão)
				const storedState = localStorage.getItem(this.config.STORAGE_KEY)
				this.state.isOpen = storedState === 'true'

				this.injectToggleButton()
				this.updateVisibility()
			},

			injectToggleButton: function () {
				if (document.getElementById('melitools-toolbar-toggle')) return

				const btn = document.createElement('button')
				btn.id = 'melitools-toolbar-toggle'
				btn.title = 'MeliTools Pro - Mostrar/Ocultar Barra Inferior'

				btn.addEventListener('click', () => this.toggle())
				document.body.appendChild(btn)
			},

			toggle: function () {
				this.state.isOpen = !this.state.isOpen
				localStorage.setItem(this.config.STORAGE_KEY, this.state.isOpen)
				this.updateVisibility()
			},

			updateVisibility: function () {
				const toolbar = document.getElementById('melitools-id-toolbar')
				const btn = document.getElementById('melitools-toolbar-toggle')

				// Ocultar tudo se houver um scan a decorrer
				this.state.isScanning = !!sessionStorage.getItem(
					MeliTools.packageStatusChanger.config.STORAGE_KEY
				)

				if (this.state.isScanning) {
					if (toolbar) toolbar.style.display = 'none'
					if (btn) btn.style.display = 'none'
				} else {
					if (btn) {
						btn.style.display = 'flex'
						// Ícone altera dependendo do estado
						btn.innerHTML = this.state.isOpen
							? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`
							: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`
					}
					if (toolbar) {
						toolbar.style.display = this.state.isOpen ? 'block' : 'none'
					}
				}
			}
		},

		// ==========================================
		//  MÓDULO: SMART ID DETECTOR & COPIER
		// ==========================================
		smartIdDetector: {
			config: {
				ID_PATTERN: /\b(\d{11})\b/
			},

			state: {
				detectedIds: [],
				pageId: null,
				buttonsInjected: false
			},

			init: function () {
				this.detectPageId()
				this.injectCopyButtons()
				this.injectIdToolbar()
				this.observeNewIds()
				MeliTools.utils.log('SmartIdDetector inicializado')
			},

			detectPageId: function () {
				const urlMatch = window.location.href.match(/(\d{11})/)
				if (urlMatch) {
					this.state.pageId = urlMatch[1]
					MeliTools.utils.log(`ID da página detectado: ${this.state.pageId}`)
				}
			},

			injectCopyButtons: function () {
				if (this.state.buttonsInjected) return
				setTimeout(() => {
					this.addCopyButtonsToPage()
					this.state.buttonsInjected = true
				}, 1500)
			},

			addCopyButtonsToPage: function () {
				const headerElements = document.querySelectorAll(
					'h1, h2, .package-detail__header, [class*="package"] [class*="title"], [class*="header"] [class*="id"], [class*="shipping-id"]'
				)
				headerElements.forEach(el => {
					const ids = MeliTools.utils.extractIds(el.textContent)
					ids.forEach(id => {
						if (!el.querySelector('.melitools-copy-btn')) {
							this.appendCopyButton(el, id)
						}
					})
				})

				const allSpans = document.querySelectorAll(
					'span, p, td, .andes-form-control__field'
				)
				allSpans.forEach(el => {
					if (
						el.closest(
							'.melitools-copy-btn, .melitools-toolbar, #melitools-toast-container, .melitools-psc-modal, #melitools-qn-display, #melitools-psc-progress, .melitools-confirm'
						)
					)
						return
					const text = el.textContent.trim()
					if (
						/^\d{11}$/.test(text) &&
						!el.querySelector('.melitools-copy-btn') &&
						!el.parentElement?.querySelector('.melitools-copy-btn')
					) {
						this.appendCopyButton(el, text)
					}
				})
			},

			appendCopyButton: function (parentEl, id) {
				if (parentEl.querySelector('.melitools-copy-btn')) return
				const btn = document.createElement('button')
				btn.className = 'melitools-copy-btn'
				btn.title = `Copiar ID: ${id}`
				btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
				btn.addEventListener('click', e => {
					e.preventDefault()
					e.stopPropagation()
					MeliTools.utils.copyToClipboard(id, 'ID do envio')
					btn.classList.add('melitools-copy-btn--copied')
					setTimeout(() => btn.classList.remove('melitools-copy-btn--copied'), 1500)
				})
				parentEl.style.position = parentEl.style.position || 'relative'
				parentEl.appendChild(btn)
			},

			injectIdToolbar: function () {
				if (!this.state.pageId) return
				if (document.getElementById('melitools-id-toolbar')) return

				const id = this.state.pageId
				const toolbar = document.createElement('div')
				toolbar.id = 'melitools-id-toolbar'
				toolbar.className = 'melitools-toolbar'

				toolbar.innerHTML = `
					<div class="melitools-toolbar__content">
						<div class="melitools-toolbar__id-section">
							<span class="melitools-toolbar__label">📦 Pacote</span>
							<span class="melitools-toolbar__id" title="Clique para copiar">${id}</span>
							<button class="melitools-toolbar__btn melitools-toolbar__btn--copy" title="Copiar ID">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
								Copiar
							</button>
						</div>
						<div class="melitools-toolbar__actions">
							<button class="melitools-toolbar__btn melitools-toolbar__btn--link" title="Abrir MeliTools Pro (Alt+Q)" data-action="openpsc">
								📦 Painel
							</button>
							<button class="melitools-toolbar__btn melitools-toolbar__btn--link" title="Abrir no Backoffice" data-action="backoffice">
								🔗 Backoffice
							</button>
							<button class="melitools-toolbar__btn melitools-toolbar__btn--link" title="Abrir no Audit-Trail" data-action="audit">
								📋 Audit-Trail
							</button>
							<button class="melitools-toolbar__btn melitools-toolbar__btn--link" title="Copiar URL desta página" data-action="copyurl">
								🌐 Copiar URL
							</button>
						</div>
					</div>
				`

				document.body.appendChild(toolbar)

				toolbar.querySelector('.melitools-toolbar__id').addEventListener('click', () => {
					MeliTools.utils.copyToClipboard(id, 'ID do envio')
				})

				toolbar
					.querySelector('.melitools-toolbar__btn--copy')
					.addEventListener('click', () => {
						MeliTools.utils.copyToClipboard(id, 'ID do envio')
					})

				toolbar.querySelectorAll('[data-action]').forEach(btn => {
					btn.addEventListener('click', () => {
						const action = btn.dataset.action
						if (action === 'backoffice') {
							window.open(
								`https://shipping-bo.adminml.com/sauron/shipments/shipment/${id}`,
								'_blank'
							)
						} else if (action === 'audit') {
							window.open(
								`https://envios.adminml.com/logistics/audit-trail/search?shipment_id=${id}`,
								'_blank'
							)
						} else if (action === 'copyurl') {
							MeliTools.utils.copyToClipboard(window.location.href, 'URL da página')
						} else if (action === 'openpsc') {
							MeliTools.packageStatusChanger.openModal()
						}
					})
				})

				// Certifica-se de que a barra assume o estado visual correto imediatamente
				MeliTools.toolbarController.updateVisibility()
			},

			observeNewIds: function () {
				let debounceTimer
				const observer = new MutationObserver(() => {
					clearTimeout(debounceTimer)
					debounceTimer = setTimeout(() => this.addCopyButtonsToPage(), 1500)
				})

				observer.observe(document.body, {
					childList: true,
					subtree: true
				})
			}
		},

		// ==========================================
		//  MÓDULO: QUICK NAVIGATOR
		// ==========================================
		quickNavigator: {
			config: {
				TIMEOUT_SECONDS: 4,
				ID_LENGTH: 11,
				REDIRECT_URL_BASE:
					'https://envios.adminml.com/logistics/package-management/package/'
			},

			state: {
				typedId: '',
				mainTimeout: null,
				countdownInterval: null,
				isRedirecting: false
			},

			display: null,

			init: function () {
				this.createDisplay()
				document.addEventListener('keydown', this.handleKeyDown.bind(this))
				document.addEventListener('paste', this.handlePaste.bind(this))
				MeliTools.utils.log('QuickNavigator inicializado')
			},

			createDisplay: function () {
				this.display = document.createElement('div')
				this.display.id = 'melitools-qn-display'
				this.display.style.display = 'none'
				document.body.appendChild(this.display)
			},

			showDisplay: function () {
				this.display.style.display = 'flex'
			},

			hideDisplay: function () {
				this.display.style.display = 'none'
			},

			updateDisplay: function (typedId, timeLeft) {
				const remainingDigits = this.config.ID_LENGTH - typedId.length
				const isInstant = timeLeft === '→'
				this.display.innerHTML = `
					<div class="melitools-qn__header">
						<span class="melitools-qn__icon">🚀</span>
						<span class="melitools-qn__title">Navegação Rápida</span>
					</div>
					<div class="melitools-qn__id">${typedId}${!isInstant ? '<span class="melitools-qn__cursor">|</span>' : ''}</div>
					<div class="melitools-qn__info">
						<span>${isInstant ? 'Redirecionando...' : `${remainingDigits} dígito${remainingDigits !== 1 ? 's' : ''} restante${remainingDigits !== 1 ? 's' : ''}`}</span>
						${!isInstant ? `<span class="melitools-qn__timer">${timeLeft}s</span>` : '<span class="melitools-qn__timer" style="color:#00a650;">✓</span>'}
					</div>
					<div class="melitools-qn__progress">
						<div class="melitools-qn__progress-bar" style="width: ${isInstant ? 100 : (typedId.length / this.config.ID_LENGTH) * 100}%"></div>
					</div>
				`
			},

			resetState: function () {
				clearTimeout(this.state.mainTimeout)
				clearInterval(this.state.countdownInterval)
				this.state.typedId = ''
				this.state.isRedirecting = false
				this.hideDisplay()
			},

			redirectToUrl: function (id) {
				MeliTools.utils.log(`Navegando para: ${id}`)
				MeliTools.navigation.redirectTo(`${this.config.REDIRECT_URL_BASE}${id}`)
			},

			isInputFocused: function () {
				const el = document.activeElement
				if (!el) return false
				const tag = el.tagName.toLowerCase()
				return ['input', 'textarea', 'select'].includes(tag) || el.isContentEditable
			},

			isModalOpen: function () {
				return !!document.querySelector('.melitools-psc-modal, .melitools-confirm')
			},

			handlePaste: function (event) {
				if (this.state.isRedirecting) return
				if (this.isInputFocused()) return
				if (this.isModalOpen()) return

				const pastedText = (event.clipboardData || window.clipboardData)
					?.getData('text')
					?.trim()
				if (!pastedText) return

				const ids = MeliTools.utils.extractIds(pastedText)

				if (ids.length === 1) {
					event.preventDefault()
					this.state.isRedirecting = true
					this.showDisplay()
					this.updateDisplay(ids[0], '→')
					setTimeout(() => {
						this.redirectToUrl(ids[0])
					}, 400)
				} else if (ids.length > 1) {
					event.preventDefault()
					MeliTools.toast.show(`${ids.length} IDs detectados — abrindo modal...`, 'info')
					setTimeout(() => {
						MeliTools.packageStatusChanger.openModalWithIds(ids)
					}, 300)
				}
			},

			handleKeyDown: function (event) {
				if (this.state.isRedirecting) return

				// ALT+Q → abrir / fechar modal do PSC
				if (event.altKey && (event.key === 'q' || event.key === 'Q')) {
					event.preventDefault()
					event.stopPropagation()
					if (MeliTools.packageStatusChanger.state.isModalOpen) {
						MeliTools.packageStatusChanger.closeModal()
					} else {
						MeliTools.packageStatusChanger.openModal()
					}
					return
				}

				if (this.isInputFocused()) return
				if (this.isModalOpen()) return

				if (!/^\d$/.test(event.key)) {
					if (this.state.typedId.length > 0) {
						this.resetState()
					}
					return
				}

				clearTimeout(this.state.mainTimeout)
				clearInterval(this.state.countdownInterval)

				if (this.state.typedId.length === 0) {
					this.showDisplay()
				}

				this.state.typedId += event.key

				let timeLeft = this.config.TIMEOUT_SECONDS
				this.updateDisplay(this.state.typedId, timeLeft)

				this.state.mainTimeout = setTimeout(
					() => this.resetState(),
					this.config.TIMEOUT_SECONDS * 1000
				)

				this.state.countdownInterval = setInterval(() => {
					timeLeft--
					this.updateDisplay(this.state.typedId, timeLeft)
					if (timeLeft <= 0) {
						clearInterval(this.state.countdownInterval)
					}
				}, 1000)

				if (this.state.typedId.length === this.config.ID_LENGTH) {
					this.state.isRedirecting = true
					this.redirectToUrl(this.state.typedId)
					this.resetState()
				}
			}
		},

		// ==========================================
		//  MÓDULO: PACKAGE STATUS CHANGER
		// ==========================================
		packageStatusChanger: {
			STATUS_OPTIONS: [
				'Aguardando boletim de ocorrência',
				'Aguardando documentação fiscal',
				'Aguardando documentação obrigatória por parte do seller',
				'Buffered',
				'Confiscado',
				'Entregue',
				'Faltante',
				'Multiguía',
				'No regulamento de sinistros por roubo',
				'Para despachar',
				'Para devolver',
				'Para solução de problemas',
				'Perdido',
				'Pertence a outra área',
				'Roubado'
			],

			config: {
				REDIRECT_URL_BASE:
					'https://envios.adminml.com/logistics/package-management/package/',
				STORAGE_KEY: 'psc_execution_data',
				FINAL_LOG_KEY: 'psc_final_log'
			},

			state: {
				isModalOpen: false,
				isProcessing: false
			},

			init: function () {
				this.processNextInQueue()
				MeliTools.utils.log('PackageStatusChanger inicializado')
			},

			openModal: function () {
				if (this.state.isModalOpen) return
				this.state.isModalOpen = true
				this.createModal()
			},

			openModalWithIds: function (ids) {
				if (this.state.isModalOpen) return
				this.state.isModalOpen = true
				this.createModal(ids)
			},

			closeModal: function () {
				// Atualiza de imediato para resolver a sincronização do Alt+Q
				this.state.isModalOpen = false
				const modal = document.querySelector('.melitools-psc-modal')
				if (modal) {
					modal.classList.add('melitools-psc-modal--closing')
					setTimeout(() => {
						modal.remove()
					}, 200)
				}
			},

			createModal: function (prefillIds = null) {
				const overlay = document.createElement('div')
				overlay.className = 'melitools-psc-modal'

				overlay.innerHTML = `
					<div class="melitools-psc-modal__backdrop"></div>
					<div class="melitools-psc-modal__container">
						<div class="melitools-psc-modal__header">
							<div class="melitools-psc-modal__header-left">
								<h2>📦 MeliTools Pro</h2>
								<span class="melitools-psc-modal__version">v${MeliTools.config.VERSION}</span>
							</div>
							<button class="melitools-psc-modal__close" title="Fechar (Esc)">&times;</button>
						</div>

						<div class="melitools-psc-modal__body">
							<div class="melitools-psc-modal__tabs">
								<button class="melitools-psc-modal__tab" data-tab="change">
									🔄 Alterar Status
								</button>
								<button class="melitools-psc-modal__tab melitools-psc-modal__tab--active" data-tab="verify">
									🔍 Verificar Status
								</button>
								<button class="melitools-psc-modal__tab" data-tab="shortcuts">
									⌨️ Atalhos
								</button>
							</div>

							<div class="melitools-psc-modal__tab-content" data-content="change" style="display:none;">
								<div class="melitools-psc-modal__field">
									<label>IDs dos Pacotes <small>(um por linha ou separados por vírgula/espaço)</small></label>
									<div class="melitools-psc-modal__textarea-wrapper">
										<textarea id="psc-ids-change" placeholder="Cole os IDs aqui...&#10;46728965867&#10;46728965868&#10;46728965869" rows="8"></textarea>
										<div class="melitools-psc-modal__textarea-actions">
											<button class="melitools-psc-modal__mini-btn" id="psc-paste-btn-change" title="Colar da área de transferência">📋 Colar</button>
											<button class="melitools-psc-modal__mini-btn" id="psc-clear-btn-change" title="Limpar campo">🗑️ Limpar</button>
											<span class="melitools-psc-modal__counter" id="psc-count-change">0 IDs</span>
										</div>
									</div>
								</div>
								<div class="melitools-psc-modal__field">
									<label>Status Destino</label>
									<select id="psc-status-select">
										<option value="" disabled selected>Selecione o status...</option>
										${this.STATUS_OPTIONS.map(s => `<option value="${s}">${s}</option>`).join('')}
									</select>
								</div>
								<button class="melitools-psc-modal__submit" id="psc-submit-change">
									🚀 Iniciar Alteração em Lote
								</button>
							</div>

							<div class="melitools-psc-modal__tab-content" data-content="verify">
								<div class="melitools-psc-modal__field">
									<label>IDs dos Pacotes <small>(um por linha ou separados por vírgula/espaço)</small></label>
									<div class="melitools-psc-modal__textarea-wrapper">
										<textarea id="psc-ids-verify" placeholder="Cole os IDs aqui...&#10;46728965867&#10;46728965868" rows="8"></textarea>
										<div class="melitools-psc-modal__textarea-actions">
											<button class="melitools-psc-modal__mini-btn" id="psc-paste-btn-verify" title="Colar da área de transferência">📋 Colar</button>
											<button class="melitools-psc-modal__mini-btn" id="psc-clear-btn-verify" title="Limpar campo">🗑️ Limpar</button>
											<span class="melitools-psc-modal__counter" id="psc-count-verify">0 IDs</span>
										</div>
									</div>
								</div>
								<button class="melitools-psc-modal__submit melitools-psc-modal__submit--verify" id="psc-submit-verify">
									🔍 Iniciar Verificação em Lote
								</button>
							</div>

							<div class="melitools-psc-modal__tab-content" data-content="shortcuts" style="display:none;">
								<div class="melitools-psc-modal__shortcuts-list">
									<div class="melitools-psc-modal__shortcut-item">
										<kbd>Alt + Q</kbd>
										<span>Abrir / fechar este modal</span>
									</div>
									<div class="melitools-psc-modal__shortcut-item">
										<kbd>0-9</kbd>
										<span>Navegação rápida — digite 11 dígitos para ir ao pacote</span>
									</div>
									<div class="melitools-psc-modal__shortcut-item">
										<kbd>Ctrl+V</kbd>
										<span>Cola um ID e navega automaticamente. Múltiplos IDs abrem o modal</span>
									</div>
									<div class="melitools-psc-modal__shortcut-item">
										<kbd>Bipe 📦</kbd>
										<span>Leitora de código de barras — bipa e navega direto ao pacote</span>
									</div>
									<div class="melitools-psc-modal__shortcut-item">
										<kbd>📋 Copiar</kbd>
										<span>Clique no ícone ao lado de qualquer ID para copiar</span>
									</div>
									<div class="melitools-psc-modal__shortcut-item">
										<kbd>Toolbar</kbd>
										<span>Barra inferior: copiar ID, URL, abrir Backoffice / Audit-Trail</span>
									</div>
									<div class="melitools-psc-modal__shortcut-item">
										<kbd>Enter</kbd>
										<span>Confirmar ação nos diálogos de confirmação</span>
									</div>
									<div class="melitools-psc-modal__shortcut-item">
										<kbd>Esc</kbd>
										<span>Fechar modal / cancelar ação</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				`

				document.body.appendChild(overlay)

				requestAnimationFrame(() => {
					overlay.classList.add('melitools-psc-modal--visible')
				})

				if (prefillIds && prefillIds.length > 0) {
					const verifyTextarea = overlay.querySelector('#psc-ids-verify')
					if (verifyTextarea) {
						verifyTextarea.value = prefillIds.join('\n')
						setTimeout(() => verifyTextarea.dispatchEvent(new Event('input')), 50)
					}
				}

				this.bindModalEvents(overlay)
			},

			bindModalEvents: function (modal) {
				// Fechar
				modal
					.querySelector('.melitools-psc-modal__backdrop')
					.addEventListener('click', () => this.closeModal())
				modal
					.querySelector('.melitools-psc-modal__close')
					.addEventListener('click', () => this.closeModal())

				// ESC para fechar
				const escHandler = e => {
					if (e.key === 'Escape' && !document.querySelector('.melitools-confirm')) {
						this.closeModal()
						document.removeEventListener('keydown', escHandler)
					}
				}
				document.addEventListener('keydown', escHandler)

				// Tabs
				modal.querySelectorAll('.melitools-psc-modal__tab').forEach(tab => {
					tab.addEventListener('click', () => {
						modal
							.querySelectorAll('.melitools-psc-modal__tab')
							.forEach(t => t.classList.remove('melitools-psc-modal__tab--active'))
						modal
							.querySelectorAll('.melitools-psc-modal__tab-content')
							.forEach(c => (c.style.display = 'none'))
						tab.classList.add('melitools-psc-modal__tab--active')
						modal.querySelector(`[data-content="${tab.dataset.tab}"]`).style.display =
							'block'
					})
				})

				// Contador de IDs
				const setupCounter = (textareaId, counterId) => {
					const textarea = modal.querySelector(`#${textareaId}`)
					const counter = modal.querySelector(`#${counterId}`)
					if (textarea && counter) {
						const update = () => {
							const ids = this.parseIds(textarea.value)
							counter.textContent = `${ids.length} ID${ids.length !== 1 ? 's' : ''}`
						}
						textarea.addEventListener('input', update)
						update()
					}
				}
				setupCounter('psc-ids-change', 'psc-count-change')
				setupCounter('psc-ids-verify', 'psc-count-verify')

				// Botões Colar
				const setupPaste = (btnId, textareaId) => {
					const btn = modal.querySelector(`#${btnId}`)
					if (btn) {
						btn.addEventListener('click', async () => {
							try {
								const text = await navigator.clipboard.readText()
								const textarea = modal.querySelector(`#${textareaId}`)
								if (textarea) {
									textarea.value = text
									textarea.dispatchEvent(new Event('input'))
								}
							} catch {
								MeliTools.toast.show(
									'Não foi possível acessar a área de transferência',
									'warning'
								)
							}
						})
					}
				}
				setupPaste('psc-paste-btn-change', 'psc-ids-change')
				setupPaste('psc-paste-btn-verify', 'psc-ids-verify')

				// Botões Limpar
				const setupClear = (btnId, textareaId) => {
					const btn = modal.querySelector(`#${btnId}`)
					if (btn) {
						btn.addEventListener('click', () => {
							const textarea = modal.querySelector(`#${textareaId}`)
							if (textarea) {
								textarea.value = ''
								textarea.dispatchEvent(new Event('input'))
								textarea.focus()
							}
						})
					}
				}
				setupClear('psc-clear-btn-change', 'psc-ids-change')
				setupClear('psc-clear-btn-verify', 'psc-ids-verify')

				// Submit Alterar
				modal.querySelector('#psc-submit-change')?.addEventListener('click', () => {
					const idsText = modal.querySelector('#psc-ids-change')?.value || ''
					const status = modal.querySelector('#psc-status-select')?.value || ''
					this.startExecution(idsText, status, false)
				})

				// Submit Verificar
				modal.querySelector('#psc-submit-verify')?.addEventListener('click', () => {
					const idsText = modal.querySelector('#psc-ids-verify')?.value || ''
					this.startExecution(idsText, null, true)
				})
			},

			parseIds: function (text) {
				if (!text || !text.trim()) return []
				return text
					.split(/[\s,;\n\r\t]+/)
					.map(id => id.trim())
					.filter(id => /^\d{11}$/.test(id))
					.filter((id, index, self) => self.indexOf(id) === index)
			},

			startExecution: async function (idsText, targetStatus, isVerificationOnly) {
				const ids = this.parseIds(idsText)

				if (ids.length === 0) {
					MeliTools.toast.show(
						'Nenhum ID válido encontrado (esperado: 11 dígitos)',
						'error'
					)
					return
				}

				if (!isVerificationOnly && !targetStatus) {
					MeliTools.toast.show('Selecione um status destino', 'error')
					return
				}

				const action = isVerificationOnly ? 'verificar' : 'alterar'
				const statusInfo = isVerificationOnly
					? ''
					: `<div class="melitools-confirm__status-tag">→ ${targetStatus}</div>`

				const maxPreview = 8
				const previewIds = ids.slice(0, maxPreview)
				const remaining = ids.length - maxPreview

				let idsPreview = `<div class="melitools-confirm__ids-list">`
				previewIds.forEach(id => {
					idsPreview += `<code class="melitools-confirm__id-chip">${id}</code>`
				})
				if (remaining > 0) {
					idsPreview += `<code class="melitools-confirm__id-chip melitools-confirm__id-chip--more">+${remaining} mais</code>`
				}
				idsPreview += `</div>`

				const confirmed = await MeliTools.confirmModal.show({
					title: `${isVerificationOnly ? '🔍' : '🔄'} ${isVerificationOnly ? 'Verificar' : 'Alterar'} Status`,
					message: `
						<div class="melitools-confirm__detail">
							<div class="melitools-confirm__detail-row">
								<span class="melitools-confirm__detail-label">Ação</span>
								<span class="melitools-confirm__detail-value">${action === 'verificar' ? 'Verificar status atual' : 'Alterar status'}</span>
							</div>
							<div class="melitools-confirm__detail-row">
								<span class="melitools-confirm__detail-label">Pacotes</span>
								<span class="melitools-confirm__detail-value"><strong>${ids.length}</strong> pacote${ids.length !== 1 ? 's' : ''}</span>
							</div>
							${statusInfo}
						</div>
						${idsPreview}
					`,
					confirmText: `${isVerificationOnly ? '🔍 Verificar' : '🚀 Alterar'} ${ids.length} pacote${ids.length !== 1 ? 's' : ''}`,
					cancelText: 'Cancelar',
					type: isVerificationOnly ? 'info' : 'warning'
				})

				if (!confirmed) return

				const executionData = {
					ids,
					targetStatus,
					isVerificationOnly,
					currentIndex: 0,
					logs: [],
					reconfirmingId: null
				}

				sessionStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(executionData))
				this.closeModal()

				await MeliTools.utils.sleep(300)
				this.processNextInQueue()
			},

			processNextInQueue: function () {
				const finalLog = sessionStorage.getItem(this.config.FINAL_LOG_KEY)
				if (finalLog) {
					sessionStorage.removeItem(this.config.FINAL_LOG_KEY)
					try {
						const { logs, isVerificationOnly } = JSON.parse(finalLog)
						this.showFinalReport(logs, isVerificationOnly)
					} catch (e) {
						MeliTools.utils.log(`Erro ao exibir log final: ${e.message}`)
					}
					return
				}

				const data = sessionStorage.getItem(this.config.STORAGE_KEY)
				if (!data) return

				try {
					const executionData = JSON.parse(data)
					const { ids, currentIndex } = executionData

					if (currentIndex >= ids.length) {
						sessionStorage.removeItem(this.config.STORAGE_KEY)
						sessionStorage.setItem(
							this.config.FINAL_LOG_KEY,
							JSON.stringify({
								logs: executionData.logs,
								isVerificationOnly: executionData.isVerificationOnly
							})
						)
						try {
							this.hideProgressDisplay()
						} catch (e) {}
						window.location.reload()
						return
					}

					this.routeExecution(executionData)
				} catch (e) {
					MeliTools.utils.log(`Erro ao processar fila: ${e.message}`)
					sessionStorage.removeItem(this.config.STORAGE_KEY)
				}
			},

			routeExecution: function (data) {
				const { ids, currentIndex, isVerificationOnly, reconfirmingId } = data
				const currentUrl = window.location.href
				const currentUrlId = (currentUrl.match(/(\d{11})$/) || [])[1]

				// Verifica se a página atual é efetivamente do sistema de gestão do primeiro ID
				const isOnCorrectPage =
					currentUrl.startsWith(this.config.REDIRECT_URL_BASE) &&
					currentUrlId === ids[currentIndex]

				if (ids && ids.length > 0) {
					const remaining = Math.max(0, ids.length - currentIndex)
					this.showProgressDisplay(remaining, ids.length, currentIndex)
				}

				if (
					!isVerificationOnly &&
					reconfirmingId &&
					isOnCorrectPage &&
					currentUrlId === reconfirmingId
				) {
					this.verifyStatusAndContinue(data)
					return
				}

				if (isOnCorrectPage) {
					if (isVerificationOnly) {
						this.verifyStatusOnPage(data)
					} else {
						this.changeStatusOnPage(data)
					}
				} else if (currentIndex < ids.length) {
					// Caso a página atual seja qualquer outra coisa, forçamos o redirecionamento.
					const nextId = ids[currentIndex]
					const url = `${this.config.REDIRECT_URL_BASE}${nextId}`
					MeliTools.utils.log(`Navegando para o pacote: ${nextId}`)
					MeliTools.navigation.redirectTo(url)
				} else {
					sessionStorage.removeItem(this.config.STORAGE_KEY)
					sessionStorage.setItem(
						this.config.FINAL_LOG_KEY,
						JSON.stringify({
							logs: data.logs,
							isVerificationOnly: data.isVerificationOnly
						})
					)
					try {
						this.hideProgressDisplay()
					} catch (e) {}
					window.location.reload()
				}
			},

			verifyStatusOnPage: async function (executionData) {
				const { ids, currentIndex } = executionData
				const currentId = ids[currentIndex]
				let logEntry = { id: currentId, message: '', type: 'info' }
				let finalStatus = 'Falha na Verificação'

				try {
					let currentStatus = null

					try {
						MeliTools.utils.log(`Buscando input para ${currentId}...`)
						const container = await MeliTools.dom.waitForElement(
							'.package-status-input--status',
							3000
						)

						if (container) {
							const inputElement = container.querySelector(
								'input.andes-form-control__field'
							)

							if (inputElement && inputElement.value) {
								currentStatus = inputElement.value.trim()
								MeliTools.utils.log(`Status obtido do input: ${currentStatus}`)
							}
						}
					} catch (inputError) {
						MeliTools.utils.log(`Erro ao buscar input: ${inputError.message}`)
					}

					if (!currentStatus) {
						try {
							MeliTools.utils.log(`Tentando dropdown para ${currentId}...`)
							const statusElement = await MeliTools.dom.waitForElement(
								'.package-status-input--status .andes-dropdown__display-values',
								5000
							)
							currentStatus = statusElement.textContent.trim()
							MeliTools.utils.log(`Status obtido do dropdown: ${currentStatus}`)
						} catch (dropdownError) {
							MeliTools.utils.log(`Erro ao buscar dropdown: ${dropdownError.message}`)
						}
					}

					if (currentStatus) {
						finalStatus = currentStatus
						logEntry = { message: `${currentId}`, type: 'info' }
					} else {
						throw new Error('Não foi possível obter o status por nenhum método')
					}
				} catch (error) {
					MeliTools.utils.log(
						`Erro ao verificar status de ${currentId}: ${error.message}`
					)
					logEntry = {
						message: `${currentId}: Não foi possível verificar o status.`,
						type: 'error'
					}
				} finally {
					this.updateExecutionData(executionData, logEntry, true, finalStatus)
					await MeliTools.utils.sleep(500)
					this.processNextInQueue()
				}
			},

			changeStatusOnPage: async function (executionData) {
				const { ids, targetStatus, currentIndex } = executionData
				const currentId = ids[currentIndex]
				let finalStatus = 'Falha na Alteração'

				try {
					const statusElement = await MeliTools.dom.waitForElement(
						'.package-status-input--status .andes-dropdown__display-values',
						8000
					)
					const currentStatus = statusElement.textContent.trim()
					finalStatus = currentStatus

					if (currentStatus === targetStatus) {
						const logEntry = { message: `${currentId}`, type: 'success' }
						this.updateExecutionData(executionData, logEntry, true, targetStatus)
						await MeliTools.utils.sleep(500)
						this.processNextInQueue()
						return
					}

					MeliTools.dom.click(
						await MeliTools.dom.waitForElement(
							'.package-status-input--status .andes-dropdown__trigger'
						)
					)
					const optionList = await MeliTools.dom.waitForElement(
						'[role="listbox"].andes-list'
					)
					const targetOption = [
						...optionList.querySelectorAll('[role="option"].andes-list__item')
					].find(opt => opt.textContent.trim() === targetStatus)

					if (!targetOption) {
						throw new Error(`Opção "${targetStatus}" não encontrada no dropdown`)
					}

					MeliTools.dom.click(targetOption)
					await MeliTools.utils.sleep(800)

					const saveButton = await MeliTools.dom.waitForElement(
						'button.andes-button--loud',
						5000
					)
					MeliTools.dom.click(saveButton)
					await MeliTools.utils.sleep(1500)

					executionData.reconfirmingId = currentId
					sessionStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(executionData))

					window.location.reload()
				} catch (error) {
					MeliTools.utils.log(`Erro ao alterar status de ${currentId}: ${error.message}`)
					const logEntry = {
						message: `${currentId}: Erro - ${error.message}`,
						type: 'error'
					}
					this.updateExecutionData(executionData, logEntry, true, finalStatus)
					await MeliTools.utils.sleep(500)
					this.processNextInQueue()
				}
			},

			verifyStatusAndContinue: async function (executionData) {
				const { ids, targetStatus, currentIndex } = executionData
				const currentId = ids[currentIndex]
				let finalStatus = 'Falha na Verificação'

				try {
					const statusElement = await MeliTools.dom.waitForElement(
						'.package-status-input--status .andes-dropdown__display-values',
						8000
					)
					const currentStatus = statusElement.textContent.trim()
					finalStatus = currentStatus

					const logEntry = {
						message: `${currentId}`,
						type: currentStatus === targetStatus ? 'success' : 'warning'
					}

					executionData.reconfirmingId = null
					this.updateExecutionData(executionData, logEntry, true, finalStatus)
					await MeliTools.utils.sleep(500)
					this.processNextInQueue()
				} catch (error) {
					MeliTools.utils.log(
						`Erro ao verificar reconfirmação de ${currentId}: ${error.message}`
					)
					const logEntry = {
						message: `${currentId}: Erro na verificação pós-alteração`,
						type: 'error'
					}
					executionData.reconfirmingId = null
					this.updateExecutionData(executionData, logEntry, true, finalStatus)
					await MeliTools.utils.sleep(500)
					this.processNextInQueue()
				}
			},

			updateExecutionData: function (data, logEntry, advance = false, status = null) {
				if (logEntry) {
					if (status) logEntry.status = status
					data.logs.push(logEntry)
				}
				if (advance) data.currentIndex++
				data.reconfirmingId = data.reconfirmingId || null
				sessionStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(data))
			},

			showProgressDisplay: function (remaining, total, currentIndex) {
				let display = document.getElementById('melitools-psc-progress')
				if (!display) {
					display = document.createElement('div')
					display.id = 'melitools-psc-progress'
					document.body.appendChild(display)
				}

				const processed = total ? currentIndex || 0 : 0
				const percent = total ? Math.round((processed / total) * 100) : 0

				display.innerHTML = `
					<div class="melitools-progress__content">
						<span class="melitools-progress__spinner"></span>
						<span>Processando... <strong>${remaining}</strong> de <strong>${total || remaining}</strong> restante${remaining !== 1 ? 's' : ''}</span>
						<div class="melitools-progress__bar-wrapper">
							<div class="melitools-progress__bar" style="width: ${percent}%"></div>
						</div>
						<span class="melitools-progress__percent">${percent}%</span>
						<button class="melitools-progress__cancel" title="Cancelar execução">✕</button>
					</div>
				`
				display.style.display = 'flex'

				display
					.querySelector('.melitools-progress__cancel')
					?.addEventListener('click', async () => {
						const confirmed = await MeliTools.confirmModal.show({
							title: '⏹️ Cancelar Execução',
							message:
								'<p>Deseja cancelar a execução em andamento?</p><p style="color:#999;font-size:12px;">Os pacotes já processados serão mantidos no relatório.</p>',
							confirmText: 'Sim, cancelar',
							cancelText: 'Não, continuar',
							type: 'danger'
						})

						if (confirmed) {
							const data = sessionStorage.getItem(this.config.STORAGE_KEY)
							if (data) {
								const executionData = JSON.parse(data)
								sessionStorage.removeItem(this.config.STORAGE_KEY)
								sessionStorage.setItem(
									this.config.FINAL_LOG_KEY,
									JSON.stringify({
										logs: executionData.logs,
										isVerificationOnly: executionData.isVerificationOnly
									})
								)
							} else {
								sessionStorage.removeItem(this.config.STORAGE_KEY)
							}
							window.location.reload()
						}
					})
			},

			hideProgressDisplay: function () {
				const display = document.getElementById('melitools-psc-progress')
				if (display) display.style.display = 'none'
			},

			showFinalReport: function (logs, isVerificationOnly) {
				const overlay = document.createElement('div')
				overlay.className = 'melitools-psc-modal melitools-psc-modal--visible'

				const title = isVerificationOnly
					? '🔍 Relatório de Verificação'
					: '📊 Relatório de Alteração'

				const statusGroups = {}
				logs.forEach(log => {
					const status = log.status || 'Desconhecido'
					if (!statusGroups[status]) statusGroups[status] = []
					statusGroups[status].push(log)
				})

				const successCount = logs.filter(l => l.type === 'success').length
				const errorCount = logs.filter(l => l.type === 'error').length
				const warningCount = logs.filter(l => l.type === 'warning').length
				const infoCount = logs.filter(l => l.type === 'info').length

				let reportHTML = `
					<div class="melitools-report__summary">
						<div class="melitools-report__stat melitools-report__stat--total">
							<span class="melitools-report__stat-value">${logs.length}</span>
							<span class="melitools-report__stat-label">Total</span>
						</div>
						${successCount > 0 ? `<div class="melitools-report__stat melitools-report__stat--success"><span class="melitools-report__stat-value">${successCount}</span><span class="melitools-report__stat-label">Sucesso</span></div>` : ''}
						${infoCount > 0 ? `<div class="melitools-report__stat melitools-report__stat--info"><span class="melitools-report__stat-value">${infoCount}</span><span class="melitools-report__stat-label">Verificados</span></div>` : ''}
						${warningCount > 0 ? `<div class="melitools-report__stat melitools-report__stat--warning"><span class="melitools-report__stat-value">${warningCount}</span><span class="melitools-report__stat-label">Alerta</span></div>` : ''}
						${errorCount > 0 ? `<div class="melitools-report__stat melitools-report__stat--error"><span class="melitools-report__stat-value">${errorCount}</span><span class="melitools-report__stat-label">Erro</span></div>` : ''}
					</div>
				`

				Object.entries(statusGroups)
					.sort(([, a], [, b]) => b.length - a.length)
					.forEach(([status, items]) => {
						const ids = items.map(i => {
							const idMatch = i.message.match(/\d{11}/)
							return idMatch ? idMatch[0] : i.message
						})

						reportHTML += `
						<div class="melitools-report__group">
							<div class="melitools-report__group-header">
								<span class="melitools-report__group-status">${status}</span>
								<span class="melitools-report__group-count">${items.length}</span>
								<button class="melitools-report__copy-group" data-ids="${ids.join(',')}" title="Copiar todos os IDs deste grupo">
									📋 Copiar IDs
								</button>
							</div>
							<div class="melitools-report__group-ids">
								${items
									.map(item => {
										const typeClass = `melitools-report__item--${item.type}`
										return `<span class="melitools-report__item ${typeClass}" title="${item.message}">${item.message.substring(0, 40)}</span>`
									})
									.join('')}
							</div>
						</div>
					`
					})

				const allIds = logs
					.map(l => {
						const m = l.message.match(/\d{11}/)
						return m ? m[0] : ''
					})
					.filter(Boolean)

				overlay.innerHTML = `
					<div class="melitools-psc-modal__backdrop"></div>
					<div class="melitools-psc-modal__container melitools-psc-modal__container--report">
						<div class="melitools-psc-modal__header">
							<h2>${title}</h2>
							<button class="melitools-psc-modal__close">&times;</button>
						</div>
						<div class="melitools-psc-modal__body">
							${reportHTML}
							<div class="melitools-report__actions">
								<button class="melitools-psc-modal__submit" id="report-copy-all">
									📋 Copiar Todos os IDs (${allIds.length})
								</button>
								<button class="melitools-psc-modal__submit melitools-psc-modal__submit--secondary" id="report-copy-report">
									📄 Copiar Relatório
								</button>
							</div>
						</div>
					</div>
				`

				document.body.appendChild(overlay)

				overlay
					.querySelector('.melitools-psc-modal__backdrop')
					.addEventListener('click', () => overlay.remove())
				overlay
					.querySelector('.melitools-psc-modal__close')
					.addEventListener('click', () => overlay.remove())

				const escHandler = e => {
					if (e.key === 'Escape' && !document.querySelector('.melitools-confirm')) {
						overlay.remove()
						document.removeEventListener('keydown', escHandler)
					}
				}
				document.addEventListener('keydown', escHandler)

				overlay.querySelectorAll('.melitools-report__copy-group').forEach(btn => {
					btn.addEventListener('click', () => {
						const ids = btn.dataset.ids
						MeliTools.utils.copyToClipboard(ids.replace(/,/g, '\n'), 'IDs do grupo')
					})
				})

				overlay.querySelector('#report-copy-all')?.addEventListener('click', () => {
					MeliTools.utils.copyToClipboard(allIds.join('\n'), `${allIds.length} IDs`)
				})

				overlay.querySelector('#report-copy-report')?.addEventListener('click', () => {
					let report = `${title}\n${'='.repeat(40)}\n\n`
					report += `Total: ${logs.length} | Sucesso: ${successCount} | Erro: ${errorCount}\n\n`

					Object.entries(statusGroups).forEach(([status, items]) => {
						report += `--- ${status} (${items.length}) ---\n`
						items.forEach(i => {
							report += `  ${i.message}\n`
						})
						report += '\n'
					})

					MeliTools.utils.copyToClipboard(report, 'Relatório completo')
				})
			}
		}
	}

	// ==========================================
	//  ESTILOS CSS
	// ==========================================
	GM_addStyle(`
		/* ===== TOAST NOTIFICATIONS ===== */
		#melitools-toast-container {
			position: fixed;
			top: 16px;
			right: 16px;
			z-index: 99999999;
			display: flex;
			flex-direction: column;
			gap: 8px;
			pointer-events: none;
		}

		.melitools-toast {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 10px 16px;
			border-radius: 8px;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
			font-size: 13px;
			font-weight: 500;
			color: #fff;
			box-shadow: 0 4px 16px rgba(0,0,0,0.2);
			pointer-events: auto;
			opacity: 0;
			transform: translateX(100%);
			transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
			max-width: 380px;
		}

		.melitools-toast--visible { opacity: 1; transform: translateX(0); }
		.melitools-toast--exit { opacity: 0; transform: translateX(100%); }
		.melitools-toast--success { background: #00a650; }
		.melitools-toast--error { background: #f23d4f; }
		.melitools-toast--info { background: #3483fa; }
		.melitools-toast--warning { background: #ff7733; }
		.melitools-toast__icon { font-size: 16px; flex-shrink: 0; }
		.melitools-toast__message { flex: 1; line-height: 1.3; }

		/* ===== CONFIRM MODAL ===== */
		.melitools-confirm {
			position: fixed;
			inset: 0;
			z-index: 99999999;
			display: flex;
			align-items: center;
			justify-content: center;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		.melitools-confirm--visible { opacity: 1; }
		.melitools-confirm--closing { opacity: 0; }

		.melitools-confirm__backdrop {
			position: absolute;
			inset: 0;
			background: rgba(0,0,0,0.5);
			backdrop-filter: blur(3px);
		}

		.melitools-confirm__box {
			position: relative;
			background: #fff;
			border-radius: 16px;
			width: 90%;
			max-width: 460px;
			max-height: 80vh;
			overflow-y: auto;
			box-shadow: 0 24px 80px rgba(0,0,0,0.25);
			animation: melitools-confirmIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-confirm__box::-webkit-scrollbar { width: 6px; }
		.melitools-confirm__box::-webkit-scrollbar-track { background: transparent; }
		.melitools-confirm__box::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
		.melitools-confirm__box::-webkit-scrollbar-thumb:hover { background: #bbb; }
		.melitools-confirm__box { scrollbar-width: thin; scrollbar-color: #ddd transparent; }

		@keyframes melitools-confirmIn {
			from { transform: scale(0.95) translateY(10px); opacity: 0; }
			to { transform: scale(1) translateY(0); opacity: 1; }
		}

		.melitools-confirm__header {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 20px 24px 12px;
		}

		.melitools-confirm__icon { font-size: 24px; }

		.melitools-confirm__title {
			margin: 0;
			font-size: 17px;
			font-weight: 700;
			color: #1a1a2e;
		}

		.melitools-confirm__body {
			padding: 0 24px 16px;
			font-size: 14px;
			color: #555;
			line-height: 1.5;
		}

		.melitools-confirm__body p {
			margin: 0 0 8px;
		}

		.melitools-confirm__detail {
			background: #f8f9fa;
			border-radius: 10px;
			padding: 12px 14px;
			margin-bottom: 12px;
		}

		.melitools-confirm__detail-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 4px 0;
		}

		.melitools-confirm__detail-row + .melitools-confirm__detail-row {
			border-top: 1px solid #eee;
			margin-top: 4px;
			padding-top: 8px;
		}

		.melitools-confirm__detail-label {
			font-size: 12px;
			font-weight: 600;
			color: #999;
			text-transform: uppercase;
			letter-spacing: 0.3px;
		}

		.melitools-confirm__detail-value {
			font-size: 13px;
			font-weight: 600;
			color: #333;
		}

		.melitools-confirm__status-tag {
			margin-top: 8px;
			padding: 8px 12px;
			background: linear-gradient(135deg, #e8f2ff, #dbeafe);
			border-radius: 8px;
			color: #2968c8;
			font-size: 13px;
			font-weight: 700;
			text-align: center;
			border: 1px solid rgba(52, 131, 250, 0.2);
		}

		.melitools-confirm__ids-list {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
			margin-top: 4px;
		}

		.melitools-confirm__id-chip {
			display: inline-block;
			padding: 4px 10px;
			background: #f0f0f0;
			border-radius: 6px;
			font-size: 12px;
			font-family: 'SF Mono', 'Consolas', monospace;
			color: #444;
			font-weight: 500;
		}

		.melitools-confirm__id-chip--more {
			background: #e8f2ff;
			color: #3483fa;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
			font-weight: 600;
		}

		.melitools-confirm__footer {
			display: flex;
			gap: 8px;
			padding: 16px 24px 20px;
			justify-content: flex-end;
		}

		.melitools-confirm__btn {
			padding: 10px 20px;
			border: none;
			border-radius: 8px;
			font-size: 13px;
			font-weight: 700;
			cursor: pointer;
			transition: all 0.2s;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-confirm__btn:focus {
			outline: 2px solid #3483fa;
			outline-offset: 2px;
		}

		.melitools-confirm__btn--cancel {
			background: #f0f0f0;
			color: #555;
		}

		.melitools-confirm__btn--cancel:hover {
			background: #e5e5e5;
			color: #333;
		}

		.melitools-confirm__btn--confirm {
			color: #fff;
		}

		.melitools-confirm__btn--info { background: linear-gradient(135deg, #3483fa, #2968c8); }
		.melitools-confirm__btn--info:hover { box-shadow: 0 4px 12px rgba(52,131,250,0.4); }

		.melitools-confirm__btn--warning { background: linear-gradient(135deg, #ff7733, #e5662e); }
		.melitools-confirm__btn--warning:hover { box-shadow: 0 4px 12px rgba(255,119,51,0.4); }

		.melitools-confirm__btn--danger { background: linear-gradient(135deg, #f23d4f, #d63344); }
		.melitools-confirm__btn--danger:hover { box-shadow: 0 4px 12px rgba(242,61,79,0.4); }

		.melitools-confirm__btn--success { background: linear-gradient(135deg, #00a650, #008a42); }
		.melitools-confirm__btn--success:hover { box-shadow: 0 4px 12px rgba(0,166,80,0.4); }

		/* ===== COPY BUTTONS (inline) ===== */
		.melitools-copy-btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 22px;
			height: 22px;
			margin-left: 4px;
			padding: 0;
			border: none;
			border-radius: 4px;
			background: rgba(52, 131, 250, 0.1);
			color: #3483fa;
			cursor: pointer;
			vertical-align: middle;
			transition: all 0.2s;
			flex-shrink: 0;
		}

		.melitools-copy-btn:hover {
			background: rgba(52, 131, 250, 0.2);
			transform: scale(1.1);
		}

		.melitools-copy-btn--copied {
			background: rgba(0, 166, 80, 0.15) !important;
			color: #00a650 !important;
		}

		/* ===== ID TOOLBAR (barra inferior) ===== */
		.melitools-toolbar {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			z-index: 99998;
			background: #1a1a2e;
			border-top: 2px solid #3483fa;
			box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-toolbar__content {
			display: flex;
			align-items: center;
			justify-content: space-between;
			max-width: 1200px;
			margin: 0 auto;
			padding: 8px 20px;
			gap: 16px;
		}

		.melitools-toolbar__id-section {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.melitools-toolbar__label {
			color: #a0a0b8;
			font-size: 12px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.melitools-toolbar__id {
			color: #fff;
			font-size: 16px;
			font-weight: 700;
			font-family: 'SF Mono', 'Consolas', monospace;
			cursor: pointer;
			padding: 4px 10px;
			border-radius: 6px;
			background: rgba(52, 131, 250, 0.15);
			border: 1px solid rgba(52, 131, 250, 0.3);
			transition: all 0.2s;
			user-select: all;
		}

		.melitools-toolbar__id:hover {
			background: rgba(52, 131, 250, 0.25);
			border-color: #3483fa;
		}

		.melitools-toolbar__actions {
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.melitools-toolbar__btn {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 6px 12px;
			border: 1px solid rgba(255,255,255,0.1);
			border-radius: 6px;
			background: rgba(255,255,255,0.05);
			color: #d0d0e0;
			font-size: 12px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
			white-space: nowrap;
		}

		.melitools-toolbar__btn:hover {
			background: rgba(255,255,255,0.1);
			border-color: rgba(255,255,255,0.2);
			color: #fff;
		}

		.melitools-toolbar__btn--copy {
			background: rgba(52, 131, 250, 0.2);
			border-color: rgba(52, 131, 250, 0.4);
			color: #7ab8ff;
		}

		.melitools-toolbar__btn--copy:hover {
			background: rgba(52, 131, 250, 0.35);
			color: #fff;
		}

		/* ===== QUICK NAVIGATOR ===== */
		#melitools-qn-display {
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			z-index: 99999999;
			background: #1a1a2e;
			border: 2px solid #3483fa;
			border-radius: 16px;
			padding: 24px 32px;
			min-width: 320px;
			box-shadow: 0 20px 60px rgba(0,0,0,0.5);
			font-family: 'Proxima Nova', -apple-system, sans-serif;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 12px;
			animation: melitools-fadeIn 0.2s ease;
		}

		@keyframes melitools-fadeIn {
			from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
			to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
		}

		.melitools-qn__header { display: flex; align-items: center; gap: 8px; }
		.melitools-qn__icon { font-size: 20px; }
		.melitools-qn__title {
			color: #a0a0b8;
			font-size: 13px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.melitools-qn__id {
			color: #fff;
			font-size: 28px;
			font-weight: 700;
			font-family: 'SF Mono', 'Consolas', monospace;
			letter-spacing: 2px;
		}

		.melitools-qn__cursor {
			color: #3483fa;
			animation: melitools-blink 1s infinite;
		}

		@keyframes melitools-blink {
			0%, 50% { opacity: 1; }
			51%, 100% { opacity: 0; }
		}

		.melitools-qn__info {
			display: flex;
			justify-content: space-between;
			width: 100%;
			color: #a0a0b8;
			font-size: 12px;
		}

		.melitools-qn__timer { color: #ff7733; font-weight: 700; }

		.melitools-qn__progress {
			width: 100%;
			height: 4px;
			background: rgba(255,255,255,0.1);
			border-radius: 2px;
			overflow: hidden;
		}

		.melitools-qn__progress-bar {
			height: 100%;
			background: linear-gradient(90deg, #3483fa, #00a650);
			border-radius: 2px;
			transition: width 0.15s ease;
		}

		/* ===== TOOLBAR TOGGLE BUTTON ===== */
		#melitools-toolbar-toggle {
			position: fixed;
			bottom: 60px;
			right: 20px;
			z-index: 99997;
			width: 50px;
			height: 50px;
			border-radius: 50%;
			border: none;
			background: linear-gradient(135deg, #3483fa, #2968c8);
			color: white;
			cursor: pointer;
			box-shadow: 0 4px 16px rgba(52, 131, 250, 0.4);
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		}

		#melitools-toolbar-toggle:hover {
			transform: scale(1.1);
			box-shadow: 0 6px 24px rgba(52, 131, 250, 0.6);
		}

		/* ===== PROGRESS DISPLAY (top bar) ===== */
		#melitools-psc-progress {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			z-index: 999998;
			background: linear-gradient(90deg, #3483fa, #2968c8);
			display: flex;
			justify-content: center;
			padding: 10px 16px;
			box-shadow: 0 2px 12px rgba(52, 131, 250, 0.3);
		}

		.melitools-progress__content {
			display: flex;
			align-items: center;
			gap: 12px;
			color: #fff;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
			font-size: 13px;
			font-weight: 500;
			width: 100%;
			max-width: 700px;
		}

		.melitools-progress__spinner {
			width: 16px;
			height: 16px;
			border: 2px solid rgba(255,255,255,0.3);
			border-top-color: #fff;
			border-radius: 50%;
			animation: melitools-spin 0.8s linear infinite;
			flex-shrink: 0;
		}

		@keyframes melitools-spin { to { transform: rotate(360deg); } }

		.melitools-progress__bar-wrapper {
			flex: 1;
			height: 6px;
			background: rgba(255,255,255,0.2);
			border-radius: 3px;
			overflow: hidden;
		}

		.melitools-progress__bar {
			height: 100%;
			background: #fff;
			border-radius: 3px;
			transition: width 0.4s ease;
		}

		.melitools-progress__percent {
			font-size: 12px;
			font-weight: 700;
			min-width: 36px;
			text-align: right;
		}

		.melitools-progress__cancel {
			background: rgba(255,255,255,0.2);
			border: none;
			color: #fff;
			width: 24px;
			height: 24px;
			border-radius: 50%;
			cursor: pointer;
			font-size: 12px;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: background 0.2s;
			flex-shrink: 0;
		}

		.melitools-progress__cancel:hover { background: rgba(255,255,255,0.35); }

		/* ===== PSC MODAL ===== */
		.melitools-psc-modal {
			position: fixed;
			inset: 0;
			z-index: 9999999;
			display: flex;
			align-items: center;
			justify-content: center;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		.melitools-psc-modal--visible { opacity: 1; }
		.melitools-psc-modal--closing { opacity: 0; }

		.melitools-psc-modal__backdrop {
			position: absolute;
			inset: 0;
			background: rgba(0,0,0,0.6);
			backdrop-filter: blur(4px);
		}

		.melitools-psc-modal__container {
			position: relative;
			background: #fff;
			border-radius: 16px;
			width: 94%;
			max-width: 680px;
			max-height: 90vh;
			display: flex;
			flex-direction: column;
			box-shadow: 0 24px 80px rgba(0,0,0,0.3);
			animation: melitools-modalIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		}

		.melitools-psc-modal__container--report { max-width: 720px; }

		@keyframes melitools-modalIn {
			from { transform: translateY(20px) scale(0.97); opacity: 0; }
			to { transform: translateY(0) scale(1); opacity: 1; }
		}

		.melitools-psc-modal__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 20px 24px 16px;
			border-bottom: 1px solid #eee;
			flex-shrink: 0;
		}

		.melitools-psc-modal__header-left {
			display: flex;
			align-items: baseline;
			gap: 8px;
		}

		.melitools-psc-modal__header h2 {
			margin: 0;
			font-size: 18px;
			font-weight: 700;
			color: #1a1a2e;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-psc-modal__version {
			font-size: 11px;
			color: #999;
			font-weight: 500;
			background: #f0f0f0;
			padding: 2px 6px;
			border-radius: 4px;
		}

		.melitools-psc-modal__close {
			width: 32px;
			height: 32px;
			border: none;
			background: #f5f5f5;
			border-radius: 8px;
			font-size: 20px;
			color: #666;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s;
			flex-shrink: 0;
		}

		.melitools-psc-modal__close:hover { background: #e8e8e8; color: #333; }

		/* === SCROLLABLE BODY === */
		.melitools-psc-modal__body {
			padding: 20px 24px 24px;
			overflow-y: auto;
			flex: 1;
			min-height: 0;
		}

		.melitools-psc-modal__body::-webkit-scrollbar { width: 8px; }
		.melitools-psc-modal__body::-webkit-scrollbar-track {
			background: transparent;
			border-radius: 4px;
			margin: 8px 0;
		}
		.melitools-psc-modal__body::-webkit-scrollbar-thumb {
			background: #d0d0d8;
			border-radius: 4px;
			border: 2px solid #fff;
		}
		.melitools-psc-modal__body::-webkit-scrollbar-thumb:hover { background: #a0a0b0; }

		.melitools-psc-modal__body {
			scrollbar-width: thin;
			scrollbar-color: #d0d0d8 transparent;
		}

		/* Tabs */
		.melitools-psc-modal__tabs {
			display: flex;
			gap: 4px;
			margin-bottom: 20px;
			background: #f5f5f5;
			border-radius: 10px;
			padding: 4px;
		}

		.melitools-psc-modal__tab {
			flex: 1;
			padding: 8px 12px;
			border: none;
			border-radius: 8px;
			background: transparent;
			color: #666;
			font-size: 13px;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-psc-modal__tab:hover { color: #333; background: rgba(255,255,255,0.5); }

		.melitools-psc-modal__tab--active {
			background: #fff !important;
			color: #3483fa !important;
			box-shadow: 0 1px 4px rgba(0,0,0,0.1);
		}

		/* Fields */
		.melitools-psc-modal__field { margin-bottom: 16px; }

		.melitools-psc-modal__field label {
			display: block;
			margin-bottom: 6px;
			font-size: 13px;
			font-weight: 600;
			color: #333;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-psc-modal__field label small { font-weight: 400; color: #999; }

		.melitools-psc-modal__textarea-wrapper { position: relative; }

		.melitools-psc-modal__field textarea {
			width: 100%;
			padding: 12px;
			border: 2px solid #e0e0e0;
			border-radius: 10px;
			font-size: 13px;
			font-family: 'SF Mono', 'Consolas', monospace;
			resize: vertical;
			transition: border-color 0.2s;
			box-sizing: border-box;
			line-height: 1.6;
			min-height: 140px;
		}

		.melitools-psc-modal__field textarea:focus { outline: none; border-color: #3483fa; }

		.melitools-psc-modal__field textarea::-webkit-scrollbar { width: 6px; }
		.melitools-psc-modal__field textarea::-webkit-scrollbar-track { background: transparent; }
		.melitools-psc-modal__field textarea::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
		.melitools-psc-modal__field textarea::-webkit-scrollbar-thumb:hover { background: #aaa; }

		.melitools-psc-modal__textarea-actions {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-top: 6px;
		}

		.melitools-psc-modal__mini-btn {
			padding: 4px 10px;
			border: 1px solid #ddd;
			border-radius: 6px;
			background: #fafafa;
			color: #555;
			font-size: 11px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-psc-modal__mini-btn:hover { background: #f0f0f0; border-color: #ccc; }

		.melitools-psc-modal__counter {
			margin-left: auto;
			font-size: 12px;
			font-weight: 600;
			color: #3483fa;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-psc-modal__field select {
			width: 100%;
			padding: 10px 12px;
			border: 2px solid #e0e0e0;
			border-radius: 10px;
			font-size: 13px;
			background: #fff;
			cursor: pointer;
			transition: border-color 0.2s;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-psc-modal__field select:focus { outline: none; border-color: #3483fa; }

		/* Submit buttons */
		.melitools-psc-modal__submit {
			width: 100%;
			padding: 12px;
			border: none;
			border-radius: 10px;
			background: linear-gradient(135deg, #3483fa, #2968c8);
			color: #fff;
			font-size: 14px;
			font-weight: 700;
			cursor: pointer;
			transition: all 0.2s;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
			margin-top: 8px;
		}

		.melitools-psc-modal__submit:hover {
			transform: translateY(-1px);
			box-shadow: 0 4px 16px rgba(52, 131, 250, 0.4);
		}

		.melitools-psc-modal__submit--verify { background: linear-gradient(135deg, #00a650, #008a42); }
		.melitools-psc-modal__submit--verify:hover { box-shadow: 0 4px 16px rgba(0, 166, 80, 0.4); }

		.melitools-psc-modal__submit--secondary { background: #f0f0f0; color: #333; margin-top: 8px; }
		.melitools-psc-modal__submit--secondary:hover { background: #e5e5e5; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

		/* Shortcuts */
		.melitools-psc-modal__shortcuts-list { display: flex; flex-direction: column; gap: 10px; }

		.melitools-psc-modal__shortcut-item {
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 10px 12px;
			background: #f9f9f9;
			border-radius: 8px;
			border: 1px solid #f0f0f0;
		}

		.melitools-psc-modal__shortcut-item kbd {
			display: inline-block;
			padding: 4px 10px;
			background: #fff;
			border: 1px solid #ddd;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 700;
			font-family: 'SF Mono', 'Consolas', monospace;
			color: #333;
			white-space: nowrap;
			box-shadow: 0 1px 2px rgba(0,0,0,0.05);
			min-width: 70px;
			text-align: center;
		}

		.melitools-psc-modal__shortcut-item span { font-size: 13px; color: #555; }

		/* ===== REPORT ===== */
		.melitools-report__summary {
			display: flex;
			gap: 12px;
			margin-bottom: 20px;
			flex-wrap: wrap;
		}

		.melitools-report__stat {
			flex: 1;
			min-width: 80px;
			text-align: center;
			padding: 12px 8px;
			border-radius: 10px;
			background: #f5f5f5;
		}

		.melitools-report__stat-value {
			display: block;
			font-size: 24px;
			font-weight: 700;
			font-family: 'Proxima Nova', -apple-system, sans-serif;
		}

		.melitools-report__stat-label {
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: #999;
		}

		.melitools-report__stat--total .melitools-report__stat-value { color: #333; }
		.melitools-report__stat--success { background: #e6f9ed; }
		.melitools-report__stat--success .melitools-report__stat-value { color: #00a650; }
		.melitools-report__stat--info { background: #e8f2ff; }
		.melitools-report__stat--info .melitools-report__stat-value { color: #3483fa; }
		.melitools-report__stat--warning { background: #fff3e6; }
		.melitools-report__stat--warning .melitools-report__stat-value { color: #ff7733; }
		.melitools-report__stat--error { background: #fde8ea; }
		.melitools-report__stat--error .melitools-report__stat-value { color: #f23d4f; }

		.melitools-report__group {
			margin-bottom: 16px;
			border: 1px solid #eee;
			border-radius: 10px;
			overflow: hidden;
		}

		.melitools-report__group-header {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 10px 14px;
			background: #fafafa;
			border-bottom: 1px solid #eee;
		}

		.melitools-report__group-status { font-size: 13px; font-weight: 700; color: #333; flex: 1; }

		.melitools-report__group-count {
			background: #3483fa;
			color: #fff;
			font-size: 11px;
			font-weight: 700;
			padding: 2px 8px;
			border-radius: 12px;
		}

		.melitools-report__copy-group {
			padding: 4px 10px;
			border: 1px solid #ddd;
			border-radius: 6px;
			background: #fff;
			color: #555;
			font-size: 11px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
		}

		.melitools-report__copy-group:hover { background: #f0f0f0; border-color: #3483fa; color: #3483fa; }

		.melitools-report__group-ids {
			padding: 10px 14px;
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
		}

		.melitools-report__item {
			font-size: 12px;
			font-family: 'SF Mono', 'Consolas', monospace;
			padding: 3px 8px;
			border-radius: 6px;
			cursor: default;
		}

		.melitools-report__item--success { background: #e6f9ed; color: #00a650; }
		.melitools-report__item--error { background: #fde8ea; color: #f23d4f; }
		.melitools-report__item--warning { background: #fff3e6; color: #ff7733; }
		.melitools-report__item--info { background: #e8f2ff; color: #3483fa; }

		.melitools-report__actions { display: flex; flex-direction: column; gap: 0; margin-top: 16px; }

		/* ===== RESPONSIVO ===== */
		@media (max-width: 600px) {
			.melitools-toolbar__content {
				flex-direction: column;
				gap: 8px;
				padding: 8px 12px;
			}

			.melitools-toolbar__actions { flex-wrap: wrap; justify-content: center; }
			.melitools-psc-modal__container { width: 98%; margin: 10px; }
			.melitools-confirm__box { width: 95%; }
		}
	`)

	// ==========================================
	//  INICIALIZAÇÃO
	// ==========================================
	function init() {
		MeliTools.utils.log('Inicializando MeliTools Pro...')
		MeliTools.quickNavigator.init()
		MeliTools.packageStatusChanger.init()
		MeliTools.smartIdDetector.init()
		// MeliTools.toolbarController.init()
		MeliTools.utils.log('MeliTools Pro inicializado com sucesso!')
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init)
	} else {
		init()
	}
})()
