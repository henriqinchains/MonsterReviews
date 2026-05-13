// Seleciona o formulário
const formAvaliacao = document.getElementById("formAvaliacao");

// Adiciona listener para o envio do formulário
formAvaliacao.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Cria um FormData com os dados do formulário
  const formData = new FormData(formAvaliacao);

  try {
    // Envia o POST para o backend
    const response = await fetch("http://localhost:3000/api/avaliacoes", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    // Verifica se a requisição foi bem-sucedida
    if (response.ok) {
      alert("Avaliação enviada com sucesso!");
      formAvaliacao.reset(); // Limpa o formulário
    } else {
      alert("Erro ao enviar avaliação: " + data.message);
    }
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro ao enviar avaliação. Tente novamente.");
  }
});
