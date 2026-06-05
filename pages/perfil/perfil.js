document.addEventListener("DOMContentLoaded", () => {
  // 1. VERIFICAÇÃO DE SEGURANÇA
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "./pages/login/login.html";
    return;
  }

  // 2. DESCOBRINDO DE QUEM É O PERFIL (Lógica do Split Screen)
  const usuarioLogado = localStorage.getItem("loggedUser");
  const emailLogado = localStorage.getItem("loggedEmail");
  
  // Lê a URL (ex: perfil.html?user=Joao)
  const urlParams = new URLSearchParams(window.location.search);
  const targetUser = urlParams.get("user") || usuarioLogado; // Se não tiver nada na URL, é o seu perfil
  
  const isMeuPerfil = (targetUser === usuarioLogado);

  // 3. PREENCHENDO A IDENTIDADE VISUAL
  document.getElementById("profileNameDisplay").textContent = targetUser;
  document.getElementById("navUserName").textContent = usuarioLogado; // Nome lá em cima na Navbar
  
  // Ajustes de Perfil Visitante vs Meu Perfil
  const btnTrocarFoto = document.getElementById("btnTrocarFotoPerfil");
  const emailDisplay = document.getElementById("profileEmailDisplay");
  
  if (!isMeuPerfil) {
    // Se for perfil de outro cara, esconde o botão de foto e o e-mail (privacidade)
    if (btnTrocarFoto) btnTrocarFoto.style.display = "none";
    if (emailDisplay) emailDisplay.textContent = "Avaliador da Comunidade";
    document.getElementById("tituloStatsUsuario").textContent = `Desempenho de ${targetUser}`;
  } else {
    // Se for o meu perfil, mostra meu e-mail
    if (emailDisplay) emailDisplay.textContent = emailLogado || "Sem e-mail";
  }

  // 4. LÓGICA DO AVATAR (Foto de Perfil)
  const avatarBig = document.getElementById("profileAvatarBig");
  const avatarNav = document.querySelector("#navUser .user-avatar");
  
  // Tenta achar a foto salva. Se for perfil de visitante, por enquanto fica com as iniciais.
  const avatarSalvo = isMeuPerfil ? localStorage.getItem(`avatar_${emailLogado}`) : null;

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
      if (avatarNav) avatarNav.textContent = usuarioLogado.substring(0, 2).toUpperCase();
    }
  }

  atualizarAvatares(avatarSalvo);

  // Função de Trocar Foto (Só funciona no próprio perfil)
  const fileInput = document.getElementById("profileFileInput");
  if (isMeuPerfil && btnTrocarFoto && fileInput) {
    btnTrocarFoto.addEventListener("click", () => fileInput.click());
    
    fileInput.addEventListener("change", (e) => {
      const input = e.target;
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evento) {
          const base64Image = evento.target.result;
          localStorage.setItem(`avatar_${emailLogado}`, base64Image); // Salva no cache
          atualizarAvatares(base64Image); // Atualiza na hora na tela
        };
        reader.readAsDataURL(input.files[0]);
      }
    });
  }

  // 5. O MOTOR DE ESTATÍSTICAS (O Dashboard)
  carregarEstatisticas(targetUser);
});

// Função para descobrir o Sabor Favorito
function calcularSaborFavorito(arrayDePosts) {
  if (arrayDePosts.length === 0) return "-";
  
  const contagem = {};
  arrayDePosts.forEach(post => {
    const sabor = post.sabor || "Desconhecido";
    contagem[sabor] = (contagem[sabor] || 0) + 1;
  });

  // Acha quem tem o maior número na contagem
  return Object.keys(contagem).reduce((a, b) => contagem[a] > contagem[b] ? a : b);
}

// O Fetch que busca as notas e faz a matemática
async function carregarEstatisticas(targetUser) {
  try {
    const resposta = await fetch("https://monster-reviews-api.onrender.com/api/avaliacoes");
    const todosPosts = await resposta.json();
    
    // --- ESTATÍSTICAS GLOBAIS (O Bando de Dados Inteiro) ---
    const globalTotal = todosPosts.length;
    const globalGasto = todosPosts.reduce((soma, post) => soma + Number(post.valor || 0), 0);
    const globalMedia = globalTotal > 0 ? (todosPosts.reduce((soma, post) => soma + Number(post.nota || 0), 0) / globalTotal) : 0;
    const globalFav = calcularSaborFavorito(todosPosts);

    document.getElementById("globalTotalLatas").textContent = globalTotal;
    document.getElementById("globalGasto").textContent = `R$ ${globalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("globalMedia").textContent = globalMedia.toFixed(1);
    document.getElementById("globalSaborFav").textContent = globalFav;

    // --- ESTATÍSTICAS DO USUÁRIO ---
    const userPosts = todosPosts.filter(post => post.sujeito === targetUser);
    
    const userTotal = userPosts.length;
    const userGasto = userPosts.reduce((soma, post) => soma + Number(post.valor || 0), 0);
    const userMedia = userTotal > 0 ? (userPosts.reduce((soma, post) => soma + Number(post.nota || 0), 0) / userTotal) : 0;
    const userFav = calcularSaborFavorito(userPosts);

    document.getElementById("userTotalLatas").textContent = userTotal;
    document.getElementById("userGasto").textContent = `R$ ${userGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("userMedia").textContent = userMedia.toFixed(1);
    document.getElementById("userSaborFav").textContent = userFav;

  } catch (erro) {
    console.error("Erro ao carregar estatísticas:", erro);
  }
}

// Mantém o Dropdown funcionando na navbar
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
