const token = localStorage.getItem("authToken");
const loggedUser = localStorage.getItem("loggedUser");
const userRole = localStorage.getItem("userRole");

if (!token) {
  window.location.href = "../login/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const loggedUserEl = document.getElementById("loggedUser");
  const loggedUserEmailEl = document.getElementById("loggedUserEmail");

  if (loggedUserEl) loggedUserEl.textContent = loggedUser;
  if (loggedUserEmailEl)
    loggedUserEmailEl.textContent = localStorage.getItem("loggedEmail");

  carregarFeed();
  carregarRanking();

  const userAvatar = document.querySelector("#navUser .user-avatar");
  const fileInput = document.getElementById("fileInput");

  if (userAvatar && fileInput) {
    userAvatar.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      const input = event.target;

      if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function (e) {
          const base64Image = e.target.result;

          if (userAvatar) {
            userAvatar.style.background = "none";
            userAvatar.style.backgroundImage = `url(${base64Image})`;
            userAvatar.style.backgroundColor = "transparent";
            userAvatar.style.backgroundSize = "cover";
            userAvatar.style.backgroundPosition = "center";
          }

          const emailLogado =
            localStorage.getItem("loggedEmail") || "avatar_generico";
          localStorage.setItem(`avatar_${emailLogado}`, base64Image);
        };

        reader.readAsDataURL(input.files[0]);
      }
    });
  }

  const emailLogado = localStorage.getItem("loggedEmail") || "avatar_generico";
  const avatarSalvo = localStorage.getItem(`avatar_${emailLogado}`);

  if (avatarSalvo && userAvatar) {
    userAvatar.style.background = "none";
    userAvatar.style.backgroundImage = `url(${avatarSalvo})`;
    userAvatar.style.backgroundColor = "transparent";
    userAvatar.style.backgroundSize = "cover";
    userAvatar.style.backgroundPosition = "center";
  }

  document.querySelectorAll(".tl-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tl-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });
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

function toggleTag(el) {
  document
    .querySelectorAll("#tagGroup .tag")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
}

async function carregarFeed() {
  const feedContainer = document.getElementById("feed-container");
  if (!feedContainer) return;

  feedContainer.innerHTML = "<p>Carregando avaliações monstruosas...</p>";
  try {
    const resposta = await fetch(
      "https://monster-reviews-api.onrender.com/api/avaliacoes",
    );
    const avaliacoes = await resposta.json();

    feedContainer.innerHTML = "";

    if (avaliacoes.length === 0) {
      feedContainer.innerHTML =
        "<p>Nenhuma avaliação postada ainda. Seja o primeiro!</p>";
      return;
    }

    avaliacoes.forEach((post) => {
      const estrelas =
        "★".repeat(Math.round(post.nota / 2)) +
        "☆".repeat(5 - Math.round(post.nota / 2));
      const valeuClasse = post.valeu_a_pena ? "valeu-sim" : "valeu-nao";
      const valeuTexto = post.valeu_a_pena ? "✓ Sim" : "✕ Não";

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
  } catch (erro) {
    feedContainer.innerHTML =
      "<p>❌ Erro ao conectar com o servidor do Render.</p>";
    console.error(erro);
  }
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
