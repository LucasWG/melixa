function onOpen() {
	var ui = SpreadsheetApp.getUi();
	ui.createMenu("🚀 Automação - T1")
		.addItem("Enviar E-mails de Justificativa", "sendEmailsJustificativa")
		.addItem("Enviar Cancelado e duplicados", "processarCadu")
		.addItem("Enviar Relatório de Pacotes Vazios / Fraude", "enviarRelatorioPacotesVaziosFraude")
		.addToUi();
}
