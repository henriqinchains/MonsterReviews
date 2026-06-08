// Lógica do Menu Hambúrguer Mobile
const btnHamburguer = document.getElementById('btnHamburguer');
const navLinks = document.querySelector('.nav-links');

if (btnHamburguer && navLinks) {
  btnHamburguer.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

function abrirModal() {
  const modal = document.getElementById("modalSobre");

}
// ==========================================================================
// CONFIGURAÇÕES INICIAIS E CACHE IMEDIATO (ANTI-PISCADA)
// ==========================================================================
let loggedUser = sessionStorage.getItem("cache_usuario") || "";
let userRole = sessionStorage.getItem("cache_cargo") || "user";
let userEmail = sessionStorage.getItem("cache_email") || "";
let todasAvaliacoes = [];
const feedContainer = document.getElementById("feed-container");
const cacheMemoriaAvatares = {};
const listaSabores = [
  "Original",
  "Zero Sugar",
  "Absolutely Zero",
  "Ultra White",
  "Ultra Violet",
  "Ultra Strawberry Dreams",
  "Ultra Watermelon",
  "Ultra Fiesta Mango",
  "Ultra Peachy Keen",
  "Mango Loco",
  "Pacific Punch",
  "Khaotic",
  "Pipeline Punch",
  "Rio Punch",
  "Dragon Ice Tea Limão",
  "Dragon Ice Tea Pêssego",
  "Outro"
];

// Renderiza o cache de sessão imediatamente para a Navbar nascer preenchida
aplicarCacheImediato();

function aplicarCacheImediato() {
  if (!loggedUser) return;

  document.addEventListener("DOMContentLoaded", () => {
    const loggedUserEl = document.getElementById("loggedUser");
    const loggedUserEmailEl = document.getElementById("loggedUserEmail");
    const avatarNav = document.querySelector("#navUser .user-avatar");
    const inputSujeito = document.getElementById("sujeito");

    if (loggedUserEl) loggedUserEl.textContent = loggedUser;
    if (loggedUserEmailEl) loggedUserEmailEl.textContent = userEmail;
    if (inputSujeito) inputSujeito.value = loggedUser;

    if (avatarNav) {
      const avatarSalvo = sessionStorage.getItem(`cache_avatar_${loggedUser}`);
      if (avatarSalvo) {
        avatarNav.style.backgroundImage = `url(${avatarSalvo})`;
        avatarNav.textContent = "";
      } else {
        avatarNav.style.backgroundImage = "none";
        avatarNav.textContent = loggedUser.substring(0, 2).toUpperCase();
      }
    }
  });
}

// ==========================================
// 1. CONTROLE E VALIDAÇÃO DE SESSÃO SECURE
// ==========================================
async function verificarSessao() {
  try {
    const resposta = await fetch(
      "https://monster-reviews-api.onrender.com/api/auth/me",
      {
        method: "GET",
        credentials: "include",
      },
    );

    if (!resposta.ok) {
      sessionStorage.clear();
      window.location.href = "./pages/login/login.html";
      return false;
    }

    const dadosUsuario = await resposta.json();

    loggedUser = dadosUsuario.login;
    userRole = dadosUsuario.cargo || "user";
    userEmail = dadosUsuario.email || "";

    sessionStorage.setItem("cache_usuario", loggedUser);
    sessionStorage.setItem("cache_cargo", userRole);
    sessionStorage.setItem("cache_email", userEmail);

    inicializarInterface(dadosUsuario);
    return true;
  } catch (erro) {
    console.error("Erro ao verificar sessão segura:", erro);
    sessionStorage.clear();
    window.location.href = "./pages/login/login.html";
    return false;
  }
}

// ==========================================
// 2. INICIALIZAÇÃO DA INTERFACE PÓS-LOGIN
// ==========================================

function popularSelectsDeSabor() {
  // Pega os DATALISTS que criamos no HTML
  const datalistFiltro = document.getElementById("listaSaboresFiltro");
  const datalistModal = document.getElementById("listaSaboresModal");

  listaSabores.forEach(sabor => {
    // 1. Injeta no datalist do filtro
    if (datalistFiltro) {
      const optionFiltro = document.createElement("option");
      optionFiltro.value = sabor;
      datalistFiltro.appendChild(optionFiltro);
    }

    // 2. Injeta no datalist do modal
    if (datalistModal) {
      const optionModal = document.createElement("option");
      optionModal.value = sabor;
      datalistModal.appendChild(optionModal);
    }
  });
}

async function inicializarInterface(usuario) {
  const loggedUserEl = document.getElementById("loggedUser");
  const loggedUserEmailEl = document.getElementById("loggedUserEmail");
  const inputSujeito = document.getElementById("sujeito");
  const avatarNav = document.querySelector("#navUser .user-avatar");

  if (loggedUserEl) loggedUserEl.textContent = usuario.login;
  if (loggedUserEmailEl) loggedUserEmailEl.textContent = usuario.email || "";
  if (inputSujeito) inputSujeito.value = usuario.login;

  if (avatarNav && usuario.login) {
    const avatarSalvo = sessionStorage.getItem(`cache_avatar_${usuario.login}`);
    if (avatarSalvo) {
      avatarNav.style.backgroundImage = `url(${avatarSalvo})`;
      avatarNav.textContent = "";
    } else {
      buscarAvatarEmSegundoPlano(usuario.login);
    }
  }

  await Promise.all([
    carregarFeed(),
    carregarRanking()
  ]);

  renderizarPosts(todasAvaliacoes);

  // Só chega nessa linha quando o feed e o ranking estiverem 100% prontos na tela.
  ocultarLoading();
}

function ocultarLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    // Zera a opacidade para a transição suave
    overlay.style.opacity = '0';

    setTimeout(() => {
      overlay.style.visibility = 'hidden';
      overlay.style.display = 'none'; // Garante que saiu do fluxo
    }, 500);

    // Grava que o usuário já viu a tela de loading hoje
    sessionStorage.setItem('jaViuLoading', 'true');
  }
}

async function buscarAvatarEmSegundoPlano(usuario) {
  try {
    const resposta = await fetch(`https://monster-reviews-api.onrender.com/api/estatisticas?user=${encodeURIComponent(usuario)}`);
    const dados = await resposta.json();
    const urlFoto = dados.usuario?.avatarUrl || dados.avatarUrl;

    const avatarNav = document.querySelector("#navUser .user-avatar");

    if (urlFoto) {
      sessionStorage.setItem(`cache_avatar_${usuario}`, urlFoto);

      if (avatarNav) {
        avatarNav.style.backgroundImage = `url(${urlFoto})`;
        avatarNav.textContent = "";
      }
    }
    else {
      sessionStorage.removeItem(`cache_avatar_${usuario}`);
      if (avatarNav) {
        avatarNav.style.backgroundImage = "none";
        avatarNav.textContent = usuario.substring(0, 2).toUpperCase();
      }
    }
  } catch (e) {
    console.warn("Não foi possível pré-carregar o avatar.");
  }
}

// ==========================================
// 3. INICIALIZAÇÃO DOS COMPONENTES VISUAIS (DOM)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const logadoComSucesso = await verificarSessao();
  if (!logadoComSucesso) return;

  popularSelectsDeSabor();

  document.querySelectorAll(".tl-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tl-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });

  const btnAbrirModal = document.getElementById("btn-abrir-registro");
  const modalContainer = document.getElementById("modal-container");
  const formAvaliacao = document.getElementById("formAvaliacao");
  const btnSubmit = document.getElementById("btnSubmit");
  const btnFecharModal = document.getElementById("btn-fechar-modal");
  const selectSabor = document.querySelector('input[name="sabor"]');

  if (btnAbrirModal) {
    btnAbrirModal.addEventListener("click", (e) => {
      e.preventDefault();
      modalContainer.style.display = "flex";
      document.body.style.overflow = "hidden";
      if (selectSabor) {
        selectSabor.focus();
      }
    });
  }

  const fecharModal = () => {
    modalContainer.style.display = "none";
    document.body.style.overflow = "";
    if (formAvaliacao) formAvaliacao.reset();
    const inputSujeito = document.getElementById("sujeito");
    if (inputSujeito) inputSujeito.value = loggedUser;
  };

  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", fecharModal);
  }

  window.addEventListener("mousedown", (e) => {
    if (e.target === modalContainer) fecharModal();
  });

  if (formAvaliacao) {
    formAvaliacao.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputSabor = document.getElementById("modalSabor").value;
      if (!listaSabores.includes(inputSabor)) {
        alert("Selecione um sabor válido da lista de Monsters.");
        document.getElementById("modalSabor").focus();
        return;
      }
      const textoOriginal = btnSubmit.innerText;
      btnSubmit.innerText = "Enviando... 🚀";
      btnSubmit.disabled = true;

      try {
        const formData = new FormData(formAvaliacao);
        const resposta = await fetch("https://monster-reviews-api.onrender.com/api/avaliacoes", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const dados = await resposta.json();
        if (resposta.ok) {
          const audioLatinha = new Audio('./src/audio/latinha.mp3');
          audioLatinha.play();
          alert("Review postada com sucesso! 🔋");
          fecharModal();
          location.reload();
        } else {
          alert(`Erro: ${dados.erro || "Falha ao postar"}`);
        }
      } catch (erro) {
        console.error("Erro no envio:", erro);
        alert("Erro ao conectar com o servidor.");
      } finally {
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
      }
    });
  }

  const btnAplicar = document.getElementById("btnAplicarFiltros");
  const btnLimpar = document.getElementById("btnLimparFiltros");

  if (btnAplicar) {
    btnAplicar.addEventListener("click", () => {
      // Pega APENAS os 3 valores que ainda existem na tela
      const apenasMinhas = document.getElementById("checkMeusPosts").checked;
      const sabor = document.getElementById("filtroSabor").value;
      const ordem = document.getElementById("filtroOrdem").value;

      // Filtra a lista
      let postsFiltrados = todasAvaliacoes.filter((post) => {
        if (apenasMinhas && post.sujeito !== loggedUser) return false;
        if (sabor && post.sabor !== sabor) return false;
        return true;
      });

      // Ordena a lista
      postsFiltrados.sort((a, b) => {
        if (ordem === "recentes") return new Date(b.createdAt) - new Date(a.createdAt);
        if (ordem === "antigos") return new Date(a.createdAt) - new Date(b.createdAt);
        if (ordem === "maior_nota") return b.nota - a.nota;
        if (ordem === "menor_nota") return a.nota - b.nota;
        if (ordem === "menor_preco") return a.valor - b.valor;
        return 0;
      });

      renderizarPosts(postsFiltrados);
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      document.getElementById("checkMeusPosts").checked = false;
      document.getElementById("filtroSabor").value = "";
      document.getElementById("filtroOrdem").value = "recentes";

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
  if (nu && !nu.contains(e.target)) nu.classList.remove("open");
});

async function carregarFeed() {
  if (!feedContainer) return;
  feedContainer.innerHTML = "<p>Carregando avaliações monstruosas...</p>";
  try {
    const resposta = await fetch("https://monster-reviews-api.onrender.com/api/avaliacoes");
    const avaliacoes = await resposta.json();
    todasAvaliacoes = avaliacoes;
  } catch (erro) {
    feedContainer.innerHTML = "<p>❌ Erro ao conectar com o servidor do Render.</p>";
    console.error(erro);
  }
}

function renderizarPosts(arrayAvaliacoes) {
  feedContainer.innerHTML = "";
  if (arrayAvaliacoes.length === 0) {
    feedContainer.innerHTML = "<p>Nenhuma avaliação postada ainda. Seja o primeiro!</p>";
    return;
  }
  arrayAvaliacoes.forEach((post) => {
    const dataObjeto = new Date(post.createdAt);
    const dataFormatada = dataObjeto.toLocaleDateString("pt-BR");
    // O config garante que exiba sempre com dois dígitos (ex: 09:05 em vez de 9:5)
    const horaFormatada = dataObjeto.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const dataEHoraFinal = `${dataFormatada} · ${horaFormatada}`;
    const estrelas = "★".repeat(Math.round(post.nota / 2)) + "☆".repeat(5 - Math.round(post.nota / 2));
    const valeuClasse = post.valeu_a_pena ? "valeu-sim" : "valeu-nao";
    const valeuTexto = post.valeu_a_pena ? "Sim" : "Não";

    const avatarElementId = `avatar-feed-${post._id}`;
    const iniciais = post.sujeito ? post.sujeito.substring(0, 2).toUpperCase() : "US";

    const postArticle = document.createElement("article");
    postArticle.className = "post-card";
    postArticle.innerHTML = `
      <div class="post-head">
        <div class="post-avatar" id="${avatarElementId}" data-usuario="${post.sujeito}" style="
          background: linear-gradient(135deg,#e74c3c,#c0392b);
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          border-radius: 50%;
        ">
          ${iniciais}
        </div>
        <div class="post-meta">
          <strong>
            <a href="./pages/perfil/perfil.html?user=${encodeURIComponent(post.sujeito)}" style="color: inherit; text-decoration: none; font-family: 'Nova Square'" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
              ${post.sujeito}
            </a>
          </strong>
          <span>${dataEHoraFinal}</span>
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
      <div class="post-desc" style="font-family: 'Nova Square';">${post.review || "Sem descrição."}</div>
      <div class="post-footer" style="display: flex;  justify-content: space-between; align-items: center;">
        <button class="post-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          0
        </button>
        ${post.sujeito === loggedUser || userRole === "admin" ? `<button class="post-action" onclick="deletarPost('${post._id}')" style="color: #ff4d4d; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: bold;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Excluir</button>` : ""}
      </div>
    `;
    feedContainer.appendChild(postArticle);

    resolverAvatarDoCardFeed(post.sujeito, avatarElementId);
  });
}

// ==========================================================================
// GERENCIADOR DE AVATARES FIXADO CONTRA FALLBACK CINZA
// ==========================================================================
async function resolverAvatarDoCardFeed(usuario, elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // 1. Tenta pegar do sessionStorage
  const cacheSessao = sessionStorage.getItem(`cache_avatar_${usuario}`);
  if (cacheSessao) {
    if (cacheSessao !== "none_found") {
      el.style.background = "none";
      el.style.backgroundColor = "#11161d";
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundImage = `url(${cacheSessao})`;
      el.textContent = "";
    } else {
      el.style.background = "linear-gradient(135deg,#e74c3c,#c0392b)";
      el.style.backgroundImage = "none";
    }
    return;
  }

  // 2. Tenta pegar do cache em memória
  if (cacheMemoriaAvatares[usuario]) {
    // Se já tem um post buscando essa foto, este post não faz nada. 
    // Ele apenas espera a primeira requisição terminar e pintar a tela.
    if (cacheMemoriaAvatares[usuario] === "buscando") return;

    if (cacheMemoriaAvatares[usuario] !== "none_found") {
      el.style.background = "none";
      el.style.backgroundColor = "#11161d";
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundImage = `url(${cacheMemoriaAvatares[usuario]})`;
      el.textContent = "";
    } else {
      el.style.background = "linear-gradient(135deg,#e74c3c,#c0392b)";
      el.style.backgroundImage = "none";
    }
    return;
  }

  // 3. Busca na API em segundo plano
  try {
    // ⚡ Avisa os próximos posts que já estamos resolvendo isso
    cacheMemoriaAvatares[usuario] = "buscando";

    const url = `https://monster-reviews-api.onrender.com/api/estatisticas?user=${encodeURIComponent(usuario)}`;
    const resposta = await fetch(url);
    const dados = await resposta.json();
    const urlFoto = dados.usuario?.avatarUrl || dados.avatarUrl;

    // ⚡ FUNÇÃO INTERNA: Quando a foto chega, procura TODOS os posts desse usuário e atualiza de uma vez!
    const atualizarTodosOsAvatares = (fotoUrl) => {
      const avatares = document.querySelectorAll(`.post-avatar[data-usuario="${usuario}"]`);
      avatares.forEach(avatarEl => {
        if (fotoUrl) {
          avatarEl.style.background = "none";
          avatarEl.style.backgroundColor = "#11161d";
          avatarEl.style.backgroundSize = "cover";
          avatarEl.style.backgroundPosition = "center";
          avatarEl.style.backgroundRepeat = "no-repeat";
          avatarEl.style.backgroundImage = `url(${fotoUrl})`;
          avatarEl.textContent = "";
        } else {
          avatarEl.style.background = "linear-gradient(135deg,#e74c3c,#c0392b)";
          avatarEl.style.backgroundImage = "none";
        }
      });
    };

    if (urlFoto) {
      sessionStorage.setItem(`cache_avatar_${usuario}`, urlFoto);
      cacheMemoriaAvatares[usuario] = urlFoto;
      atualizarTodosOsAvatares(urlFoto);
    } else {
      sessionStorage.setItem(`cache_avatar_${usuario}`, "none_found");
      cacheMemoriaAvatares[usuario] = "none_found";
      atualizarTodosOsAvatares(null);
    }
  } catch (erro) {
    cacheMemoriaAvatares[usuario] = "none_found";
    el.style.background = "linear-gradient(135deg,#e74c3c,#c0392b)";
    el.style.backgroundImage = "none";
  }
}

async function deletarPost(id) {
  if (!confirm("Tem certeza que quer apagar essa review, monstro?")) return;
  try {
    const resposta = await fetch(`https://monster-reviews-api.onrender.com/api/avaliacoes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (resposta.ok) { alert("Post excluído com sucesso!"); location.reload(); }
    else { const dados = await resposta.json(); alert(dados.erro || "Erro ao deletar."); }
  } catch (erro) { console.error("Erro no fetch:", erro); }
}

async function carregarRanking() {
  const container = document.getElementById("ranking-container");
  if (!container) return;
  try {
    const respuesta = await fetch("https://monster-reviews-api.onrender.com/api/ranking");
    const ranking = await respuesta.json();
    container.innerHTML = "";
    if (ranking.length === 0) {
      container.innerHTML = "<p style='text-align: center; color: #888;'>Nenhuma latinha registrada ainda.</p>";
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
      linha.innerHTML = `<div class="rank-info"><span class="rank-posicao">${iconePosicao}</span><span class="rank-nome" style="font-family: 'Nova Square';">${usuario._id}</span></div><div class="rank-latinhas">${usuario.totalLatinhas} 🥫</div>`;
      container.appendChild(linha);
    });
  } catch (erro) { container.innerHTML = "<p style='text-align: center; color: #ff3333;'>Erro ao carregar o ranking.</p>"; console.error(erro); }
}

const modal = document.getElementById("modalSobre");
const btn = document.getElementById("btnSobre");
const span = document.getElementById("fecharModal");
const btnHamSobre = document.getElementById("sobreProjetoBtnHam");
// Quando clica no botão do Nav, abre
btn.onclick = function () {
  modal.style.display = "block";
}

// Quando clica no X, fecha
span.onclick = function () {
  modal.style.display = "none";
}

// Se o cara clicar fora da caixinha (no fundo escuro), fecha
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

function abrirModal() {
  modal.style.display = "block";
}
