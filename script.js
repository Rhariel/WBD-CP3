
class VerificadorFakeNews {
  constructor() {
    this.frasesBase = [
      { frase: "Vacina causa autismo", status: "Fake", fonte: "OMS" },
      { frase: "Terra é plana", status: "Fake", fonte: "NASA" },
      { frase: "5G espalha COVID-19", status: "Fake" },
      { frase: "Cloroquina cura COVID-19", status: "Fake" },
      { frase: "Máscaras ajudam a prevenir doenças respiratórias", status: "Verdadeiro" },
      { frase: "Vacinas salvam vidas", status: "Verdadeiro" },
      { frase: "O desmatamento afeta o clima", status: "Verdadeiro" },
      { frase: "O aquecimento global é causado por humanos", status: "Verdadeiro" },
      { frase: "COVID-19 foi criado em laboratório como arma biológica", status: "Fake" },
      { frase: "Lavar as mãos previne infecções", status: "Verdadeiro" },
      { frase: "Alimentos alcalinos curam câncer", status: "Fake" },
      { frase: "Exercícios físicos melhoram a saúde", status: "Verdadeiro" },
      { frase: "Hidroxicloroquina é eficaz contra COVID-19", status: "Fake" },
      { frase: "Meditação reduz estresse", status: "Verdadeiro" },


    ];
    
    this.historico = JSON.parse(localStorage.getItem("historico")) || [];
    this.inicializarElementos();
  }

  inicializarElementos() {
    this.resultadoDiv = document.getElementById("resultado");
    this.noticiasDiv = document.getElementById("noticias");
    this.historicoDiv = document.getElementById("historico");
    this.frasesRecentesDiv = document.getElementById("frasesRecentes");
    
    this.mostrarFrasesRecentes();
    this.mostrarHistorico();
  }

  async verificarFrase() {
    const fraseInput = document.getElementById("fraseInput").value.trim();
    
    this.limparResultados();
    
    if (!fraseInput) {
      this.mostrarMensagem("Digite uma frase para verificar.");
      return;
    }

    try {
      const resultadoLocal = this.verificarLocalmente(fraseInput);
      if (resultadoLocal) {
        this.exibirResultado(resultadoLocal);
        this.registrarHistorico(fraseInput, resultadoLocal);
        return;
      }
      
      const resultadoAPI = await this.verificarNaAPI(fraseInput);
      this.exibirResultado(resultadoAPI);
      this.registrarHistorico(fraseInput, resultadoAPI);
      
      this.mostrarFrasesRecentes();
      
    } catch (error) {
      this.tratarErro(error, fraseInput);
    }
  }

  verificarLocalmente(frase) {
    const encontrada = this.frasesBase.find(item => 
      item.frase.toLowerCase() === frase.toLowerCase()
    );
    return encontrada ? { 
      status: encontrada.status, 
      fonte: encontrada.fonte || "Base Local" 
    } : null;
  }

  async verificarNaAPI(frase) {
    this.mostrarCarregamento();
    
    const fraseSanitizada = frase.replace(/[^\w\sÀ-ÿ]/gi, '');
    const apiUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(fraseSanitizada)}&lang=pt&apikey=665039f151bf02aa711addfd929c5be5`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.articles?.length) {
      return { status: "Indeterminado", fonte: "Nenhuma notícia encontrada" };
    }
    
    this.exibirNoticias(data.articles);
    return this.analisarConteudo(data.articles);
  }

  analisarConteudo(articles) {
    let score = 0;
    const fakeTerms = ['fake', 'falso', 'boato', 'desmentido'];
    const trueTerms = ['comprovado', 'estudo', 'científico'];
    
    articles.forEach(article => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      
      if (fakeTerms.some(term => text.includes(term))) score -= 2;
      if (trueTerms.some(term => text.includes(term))) score += 1;
    });
    
    return {
      status: score < -2 ? "Fake" : score > 1 ? "Verdadeiro" : "Indeterminado",
      fonte: "Análise Automática",
      artigos: articles.length
    };
  }

  exibirResultado({status, fonte, artigos}) {
    const templates = {
      Fake: {
        classe: "fake",
        icone: "❌",
        titulo: "Fake News Detectada",
        detalhe: `Fontes confiáveis (${fonte}) desmentem esta informação.`
      },
      Verdadeiro: {
        classe: "verdadeiro",
        icone: "✅",
        titulo: "Fato Verificado",
        detalhe: `Confirmado por ${fonte} com base em ${artigos || 'várias'} fontes.`
      },
      Indeterminado: {
        classe: "indeterminado",
        icone: "🔍",
        titulo: "Não Confirmado",
        detalhe: "Não encontramos informações suficientes para verificar."
      }
    };
    
    const {classe, icone, titulo, detalhe} = templates[status];
    this.resultadoDiv.innerHTML = `
      <div class="resultado-${classe}">
        <p>${icone} <strong>${titulo}</strong></p>
        <p>${detalhe}</p>
      </div>
    `;
  }

  exibirNoticias(articles) {
    this.noticiasDiv.innerHTML = `
      <h3>Notícias Relacionadas (${articles.length})</h3>
      <div class="lista-noticias">
        ${articles.slice(0, 5).map(article => `
          <div class="noticia">
            <a href="${article.url}" target="_blank">${article.title}</a>
            <p class="fonte">${article.source.name} - ${new Date(article.publishedAt).toLocaleDateString()}</p>
          </div>
        `).join('')}
      </div>
    `;
  }
  registrarHistorico(frase, resultado) {
    const entrada = {
      frase,
      status: resultado.status,
      fonte: resultado.fonte,
      data: new Date().toLocaleString(),
      artigos: resultado.artigos || 0
    };
    
    this.historico.unshift(entrada);
    localStorage.setItem("historico", JSON.stringify(this.historico));
    this.mostrarHistorico();
  }

  mostrarHistorico() {
    if (!this.historico.length) {
      this.historicoDiv.innerHTML = "<p>Nenhuma busca registrada.</p>";
      return;
    }
    
    this.historicoDiv.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Frase</th>
            <th>Resultado</th>
            <th>Fontes</th>
          </tr>
        </thead>
        <tbody>
          ${this.historico.slice(0, 20).map(item => `
            <tr class="status-${item.status.toLowerCase()}">
              <td>${item.data}</td>
              <td>${item.frase}</td>
              <td>${item.status}</td>
              <td>${item.fonte}${item.artigos ? ` (${item.artigos})` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  mostrarFrasesRecentes() {
    const recentes = [...new Set(this.historico.slice(0, 5).map(item => item.frase))];
    this.frasesRecentesDiv.innerHTML = recentes.length 
      ? `<h4>Verificações recentes:</h4><ul>${
          recentes.map(f => `<li>${f}</li>`).join('')
        }</ul>` 
      : '';
  }

  mostrarCarregamento() {
    this.resultadoDiv.innerHTML = '<div class="carregando"><p>🔍 Analisando informações...</p></div>';
    this.noticiasDiv.innerHTML = '<p class="carregando">Buscando notícias relacionadas...</p>';
  }

  tratarErro(error, frase) {
    console.error("Erro:", error);
    
    const mensagem = error.message.includes("Failed to fetch")
      ? "Erro de conexão. Verifique sua internet."
      : error.message.includes("401")
      ? "Serviço temporariamente indisponível."
      : "Ocorreu um erro durante a verificação.";
    
    this.resultadoDiv.innerHTML = `
      <div class="resultado-erro">
        <p>⚠️ ${mensagem}</p>
        <p>Tente novamente mais tarde.</p>
      </div>
    `;
    
    this.registrarHistorico(frase, { 
      status: "Erro", 
      fonte: error.message 
    });
  }

  limparResultados() {
    this.resultadoDiv.innerHTML = "";
    this.noticiasDiv.innerHTML = "";
  }

  limparHistorico() {
    if (confirm("Tem certeza que deseja apagar todo o histórico?")) {
      this.historico = [];
      localStorage.removeItem("historico");
      this.historicoDiv.innerHTML = "<p>Histórico apagado com sucesso.</p>";
      this.mostrarFrasesRecentes();
    }
  }
}

const verificador = new VerificadorFakeNews();

function verificarFrase() { verificador.verificarFrase(); }
function mostrarHistorico() { verificador.mostrarHistorico(); }
function limparHistorico() { verificador.limparHistorico(); }