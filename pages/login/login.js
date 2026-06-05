const API_URL = "https://monster-reviews-api.onrender.com/api";
let tokenTemporario = "";

// ==========================================
// FUNÇÃO AUXILIAR DE CHECAGEM DE SESSÃO
// ==========================================
async function checarLogin() {
  try {
    // Agora ele bate na rota /me mandando os cookies de forma segura
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      credentials: "include", 
    });

    if (response.ok) {
      // Caminho corrigido! Direto pra raiz.
      window.location.href = "../../index.html";
    }
  } catch (error) {
    console.error("Erro ao verificar sessão inicial:", error);
  }
}

// Inicializadores do DOM
document.addEventListener("DOMContentLoaded", () => {
  checarLogin();
  initLogin();
  initCadastro();
  initRecuperacao();
  initReset();
});

// ==========================================
// FUNÇÕES DE TRANSIÇÃO DE TELA (SPA)
// ==========================================
function Switch() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("recovery-section").style.display = "none";
  document.getElementById("reset-section").style.display = "none";
  document.getElementById("register-section").style.display = "block";
}

function SwitchBack() {
  document.getElementById("register-section").style.display = "none";
  document.getElementById("recovery-section").style.display = "none";
  document.getElementById("reset-section").style.display = "none";
  document.getElementById("login-section").style.display = "block";
}

function SwitchToRecovery() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "none";
  document.getElementById("reset-section").style.display = "none";
  document.getElementById("recovery-section").style.display = "block";
}

function SwitchToReset() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "none";
  document.getElementById("recovery-section").style.display = "none";
  document.getElementById("reset-section").style.display = "block";
}

function SwitchBackFromRecovery() {
  document.getElementById("recovery-section").style.display = "none";
  document.getElementById("reset-section").style.display = "none";
  document.getElementById("login-section").style.display = "block";
}

// ==========================================
// LÓGICA DE LOGIN
// ==========================================
function initLogin() {
  const form = document.getElementById("login-form");
  const button = document.getElementById("login-button");
  const message = document.getElementById("login-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usuario = document.getElementById("usuario-login").value.trim();
    const senha = document.getElementById("senha-login").value;

    if (!usuario || !senha) {
      message.style.display = "block";
      message.textContent = "Preencha usuário e senha.";
      message.style.color = "#aa0000";
      message.style.fontFamily = "Nova Square, sans-serif";
      setTimeout(() => {
        message.style.display = "none";
      }, 3000);
      return;
    }

    button.disabled = true;
    message.style.display = "block";
    message.style.fontFamily = "Nova Square, sans-serif";
    button.textContent = "Entrando...";
    message.textContent = "Validando suas credenciais...";
    message.style.color = "#adadad";

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: usuario, password: senha }),
        credentials: "include", // Essencial para receber o Cookie do Render
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || "Falha no login");
      } else {
        // --- O NOSSO TOQUE DE MESTRE PARA A INTERFACE ---
        // O token agora tá seguro no Cookie, então não salvamos ele aqui.
        // Mas a gente salva os dados visuais pro feed e pro perfil usarem:
        localStorage.setItem("loggedUser", data.login);
        localStorage.setItem("loggedEmail", data.email);
        localStorage.setItem("userRole", data.cargo);
        
        if (data.avatarUrl) {
            localStorage.setItem(`avatar_${data.email}`, data.avatarUrl);
        }

        message.style.color = "#00ff66";
        message.textContent = `Login realizado com sucesso! Redirecionando...`;
        form.reset();

        window.setTimeout(() => {
          // Caminho corrigido!
          window.location.href = "../../index.html";
        }, 1500);
      }
    } catch (error) {
      message.textContent = error.message || "Não foi possível fazer login.";
      message.style.color = "#aa0000";
    } finally {
      button.disabled = false;
      button.textContent = "Entrar";
    }
  });
}

// ==========================================
// LÓGICA DE CADASTRO
// ==========================================
function initCadastro() {
  const formCadastro = document.getElementById("formCadastro");
  if (!formCadastro) return;

  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario-cadastro").value;
    const email = document.getElementById("email-cadastro").value;
    const senha = document.getElementById("senha-cadastro").value;
    const confirmacaoSenha = document.getElementById("confirm-senha-cadastro").value;
    const message = document.getElementById("cadastro-message");

    if (senha !== confirmacaoSenha) {
      message.style.display = "block";
      message.textContent = "As senhas não coincidem. Por favor, tente novamente.";
      message.style.color = "#aa0000";
      document.getElementById("confirm-senha-cadastro").value = "";
      setTimeout(() => {
        message.style.display = "none";
      }, 3000);
      return;
    }

    message.textContent = "Enviando...";
    message.style.color = "#adadad";
    message.style.display = "block";

    try {
      const resposta = await fetch(`${API_URL}/auth/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: usuario,
          email: email,
          password: senha,
        }),
        credentials: "include", // Essencial para receber o Cookie do auto-login
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        // Salva os dados estéticos pro Front-end
        localStorage.setItem("loggedUser", dados.login);
        localStorage.setItem("loggedEmail", dados.usuario.email);

        message.textContent = `✅ ${dados.mensagem}`;
        message.style.color = "#00ff66";

        formCadastro.reset();

        window.setTimeout(() => {
          // Caminho corrigido!
          window.location.href = "/index.html";
        }, 2000);
      } else {
        message.textContent = `❌ ${dados.erro || "Erro ao cadastrar."}`;
        message.style.color = "#aa0000";
        setTimeout(() => {
          message.style.display = "none";
        }, 3000);
      }
    } catch (error) {
      message.textContent = "❌ Erro ao conectar com o servidor.";
      message.style.color = "#aa0000";
      setTimeout(() => {
        message.style.display = "none";
      }, 3000);
    }
  });
}

// ==========================================
// LÓGICA DE PEDIR RECUPERAÇÃO (ENVIAR EMAIL)
// ==========================================
function initRecuperacao() {
  const formRecuperacao = document.getElementById("formRecuperacao");
  const emailInput = document.getElementById("email-recuperacao");
  const btnRecuperacao = document.getElementById("recovery-button");
  const msgRecuperacao = document.getElementById("recovery-message");

  if (!formRecuperacao) return;

  formRecuperacao.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailDigitado = emailInput.value.trim();
    if (!emailDigitado) return;

    const textoOriginalBotao = btnRecuperacao.innerText;
    btnRecuperacao.innerText = "Enviando...";
    btnRecuperacao.disabled = true;
    msgRecuperacao.style.display = "none";

    try {
      const resposta = await fetch(`${API_URL}/esqueci-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDigitado }),
      });

      const dados = await resposta.json();
      msgRecuperacao.style.display = "block";

      if (resposta.ok) {
        msgRecuperacao.style.color = "#00ff66";
        msgRecuperacao.innerText = "Código enviado! Cheque seu email.";
        emailInput.value = "";

        tokenTemporario = dados.tokenAuth;

        setTimeout(() => {
          msgRecuperacao.style.display = "none";
          SwitchToReset(); 
        }, 1500);
      } else {
        msgRecuperacao.style.color = "#ff3333";
        msgRecuperacao.innerText =
          dados.erro || "Não achamos esse email no banco.";
      }
    } catch (erro) {
      msgRecuperacao.style.display = "block";
      msgRecuperacao.style.color = "#ff3333";
      msgRecuperacao.innerText = "Erro ao conectar com o servidor.";
    } finally {
      btnRecuperacao.innerText = textoOriginalBotao;
      btnRecuperacao.disabled = false;
    }
  });
}

// ==========================================
// LÓGICA DE DIGITAR O PIN E NOVA SENHA
// ==========================================
function initReset() {
  const formReset = document.getElementById("formResetSenha");
  const inputCodigo = document.getElementById("codigo-pin");
  const inputNovaSenha = document.getElementById("nova-senha");
  const inputConfirmar = document.getElementById("confirmar-nova-senha");
  const btnSalvar = document.getElementById("btn-salvar-senha");
  const msgReset = document.getElementById("reset-message");

  if (!formReset) return;

  formReset.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigoDigitado = inputCodigo.value.trim();
    const senha1 = inputNovaSenha.value;
    const senha2 = inputConfirmar.value;

    if (senha1 !== senha2) {
      msgReset.style.display = "block";
      msgReset.style.color = "#ff3333";
      msgReset.innerText = "As senhas não batem. Digite igual nas duas caixas!";
      return;
    }

    btnSalvar.innerText = "Salvando... ⏳";
    btnSalvar.disabled = true;
    msgReset.style.display = "none";

    try {
      const resposta = await fetch(`${API_URL}/resetar-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenTemporario,
          codigoDigitado: codigoDigitado,
          novaSenha: senha1,
        }),
      });

      const dados = await resposta.json();
      msgReset.style.display = "block";

      if (resposta.ok) {
        msgReset.style.color = "#00ff66";
        msgReset.innerText = "Senha atualizada! Voltando pro login...";

        formReset.reset();
        tokenTemporario = "";
        setTimeout(() => {
          msgReset.style.display = "none";
          SwitchBackFromRecovery();
        }, 3000);
      } else {
        msgReset.style.color = "#ff3333";
        msgReset.innerText = dados.erro || "Erro ao atualizar senha.";
      }
    } catch (erro) {
      msgReset.style.display = "block";
      msgReset.style.color = "#ff3333";
      msgReset.innerText = "Erro no servidor. Tente novamente.";
    } finally {
      btnSalvar.innerText = "Atualizar Senha";
      btnSalvar.disabled = false;
    }
  });
}
