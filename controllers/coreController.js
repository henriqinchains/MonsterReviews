const jwt = require("jsonwebtoken");
const Avaliacao = require("../models/Avaliacao");
const Comentario = require("../models/Comentario");
const Usuario = require("../models/Usuario");
const { cloudinary } = require("../middlewares/upload");

// Função auxiliar
const obterPublicIdDaUrl = (url) => {
  if (!url) return null;
  const partes = url.split('/');
  return `${partes[partes.length - 2]}/${partes[partes.length - 1].split('.')[0]}`;
};

// Exporte cada função do feed, ranking e avaliações:
exports.getAvaliacoes = async (req, res) => { 
  try {
    // 1. Pegamos todos os parâmetros da URL
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { sabor, sujeito, ordem } = req.query; 

    // 2. Montamos o objeto de busca (query) dinamicamente
    const query = {};
    if (sabor) query.sabor = sabor;
    if (sujeito) query.sujeito = sujeito;

    // 3. Montamos a lógica de ordenação
    let sortConfig = { createdAt: -1 }; // Padrão: Mais recentes
    if (ordem === "antigos") sortConfig = { createdAt: 1 };
    else if (ordem === "maior_nota") sortConfig = { nota: -1 };
    else if (ordem === "menor_nota") sortConfig = { nota: 1 };
    else if (ordem === "menor_preco") sortConfig = { valor: 1 };

    // 4. Calcula o offset do scroll (skip)
    const skip = (page - 1) * limit;

    // 5. Busca no banco aplicando filtros, ordem e paginação juntos
    const avaliacoes = await Avaliacao.find(query)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit);

    // 6. Conta o total de latinhas MAS SÓ as que respeitam o filtro
    const totalPosts = await Avaliacao.countDocuments(query);
    const hasMore = (skip + avaliacoes.length) < totalPosts;

    return res.status(200).json({
      avaliacoes: avaliacoes,
      hasMore: hasMore
    });

  } catch (erro) {
    console.error("Erro ao buscar avaliações filtradas:", erro);
    return res.status(500).json({ erro: "Erro ao carregar o feed." });
  } 
};

exports.postAvaliacao = async (req, res) => { 
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
      musica_preview: req.body.musica_preview
    });

    await novaAvaliacao.save();
    return res.status(201).json({ mensagem: "Avaliação salva com sucesso!", avaliacao: novaAvaliacao });
  } catch (erro) {
    console.error("Erro ao postar avaliação:", erro);
    return res.status(401).json({ erro: "Sessão inválida ou erro no envio." });
  } 
};

exports.deleteAvaliacao = async (req, res) => { 
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
};

// Deletar Avaliação (Função Auxiliar)
const obterPublicIdDaUrl = (url) => {
  if (!url) return null;
  const partes = url.split('/');
  const arquivoComExtensao = partes.pop();
  const pasta = partes.pop(); 
  const arquivoSemExtensao = arquivoComExtensao.split('.')[0];
  return `${pasta}/${arquivoSemExtensao}`;
};

exports.curtirAvaliacao = async (req, res) => { 
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
};

exports.getComentarios = async (req, res) => { 
  try {
    const comentarios = await Comentario.find({ avaliacaoId: req.params.id }).sort({ createdAt: 1 }); // Ordem cronológica (mais antigos primeiro)
    return res.status(200).json(comentarios);
  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao buscar comentários." });
  }
};

exports.postComentario = async (req, res) => { 
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
};

exports.deleteComentario = async (req, res) => { 
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
};

exports.curtirComentario = async (req, res) => { 
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
};

exports.getRanking = async (req, res) => { 
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
};

exports.getEstatisticas = async (req, res) => { 
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
};

exports.atualizarAvatar = async (req, res) => { 
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
};
