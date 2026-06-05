// VARIÁVEIS GLOBAIS SEGURAS (Alimentadas dinamicamente pelo back-end)
let usuarioLogado = "";
let emailLogado = "";
let targetUser = "";
let isMeuPerfil = false;

// ==========================================
// AUTENTICAÇÃO E CHECAGEM DE SESSÃO SECURE
// ==========================================
async function verificarSessaoPerfil() {
  try {
    const resposta = await fetch(
      "https://monster-reviews-api.onrender.com/api/auth/me",
      {
        method: "GET",
        credentials: "include",
      },
    );

    if (!resposta.ok) {
      window.location.href = "../login/login.html";
      return;
    }

    const dadosUsuario = await resposta.json();

    // Define quem está navegando baseado no verificado da API
    usuarioLogado = dadosUsuario.login;
    emailLogado = dadosUsuario.email || "";

    // Descobre de quem é o perfil que estamos visitando na URL (perfil.html?user=Joao)
    const urlParams = new URLSearchParams(window.location.search);
    targetUser = urlParams.get("user") || usuarioLogado;
    isMeuPerfil = targetUser === usuarioLogado;

    // Inicializa os componentes visuais com os dados confirmados
    inicializarEstruturaPerfil();
  } catch (erro) {
    console.error("Erro ao verificar sessão no perfil:", erro);
    window.location.href = "../login/login.html";
  }
}

// Roda a validação de segurança imediatamente
verificarSessaoPerfil();

// ==========================================
// MONTAGEM DA INTERFACE E EVENTOS DO DOM
// ==========================================
function inicializarEstruturaPerfil() {
  // 1. Identidade Visual Básica
  document.getElementById("profileNameDisplay").textContent = targetUser;
  document.getElementById("loggedUser").textContent = usuarioLogado; // Nome na Navbar

  const btnTrocarFoto = document.getElementById("btnTrocarFotoPerfil");
  const emailDisplay = document.getElementById("profileEmailDisplay");

  // 2. Lógica de Perfil Visitante vs Meu Perfil
  if (!isMeuPerfil) {
    if (btnTrocarFoto) btnTrocarFoto.style.display = "none";
    if (emailDisplay) emailDisplay.textContent = "Avaliador da Comunidade";
    document.getElementById("tituloStatsUsuario").textContent =
      `Desempenho de ${targetUser}`;

    // Criação dinâmica do botão voltar
    const btnVoltar = document.createElement("button");
    btnVoltar.innerHTML = "Ver meu perfil";

    btnVoltar.style.padding = "8px 16px";
    btnVoltar.style.marginBottom = "15px";
    btnVoltar.style.backgroundColor = "#2c3e50";
    btnVoltar.style.color = "white";
    btnVoltar.style.border = "none";
    btnVoltar.style.borderRadius = "6px";
    btnVoltar.style.cursor = "pointer";
    btnVoltar.style.fontWeight = "bold";
    btnVoltar.style.transition = "0.2s";

    btnVoltar.onclick = () => (window.location.href = "perfil.html");

    const areaNome = document.getElementById("profileNameDisplay");
    if (areaNome && areaNome.parentNode) {
      areaNome.parentNode.insertBefore(btnVoltar, areaNome);
    }
  } else {
    if (emailDisplay) emailDisplay.textContent = emailLogado || "Sem e-mail";
  }

  // 3. Gerenciamento do Avatar Visual
  const avatarBig = document.getElementById("profileAvatarBig");
  const avatarNav = document.querySelector("#navUser .user-avatar");
  const avatarSalvo = isMeuPerfil
    ? localStorage.getItem(`avatar_${emailLogado}`)
    : null;

  function atualizarAvatares(source) {
    if (source) {
      const estilo = `url(${source})`;
      if (avatarBig) avatarBig.style.backgroundImage = estilo;
      if (avatarNav) avatarNav.style.backgroundImage = estilo;
      if (avatarBig) avatarBig.textContent = "";
      if (avatarNav) avatarNav.textContent = "";
    } else {
      const iniciais = targetUser.substring(0, 2).toUpperCase();
      if (avatarBig) avatarBig.textContent = iniciais;
      if (avatarNav)
        avatarNav.textContent = usuarioLogado.substring(0, 2).toUpperCase();
    }
  }

  atualizarAvatares(avatarSalvo);

  // 4. Lógica de Upload da Imagem (Apenas se for o meu perfil)
  const fileInput = document.getElementById("profileFileInput");
  if (isMeuPerfil && btnTrocarFoto && fileInput) {
    btnTrocarFoto.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async (e) => {
      const input = e.target;
      if (input.files && input.files[0]) {
        const textoOriginal = btnTrocarFoto.textContent;
        btnTrocarFoto.textContent = "⏳ Enviando...";
        btnTrocarFoto.disabled = true;

        const formData = new FormData();
        formData.append("nome", usuarioLogado);
        formData.append("fotoPerfil", input.files[0]);

        try {
          const resposta = await fetch(
            "https://monster-reviews-api.onrender.com/api/usuarios/avatar",
            {
              method: "POST",
              body: formData,
              credentials: "include",
            },
          );

          const dados = await resposta.json();

          if (resposta.ok) {
            localStorage.setItem(`avatar_${emailLogado}`, dados.avatarUrl);
            atualizarAvatares(dados.avatarUrl);
          } else {
            alert("Erro do servidor: " + dados.erro);
          }
        } catch (erro) {
          console.error("Erro no envio do avatar:", erro);
          alert("Erro de conexão ao tentar subir a foto.");
        } finally {
          btnTrocarFoto.textContent = textoOriginal;
          btnTrocarFoto.disabled = false;
        }
      }
    });
  }

  carregarEstatisticas(targetUser);
}

// ==========================================
// BUSCA DE ESTATÍSTICAS (DASHBOARD)
// ==========================================
async function carregarEstatisticas(target) {
  try {
    const url = `https://monster-reviews-api.onrender.com/api/estatisticas?user=${encodeURIComponent(target)}`;
    const resposta = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    const dados = await resposta.json();

    // Injeção de dados globais
    document.getElementById("globalTotalLatas").textContent =
      dados.global.totalLatas;
    document.getElementById("globalGasto").textContent =
      `R$ ${dados.global.totalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("globalMedia").textContent =
      dados.global.mediaNotas.toFixed(1);
    document.getElementById("globalSaborFav").textContent =
      dados.global.saborFavorito;

    // Injeção de dados específicos do usuário/visitante
    document.getElementById("userTotalLatas").textContent =
      dados.usuario.totalLatas;
    document.getElementById("userGasto").textContent =
      `R$ ${dados.usuario.totalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("userMedia").textContent =
      dados.usuario.mediaNotas.toFixed(1);
    document.getElementById("userSaborFav").textContent =
      dados.usuario.saborFavorito;
  } catch (erro) {
    console.error("Erro ao carregar estatísticas do backend:", erro);
  }
}

// ==========================================
// COMPONENTES DE INTERAÇÃO DA NAVBAR
// ==========================================
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
