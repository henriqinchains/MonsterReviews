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
  document.getElementById("loggedUser").textContent = usuarioLogado; // Nome lá em cima na Navbar
  
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
    
    fileInput.addEventListener("change", async (e) => {
      const input = e.target;
      if (input.files && input.files[0]) {
        
        // Troca o texto do botão para dar um feedback visual
        const textoOriginal = btnTrocarFoto.textContent;
        btnTrocarFoto.textContent = "⏳ Enviando...";
        btnTrocarFoto.disabled = true;

        // Monta a caixa (FormData) com a foto e o e-mail do dono
        const formData = new FormData();
        formData.append("fotoPerfil", input.files[0]);
        formData.append("email", emailLogado);

        try {
          const resposta = await fetch("https://monster-reviews-api.onrender.com/api/usuarios/avatar", {
            method: "POST",
            body: formData // Manda a caixa pesada pro servidor
          });
          
          const dados = await resposta.json();

          if (resposta.ok) {
            // Salva o link OFICIAL no cache só pra recuperar rápido na próxima vez
            localStorage.setItem(`avatar_${emailLogado}`, dados.avatarUrl);
            atualizarAvatares(dados.avatarUrl); // Atualiza a tela instantaneamente
          } else {
            alert("Erro do servidor: " + dados.erro);
          }
        } catch (erro) {
          console.error("Erro no envio do formulário:", erro);
          alert("Erro de conexão ao tentar subir a foto.");
        } finally {
          // Devolve o botão ao normal
          btnTrocarFoto.textContent = textoOriginal;
          btnTrocarFoto.disabled = false;
        }
      }
    });
  }

  // 5. O MOTOR DE ESTATÍSTICAS (O Dashboard)
  carregarEstatisticas(targetUser);
});

// O Fetch que busca as estatísticas pelo servidor
async function carregarEstatisticas(targetUser) {
  try {
    // Chama a rota passando o nome do cara na URL
    const url = `https://monster-reviews-api.onrender.com/api/estatisticas?user=${targetUser}`;
    const resposta = await fetch(url);
    const dados = await resposta.json();
    
    // --- ATUALIZA A TELA: ESTATÍSTICAS GLOBAIS ---
    document.getElementById("globalTotalLatas").textContent = dados.global.totalLatas;
    document.getElementById("globalGasto").textContent = `R$ ${dados.global.totalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("globalMedia").textContent = dados.global.mediaNotas.toFixed(1);
    document.getElementById("globalSaborFav").textContent = dados.global.saborFavorito;

    // --- ATUALIZA A TELA: ESTATÍSTICAS DO USUÁRIO ---
    document.getElementById("userTotalLatas").textContent = dados.usuario.totalLatas;
    document.getElementById("userGasto").textContent = `R$ ${dados.usuario.totalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("userMedia").textContent = dados.usuario.mediaNotas.toFixed(1);
    document.getElementById("userSaborFav").textContent = dados.usuario.saborFavorito;

  } catch (erro) {
    console.error("Erro ao carregar estatísticas do backend:", erro);
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
