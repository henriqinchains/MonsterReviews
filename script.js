// Seleciona o formulário
const formAvaliacao = document.getElementById("formAvaliacao");
const saborSelect = document.querySelector('select[name="sabor"]');
const root = document.documentElement;

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

  // Cria um FormData com os dados do formulário
  const formData = new FormData(formAvaliacao);

  try {
    // Envia o POST para o backend
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });

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
  }
});
