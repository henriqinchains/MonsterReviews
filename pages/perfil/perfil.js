// ==========================================================================
// CONFIGURAÇÕES INICIAIS E CACHE IMEDIATO (ANTI-PISCADA)
// ==========================================================================
let usuarioLogado = sessionStorage.getItem("cache_usuario") || "";
let emailLogado = sessionStorage.getItem("cache_email") || "";
let targetUser = "";
let isMeuPerfil = false;

aplicarCacheImediato();

function aplicarCacheImediato() {
  const urlParams = new URLSearchParams(window.location.search);
  targetUser = urlParams.get("user") || usuarioLogado;
  isMeuPerfil = targetUser === usuarioLogado;

  document.addEventListener("DOMContentLoaded", () => {
    const profileNameEl = document.getElementById("profileNameDisplay");
    const loggedUserEl = document.getElementById("loggedUser");
    const emailDisplay = document.getElementById("profileEmailDisplay");

    if (targetUser && profileNameEl) profileNameEl.textContent = targetUser;
    if (usuarioLogado && loggedUserEl) loggedUserEl.textContent = usuarioLogado;

    if (usuarioLogado) {
      if (!isMeuPerfil) { if (emailDisplay) emailDisplay.textContent = "Avaliador da Comunidade"; }
      else { if (emailDisplay) emailDisplay.textContent = emailLogado || "Sem e-mail"; }
    }

    const avatarSalvo = sessionStorage.getItem(`cache_avatar_${targetUser}`);
    const meuAvatarNavbar = sessionStorage.getItem(`cache_avatar_${usuarioLogado}`);

    atualizarAvatares(avatarSalvo);

    const avatarNav = document.querySelector("#navUser .user-avatar");
    if (meuAvatarNavbar && avatarNav) {
      avatarNav.style.backgroundImage = `url(${meuAvatarNavbar})`;
      avatarNav.textContent = "";
    }
  });
}

function atualizarAvatares(source) {
  const avatarBig = document.getElementById("profileAvatarBig");
  const avatarNav = document.querySelector("#navUser .user-avatar");

  if (source) {
    if (avatarBig) {
      avatarBig.style.backgroundImage = `url(${source})`;
      avatarBig.textContent = "";
    }
  } else {
    const iniciaisTarget = targetUser ? targetUser.substring(0, 2).toUpperCase() : "US";
  }
}

const meuAvatarNavbar = sessionStorage.getItem(`cache_avatar_${usuarioLogado}`);
if (meuAvatarNavbar && avatarNav) {
  avatarNav.style.backgroundImage = `url(${meuAvatarNavbar})`;
  avatarNav.textContent = "";
}
else if (avatarNav) {
  avatarNav.textContent = iniciaisLogado;
  avatarNav.style.backgroundImage = "none";
}


async function verificarSessaoPerfil() {
  try {
    const resposta = await fetch("https://monster-reviews-api.onrender.com/api/auth/me", {
      method: "GET",
      credentials: "include",
    });

    if (!resposta.ok) { sessionStorage.clear(); window.location.href = "../login/login.html"; return; }

    const dadosUsuario = await resposta.json();
    usuarioLogado = dadosUsuario.login;
    emailLogado = dadosUsuario.email || "";

    sessionStorage.setItem("cache_usuario", usuarioLogado);
    sessionStorage.setItem("cache_email", emailLogado);

    const urlParams = new URLSearchParams(window.location.search);
    targetUser = urlParams.get("user") || usuarioLogado;
    isMeuPerfil = targetUser === usuarioLogado;

    inicializarStructurePerfil();
  } catch (erro) {
    console.error("Erro ao verificar sessão no perfil:", erro);
    window.location.href = "../login/login.html";
  }
}

verificarSessaoPerfil();

function inicializarStructurePerfil() {
  document.getElementById("profileNameDisplay").textContent = targetUser;
  document.getElementById("loggedUser").textContent = usuarioLogado;

  const btnTrocarFoto = document.getElementById("btnTrocarFotoPerfil");
  const emailDisplay = document.getElementById("profileEmailDisplay");

  if (!isMeuPerfil) {
    if (btnTrocarFoto) btnTrocarFoto.style.display = "none";
    if (emailDisplay) emailDisplay.textContent = "Avaliador da Comunidade";
    document.getElementById("tituloStatsUsuario").textContent = `Desempenho de ${targetUser}`;

    if (!document.getElementById("btnVoltarPerfil")) {
      const btnVoltar = document.createElement("button");
      btnVoltar.id = "btnVoltarPerfil";
      btnVoltar.innerHTML = "Ver meu perfil";
      btnVoltar.style.padding = "8px 16px";
      btnVoltar.style.marginBottom = "15px";
      btnVoltar.style.backgroundColor = "#2c3e50";
      btnVoltar.style.color = "white";
      btnVoltar.style.border = "none";
      btnVoltar.style.borderRadius = "6px";
      btnVoltar.style.cursor = "pointer";
      btnVoltar.style.fontWeight = "bold";
      btnVoltar.onclick = () => (window.location.href = "perfil.html");

      const areaNome = document.getElementById("profileNameDisplay");
      if (areaNome && areaNome.parentNode) areaNome.parentNode.insertBefore(btnVoltar, areaNome);
    }
  } else {
    if (emailDisplay) emailDisplay.textContent = emailLogado || "Sem e-mail";
  }

  const fileInput = document.getElementById("profileFileInput");
  if (isMeuPerfil && btnTrocarFoto && fileInput) {
    const novoInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(novoInput, fileInput);
    btnTrocarFoto.onclick = () => novoInput.click();

    novoInput.addEventListener("change", async (e) => {
      const input = e.target;
      if (input.files && input.files[0]) {
        const textoOriginal = btnTrocarFoto.textContent;
        btnTrocarFoto.textContent = "⏳ Enviando...";
        btnTrocarFoto.disabled = true;

        const formData = new FormData();
        formData.append("nome", usuarioLogado);
        formData.append("fotoPerfil", input.files[0]);

        try {
          const resposta = await fetch("https://monster-reviews-api.onrender.com/api/usuarios/avatar", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          const dados = await resposta.json();
          if (resposta.ok) {
            sessionStorage.setItem(`cache_avatar_${usuarioLogado}`, dados.avatarUrl);
            atualizarAvatares(dados.avatarUrl);
          } else { alert("Erro do servidor: " + dados.erro); }
        } catch (erro) { console.error("Erro no envio:", erro); }
        finally { btnTrocarFoto.textContent = textoOriginal; btnTrocarFoto.disabled = false; }
      }
    });
  }
  carregarEstatisticas(targetUser);
}

async function carregarEstatisticas(target) {
  try {
    const url = `https://monster-reviews-api.onrender.com/api/estatisticas?user=${encodeURIComponent(target)}`;
    const resposta = await fetch(url, { method: "GET", credentials: "include" });
    const dados = await resposta.json();

    const urlFotoReal = dados.usuario?.avatarUrl || dados.avatarUrl;
    if (urlFotoReal) {
      sessionStorage.setItem(`cache_avatar_${target}`, urlFotoReal);
      atualizarAvatares(urlFotoReal);
    }

    document.getElementById("globalTotalLatas").textContent = dados.global.totalLatas;
    document.getElementById("globalGasto").textContent = `R$ ${dados.global.totalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("globalMedia").textContent = dados.global.mediaNotas.toFixed(1);
    document.getElementById("globalSaborFav").textContent = dados.global.saborFavorito;

    document.getElementById("userTotalLatas").textContent = dados.usuario.totalLatas;
    document.getElementById("userGasto").textContent = `R$ ${dados.usuario.totalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("userMedia").textContent = dados.usuario.mediaNotas.toFixed(1);
    document.getElementById("userSaborFav").textContent = dados.usuario.saborFavorito;
  } catch (erro) { console.error("Erro ao carregar estatísticas:", erro); }
}

function toggleDropdown() {
  const nu = document.getElementById("navUser");
  if (nu) nu.classList.toggle("open");
}

document.addEventListener("click", (e) => {
  const nu = document.getElementById("navUser");
  if (nu && !nu.contains(e.target)) nu.classList.remove("open");
});