/**
 * Envia e-mail com todas as tabelas da aba "CANCELADO & DUPLICADO"
 */
function processarCadu() {
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var sheet = ss.getSheetByName("CANCELADO & DUPLICADO");
	var data = sheet.getDataRange().getValues();

	// --- DESTINATÁRIOS (adicione os e-mails aqui) ---
	var destinatarios =
		"lucas.cdsouza@mercadolivre.com, genderson.reseende@mercadolivre.com, marcelo.esteves@mercadolivre.com, lucastav.campos@mercadolivre.com, johnny.msilva@mercadolivre.com, matheus.rsilva@mercadolivre.com";
	var ccoDefault = "";

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

	// Lê os cabeçalhos da linha 1
	var headers = data[0]; // ["LOGISTICS CANCELADO", "ENTREGUE", "PERDIDO", "DEVOLVIDO", "JET"]

	// Cores por coluna (cabeçalho)
	var coresColunas = [
		"#FFE600", // LOGISTICS CANCELADO - vermelho
		"#FFE600", // ENTREGUE - verde
		"#FFE600", // PERDIDO - laranja
		"#FFE600", // DEVOLVIDO - roxo
		"#FFE600", // JET - azul
	];

	// Formata a data do dia em dd/mm/YYYY (considerando timezone do Brasil)
	var dataFormatada = Utilities.formatDate(
		new Date(),
		Session.getScriptTimeZone(),
		"dd/MM/yyyy",
	);

	var corpoHtml = "<p>Olá, time.</p>";
	corpoHtml +=
		"<p>Segue abaixo a lista dos IDs que foram devolvidos como <strong>Cancelados e Duplicados</strong> na devolução de hoje (" +
		dataFormatada +
		").</p>";

	// Itera cada coluna e monta uma tabela separada
	for (var col = 0; col < headers.length; col++) {
		var header = headers[col];
		if (!header) continue;

		// Coleta os valores não vazios desta coluna (a partir da linha 2)
		var itens = [];
		for (var row = 1; row < data.length; row++) {
			var valor = data[row][col];
			if (valor !== "" && valor !== null && valor !== undefined) {
				itens.push(valor);
			}
		}

		// Monta a tabela para esta coluna
		var corHeader = coresColunas[col] || "#2D3277";

		corpoHtml +=
			"<table border='1' style='border-collapse: collapse; width: 50%; font-family: Roboto, sans-serif; margin-bottom: 20px;'>";
		corpoHtml +=
			"<tr style='background-color: " + corHeader + "; color: #000;'>";
		corpoHtml +=
			"<th style='padding: 8px; text-align: center;'>" + header + "</th>";
		corpoHtml += "</tr>";

		if (itens.length === 0) {
			corpoHtml +=
				"<tr><td style='padding: 8px; text-align: center; color: #999;'>Nenhum item</td></tr>";
		} else {
			itens.forEach(function (valor) {
				corpoHtml +=
					"<tr><td style='padding: 8px; text-align: center;'>" +
					valor +
					"</td></tr>";
			});
		}

		corpoHtml += "</table>";
	}

	corpoHtml += "<br><br>" + minhaAssinatura;

	// Envia o e-mail
	GmailApp.sendEmail(
		destinatarios,
		"Relatório Cancelados & Duplicados - SMG2",
		"",
		{
			htmlBody: corpoHtml,
			bcc: ccoDefault,
		},
	);

	SpreadsheetApp.getUi().alert(
		"E-mail enviado com sucesso para: " + destinatarios,
	);
	Logger.log("E-mail enviado para: " + destinatarios);
}
