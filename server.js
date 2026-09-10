require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const dns = require("dns");

// 📦 Importando Middlewares e Rotas
const seguranca = require("./middlewares/seguranca");
const authRoutes = require("./routes/authRoutes");
const coreRoutes = require("./routes/coreRoutes");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
app.set("trust proxy", 1); 

// ==========================================
// CONFIGURAÇÕES GERAIS
// ==========================================
const allowedOrigins = [
  "https://monstereviews.com.br", "http://127.0.0.1:5500", 
  "http://localhost:5500", "http://localhost:3000", "http://127.0.0.1:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(url => origin.startsWith(url))) return callback(null, true);
    callback(new Error("Bloqueado pelo CORS do Monster Reviews!"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "CSRF-Token"],
}));

app.use(cookieParser());
app.use(express.json());

// ==========================================
// SEGURANÇA (RATE LIMITING)
// ==========================================
// 1. Limite geral da API: 100 acessos por minuto pra não derrubar o banco
app.use("/api", rateLimit({ 
  windowMs: 1 * 60 * 1000, 
  limit: 100, 
  standardHeaders: true, 
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em instantes." }
}));

// 2. Limite restrito: Só 5 tentativas a cada 15 minutos nas rotas de Login e Cadastro
app.use(["/api/auth/login", "/api/auth/cadastro"], rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  limit: 5, 
  standardHeaders: true, 
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde alguns minutos antes de tentar de novo." }
}));

// ==========================================
// MÓDULOS DE ROTAS 
// ==========================================
app.use("/api/auth", authRoutes); 
app.use("/api", coreRoutes);      


// ==========================================
// SEGURANÇA (Middlewares Globais)
// ==========================================
app.use(seguranca.antiNoSql);
app.use(seguranca.csrfProtection);

app.use("/api", rateLimit({ windowMs: 1 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));
app.use(["/api/auth/login", "/api/auth/cadastro"], rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false }));

// Rota de entrega do token CSRF para o frontend
app.get("/api/token-seguranca", (req, res) => {
  res.json({ token: req.csrfToken });
});

// ==========================================
// MÓDULOS DE ROTAS
// ==========================================
app.use("/api/auth", authRoutes); // Tudo de login vai pra cá
app.use("/api", coreRoutes);      // Tudo de feed e stats vai pra cá

// ==========================================
// BANCO DE DADOS & START
// ==========================================
mongoose.connect(process.env.DATABASE_URL, { family: 4 })
  .then(() => {
    console.log("✅ Conectado ao MongoDB com sucesso!");
    const PORTA = process.env.PORT || 3000;
    app.listen(PORTA, () => console.log(`🚀 Servidor MVC rodando na porta ${PORTA}`));
  })
  .catch((erro) => console.log("❌ Erro ao conectar no banco:", erro));
