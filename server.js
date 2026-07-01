require("dotenv").config();

// ============================================================================
// 1. IMPORTAÇÕES E PACOTES
// ============================================================================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const { Resend } = require("resend");
const fs = require("fs");
const path = require("path");
const dns = require("dns");

// ============================================================================
// 2. CONFIGURAÇÕES GERAIS E SERVIÇOS EXTERNOS
// ============================================================================
// DNS (Contorno para problemas de rede em alguns provedores)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Diretório de Uploads Locais
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: "uploads/" });

// API de E-mails (Resend)
const resend = new Resend(process.env.RESEND_API_KEY);

// API de Imagens (Cloudinary)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================================
// 3. INICIALIZAÇÃO DO APP E MIDDLEWARES
// ============================================================================
const app = express();
app.set("trust proxy", 1); 

const allowedOrigins = [
  "https://monstereviews.com.br",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some((allowedUrl) => origin.startsWith(allowedUrl));
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Bloqueado pelo CORS do Monster Reviews!"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  })
);

app.use(cookieParser());
app.use(express.json());

// ============================================================================
// 4. BANCO DE DADOS E MODELS (MONGODB)
// ============================================================================
mongoose
  .connect(process.env.DATABASE_URL, { family: 4 })
  .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
  .catch((erro) => console.log("❌ Erro ao conectar no banco:", erro));

// Model: Usuário
const UsuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true },
  cargo: { type: String, enum: ["user", "admin"], default: "user" },
  avatarUrl: { type: String, default: "" },
}, { timestamps: true });

const Usuario = mongoose.model("Usuario", UsuarioSchema, "usuarios");

// Model: Avaliação
const AvaliacaoSchema = new mongoose.Schema({
  sujeito: { type: String, required: true },
  sabor: { type: String, required: true },
  valor: { type: Number, required: true },
  nota: { type: Number, required: true },
  valeu_a_pena: { type: Boolean, required: true },
  review: { type: String, required: false },
  foto_url: { type: String, required: true },
  likes: { type: [String], default: [] }
}, { timestamps: true });

const Avaliacao = mongoose.model("Avaliacao", AvaliacaoSchema, "avaliacoes");

// Model: Comentários
const ComentarioSchema = new mongoose.Schema({
  avaliacaoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Avaliacao', required: true },
  sujeito: { type: String, required: true },
  texto: { type: String, required: true },
  likes: { type: [String], default: [] }
}, { timestamps: true });

const Comentario = mongoose.model("Comentario", ComentarioSchema, "comentarios");

// ============================================================================
// 5. ROTAS DE AUTENTICAÇÃO E SESSÃO
// ============================================================================

// Cadastro
app.post("/api/auth/cadastro", async (req, res) => {
  try {
    const { login, email, password } = req.body;

    if (!login || !email || !password) return res.status(400).json({ erro: "Por favor, preencha todos os campos." });
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ erro: "Formato de e-mail inválido." });

    const usuarioExiste = await Usuario.findOne({ nome: login });
    if (usuarioExiste) return res.status(400).json({ erro: "Este nome de usuário já está sendo usado." });

    const emailExiste = await Usuario.findOne({ email: email.toLowerCase() });
    if (emailExiste) return res.status(400).json({ erro: "Este e-mail já está cadastrado em outra conta." });

    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(password, salt);

    const novoUsuario = new Usuario({ nome: login, email: email, senha: senhaCriptografada });
    await novoUsuario.save();

    const token = jwt.sign(
      { id: novoUsuario._id, nome: novoUsuario.nome, email: novoUsuario.email, cargo: novoUsuario.cargo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("authToken", token, { httpOnly: true, secure: true, sameSite: "none", partitioned: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso!",
      login: novoUsuario.nome,
      usuario: { id: novoUsuario._id, nome: novoUsuario.nome, email: novoUsuario.email },
    });
  } catch (erro) {
    console.error("❌ Erro no cadastro:", erro);
    return res.status(500).json({ erro: "Erro ao tentar cadastrar usuário." });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { login, password } = req.body;
    const usuarioEncontrado = await Usuario.findOne({ $or: [{ nome: login }, { email: login }] });

    if (!usuarioEncontrado) return res.status(400).json({ erro: "Usuário ou senha incorretos." });

    const senhaValidaLogin = await bcrypt.compare(password, usuarioEncontrado.senha);
    if (!senhaValidaLogin) return res.status(400).json({ erro: "Usuário ou senha incorretos." });

    const token = jwt.sign(
      { id: usuarioEncontrado._id, nome: usuarioEncontrado.nome, email: usuarioEncontrado.email, cargo: usuarioEncontrado.cargo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("authToken", token, { httpOnly: true, secure: true, sameSite: "none", partitioned: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.status(200).json({
      mensagem: "Login realizado com sucesso!",
      login: usuarioEncontrado.nome,
      email: usuarioEncontrado.email,
      cargo: usuarioEncontrado.cargo,
      avatarUrl: usuarioEncontrado.avatarUrl,
    });
  } catch (erro) {
    console.error("❌ Erro no login:", erro);
    return res.status(500).json({ erro: "Erro ao tentar fazer login." });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.cookie("authToken", "", { httpOnly: true, secure: true, sameSite: "none", partitioned: true, expires: new Date(0) });
  return res.status(200).json({ mensagem: "Deslogado com sucesso!" });
});

// Validação de Sessão (/me)
app.get("/api/auth/me", async (req, res) => {
  const token = req.cookies.authToken;
  if (!token) return res.status(401).json({ logado: false });

  try {
    const usuarioVerificado = jwt.verify(token, process.env.JWT_SECRET);
    const userDb = await Usuario.findById(usuarioVerificado.id);

    return res.json({
      logado: true,
      login: usuarioVerificado.nome,
      email: usuarioVerificado.email,
      cargo: usuarioVerificado.cargo || "user",
      id: usuarioVerificado.id,
      avatarUrl: userDb ? userDb.avatarUrl : "" 
    });
  } catch (err) {
    return res.status(401).json({ logado: false });
  }
});

// ============================================================================
// 6. ROTAS DE RECUPERAÇÃO DE CONHA
// ============================================================================
app.post("/api/esqueci-senha", async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(404).json({ erro: "Email não encontrado na nossa base." });

    const codigoPin = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenParaOFront = jwt.sign({ id: usuario._id, codigo: codigoPin }, process.env.JWT_SECRET, { expiresIn: "15m" });

    const { data, error } = await resend.emails.send({
      from: "nao-responda@monstereviews.com.br",
      to: usuario.email,
      subject: "Monster Reviews - Seu Código de Recuperação",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #121212; color: #fff; padding: 20px; border-radius: 8px; text-align: center;">
            <h2 style="color: #00ff66;">E aí monstro!</h2>
            <p>Aqui está o seu código para criar uma nova senha:</p>
            <h1 style="background-color: #222; padding: 15px; letter-spacing: 5px; color: #00ff66; border-radius: 8px;">${codigoPin}</h1>
            <p style="color: #aaa; font-size: 12px;">Este código expira em 15 minutos.</p>
        </div>
      `,
    });

    if (error) throw error;
    return res.status(200).json({ mensagem: "Código enviado!", tokenAuth: tokenParaOFront });
  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao enviar código." });
  }
});

app.post("/api/resetar-senha", async (req, res) => {
  try {
    const { token, codigoDigitado, novaSenha } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.codigo !== codigoDigitado) return res.status(400).json({ erro: "Código inválido." });

    const usuario = await Usuario.findById(decoded.id);
    const salt = await bcrypt.genSalt(10);
    usuario.senha = await bcrypt.hash(novaSenha, salt);
    await usuario.save();

    return res.status(200).json({ mensagem: "Senha atualizada com sucesso!" });
  } catch (erro) {
    return res.status(400).json({ erro: "Código expirado ou inválido." });
  }
});

// ============================================================================
// 7. ROTAS DO CORE (AVALIAÇÕES, FEED E ESTATÍSTICAS)
// ============================================================================

// Rota para buscar as avaliações com Paginação
app.get("/api/avaliacoes", async (req, res) => {
  try {
    // Pega a página da URL (se não mandar, assume página 1)
    const page = parseInt(req.query.page) || 1;
    // Define o limite de latinhas por vez
    const limit = parseInt(req.query.limit) || 10; 
    
    // Calcula quantas latinhas pular
    const skip = (page - 1) * limit;

    // Busca no banco aplicando a ordenação, o pulo e o limite
    const avaliacoes = await Avaliacao.find()
      .sort({ createdAt: -1 }) // Mais novas primeiro
      .skip(skip)
      .limit(limit);

    // Conta o total de latinhas no banco para sabermos quando parar de pedir
    const totalPosts = await Avaliacao.countDocuments();
    const hasMore = (page * limit) < totalPosts;

    // 🚨 ATENÇÃO: Agora não devolvemos mais só o array puro!
    // Devolvemos um objeto com as avaliações e a informação se tem mais.
    return res.status(200).json({
      avaliacoes: avaliacoes,
      hasMore: hasMore
    });

  } catch (erro) {
    console.error("Erro ao buscar avaliações:", erro);
    return res.status(500).json({ erro: "Erro ao carregar o feed." });
  }
});

// Publicar Avaliação
app.post("/api/avaliacoes", upload.single("foto"), async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ erro: "Você precisa estar logado!" });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let linkDaFotoNaNuvem = "";
    
    if (req.file) {
      console.log("⏳ Subindo foto pro Cloudinary...");
      const resultado = await cloudinary.uploader.upload(req.file.path, { folder: "MonsterReviews" });
      linkDaFotoNaNuvem = resultado.secure_url;
      console.log("✅ Foto na nuvem! Link:", linkDaFotoNaNuvem);
    }

    const novaAvaliacao = new Avaliacao({
      sujeito: decoded.nome,
      sabor: req.body.sabor,
      valor: Number(req.body.valor),
      nota: Number(req.body.nota),
      review: req.body.review,
      valeu_a_pena: req.body.valeu_a_pena === "true",
      foto_url: linkDaFotoNaNuvem,
    });

    await novaAvaliacao.save();
    return res.status(201).json({ mensagem: "Avaliação salva com sucesso!", avaliacao: novaAvaliacao });
  } catch (erro) {
    console.error("Erro ao postar avaliação:", erro);
    return res.status(401).json({ erro: "Sessão inválida ou erro no envio." });
  }
});

// Deletar Avaliação (Função Auxiliar Embutida)
const obterPublicIdDaUrl = (url) => {
  if (!url) return null;
  const partes = url.split('/');
  const arquivoComExtensao = partes.pop();
  const pasta = partes.pop(); 
  const arquivoSemExtensao = arquivoComExtensao.split('.')[0];
  return `${pasta}/${arquivoSemExtensao}`;
};

app.delete("/api/avaliacoes/:id", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ erro: "Acesso negado. Faça login novamente." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const avaliacao = await Avaliacao.findById(req.params.id);

    if (!avaliacao) return res.status(404).json({ erro: "Avaliação não encontrada." });

    if (avaliacao.sujeito === decoded.nome || decoded.cargo === "admin") {
      if (avaliacao.foto_url) {
        const publicId = obterPublicIdDaUrl(avaliacao.foto_url);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      }
      await Avaliacao.findByIdAndDelete(req.params.id);
      return res.status(200).json({ mensagem: "Avaliação excluída com sucesso! 🗑️" });
    } else {
      return res.status(403).json({ erro: "Você não tem permissão para excluir esta avaliação." });
    }
  } catch (erro) {
    console.error("❌ Erro interno no servidor ao deletar:", erro);
    if (erro.name === "JsonWebTokenError" || erro.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Sessão expirada ou inválida. Faça login novamente." });
    }
    return res.status(500).json({ erro: "Erro interno ao tentar deletar a avaliação." });
  }
});

// Rota para excluir um comentário
app.delete("/api/comentarios/:id", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ erro: "Acesso negado." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const comentario = await Comentario.findById(req.params.id);

    if (!comentario) return res.status(404).json({ erro: "Comentário não encontrado." });

    // 🔒 REGRA DE NEGÓCIO: Só exclui se for o dono do comentário ou um ADMIN
    if (comentario.sujeito !== decoded.nome && decoded.cargo !== "admin") {
      return res.status(403).json({ erro: "Você não tem permissão para excluir este comentário." });
    }

    await Comentario.findByIdAndDelete(req.params.id);
    return res.status(200).json({ mensagem: "Comentário excluído com sucesso!" });

  } catch (erro) {
    console.error("❌ Erro ao excluir comentário:", erro);
    return res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// Toggle likes de posts
app.post("/api/avaliacoes/:id/curtidas", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ erro: "Você precisa estar logado para curtir, monstro!" });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const avaliacao = await Avaliacao.findById(req.params.id);
    
    if (!avaliacao) return res.status(404).json({ erro: "Avaliação não encontrada." });

    const indexLike = avaliacao.likes.indexOf(decoded.nome);
    if (indexLike === -1) {
      avaliacao.likes.push(decoded.nome);
    } else {
      avaliacao.likes.splice(indexLike, 1);
    }

    await avaliacao.save();
    return res.status(200).json({ mensagem: indexLike === -1 ? "Like adicionado!" : "Like removido!", likes: avaliacao.likes });
  } catch (erro) {
    console.error("❌ Erro ao curtir a avaliação:", erro);
    if (erro.name === "JsonWebTokenError" || erro.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Sessão expirada. Faça login novamente." });
    }
    return res.status(500).json({ erro: "Erro interno ao processar a curtida." });
  }
});

// Toggle likes de comentários
app.post("/api/comentarios/:id/curtidas", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ erro: "Você precisa estar logado para curtir, monstro!" });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const comentario = await Comentario.findById(req.params.id);
    
    if (!comentario) return res.status(404).json({ erro: "Comentário não encontrado." });

    // Se o nome do cara já está no array, tira (unlike). Se não tá, coloca (like).
    const indexLike = comentario.likes.indexOf(decoded.nome);
    if (indexLike === -1) {
      comentario.likes.push(decoded.nome);
    } else {
      comentario.likes.splice(indexLike, 1);
    }

    await comentario.save();
    return res.status(200).json({ 
      mensagem: indexLike === -1 ? "Like adicionado!" : "Like removido!", 
      likes: comentario.likes 
    });
  } catch (erro) {
    console.error("❌ Erro ao curtir o comentário:", erro);
    return res.status(500).json({ erro: "Erro interno ao processar a curtida." });
  }
});

// Rota para buscar os comentários de uma avaliação específica
app.get("/api/avaliacoes/:id/comentarios", async (req, res) => {
  try {
    const comentarios = await Comentario.find({ avaliacaoId: req.params.id }).sort({ createdAt: 1 }); // Ordem cronológica (mais antigos primeiro)
    return res.status(200).json(comentarios);
  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao buscar comentários." });
  }
});

// Rota para salvar um novo comentário
app.post("/api/avaliacoes/:id/comentarios", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ erro: "Você precisa estar logado para comentar, monstro!" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { texto } = req.body;

    if (!texto) return res.status(400).json({ erro: "O comentário não pode estar vazio." });

    const novoComentario = new Comentario({
      avaliacaoId: req.params.id,
      sujeito: decoded.nome, // Puxa direto da sessão segura do token
      texto: texto
    });

    await novoComentario.save();
    return res.status(201).json(novoComentario);
  } catch (erro) {
    return res.status(401).json({ erro: "Sessão inválida ou erro ao comentar." });
  }
});

// Ranking e Estatísticas
app.get("/api/ranking", async (req, res) => {
  try {
    const ranking = await Avaliacao.aggregate([
      { $group: { _id: "$sujeito", totalLatinhas: { $sum: 1 } } },
      { $sort: { totalLatinhas: -1 } },
      { $limit: 10 },
    ]);
    return res.status(200).json(ranking);
  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao gerar o painel de liderança." });
  }
});

app.get("/api/estatisticas", async (req, res) => {
  try {
    const user = req.query.user;
    let dadosUsuarioBanco = null;
    let statsUsuario = [];
    let saborUsuario = [];

    if (user) {
      dadosUsuarioBanco = await Usuario.findOne({ nome: new RegExp("^" + user + "$", "i") });
      statsUsuario = await Avaliacao.aggregate([
        { $match: { sujeito: user } },
        { $group: { _id: null, totalLatas: { $sum: 1 }, totalGasto: { $sum: "$valor" }, mediaNotas: { $avg: "$nota" } } },
      ]);
      saborUsuario = await Avaliacao.aggregate([
        { $match: { sujeito: user } },
        { $group: { _id: "$sabor", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);
    }

    const statsGlobais = await Avaliacao.aggregate([
      { $group: { _id: null, totalLatas: { $sum: 1 }, totalGasto: { $sum: "$valor" }, mediaNotas: { $avg: "$nota" } } },
    ]);

    const saborGlobal = await Avaliacao.aggregate([
      { $group: { _id: "$sabor", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    return res.json({
      global: {
        totalLatas: statsGlobais[0]?.totalLatas || 0,
        totalGasto: statsGlobais[0]?.totalGasto || 0,
        mediaNotas: statsGlobais[0]?.mediaNotas || 0,
        saborFavorito: saborGlobal[0]?._id || "-",
      },
      usuario: {
        totalLatas: statsUsuario[0]?.totalLatas || 0,
        totalGasto: statsUsuario[0]?.totalGasto || 0,
        mediaNotas: statsUsuario[0]?.mediaNotas || 0,
        saborFavorito: saborUsuario[0]?._id || "-",
        avatarUrl: dadosUsuarioBanco ? dadosUsuarioBanco.avatarUrl : ""
      },
    });
  } catch (erro) {
    console.error("Erro na rota de estatísticas:", erro);
    return res.status(500).json({ erro: "Erro ao processar as estatísticas no banco." });
  }
});

// Alterar Avatar
app.post("/api/usuarios/avatar", upload.single("fotoPerfil"), async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ erro: "Acesso negado. Faça login novamente." });

    const verificado = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.file) return res.status(400).json({ erro: "Nenhuma imagem foi recebida." });

    const usuario = await Usuario.findOne({ nome: new RegExp("^" + verificado.nome + "$", "i") });
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado no banco." });

    console.log("⏳ Subindo avatar pro Cloudinary...");
    const resultado = await cloudinary.uploader.upload(req.file.path, { folder: "MonsterAvatares" });
    const linkCloudinary = resultado.secure_url;

    if (usuario.avatarUrl && usuario.avatarUrl !== "") {
      const publicIdAntigo = obterPublicIdDaUrl(usuario.avatarUrl);
      if (publicIdAntigo) await cloudinary.uploader.destroy(publicIdAntigo);
    }

    usuario.avatarUrl = linkCloudinary;
    await usuario.save();

    return res.json({ mensagem: "Avatar atualizado com sucesso, monstro!", avatarUrl: linkCloudinary });
  } catch (erro) {
    console.error("❌ Erro na rota de avatar:", erro);
    return res.status(500).json({ erro: "Erro interno no servidor ao atualizar avatar." });
  }
});

// ============================================================================
// 8. INICIALIZAÇÃO DO SERVIDOR
// ============================================================================
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});
