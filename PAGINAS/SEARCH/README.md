# 📦 PackSearch v3

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/javascript-ES6%2B-yellow.svg?style=for-the-badge)
![Interface](https://img.shields.io/badge/UI-Modern%20Design-orange.svg?style=for-the-badge)

> **Uma plataforma logística serverless de alto desempenho para busca, rastreamento e enriquecimento inteligente de dados de remessas.**

O **PackSearch** é uma solução web moderna projetada para profissionais de logística que lidam com grandes volumes de dados. Ele permite processar, gerenciar e realizar buscas complexas em remessas diretamente no navegador, eliminando a necessidade de infraestrutura de servidor e garantindo a máxima privacidade e agilidade.

---

## 🚀 Diferenciais Estratégicos

- **🔍 Engine de Busca Transacional**: Localize qualquer informação instantaneamente com suporte a termos exatos (`"frase"`), exclusão (`-termo`) e escopo por campos (`id:`, `svc:`, `tramo:`).
- **📂 Parser Inteligente e Adaptável**: Suporte nativo para múltiplos formatos:
    - **CSV Tabular**: Detecção automática de delimitadores (`,`, `;`, `|`, `\t`).
    - **Blocos Chave-Valor**: Processamento de logs e textos estruturados.
    - **Mapeamento Dinâmico**: Sistema de _aliases_ que reconhece colunas como `shipment`, `descri`, `facility_id` e as converte automaticamente.
- **💾 Persistência Offline Industrial**: Utiliza **IndexedDB** para armazenar milhares de registros de forma segura no navegador, permitindo acesso instantâneo e recuperação pós-fechamento.
- **🧬 Fluxo de Enriquecimento (SQL Sync)**: Gere automaticamente queries SQL para BigQuery para buscar dados faltantes e atualize seu cache local colando os resultados.
- **🎨 Experiência Premium (UI/UX)**: Interface responsiva com suporte a temas (Light/Dark), animações sutis, visualização em Grade/Lista e notificações não-bloqueantes.

---

## 🛠 Tech Stack

A arquitetura do PackSearch prioriza performance e zero dependências externas pesadas (Zero-Dependency Core):

- **Core**: Vanilla JavaScript (ES6+) para máxima eficiência.
- **Storage**: IndexedDB API para persistência de dados em larga escala.
- **Styling**: Modern CSS (Grid, Flexbox, CSS Variables) com design responsivo.
- **Icons**: SVG nativo para carregamento ultra-rápido.
- **Fonts**: Inter (via Google Fonts) para legibilidade profissional.

---

## 📖 Guia de Uso

### 1. Importação de Dados

Simplesmente arraste seu arquivo `.csv` ou `.txt` ou use o botão **Importar**. O sistema cuidará da normalização:

- Remoção automática de acentos e caracteres especiais.
- Conversão de datas em português (ex: "10 de janeiro de 2026").
- Identificação de valores monetários e status logísticos.

### 2. Sintaxe de Busca Avançada

A barra de pesquisa não é apenas um filtro de texto, é uma ferramenta de diagnóstico:

| Operação            | Exemplo de Sintaxe      | Descrição                                                   |
| :------------------ | :---------------------- | :---------------------------------------------------------- |
| **Termo Exato**     | `"São Paulo"`           | Busca a frase exatamente como escrita.                      |
| **Exclusão**        | `id:123 -cancelado`     | Busca o ID 123, mas oculta itens que contenham "cancelado". |
| **Escopo de Campo** | `svc:SMG2`              | Filtra especificamente na coluna de serviço (SVC).          |
| **Composição**      | `tramo:ONWAY "urgente"` | Combina filtros de campo com termos de texto.               |

---

## 💻 Desenvolvimento e Estrutura

O projeto segue uma estrutura modular e limpa para facilitar extensões:

```text
PackageSearch/
├── src/
│   ├── index.html     # Estrutura semântica e acessível
│   ├── app.js         # Engine principal (Parser, Search, IDB)
│   ├── styles.css     # Design System e Tematização
│   └── image/         # Assets e recursos visuais
├── .editorconfig      # Padronização de código
└── README.md          # Documentação técnica
```

### Extensibilidade

Para adicionar novos apelidos de colunas, basta editar a constante `COL_MAP` em `src/app.js`:

```javascript
const COL_MAP = {
	meu_campo_custom: "id", // Mapeia 'meu_campo_custom' para o ID interno
	// ...
};
```

---

## 📦 Instalação e Execução Local

Como o PackSearch é uma aplicação estática, a execução é imediata.

1.  **Clone o repositório**:

    ```bash
    git clone https://github.com/seu-usuario/PackageSearch.git
    cd PackageSearch
    ```

2.  **Servidor Local (Recomendado)**:
    Para evitar restrições de CORS ao lidar com módulos ou arquivos locais:

    ```bash
    # Usando Python
    python3 -m http.server 8000

    # Ou usando Node.js (npx)
    npx serve src/
    ```

3.  **Acesse**: `http://localhost:8000/src/`

---

## 🎯 Roadmap & Futuro

- [ ] Exportação consolidada para Excel/JSON.
- [ ] Dashboards analíticos com gráficos integrados.
- [ ] Sincronização em nuvem opcional (E2E Encrypted).
- [ ] Suporte a múltiplos idiomas (i18n).

---

## 🤝 Contribuição

Interessado em melhorar o PackSearch?

1. Faça um **Fork**.
2. Crie sua Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`).
4. Push para a Branch (`git push origin feature/AmazingFeature`).
5. Abra um **Pull Request**.

---

## 📝 Licença

Distribuído sob a licença **MIT**. Veja `LICENSE` para mais informações.

---

<p align="center">
  Desenvolvido com ❤️ por <strong>LucasWG</strong>
</p>
