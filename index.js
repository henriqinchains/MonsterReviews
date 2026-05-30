// Seleciona o formulário
const formAvaliacao = document.getElementById("formAvaliacao");
const saborSelect = document.querySelector('select[name="sabor"]');
const root = document.documentElement;
const btnSubmit = document.getElementById("btnSubmit");

const token = localStorage.getItem("authToken");

document.addEventListener("DOMContentLoaded", () => {
  if (!token) window.location.href = "pages/login/login.html";
  else if (localStorage.getItem('autorizacao') == 0)
    window.location.href = "pages/feed/feed.html";
  
  }
  
)
// Se houver token, pode carregar o restante da página normalmente

document.addEventListener("DOMContentLoaded", () => {
  let enviando = false;

  // Função para mudar tema por sabor
  function mudarTemaPorSabor(sabor) {
    if (sabor) {
      root.setAttribute("data-sabor", sabor);
    } else {
      root.removeAttribute("data-sabor");
    }
  }

  // Adiciona listener para mudança de sabor
  if (saborSelect) {
    saborSelect.addEventListener("change", (e) => {
      mudarTemaPorSabor(e.target.value);
    });
  }

  // Adiciona listener para o envio do formulário
  formAvaliacao.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (enviando) return;

    enviando = true;
    btnSubmit.disabled = true;

    // Cria um FormData com os dados do formulário
    const formData = new FormData(formAvaliacao);

    try {
      // Envia o POST para o backend
      const response = await fetch(
        "https://monster-reviews-api.onrender.com/api/avaliacoes",
        {
          method: "POST",
          body: formData,
        },
      );

      //xereca

      const data = await response.json();

      // Verifica se a requisição foi bem-sucedida
      if (response.ok) {
        alert("Avaliação enviada com sucesso!");
        formAvaliacao.reset(); // Limpa o formulário
        root.removeAttribute("data-sabor"); // Remove o tema customizado
      } else {
        alert("Erro ao enviar avaliação: " + data.message);
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      // reabilita o botão
      enviando = false;
      btnSubmit.disabled = false;
      window.location.href = "pages/feed/feed.html"
      localStorage.removeItem("authToken");
    }
  });
});
