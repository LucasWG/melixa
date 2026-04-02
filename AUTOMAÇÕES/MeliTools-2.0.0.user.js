// ==UserScript==
// @name         MeliTools
// @namespace    https://debugzone.com.br
// @version      2.0.0
// @description  Este é um conjunto de ferramentas para automatizar e auxiliar no SVC (Service Center).
// @author       LwG94
// @match        *://*/*
// @grant        none
// @connect      gist.githubusercontent.com
// @updateURL    https://gist.github.com/LucasWG/a5630b235cd956a66d6ed6eb56d9688a/raw/melitools.user.js
// @downloadURL  https://gist.github.com/LucasWG/a5630b235cd956a66d6ed6eb56d9688a/raw/melitools.user.js
// ==/UserScript==

;(function () {
	'use strict'

	// Objeto principal do MeliTools
	const MeliTools = {
		// Quick Navigator - Navegador rápido por ID
		quickNavigator: {
			// Configurações do Quick Navigator
			config: {
				ID_LENGTH: 11,
				TIMEOUT_SECONDS: 10,
				ENABLED_URLS: [
					'*://127.0.0.1:5500/src/mock/gestao*',
					'https://envios.adminml.com/logistics/package-management*',
					'https://shipping-bo.adminml.com/sauron/shipments/shipment/*',
					'https://envios.adminml.com/logistics/monitoring-distribution/detail/*'
				],
				// REDIRECT_URL_BASE: 'http://127.0.0.1:5500/src/mock/gestao.html?ID='
				REDIRECT_URL_BASE:
					'https://envios.adminml.com/logistics/package-management/package/'
			},
			// Estado interno
			state: {
				typedId: '',
				mainTimeout: null,
				countdownInterval: null,
				displayElement: null,
				isRedirecting: false
			},

			// Inicializa o quick navigator
			init: function () {
				// Verifica se deve ser ativado na página atual
				if (!MeliTools.utils.matchUrls(this.config.ENABLED_URLS)) return

				this.createDisplayElement()
				document.addEventListener('paste', this.handlePaste.bind(this))
				document.addEventListener('keydown', this.handleKeyDown.bind(this))
				MeliTools.utils.log('Quick Navigator iniciado')
			},

			// Cria o elemento visual do display
			createDisplayElement: function () {
				if (this.state.displayElement) return

				this.state.displayElement = MeliTools.ui.createFloatingElement({
					id: 'id-navigator-display',
					position: 'bottom-right',
					backgroundColor: '#333',
					textColor: '#FFF159'
				})
			},

			// Atualiza o display com o ID e tempo
			updateDisplay: function (id, time) {
				if (!this.state.displayElement) return
				const placeholders = '_'.repeat(this.config.ID_LENGTH - id.length)
				const content = `ID: <span style="color: white;">${id}${placeholders}</span> | Tempo: <span style="color: white;">${time}s</span>`
				MeliTools.ui.updateContent(this.state.displayElement, content)
			},

			// Mostra o display
			showDisplay: function () {
				MeliTools.ui.showElement(this.state.displayElement)
			},

			// Reseta o estado
			resetState: function () {
				this.state.typedId = ''
				this.state.isRedirecting = false

				clearTimeout(this.state.mainTimeout)
				clearInterval(this.state.countdownInterval)
				this.state.mainTimeout = null
				this.state.countdownInterval = null

				MeliTools.ui.hideElement(this.state.displayElement)
			},

			// Redireciona para a URL com o ID
			redirectToUrl: function (id) {
				const url = `${this.config.REDIRECT_URL_BASE}${id}`
				MeliTools.utils.log(`Redirecionando para: ${url}`)
				MeliTools.navigation.redirectTo(url)
			},

			// Handler para evento de colar
			handlePaste: function (event) {
				if (this.state.isRedirecting) return

				const pastedText = (event.clipboardData || window.clipboardData)
					.getData('text')
					.trim()

				if (/^\d+$/.test(pastedText) && pastedText.length === this.config.ID_LENGTH) {
					event.preventDefault()
					this.state.isRedirecting = true
					this.redirectToUrl(pastedText)
					this.resetState()
				}
			},

			// Handler para evento de tecla pressionada
			handleKeyDown: function (event) {
				if (this.state.isRedirecting) return

				const targetElement = event.target.tagName.toLowerCase()
				if (
					['input', 'textarea', 'select'].includes(targetElement) ||
					event.target.isContentEditable
				) {
					return
				}

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

		// Visualizador de Status do Pacote
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

			// Configurações
			config: {
				ENABLED_URLS: [
					'*://*/*gestao*',
					'https://envios.adminml.com/logistics/package-management/package/*'
				], // URL onde o script pode rodar e mostrar o log final
				// REDIRECT_URL_BASE: 'http://127.0.0.1:5500/src/mock/gestao.html?ID='
				REDIRECT_URL_BASE:
					'https://envios.adminml.com/logistics/package-management/package/'
			},

			// Estado interno
			state: {
				controlPanel: null,
				logPanel: null,
				interruptButton: null
			},

			// Inicializa o módulo
			init: function () {
				document.addEventListener('keydown', this.handleShortcut.bind(this))
				MeliTools.utils.onPageLoad(this.processNextInQueue.bind(this))
				MeliTools.utils.log(
					'Package Status Changer iniciado. Pressione Ctrl+Alt+1 para abrir o painel.'
				)
			},

			// Handler para o atalho de teclado
			handleShortcut: function (event) {
				if (event.altKey && (event.key === 'q' || event.key === 'Q')) {
					event.preventDefault()

					// Se a execução está em andamento, interrompe e mostra o log parcial
					if (sessionStorage.getItem('psc_execution_data')) {
						this.interruptExecution()
						return
					}

					if (this.state.controlPanel) {
						this.state.controlPanel.hide()
						this.state.controlPanel = null
					} else {
						this.showControlPanel()
					}
				}
			},

			// Cria e exibe o painel de controle modal
			showControlPanel: function () {
				const panel = MeliTools.ui.createModal({
					id: 'psc-control-panel',
					title: 'MeliTools - Alterador de Status de Pacotes',
					maxWidth: '1200px',
					content: `
					<div style="display: flex; flex-direction: column; gap: 15px; text-align: left;">
						<div id="psc-error-container" style="color: #e74c3c; background-color: #fdd; border: 1px solid #e74c3c; border-radius: 4px; padding: 10px; display: none;"></div>
						<label for="psc-status-select" style="font-size: 14px; font-weight: 600;">Selecione o Status de Destino (para alteração):</label>
						<select id="psc-status-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;"></select>
						<label for="psc-id-textarea" style="font-size: 14px; font-weight: 600;">Insira os IDs dos Pacotes:</label>
						<textarea id="psc-id-textarea" rows="10" style="width: 100%; font-family: monospace; border-radius: 4px; border: 1px solid #ccc; padding: 8px; box-sizing: border-box;"></textarea>
						<small style="color: #666;">Um ID por linha ou separados por ponto e vírgula (;).</small>
					</div>
				`,
					buttons: [
						{
							text: 'Cancelar',
							type: 'quiet',
							action: () => this.state.controlPanel.hide()
						},
						{
							text: 'Verificar Status',
							type: 'quiet',
							action: () => this.startProcessing(true) // true para modo verificação
						},
						{
							text: 'Iniciar Alteração',
							type: 'loud',
							action: () => this.startProcessing(false) // false para modo alteração
						}
					],
					onClose: () => {
						this.state.controlPanel = null
					}
				})

				const select = panel.querySelector('#psc-status-select')
				// Adiciona uma opção padrão desabilitada
				const defaultOption = document.createElement('option')
				defaultOption.value = ''
				defaultOption.textContent = 'Selecione um status...'
				defaultOption.disabled = true
				defaultOption.selected = true
				select.appendChild(defaultOption)

				this.STATUS_OPTIONS.forEach(status => {
					const option = document.createElement('option')
					option.value = status
					option.textContent = status
					select.appendChild(option)
				})

				// Preenche a textarea com os IDs da última verificação, se houver, e depois limpa.
				const lastIds = sessionStorage.getItem('psc_last_ids')
				const textarea = panel.querySelector('#psc-id-textarea')
				if (lastIds) {
					textarea.value = lastIds
					sessionStorage.removeItem('psc_last_ids') // Limpa para que não recarregue na próxima abertura
				}

				this.state.controlPanel = panel
				panel.show()

				// Foca no textarea após o modal ser exibido
				if (textarea) {
					textarea.focus()
				}
			},

			// Valida os IDs e inicia o processo
			startProcessing: function (isVerificationOnly = false) {
				const errorContainer = this.state.controlPanel.querySelector('#psc-error-container')
				const textarea = this.state.controlPanel.querySelector('#psc-id-textarea')
				const select = this.state.controlPanel.querySelector('#psc-status-select')
				const rawIds = textarea.value
				const targetStatus = select.value

				errorContainer.style.display = 'none'
				errorContainer.textContent = ''

				// Validação do status selecionado (apenas para alteração)
				if (!isVerificationOnly && !targetStatus) {
					errorContainer.textContent =
						'Por favor, selecione um status de destino para alterar.'
					errorContainer.style.display = 'block'
					return
				}

				const allIds = rawIds
					.split(/[\n;]/)
					.map(id => id.trim())
					.filter(id => id.length > 0)

				const validIds = allIds.filter(id => /^\d{11}$/.test(id))
				const invalidIds = allIds.filter(id => !/^\d{11}$/.test(id))
				const uniqueIds = [...new Set(validIds)]

				if (invalidIds.length > 0) {
					errorContainer.textContent = `IDs inválidos (diferentes de 11 dígitos) foram encontrados e ignorados: ${invalidIds.join(
						', '
					)}`
					errorContainer.style.display = 'block'
				}

				if (uniqueIds.length === 0) {
					errorContainer.textContent += `${
						errorContainer.textContent ? '\n' : ''
					}Nenhum ID válido para processar.`
					errorContainer.style.display = 'block'
					return
				}

				if (uniqueIds.length < validIds.length) {
					const confirmationModal = MeliTools.ui.createModal({
						title: 'IDs Duplicados Encontrados',
						content: `Foram encontrados ${
							validIds.length - uniqueIds.length
						} IDs duplicados. Deseja removê-los e continuar o processo com ${
							uniqueIds.length
						} IDs únicos?`,
						buttons: [
							{
								text: 'Editar Manualmente',
								type: 'quiet',
								action: () => confirmationModal.hide()
							},
							{
								text: 'Remover e Continuar',
								type: 'loud',
								action: () => {
									confirmationModal.hide()
									this.executeProcessing(
										uniqueIds,
										targetStatus,
										isVerificationOnly
									)
								}
							}
						]
					})
					confirmationModal.show()
				} else {
					this.executeProcessing(uniqueIds, targetStatus, isVerificationOnly)
				}
			},

			// Executa o processamento após validação
			executeProcessing: function (ids, targetStatus, isVerificationOnly) {
				sessionStorage.setItem('psc_last_ids', ids.join('\n')) // Salva os IDs para reutilização
				sessionStorage.setItem(
					'psc_execution_data',
					JSON.stringify({
						ids: ids,
						targetStatus,
						currentIndex: 0,
						logs: [],
						isVerificationOnly
					})
				)

				this.state.controlPanel.hide()
				this.state.controlPanel = null
				const message = isVerificationOnly
					? `Iniciando verificação para ${ids.length} pacotes.`
					: `Iniciando processo de alteração para ${ids.length} pacotes.`
				MeliTools.ui.showToast(message, {
					type: 'info'
				})
				this.showInterruptButton()
				// Mostra também o display de progresso com o total inicial
				this.showProgressDisplay(ids.length)
				this.processNextInQueue()
			},

			// Gerencia a fila de processamento
			processNextInQueue: function () {
				const dataString = sessionStorage.getItem('psc_execution_data')
				if (!dataString) {
					// Verifica se há um log final para mostrar
					const finalLogString = sessionStorage.getItem('psc_final_log')
					if (finalLogString) {
						const finalLog = JSON.parse(finalLogString)
						this.showLogPanel(finalLog.logs)
						sessionStorage.removeItem('psc_final_log')

						// Se era modo verificação, reabre o painel de controle
						if (finalLog.isVerificationOnly) {
							this.showControlPanel()
						}
					}
					this.hideInterruptButton()
					return
				}

				// Garante que o botão de interrupção seja exibido em cada página do processo
				this.showInterruptButton()

				const data = JSON.parse(dataString)
				const { ids, currentIndex, isVerificationOnly } = data
				const currentUrl = window.location.href
				const reconfirmingId = sessionStorage.getItem('psc_reconfirming_id')

				const currentUrlId = (currentUrl.match(/(\d{11})$/) || [])[1]

				// --- PERSISTÊNCIA DO DISPLAY DE PROGRESSO ---
				// Se houver dados de execução, sempre mostra o display de progresso atualizado
				if (ids && ids.length > 0) {
					const remaining = Math.max(0, ids.length - currentIndex)
					this.showProgressDisplay(remaining)
				}

				// Lógica de reconfirmação (apenas para alteração)
				if (!isVerificationOnly && reconfirmingId && currentUrlId === reconfirmingId) {
					this.verifyStatusAndContinue(data)
					return
				}

				if (currentUrlId && currentUrlId === ids[currentIndex]) {
					// Decide qual ação tomar baseado no modo
					if (isVerificationOnly) {
						this.verifyStatusOnPage(data)
					} else {
						this.changeStatusOnPage(data)
					}
				} else if (currentIndex < ids.length) {
					const nextId = ids[currentIndex]
					const baseUrl = this.config.REDIRECT_URL_BASE
					const url = `${baseUrl}${nextId}`
					MeliTools.utils.log(`Navegando para o próximo pacote: ${nextId}`)
					MeliTools.navigation.redirectTo(url)
				} else {
					// O trabalho acabou, armazena o log final e reinicia o processo
					sessionStorage.removeItem('psc_execution_data')
					sessionStorage.setItem(
						'psc_final_log',
						JSON.stringify({
							logs: data.logs,
							isVerificationOnly: data.isVerificationOnly
						})
					)
					// Recarrega a página para o processNextInQueue mostrar o log
					try {
						this.hideProgressDisplay()
					} catch (e) {}
					window.location.reload()
				}
			},

			// Apenas verifica o status na página (modo leitura)
			verifyStatusOnPage: async function (executionData) {
				const { ids, currentIndex } = executionData
				const currentId = ids[currentIndex]
				let logEntry = { id: currentId, message: '', type: 'info' }
				let finalStatus = 'Falha na Verificação'

				try {
					let currentStatus = null

					// Tenta primeiro pelo input (mais rápido, funciona desabilitado ou não)
					try {
						MeliTools.utils.log(`Buscando input para ${currentId}...`)

						// Tenta encontrar o container primeiro
						const container = await MeliTools.dom.waitForElement(
							'.package-status-input--status',
							3000
						)

						MeliTools.utils.log(`Container encontrado: ${!!container}`)

						if (container) {
							// Busca o input dentro do container
							const inputElement = container.querySelector(
								'input.andes-form-control__field'
							)

							MeliTools.utils.log(`Input encontrado: ${!!inputElement}`)
							MeliTools.utils.log(`Input value: ${inputElement?.value}`)
							MeliTools.utils.log(`Input disabled: ${inputElement?.disabled}`)

							if (inputElement && inputElement.value) {
								currentStatus = inputElement.value.trim()
								MeliTools.utils.log(`Status obtido do input: ${currentStatus}`)
							}
						}
					} catch (inputError) {
						MeliTools.utils.log(`Erro ao buscar input: ${inputError.message}`)
					}

					// Se não conseguiu pelo input, tenta pelo dropdown
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
						logEntry = {
							message: `${currentId}`,
							type: 'info'
						}
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

			// Altera o status na página do pacote e prepara para verificação
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
					finalStatus = currentStatus // Status inicial caso algo dê errado

					if (currentStatus === targetStatus) {
						const logEntry = {
							message: `${currentId}`,
							type: 'success'
						}
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
						throw new Error(`Opção "${targetStatus}" não encontrada.`)
					}

					MeliTools.dom.click(targetOption)
					MeliTools.dom.click(
						await MeliTools.dom.waitForElement(
							'.andes-button--large.andes-button--quiet'
						)
					)

					const snackbarResult = await this.waitForSnackbar(5000)

					if (snackbarResult.type === 'success') {
						const logEntry = {
							message: `${currentId}`,
							type: 'success'
						}
						this.updateExecutionData(executionData, logEntry, true, targetStatus)
						await MeliTools.utils.sleep(500)
						this.processNextInQueue()
					} else {
						// Qualquer outro resultado (erro ou timeout) força a recarga
						// O log será registrado na função verifyStatusAndContinue
						sessionStorage.setItem('psc_reconfirming_id', currentId)
						await MeliTools.utils.sleep(1500)
						MeliTools.navigation.refresh()
					}
				} catch (error) {
					// Erros inesperados também forçam a recarga
					sessionStorage.setItem('psc_reconfirming_id', currentId)
					await MeliTools.utils.sleep(1500)
					MeliTools.navigation.refresh()
				}
			},

			// Aguarda o snackbar de sucesso ou erro
			waitForSnackbar: function (timeout) {
				return new Promise(resolve => {
					const timeoutId = setTimeout(() => {
						observer.disconnect()
						resolve({
							type: 'timeout',
							message: 'Tempo esgotado esperando pelo snackbar.'
						})
					}, timeout)

					const observer = new MutationObserver((mutations, obs) => {
						for (const mutation of mutations) {
							for (const node of mutation.addedNodes) {
								if (
									node.nodeType === 1 &&
									node.classList.contains('andes-snackbar')
								) {
									const messageElement = node.querySelector(
										'.andes-snackbar__message'
									)
									const message = messageElement
										? messageElement.textContent.trim()
										: 'Mensagem não encontrada.'

									if (node.classList.contains('andes-snackbar--green')) {
										clearTimeout(timeoutId)
										obs.disconnect()
										resolve({ type: 'success', message })
										return
									} else if (node.classList.contains('andes-snackbar--red')) {
										clearTimeout(timeoutId)
										obs.disconnect()
										resolve({ type: 'error', message })
										return
									}
								}
							}
						}
					})

					observer.observe(document.body, {
						childList: true,
						subtree: true
					})
				})
			},

			// Verifica o status após o recarregamento e continua a fila
			verifyStatusAndContinue: async function (executionData) {
				const { ids, targetStatus, currentIndex } = executionData
				const currentId = ids[currentIndex]
				let logEntry = { id: currentId, message: '', type: 'error' }
				let finalStatus = 'Falha na Verificação'

				try {
					const statusElement = await MeliTools.dom.waitForElement(
						'.package-status-input--status .andes-dropdown__display-values',
						8000
					)
					const currentStatus = statusElement.textContent.trim()
					finalStatus = currentStatus

					if (currentStatus === targetStatus) {
						logEntry = {
							message: `${currentId}`,
							type: 'success'
						}
						this.updateExecutionData(executionData, logEntry, true, finalStatus)
					} else {
						logEntry = {
							message: `${currentId}: FALHA. Status esperado "${targetStatus}", encontrado "${currentStatus}" (pós-recarga).`,
							type: 'error'
						}
						this.updateExecutionData(executionData, logEntry, true, finalStatus)
					}
				} catch (error) {
					logEntry.message = `${currentId}: FALHA ao verificar status (pós-recarga). ${error.message}`
					this.updateExecutionData(executionData, logEntry, true, finalStatus)
				} finally {
					sessionStorage.removeItem('psc_reconfirming_id')
					await MeliTools.utils.sleep(500)
					this.processNextInQueue()
				}
			},

			// Centraliza a atualização do estado da execução
			updateExecutionData: function (
				executionData,
				logEntry,
				advanceIndex = true,
				finalStatus = null
			) {
				const newIndex = advanceIndex
					? executionData.currentIndex + 1
					: executionData.currentIndex

				const updatedLog = { ...logEntry, finalStatus: finalStatus || logEntry.finalStatus }

				sessionStorage.setItem(
					'psc_execution_data',
					JSON.stringify({
						...executionData,
						currentIndex: newIndex,
						logs: [...executionData.logs, updatedLog]
					})
				)

				// Atualiza display de progresso, se presente
				try {
					const total = executionData.ids ? executionData.ids.length : 0
					const remaining = Math.max(0, total - newIndex)
					this.updateProgressDisplay(remaining)
				} catch (e) {
					// silencioso: não queremos quebrar a execução por causa do display
				}
			},

			// Exibe o painel de log final
			showLogPanel: function (logs) {
				const logGroups = logs.reduce((acc, log) => {
					const status = log.finalStatus || 'Desconhecido'
					if (!acc[status]) {
						acc[status] = []
					}
					acc[status].push(log)
					return acc
				}, {})

				const logContent =
					Object.keys(logGroups)
						.sort()
						.map(status => {
							const groupLogs = logGroups[status]
							const successCount = groupLogs.filter(l => l.type === 'success').length
							const errorCount = groupLogs.filter(l => l.type === 'error').length

							const details = groupLogs
								.map(log => {
									const color = log.type === 'success' ? '#2ecc71' : '#e74c3c'
									return `<div style="color: ${color}; padding: 2px 0; margin-left: 20px;">${log.message}</div>`
								})
								.join('')

							return `
					<details open style="margin-bottom: 10px;">
						<summary style="font-weight: bold; cursor: pointer; padding: 5px; background-color: #f0f0f0; border-radius: 4px;">
							${status} (${groupLogs.length} pacotes)
							<span style="color: #2ecc71; margin-left: 10px;">✓ ${successCount}</span>
							<span style="color: #e74c3c; margin-left: 5px;">✗ ${errorCount}</span>
						</summary>
						<div style="padding-top: 5px;">${details}</div>
					</details>
				`
						})
						.join('') || 'Nenhum log para exibir.'

				const panel = MeliTools.ui.createModal({
					id: 'psc-log-panel',
					title: 'Resultado do Processamento',
					content: `<div style="font-family: monospace; max-height: 60vh; overflow-y: auto; background-color: #f7f7f7; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">${logContent}</div>`,
					maxWidth: '1200px',
					zIndex: '999',
					buttons: [
						{
							text: 'Fechar',
							type: 'loud',
							action: () => {
								this.state.logPanel.hide()
							}
						}
					],
					onClose: () => {
						this.state.logPanel = null
					}
				})
				this.state.logPanel = panel
				panel.show()
			},

			// Mostra o botão de interrupção
			showInterruptButton: function () {
				if (this.state.interruptButton) {
					MeliTools.ui.showElement(this.state.interruptButton)
					return
				}
				// Botão redondo com tema padrão do sistema (fundo branco, borda leve, fonte Proxima Nova)
				this.state.interruptButton = MeliTools.ui.createFloatingElement({
					id: 'psc-interrupt-button',
					position: 'bottom-right',
					backgroundColor: '#fff',
					textColor: '#333'
				})
				this.state.interruptButton.innerHTML = '✕'
				this.state.interruptButton.style.cursor = 'pointer'
				this.state.interruptButton.style.pointerEvents = 'auto'
				this.state.interruptButton.style.width = '44px'
				this.state.interruptButton.style.height = '44px'
				this.state.interruptButton.style.display = 'flex'
				this.state.interruptButton.style.alignItems = 'center'
				this.state.interruptButton.style.justifyContent = 'center'
				this.state.interruptButton.style.borderRadius = '50%'
				this.state.interruptButton.style.fontSize = '22px'
				this.state.interruptButton.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.10)'
				this.state.interruptButton.style.border = '1.5px solid #e0e0e0'
				this.state.interruptButton.style.background = '#fff'
				this.state.interruptButton.style.transition = 'box-shadow 0.2s, border 0.2s'
				this.state.interruptButton.style.fontFamily =
					"'Proxima Nova', -apple-system, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif"

				// Tooltip customizado
				const tooltip = document.createElement('div')
				tooltip.id = 'psc-interrupt-tooltip'
				tooltip.textContent = 'Interromper processamento de IDs (mostra log parcial)'
				Object.assign(tooltip.style, {
					position: 'fixed',
					// Espaço maior entre o botão e o tooltip
					right: '76px', // 44px (botão) + 12px (espaço extra) + 20px (offset da borda)
					bottom: 'calc(20px + 22px - 50%)',
					top: 'unset',
					background: '#fff',
					color: '#333',
					padding: '8px 16px',
					borderRadius: '7px',
					fontSize: '13px',
					fontWeight: '400',
					boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
					zIndex: '1000001', // maior que displays flutuantes
					pointerEvents: 'none',
					opacity: '0',
					transition: 'opacity 0.18s',
					whiteSpace: 'nowrap',
					userSelect: 'none',
					border: '1.5px solid #e0e0e0',
					fontFamily:
						"'Proxima Nova', -apple-system, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif",
					transform: 'translateY(0)'
				})
				// Ajuste dinâmico para centralizar verticalmente após renderizar
				document.body.appendChild(tooltip)
				setTimeout(() => {
					const btn = this.state.interruptButton
					if (btn && tooltip) {
						const btnRect = btn.getBoundingClientRect()
						const tipRect = tooltip.getBoundingClientRect()
						// Calcula o centro do botão e centraliza o tooltip
						tooltip.style.bottom =
							window.innerHeight -
							btnRect.top -
							btnRect.height / 2 -
							tipRect.height / 2 +
							'px'
						// Garante espaçamento horizontal consistente
						tooltip.style.right = window.innerWidth - btnRect.left + 12 + 'px'
					}
				}, 0)

				this.state.interruptButton.addEventListener('mouseenter', () => {
					tooltip.style.opacity = '1'
				})
				this.state.interruptButton.addEventListener('mouseleave', () => {
					tooltip.style.opacity = '0'
				})

				this.state.interruptButton.addEventListener(
					'click',
					this.interruptExecution.bind(this)
				)
				MeliTools.ui.showElement(this.state.interruptButton)
			},

			// Esconde o botão de interrupção
			hideInterruptButton: function () {
				if (this.state.interruptButton) {
					MeliTools.ui.hideElement(this.state.interruptButton)
				}
				// Também esconde display de progresso, caso exista
				if (this.state.progressDisplay) {
					MeliTools.ui.hideElement(this.state.progressDisplay)
				}
			},

			// Mostra o display de progresso (pacotes restantes)
			showProgressDisplay: function (initialRemaining = 0) {
				if (this.state.progressDisplay) {
					MeliTools.ui.showElement(this.state.progressDisplay)
					this.updateProgressDisplay(initialRemaining)
					return
				}
				// Display com tema padrão do sistema (fundo branco, borda leve, fonte Proxima Nova)
				this.state.progressDisplay = MeliTools.ui.createFloatingElement({
					id: 'psc-progress-display',
					position: 'bottom-right',
					backgroundColor: '#fff',
					textColor: '#333'
				})
				this.state.progressDisplay.style.pointerEvents = 'none'
				this.state.progressDisplay.style.padding = '8px 16px'
				this.state.progressDisplay.style.borderRadius = '8px'
				this.state.progressDisplay.style.fontSize = '14px'
				this.state.progressDisplay.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.10)'
				this.state.progressDisplay.style.border = '1.5px solid #e0e0e0'
				this.state.progressDisplay.style.fontWeight = '400'
				this.state.progressDisplay.style.fontFamily =
					"'Proxima Nova', -apple-system, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif"
				this.state.progressDisplay.innerHTML = `${initialRemaining} pacotes restantes`
				MeliTools.ui.showElement(this.state.progressDisplay)
			},

			// Atualiza o display de progresso
			updateProgressDisplay: function (remaining) {
				if (!this.state.progressDisplay) return
				this.state.progressDisplay.innerHTML = `${remaining} pacote${
					remaining === 1 ? '' : 's'
				} restantes`
			},

			// Esconde o display de progresso
			hideProgressDisplay: function () {
				if (this.state.progressDisplay) {
					MeliTools.ui.hideElement(this.state.progressDisplay)
				}
			},

			// Lógica para interromper a execução
			interruptExecution: function () {
				const dataString = sessionStorage.getItem('psc_execution_data')
				if (dataString) {
					const data = JSON.parse(dataString)
					sessionStorage.removeItem('psc_execution_data')
					// Salva o log final com o estado de verificação
					sessionStorage.setItem(
						'psc_final_log',
						JSON.stringify({
							logs: data.logs,
							isVerificationOnly: data.isVerificationOnly
						})
					)
					// Recarrega a página para mostrar o log parcial
					// Antes de recarregar, tenta esconder o display de progresso
					try {
						this.hideProgressDisplay()
					} catch (e) {}
					window.location.reload()
				}
				this.hideInterruptButton()
			}
		},

		// Funções de UI reutilizáveis
		ui: {
			// Mantém registro dos elementos flutuantes ativos
			activeElements: {
				'bottom-right': [],
				'bottom-left': [],
				'top-right': [],
				'top-left': [],
				center: []
			},
			activeToasts: {}, // Rastreia toasts dinâmicos por ID

			// Cria um elemento flutuante na tela
			createFloatingElement: function ({
				id,
				position = 'bottom-right',
				backgroundColor = '#333',
				textColor = '#FFF',
				padding = '15px 20px',
				fontSize = '16px'
			} = {}) {
				const element = document.createElement('div')
				if (id) element.id = id

				// Registra o novo elemento
				this.activeElements[position].push(element)

				// Calcula a posição baseada no parâmetro position e elementos existentes
				const baseOffset = 20 // Espaçamento base da borda
				const elementSpacing = 10 // Espaçamento entre elementos

				const positionStyles = {
					'bottom-right': {
						bottom: `${baseOffset + (this.activeElements[position].length - 1) * 60}px`,
						right: baseOffset + 'px'
					},
					'bottom-left': {
						bottom: `${baseOffset + (this.activeElements[position].length - 1) * 60}px`,
						left: baseOffset + 'px'
					},
					'top-right': {
						top: `${baseOffset + (this.activeElements[position].length - 1) * 60}px`,
						right: baseOffset + 'px'
					},
					'top-left': {
						top: `${baseOffset + (this.activeElements[position].length - 1) * 60}px`,
						left: baseOffset + 'px'
					},
					center: {
						position: 'fixed',
						top: '50%',
						left: '50%',
						transform: `translate(-50%, ${
							-50 + (this.activeElements[position].length - 1) * 70
						}px)`
					}
				}

				const baseStyles = {
					position: 'fixed',
					backgroundColor,
					color: textColor,
					padding,
					borderRadius: '8px',
					fontFamily:
						'"Proxima Nova", -apple-system, "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif',
					fontSize,
					fontWeight: '600',
					zIndex: '99999999',
					boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
					transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
					opacity: '0',
					pointerEvents: 'none',
					textAlign: 'center',
					maxWidth: '90vw',
					whiteSpace: 'nowrap',
					...positionStyles[position]
				}

				Object.assign(element.style, baseStyles)
				document.body.appendChild(element)
				return element
			},

			// Mostra um elemento com animação
			showElement: function (element, transform = 'translateY(0)') {
				if (!element) return
				element.style.opacity = '1'
				element.style.transform = transform

				// Encontra a posição do elemento e atualiza
				for (let position in this.activeElements) {
					if (this.activeElements[position].includes(element)) {
						this.updateElementPositions(position)
						break
					}
				}
			},

			// Esconde um elemento com animação
			hideElement: function (element, transform = 'translateY(20px)') {
				if (!element) return
				element.style.opacity = '0'
				element.style.transform = transform

				// Encontra a posição do elemento e atualiza
				for (let position in this.activeElements) {
					if (this.activeElements[position].includes(element)) {
						this.updateElementPositions(position)
						break
					}
				}
			},

			// Verifica se um elemento está visível
			isElementVisible: function (element) {
				return element && element.style.opacity !== '0' && element.style.display !== 'none'
			},

			// Remove um elemento do DOM e atualiza as posições
			removeElement: function (element) {
				if (element && element.parentNode) {
					// Remove do registro de elementos ativos
					for (let position in this.activeElements) {
						const index = this.activeElements[position].indexOf(element)
						if (index !== -1) {
							this.activeElements[position].splice(index, 1)
							// Atualiza posições dos elementos restantes
							this.updateElementPositions(position)
							break
						}
					}
					element.parentNode.removeChild(element)
				}
			},

			// Atualiza as posições dos elementos de uma determinada posição
			updateElementPositions: function (position) {
				const baseOffset = 20
				let visibleIndex = 0

				this.activeElements[position].forEach(element => {
					if (position === 'center') return // Ignora elementos centralizados

					// Pula o ajuste de elementos que não estão visíveis
					if (!this.isElementVisible(element)) {
						return
					}

					const offset = baseOffset + visibleIndex * 60
					if (position.startsWith('bottom')) {
						element.style.bottom = `${offset}px`
					} else if (position.startsWith('top')) {
						element.style.top = `${offset}px`
					}
					visibleIndex++
				})
			},

			// Mostra uma notificação toast
			showToast: function (
				message,
				{ id = null, type = 'info', duration = 4000, position = 'top-right' } = {}
			) {
				const typeStyles = {
					info: { backgroundColor: '#3498db', textColor: '#fff' },
					success: { backgroundColor: '#2ecc71', textColor: '#fff' },
					error: { backgroundColor: '#e74c3c', textColor: '#fff' },
					warning: { backgroundColor: '#f1c40f', textColor: '#000' }
				}
				const style = typeStyles[type] || typeStyles.info

				// Se um ID for fornecido e o toast já existir, reutilize-o
				if (id && this.activeToasts[id]) {
					const { element, timeoutId } = this.activeToasts[id]

					// Limpa o timeout de remoção anterior
					clearTimeout(timeoutId)

					// Atualiza o conteúdo e o estilo
					Object.assign(element.style, {
						backgroundColor: style.backgroundColor,
						color: style.textColor
					})
					this.updateContent(element, message)
					this.showElement(element) // Garante que está visível

					// Define um novo timeout para remoção (se duration > 0)
					let newTimeoutId = null
					if (duration > 0) {
						newTimeoutId = setTimeout(() => {
							this.hideElement(element, 'translateY(-20px)')
							setTimeout(() => {
								this.removeElement(element)
								delete this.activeToasts[id]
							}, 300)
						}, duration)
					}
					this.activeToasts[id].timeoutId = newTimeoutId
					return
				}

				// Cria um novo toast se não houver ID ou não existir
				const toastElement = this.createFloatingElement({
					position,
					backgroundColor: style.backgroundColor,
					textColor: style.textColor,
					padding: '12px 18px',
					fontSize: '14px'
				})

				this.updateContent(toastElement, message)
				this.showElement(toastElement, 'translateY(0)')

				let timeoutId = null
				if (duration > 0) {
					timeoutId = setTimeout(() => {
						this.hideElement(toastElement, 'translateY(-20px)')
						setTimeout(() => {
							this.removeElement(toastElement)
							if (id) delete this.activeToasts[id]
						}, 300)
					}, duration)
				}

				// Se um ID foi fornecido, armazene o novo toast
				if (id) {
					this.activeToasts[id] = { element: toastElement, timeoutId }
				}
			},

			// Atualiza o conteúdo de um elemento
			updateContent: function (element, content) {
				if (!element) return
				element.innerHTML = content
			},

			// Cria um modal genérico
			createModal: function ({
				id,
				title,
				content,
				buttons = [],
				onClose = () => {},
				maxWidth = '500px',
				zIndex = '100'
			}) {
				const modalId = id || `modal-${Date.now()}`
				if (document.getElementById(modalId)) return document.getElementById(modalId)

				const modalOverlay = document.createElement('div')
				modalOverlay.id = modalId
				Object.assign(modalOverlay.style, {
					position: 'fixed',
					top: '0',
					left: '0',
					width: '100%',
					height: '100%',
					backgroundColor: 'rgba(0, 0, 0, 0.6)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					zIndex: zIndex,
					opacity: '0',
					transition: 'opacity 0.3s ease'
				})

				const modalContent = document.createElement('div')
				Object.assign(modalContent.style, {
					backgroundColor: '#fff',
					padding: '25px',
					borderRadius: '8px',
					boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
					width: '90%',
					maxWidth: maxWidth,
					color: '#333',
					transform: 'translateY(-20px)',
					transition: 'transform 0.3s ease'
				})

				modalContent.innerHTML = `
				<h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 600; color: #333;">${title}</h2>
				<div>${content}</div>
				<div class="modal-buttons" style="margin-top: 25px; display: flex; justify-content: flex-end; gap: 10px;"></div>
			`

				const buttonsContainer = modalContent.querySelector('.modal-buttons')
				buttons.forEach(({ text, type, action }) => {
					const button = document.createElement('button')
					button.textContent = text
					// Aplicar estilos simples para 'loud' e 'quiet'
					Object.assign(button.style, {
						padding: '10px 15px',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer',
						fontWeight: '600',
						fontSize: '14px'
					})
					if (type === 'loud') {
						button.style.backgroundColor = '#3498db'
						button.style.color = '#fff'
					} else {
						button.style.backgroundColor = '#ecf0f1'
						button.style.color = '#333'
					}
					button.addEventListener('click', action)
					buttonsContainer.appendChild(button)
				})

				modalOverlay.appendChild(modalContent)
				document.body.appendChild(modalOverlay)

				// Sobrescreve show/hide para o modal
				modalOverlay.show = () => {
					modalOverlay.style.opacity = '1'
					modalContent.style.transform = 'translateY(0)'
				}
				modalOverlay.hide = () => {
					modalOverlay.style.opacity = '0'
					modalContent.style.transform = 'translateY(-20px)'
					setTimeout(() => {
						if (modalOverlay.parentNode) {
							modalOverlay.parentNode.removeChild(modalOverlay)
						}
						onClose() // Chama o callback de fechamento
					}, 300)
				}

				// Esconder ao clicar fora
				modalOverlay.addEventListener('click', e => {
					if (e.target === modalOverlay) {
						modalOverlay.hide()
					}
				})

				return modalOverlay
			}
		},

		// Funções de navegação
		navigation: {
			// Redireciona para uma URL específica
			redirectTo: function (url) {
				window.location.href = url
			},

			// Recarrega a página atual
			refresh: function () {
				window.location.reload()
			},

			// Volta para a página anterior
			goBack: function () {
				window.history.back()
			}
		},

		// Funções de manipulação do DOM
		dom: {
			// Encontra um elemento por seletor CSS
			find: function (selector) {
				return document.querySelector(selector)
			},

			// Encontra todos os elementos que correspondem ao seletor
			findAll: function (selector) {
				return document.querySelectorAll(selector)
			},

			// Clica em um elemento
			click: function (element) {
				if (typeof element === 'string') {
					element = this.find(element)
				}
				if (element) {
					element.click()
				}
			},

			// Preenche um campo de input
			fill: function (element, value) {
				if (typeof element === 'string') {
					element = this.find(element)
				}
				if (element) {
					element.value = value
					// Dispara evento de mudança para triggers de JavaScript
					element.dispatchEvent(new Event('change', { bubbles: true }))
					element.dispatchEvent(new Event('input', { bubbles: true }))
				}
			},

			// Espera por um elemento aparecer na página e estar completamente interativo
			waitForElement: function (selector, timeout = 5000) {
				return new Promise((resolve, reject) => {
					const startTime = Date.now()

					const checkElement = async () => {
						try {
							// Aguarda qualquer carregamento de página em andamento
							if (document.readyState !== 'complete') {
								requestAnimationFrame(checkElement)
								return
							}

							const element = document.querySelector(selector)
							if (!element) {
								if (Date.now() - startTime >= timeout) {
									throw new Error(
										`Elemento ${selector} não encontrado após ${timeout}ms`
									)
								}
								requestAnimationFrame(checkElement)
								return
							}

							// Aguarda um frame para garantir que os estilos foram aplicados
							await new Promise(resolve => requestAnimationFrame(resolve))

							// Verifica se o elemento está visível
							const rect = element.getBoundingClientRect()
							const style = window.getComputedStyle(element)
							const isVisible =
								rect.width > 0 &&
								rect.height > 0 &&
								style.visibility !== 'hidden' &&
								style.display !== 'none' &&
								rect.bottom > 0 &&
								rect.right > 0 &&
								rect.top < window.innerHeight &&
								rect.left < window.innerWidth

							// Verifica se o elemento está realmente interativo
							const isInteractive =
								!element.disabled &&
								style.pointerEvents !== 'none' &&
								style.opacity !== '0' &&
								!element.closest('[aria-disabled="true"]') &&
								!element.closest('[disabled]')

							if (isVisible && isInteractive) {
								// Aguarda um pequeno tempo extra para garantir que eventos foram anexados
								await new Promise(resolve => setTimeout(resolve, 100))
								resolve(element)
								return
							}

							if (Date.now() - startTime >= timeout) {
								throw new Error(
									`Elemento ${selector} encontrado mas não está interativo após ${timeout}ms`
								)
							}

							requestAnimationFrame(checkElement)
						} catch (error) {
							reject(error)
						}
					}

					checkElement()
				})
			},

			// Verifica se um elemento existe na página
			exists: function (selector) {
				return !!document.querySelector(selector)
			}
		},

		// Funções de utilidade
		utils: {
			// Adiciona delay/espera
			sleep: function (ms) {
				return new Promise(resolve => setTimeout(resolve, ms))
			},

			// Executa uma função quando a página estiver totalmente carregada
			onPageLoad: function (callback) {
				if (document.readyState === 'complete') {
					callback()
				} else {
					window.addEventListener('load', callback)
				}
			},

			// Formata um tempo em milissegundos para um formato legível
			formatTime: function (ms) {
				const horas = Math.floor(ms / 3600000)
				const minutos = Math.floor((ms % 3600000) / 60000)
				const segundos = Math.floor((ms % 60000) / 1000)
				const milissegundos = ms % 1000

				let tempo = ''
				if (horas > 0) tempo += `${horas}h `
				if (minutos > 0) tempo += `${minutos}min `
				if (segundos > 0) tempo += `${segundos}s `
				if (milissegundos > 0) tempo += `${milissegundos}ms`

				return tempo.trim() || '0ms'
			},

			// Cria um log personalizado
			log: function (message) {
				console.log(`[MeliTools] ${message}`)
			},

			// Verifica se a URL atual corresponde a um padrão
			matchUrl: function (pattern) {
				// Converte o padrão do estilo @match para regex
				const regexPattern = pattern
					.replace(/\./g, '\\.') // Escapa pontos
					.replace(/\*/g, '.*') // Converte * em .*
					.replace(/\//g, '\\/') // Escapa barras

				const regex = new RegExp(`^${regexPattern}$`)
				return regex.test(window.location.href)
			},

			// Verifica se a URL atual corresponde a qualquer um dos padrões
			matchUrls: function (patterns) {
				if (!Array.isArray(patterns)) {
					patterns = [patterns]
				}
				return patterns.some(pattern => this.matchUrl(pattern))
			}
		}
	}

	MeliTools.utils.onPageLoad(() => {
		MeliTools.quickNavigator.init()
		MeliTools.packageStatusChanger.init()
	})

	// Expõe o MeliTools globalmente
	window.MeliTools = MeliTools
})()
