const loggedUser = localStorage.getItem("loggedUser");
const userRole = localStorage.getItem("userRole");
const token = localStorage.getItem("authToken");
const feedContainer = document.getElementById("feed-container");
let todasAvaliacoes = [];

if (!token) {
  window.location.href = "./pages/login/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const loggedUserEl = document.getElementById("loggedUser");
  const loggedUserEmailEl = document.getElementById("loggedUserEmail");

  if (loggedUserEl) loggedUserEl.textContent = loggedUser;
  if (loggedUserEmailEl)
    loggedUserEmailEl.textContent = localStorage.getItem("loggedEmail");

  // Atualiza a foto na bolinha da Navbar
  const avatarNav = document.querySelector("#navUser .user-avatar");
  const avatarSalvo = localStorage.getItem(`avatar_${loggedUserEmailEl}`);

  if (avatarNav) {
    if (avatarSalvo) {
      // Se tem foto salva, coloca como fundo e limpa o texto
      avatarNav.style.backgroundImage = `url(${avatarSalvo})`;
      avatarNav.textContent = ""; 
    } else {
        // Se não tem foto, coloca as iniciais do nome
        avatarNav.style.backgroundImage = "none";
        avatarNav.textContent = loggedUserEl.substring(0, 2).toUpperCase();
    }
  }

  carregarFeed();
  carregarRanking();

  document.querySelectorAll(".tl-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tl-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });

  // 1. MAPEANDO TUDO
  const btnAbrirModal = document.getElementById("btn-abrir-registro");
  const modalContainer = document.getElementById("modal-container");
  const formAvaliacao = document.getElementById("formAvaliacao");
  const btnSubmit = document.getElementById("btnSubmit");
  const btnFecharModal = document.getElementById("btn-fechar-modal"); // <-- O FILHO DA PUTA AQUI
  const inputSujeito = document.getElementById("sujeito");
  const selectSabor = document.querySelector('select[name="sabor"]');

  // 2. PREENCHER NOME DO USUÁRIO
  const usuarioLogado = localStorage.getItem("loggedUser") || "Desconhecido";
  if (inputSujeito) {
    inputSujeito.value = usuarioLogado;
  }

  // 3. ABRIR MODAL
  if (btnAbrirModal) {
    btnAbrirModal.addEventListener("click", (e) => {
      e.preventDefault();
      modalContainer.style.display = "flex";
      document.body.style.overflow = "hidden";
      if (selectSabor) selectSabor.focus(); 
    });
  }

  // 4. FUNÇÃO PARA FECHAR E LIMPAR TUDO
  const fecharModal = () => {
    modalContainer.style.display = "none";
    document.body.style.overflow = "";
    if (formAvaliacao) formAvaliacao.reset();
    if (inputSujeito) inputSujeito.value = usuarioLogado; // Devolve o nome
  };

  // 5. ATRIBUINDO A FUNÇÃO DE FECHAR
  
  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", fecharModal);
  }

  // 6. FECHAR CLICANDO FORA DA TELA
  window.addEventListener("mousedown", (e) => {
    if (e.target === modalContainer) {
      fecharModal();
    }
  });
  
  // 7. ENVIAR OS DADOS PRO BACK-END (FETCH)
  if (formAvaliacao) {
    formAvaliacao.addEventListener("submit", async (e) => {
      e.preventDefault();
      const textoOriginal = btnSubmit.innerText;
      btnSubmit.innerText = "Enviando... 🚀";
      btnSubmit.disabled = true;

      try {
        // Empacota tudo do form (inclusive a foto!)
        const formData = new FormData(formAvaliacao);
        const resposta = await fetch("https://monster-reviews-api.onrender.com/api/avaliacoes", {
          method: "POST",
          body: formData
        });

        const dados = await resposta.json();

        if (resposta.ok) {
          alert("Review postada com sucesso! 🔋");
          modalContainer.style.display = "none";
          formAvaliacao.reset();
          location.reload(); // Atualiza a página pra latinha nova aparecer no feed!
        } else {
          alert(`Erro: ${dados.erro || "Falha ao postar"}`);
        }
      } catch (erro) {
        console.error("Erro no envio:", erro);
        alert("Erro ao conectar com o servidor.");
      } finally {
        // Devolve o botão ao normal se der erro
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
      }
    });
  }

  const btnAplicar = document.getElementById("btnAplicarFiltros");
  const btnLimpar = document.getElementById("btnLimparFiltros");

  // AÇÃO DO BOTÃO APLICAR
  if (btnAplicar) {
    btnAplicar.addEventListener("click", () => {
      // 1. Pegando o que o usuário escolheu
      const busca = document.getElementById("filtroBusca").value.toLowerCase();
      const apenasMinhas = document.getElementById("checkMeusPosts").checked;
      const sabor = document.getElementById("filtroSabor").value;
      const notaMinima = parseFloat(document.getElementById("filtroNota").value) || 0;
      const ordem = document.getElementById("filtroOrdem").value;
      const usuarioLogado = localStorage.getItem("loggedUser");
      
      const tagAtiva = document.querySelector("#tagGroupValeu .tag.active");
      const valeuFiltro = tagAtiva ? tagAtiva.getAttribute("data-value") : "todos";

      // 2. Passando a peneira nos posts
      let postsFiltrados = todasAvaliacoes.filter(post => {
        
        // Regra 1: Só as minhas
        if (apenasMinhas && post.sujeito !== usuarioLogado) return false;

        // Regra 2: Busca por nome ou review
        const textoPost = `${post.sujeito} ${post.review || ""}`.toLowerCase();
        if (busca && !textoPost.includes(busca)) return false;

        // Regra 3: Sabor Exato
        if (sabor && post.sabor !== sabor) return false;

        // Regra 4: Nota Mínima
        if (post.nota < notaMinima) return false;

        // Regra 5: Valeu a Pena?
        if (valeuFiltro !== "todos") {
          const ehTrue = valeuFiltro === "true";
          if (post.valeu_a_pena !== ehTrue) return false;
        }

        return true; // Passou em todas as regras, continua na lista!
      });

      // 3. Ordenando a lista que sobrou
      postsFiltrados.sort((a, b) => {
        if (ordem === "recentes") return new Date(b.createdAt) - new Date(a.createdAt);
        if (ordem === "antigos") return new Date(a.createdAt) - new Date(b.createdAt);
        if (ordem === "maior_nota") return b.nota - a.nota;
        if (ordem === "menor_nota") return a.nota - b.nota;
        if (ordem === "menor_preco") return a.valor - b.valor;
        return 0;
      });

      // 4. Manda desenhar a nova lista na tela
      renderizarPosts(postsFiltrados); 
    });
  }

  // AÇÃO DO BOTÃO LIMPAR
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      // Zera tudo
      document.getElementById("filtroBusca").value = "";
      document.getElementById("checkMeusPosts").checked = false;
      document.getElementById("filtroSabor").value = "";
      document.getElementById("filtroNota").value = "";
      document.getElementById("filtroOrdem").value = "recentes";

      document.querySelectorAll("#tagGroupValeu .tag").forEach(t => t.classList.remove("active"));
      const tagTodos = document.querySelector("#tagGroupValeu .tag[data-value='todos']");
      if(tagTodos) tagTodos.classList.add("active");

      // Devolve a timeline inteira e original
      renderizarPosts(todasAvaliacoes);
    });
  }
  
});

function toggleDropdown() {
  const nu = document.getElementById("navUser");
  if (nu) nu.classList.toggle("open");
}

document.addEventListener("click", (e) => {
  const nu = document.getElementById("navUser");
  if (nu && !nu.contains(e.target)) {
    nu.classList.remove("open");
  }
});

async function carregarFeed() {
  if (!feedContainer) return;
  feedContainer.innerHTML = "<p>Carregando avaliações monstruosas...</p>";
  try {
    const resposta = await fetch(
      "https://monster-reviews-api.onrender.com/api/avaliacoes",
    );
    const avaliacoes = await resposta.json();
    todasAvaliacoes = avaliacoes; // alimenta o array
    preencherComboboxUsuarios(todasAvaliacoes);
    renderizarPosts(todasAvaliacoes);
  } catch (erro) {
    feedContainer.innerHTML =
      "<p>❌ Erro ao conectar com o servidor do Render.</p>";
    console.error(erro);
  }
}

function renderizarPosts(arrayAvaliacoes){
  feedContainer.innerHTML = "";
    if (arrayAvaliacoes.length === 0) {
      feedContainer.innerHTML =
        "<p>Nenhuma avaliação postada ainda. Seja o primeiro!</p>";
      return;
    }
    arrayAvaliacoes.forEach((post) => {
      const estrelas =
        "★".repeat(Math.round(post.nota / 2)) +
        "☆".repeat(5 - Math.round(post.nota / 2));
      const valeuClasse = post.valeu_a_pena ? "valeu-sim" : "valeu-nao";
      const valeuTexto = post.valeu_a_pena ? "Sim" : "Não";

      const postArticle = document.createElement("article");
      postArticle.className = "post-card";

      postArticle.innerHTML = `
    <div class="post-head">
      <div class="post-avatar" style="background:linear-gradient(135deg,#e74c3c,#c0392b)">
        ${post.sujeito.substring(0, 2).toUpperCase()}
      </div>
      <div class="post-meta">
        <strong>${post.sujeito}</strong>
        <span>${new Date(post.createdAt).toLocaleDateString("pt-BR")} · Público</span>
      </div>
    </div>
    
    <div class="post-image">
      <img src="${post.foto_url}" alt="Foto do Monster" style="width:100%; max-height:400px; object-fit:contain; border-radius:4px;">
    </div>
    
    <div class="post-info">
      <div class="info-item"><span class="info-label">Sabor</span><span class="info-value">${post.sabor}</span></div>
      <div class="info-item"><span class="info-label">Valor</span><span class="info-value">R$ ${Number(post.valor).toFixed(2).replace(".", ",")}</span></div>
      <div class="info-item"><span class="info-label">Nota</span><span class="info-value">${Number(post.nota).toFixed(1)} <span class="nota-stars">${estrelas}</span></span></div>
      <div class="info-item"><span class="info-label">Valeu a pena?</span><span class="info-value ${valeuClasse}">${valeuTexto}</span></div>
    </div>
    
    <div class="post-desc">${post.review || "Sem descrição."}</div>
    
    <div class="post-footer" style="display: flex; justify-content: space-between; align-items: center;">
      <button class="post-action">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        0
      </button>

      ${(post.sujeito === loggedUser || userRole === 'admin') 
          ? `<button class="post-action" onclick="deletarPost('${post._id}')" style="color: #ff4d4d; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: bold;">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
               Excluir
             </button>` 
          : ''
      }
    </div>
`;
      feedContainer.appendChild(postArticle);
    });
}

async function deletarPost(id) {
    try {
        const resposta = await fetch(`https://monster-reviews-api.onrender.com/api/avaliacoes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': localStorage.getItem('authToken')
            }
        });
        if (resposta.ok) {
            alert("Post excluído com sucesso!");
            location.reload();
        } else {
            const dados = await resposta.json();
            alert(dados.erro || "Erro ao deletar.");
        }
    } catch (erro) {
        console.error("Erro no fetch:", erro);
    }
}

async function carregarRanking() {
  const container = document.getElementById("ranking-container");
  if (!container) return;

  try {
    const respuesta = await fetch(
      "https://monster-reviews-api.onrender.com/api/ranking",
    );
    const ranking = await respuesta.json();

    container.innerHTML = "";

    if (ranking.length === 0) {
      container.innerHTML =
        "<p style='text-align: center; color: #888;'>Nenhuma latinha registrada ainda.</p>";
      return;
    }

    ranking.forEach((usuario, index) => {
      let iconePosicao = `${index + 1}`;
      let classePodio = "";

      if (index === 0) classePodio = "rank-1";
      else if (index === 1) classePodio = "rank-2";
      else if (index === 2) classePodio = "rank-3";

      const linha = document.createElement("div");
      linha.className = `ranking-item ${classePodio}`;

      linha.innerHTML = `
                <div class="rank-info">
                    <span class="rank-posicao">${iconePosicao}</span>
                    <span class="rank-nome">${usuario._id}</span>
                </div>
                <div class="rank-latinhas">
                    ${usuario.totalLatinhas} 🥫
                </div>
            `;
      container.appendChild(linha);
    });
  } catch (erro) {
    container.innerHTML =
      "<p style='text-align: center; color: #ff3333;'>Erro ao carregar o ranking.</p>";
    console.error(erro);
  }
}

function preencherComboboxUsuarios(posts) {
  const datalist = document.getElementById("listaUsuarios");
  if (!datalist) return;
  // Extrai só os nomes e remove os repetidos automaticamente
  const usuariosUnicos = [...new Set(posts.map(post => post.sujeito))];
  datalist.innerHTML = "";
  usuariosUnicos.forEach(nome => {
    if (nome) {
      const option = document.createElement("option");
      option.value = nome;
      datalist.appendChild(option);
    }
  });
}

// ==========================================
// EFEITO VISUAL DAS TAGS (Valeu a pena?)
// ==========================================
window.toggleTag = function(elemento) {
  // Tira a classe 'active' de todos os botões
  document.querySelectorAll("#tagGroupValeu .tag").forEach(t => t.classList.remove("active"));
  // Coloca só no que o usuário clicou
  elemento.classList.add("active");
};
