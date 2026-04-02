/**
 * Envia e-mail com relatório consolidado de Pacotes Vazios / Fraude
 * Ordena por: ORIGEM, VALOR_REAL, SHP_LG_STATUS, SHP_LG_SUB_STATUS
 */
function enviarRelatorioPacotesVaziosFraude() {
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var sheet = ss.getSheetByName("PACOTES VAZIOS / FRAUDE");
	var data = sheet.getDataRange().getValues();

	// --- DESTINATÁRIOS (adicione os e-mails aqui) ---
	// var destinatarios = "lucas.cdsouza@mercadolivre.com";
	// var ccoDefault = "";
	var destinatarios = "genderson.reseende@mercadolivre.com, marcelo.esteves@mercadolivre.com";
	var ccoDefault = "lucas.cdsouza@mercadolivre.com, lucastav.campos@mercadolivre.com, johnny.msilva@mercadolivre.com, matheus.rsilva@mercadolivre.com";

	// Captura a assinatura padrão do Gmail
	var minhaAssinatura = "";
	try {
		var sendAs = Gmail.Users.Settings.SendAs.list("me").sendAs;
		for (var i = 0; i < sendAs.length; i++) {
			if (sendAs[i].isDefault) {
				minhaAssinatura = sendAs[i].signature;
				break;
			}
		}
	} catch (e) {
		Logger.log("Erro ao buscar assinatura: " + e.message);
		minhaAssinatura = "--<br>Enviado via Automação Google Sheets";
	}

	// Lê os cabeçalhos (linha 1)
	var headers = data[0];

	// Índices das colunas esperadas
	var idxShipmentId = headers.indexOf("SHP_SHIPMENT_ID");
	var idxOrigem = headers.indexOf("ORIGEM");
	var idxItemDesc = headers.indexOf("SHP_ITEM_DESC");
	var idxValorReal = headers.indexOf("VALOR_REAL");
	var idxStatus = headers.indexOf("SHP_LG_STATUS");
	var idxSubStatus = headers.indexOf("SHP_LG_SUB_STATUS");
	var idxPromiseTo = headers.indexOf("SHP_LG_PROMISE_DT_TO");
	var idxPromiseFrom = headers.indexOf("SHP_LG_PROMISE_DT_FROM");
	var idxLastUpdated = headers.indexOf("shp_lg_last_updated");

	// Coleta os dados (a partir da linha 2)
	var pacotes = [];
	for (var row = 1; row < data.length; row++) {
		if (data[row][idxShipmentId]) {
			pacotes.push({
				dados: data[row],
				linhaSheet: row + 1, // Linha real na sheet (para pegar formato)
			});
		}
	}

	// Ordena por: ORIGEM, VALOR_REAL, SHP_LG_STATUS, SHP_LG_SUB_STATUS
	pacotes.sort(function (a, b) {
		// Ordem 1: ORIGEM (alfabética)
		if (a[idxOrigem] !== b[idxOrigem]) {
			return a[idxOrigem].localeCompare(b[idxOrigem]);
		}
		// Ordem 2: VALOR_REAL (numérica descendente - maior primeiro)
		var valorA = parseFloat(
			String(a[idxValorReal]).replace("R$", "").replace(",", "."),
		);
		var valorB = parseFloat(
			String(b[idxValorReal]).replace("R$", "").replace(",", "."),
		);
		if (valorA !== valorB) {
			return valorB - valorA;
		}
		// Ordem 3: SHP_LG_STATUS (alfabética)
		if (a[idxStatus] !== b[idxStatus]) {
			return a[idxStatus].localeCompare(b[idxStatus]);
		}
		// Ordem 4: SHP_LG_SUB_STATUS (alfabética)
		return a[idxSubStatus].localeCompare(b[idxSubStatus]);
	});

	// Formata a data do dia em dd/mm/YYYY
	var dataFormatada = Utilities.formatDate(
		new Date(),
		Session.getScriptTimeZone(),
		"dd/MM/yyyy",
	);

	var corpoHtml = "<p>Olá, time.</p>";
	corpoHtml +=
		"<p>Segue abaixo o relatório consolidado de <strong>Pacotes Vazios / Fraude</strong> identificados como fraude na operação SMG2 em " +
		dataFormatada +
		".</p>";

	// Monta a tabela HTML
	corpoHtml +=
		"<table border='1' style='border-collapse: collapse; width: 100%; font-family: Roboto, sans-serif; font-size: 12px;'>";
	corpoHtml +=
		"<tr style='background-color: #2D3277; color: #FFF; font-weight: bold;'>";
	corpoHtml += "<th style='padding: 8px; text-align: center;'>SHIPMENT</th>";
	corpoHtml += "<th style='padding: 8px; text-align: center;'>ORIGEM</th>";
	corpoHtml += "<th style='padding: 8px; text-align: left;'>PRODUTO</th>";
	corpoHtml += "<th style='padding: 8px; text-align: center;'>VALOR</th>";
	corpoHtml += "<th style='padding: 8px; text-align: center;'>STATUS</th>";
	corpoHtml += "<th style='padding: 8px; text-align: center;'>SUB-STATUS</th>";
	corpoHtml += "<th style='padding: 8px; text-align: center;'>ENTREGA ATÉ</th>";
	corpoHtml += "<th style='padding: 8px; text-align: center;'>ENTREGA DE</th>";
	corpoHtml += "<th style='padding: 8px; text-align: center;'>ÚLTIMA ATUALIZAÇÃO</th>";
	corpoHtml += "</tr>";

	// Insere as linhas ordenadas
	pacotes.forEach(function (item) {
		var row = item.dados;
		var linhaSheet = item.linhaSheet;

		var dataTo = new Date(row[idxPromiseTo]);
		var dataFrom = new Date(row[idxPromiseFrom]);
		var dataUpdated = new Date(row[idxLastUpdated]);

		var dataToFormatada = Utilities.formatDate(
			dataTo,
			"GMT-3",
			"dd/MM/yyyy HH:mm",
		);
		var dataFromFormatada = Utilities.formatDate(
			dataFrom,
			"GMT-3",
			"dd/MM/yyyy HH:mm",
		);
		var dataUpdatedFormatada = Utilities.formatDate(
			dataUpdated,
			"GMT-3",
			"dd/MM/yyyy HH:mm",
		);

		// Obtém o símbolo monetário da célula
		var numeroFormato = sheet.getRange(linhaSheet, idxValorReal + 1).getNumberFormat();
		var simboloMoeda = "R$ ";
		if (numeroFormato.includes("R$")) {
			simboloMoeda = "R$ ";
		} else if (numeroFormato.includes("€")) {
			simboloMoeda = "€ ";
		} else if (numeroFormato.includes("¥")) {
			simboloMoeda = "¥ ";
		} else if (numeroFormato.includes("$")) {
			simboloMoeda = "$ ";
		}

		var valorFormatado = String(row[idxValorReal]);
		// Remove símbolos antigos se existirem
		valorFormatado = valorFormatado.replace(/R\$\s?/g, "").replace(/\$\s?/g, "").replace(/¥\s?/g, "").replace(/€\s?/g, "").trim();
		// Converte para número e formata com 2 casas decimais
		var valorNumerico = parseFloat(valorFormatado);
		valorFormatado = simboloMoeda + valorNumerico.toFixed(2);

		// Cores alternadas para melhor visualização
		var bgColor = pacotes.indexOf(item) % 2 === 0 ? "#FAFAFA" : "#FFF";

		corpoHtml += "<tr style='background-color: " + bgColor + ";'>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: center;'>" +
			row[idxShipmentId] +
			"</td>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: center; font-weight: bold;'>" +
			row[idxOrigem] +
			"</td>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: left; white-space: normal;'>" +
			row[idxItemDesc] +
			"</td>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: right; white-space: nowrap;'>" +
			valorFormatado +
			"</td>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: center;'>" +
			row[idxStatus] +
			"</td>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: center;'>" +
			row[idxSubStatus] +
			"</td>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: center;'>" +
			dataToFormatada +
			"</td>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: center;'>" +
			dataFromFormatada +
			"</td>";
		corpoHtml +=
			"<td style='padding: 8px; text-align: center;'>" +
			dataUpdatedFormatada +
			"</td>";
		corpoHtml += "</tr>";
	});

	corpoHtml += "</table>";

	corpoHtml += "<br><p><strong>Total de registros: " + pacotes.length + "</strong></p>";

	corpoHtml += "<br><br>" + minhaAssinatura;

	// Envia o e-mail
	GmailApp.sendEmail(
		destinatarios,
		"Relatório de Pacotes Vazios / Fraude - SMG2 (" + dataFormatada + ")",
		"",
		{
			htmlBody: corpoHtml,
			bcc: ccoDefault,
		},
	);

	SpreadsheetApp.getUi().alert(
		"Relatório enviado com sucesso para: " +
		destinatarios +
		"\nTotal de registros: " +
		pacotes.length,
	);
	Logger.log("Relatório enviado para: " + destinatarios);
	Logger.log("Total de registros: " + pacotes.length);

	// Pergunta se deseja apagar as linhas enviadas
	var ui = SpreadsheetApp.getUi();
	var resposta = ui.alert(
		"Deseja apagar todas as linhas enviadas?",
		ui.ButtonSet.YES_NO,
	);

	if (resposta === ui.Button.YES) {
		// Apaga todas as linhas de dados, mantendo o cabeçalho
		if (pacotes.length > 0) {
			sheet.deleteRows(2, pacotes.length);
			ui.alert("Linhas apagadas com sucesso!");
			Logger.log(pacotes.length + " linhas foram apagadas.");
		}
	}
}
