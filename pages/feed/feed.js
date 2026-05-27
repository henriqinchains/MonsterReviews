function toggleDropdown() {
    document.getElementById('navUser').classList.toggle('open');
  }
  document.addEventListener('click', e => {
    const nu = document.getElementById('navUser');
    if (!nu.contains(e.target)) nu.classList.remove('open');
  });

document.addEventListener("DOMContentLoaded", () => {
  if (!token) window.location.href = "../login/login.html";
});

  function toggleTag(el) {
    document.querySelectorAll('#tagGroup .tag').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  }

  document.querySelectorAll('.tl-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tl-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

document.addEventListener('DOMContentLoaded', () => {
    carregarFeed();
    carregarRanking();
});

async function carregarFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) {
        return; 
    }
  
    feedContainer.innerHTML = "<p>Carregando avaliações monstruosas...</p>";
    try {
        // 1. Puxa os dados reais da sua API no Render
        const resposta = await fetch('https://monster-reviews-api.onrender.com/api/avaliacoes');
        const avaliacoes = await resposta.json();

        // Limpa a mensagem de carregando
        feedContainer.innerHTML = "";

        if (avaliacoes.length === 0) {
            feedContainer.innerHTML = "<p>Nenhuma avaliação postada ainda. Seja o primeiro!</p>";
            return;
        }

        // 2. Loop para varrer cada avaliação do MongoDB e montar o HTML
        avaliacoes.forEach(post => {
            
            const estrelas = "★".repeat(Math.round(post.nota / 2)) + "☆".repeat(5 - Math.round(post.nota / 2));
            
            const valeuClasse = post.valeu_a_pena ? 'valeu-sim' : 'valeu-nao';
            const valeuTexto = post.valeu_a_pena ? '✓ Sim' : '✕ Não';

            const postArticle = document.createElement('article');
            postArticle.className = 'post-card';

            postArticle.innerHTML = `
                <div class="post-head">
                  <div class="post-avatar" style="background:linear-gradient(135deg,#e74c3c,#c0392b)">
                    ${post.sujeito.substring(0, 2).toUpperCase()}
                  </div>
                  <div class="post-meta">
                    <strong>${post.sujeito}</strong>
                    <span>${new Date(post.createdAt).toLocaleDateString('pt-BR')} · Público</span>
                  </div>
                  <button class="post-options">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                  </button>
                </div>
                
                <div class="post-image">
                  <img src="${post.foto_url}" alt="Foto do Monster" style="width:100%; max-height:400px; object-fit:contain; border-radius:4px;">
                </div>
                
                <div class="post-info">
                  <div class="info-item"><span class="info-label">Sabor</span><span class="info-value">${post.sabor}</span></div>
                  <div class="info-item"><span class="info-label">Valor</span><span class="info-value">R$ ${Number(post.valor).toFixed(2).replace('.', ',')}</span></div>
                  <div class="info-item"><span class="info-label">Nota</span><span class="info-value">${Number(post.nota).toFixed(1)} <span class="nota-stars">${estrelas}</span></span></div>
                  <div class="info-item"><span class="info-label">Valeu a pena?</span><span class="info-value ${valeuClasse}">${valeuTexto}</span></div>
                </div>
                
                <div class="post-desc">${post.review || 'Sem descrição.'}</div>
                
                <div class="post-footer">
                  <button class="post-action">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    0
                  </button>
                </div>
            `;

            // Coloca o card renderizado dentro do container do feed
            feedContainer.appendChild(postArticle);
        });

    } catch (erro) {
        feedContainer.innerHTML = "<p>❌ Erro ao conectar com o servidor do Render.</p>";
        console.error(erro);
    }
}

async function carregarRanking() {
    const container = document.getElementById('ranking-container');
    if (!container) return; // Barreira de proteção clássica!

    try {
        const resposta = await fetch('https://monster-reviews-api.onrender.com/api/ranking');
        const ranking = await resposta.json();

        container.innerHTML = ""; // Limpa a mensagem de carregando

        if (ranking.length === 0) {
            container.innerHTML = "<p style='text-align: center; color: #888;'>Nenhuma latinha registrada ainda.</p>";
            return;
        }

        ranking.forEach((usuario, index) => {
            // Define o ícone de posição baseado no index (0 = 1º lugar)
            let iconePosicao = `#${index + 1}`;
            let classePodio = "";

            if (index === 0) {
                classePodio = "rank-1";
            } else if (index === 1) {
                classePodio = "rank-2";
            } else if (index === 2) {
                classePodio = "rank-3";
            }

            // Cria a linha do usuário
            const linha = document.createElement('div');
            // Se for do top 3, adiciona a classe do pódio, senão fica normal
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
        container.innerHTML = "<p style='text-align: center; color: #ff3333;'>Erro ao carregar o ranking.</p>";
        console.error(erro);
    }
}
