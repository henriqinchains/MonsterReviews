const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Usuario = require("../models/Usuario");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.cadastro = async (req, res) => {
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
};

exports.login = async (req, res) => {
  try {
    const { login, password } = req.body;
    const usuarioEncontrado = await Usuario.findOne({ $or: [{ nome: login }, { email: login }] });

    if (!usuarioEncontrado) return res.status(400).json({ erro: "Usuário ou senha incorretos." });

    // 1. A SENHA SEMPRE É OBRIGATÓRIA
    const senhaValidaLogin = await bcrypt.compare(password, usuarioEncontrado.senha);
    if (!senhaValidaLogin) return res.status(400).json({ erro: "Usuário ou senha incorretos." });

    // 2. Senha certa! Agora checamos se o dispositivo é confiável
    const trustedToken = req.cookies.trustedDevice;
    let dispositivoConiavel = false;

    if (trustedToken) {
      try {
        const decodedTrusted = jwt.verify(trustedToken, process.env.JWT_SECRET);
        if (decodedTrusted.id === usuarioEncontrado._id.toString()) {
          dispositivoConiavel = true;
        }
      } catch (e) {
        // Cookie expirado ou inválido, segue o fluxo normal
      }
    }

    // 3. SE O DISPOSITIVO É CONFIÁVEL: Pula o 2FA e já gera a sessão real!
    if (dispositivoConiavel) {
      const tokenReal = jwt.sign(
        { id: usuarioEncontrado._id, nome: usuarioEncontrado.nome, email: usuarioEncontrado.email, cargo: usuarioEncontrado.cargo },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      res.cookie("authToken", tokenReal, { httpOnly: true, secure: true, sameSite: "none", partitioned: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return res.status(200).json({
        mensagem: "Login realizado com sucesso! (Dispositivo confiável)",
        requer2FA: false, // 🛡️ Avisa o front que passou direto do 2FA
        login: usuarioEncontrado.nome,
        email: usuarioEncontrado.email,
        avatarUrl: usuarioEncontrado.avatarUrl,
      });
    }

    // 4. SE NÃO É CONFIÁVEL: Dispara o 2FA via Resend normalmente
    const codigoPin = Math.floor(100000 + Math.random() * 900000).toString();

    await resend.emails.send({
      from: "nao-responda@monstereviews.com.br", 
      to: usuarioEncontrado.email,
      subject: "🔒 Código de Acesso - Monster Reviews",
      html: `
        <div style="background-color: #121212; color: #fff; padding: 20px; text-align: center;">
            <h2 style="color: #00ff66;">Segurança em primeiro lugar!</h2>
            <p>Seu código para logar no Monster Reviews é:</p>
            <h1 style="background-color: #222; padding: 15px; letter-spacing: 5px; color: #00ff66;">${codigoPin}</h1>
            <p style="color: #aaa; font-size: 12px;">Válido por 5 minutos.</p>
        </div>
      `,
    });
    
    // 1. Define a expiração (5 minutos)
    const expiracao = new Date(Date.now() + 5 * 60 * 1000);

    // 2. Salva o código NO BANCO DE DADOS
    usuarioEncontrado.codigo2FA = codigoPin;
    usuarioEncontrado.expiracao2FA = expiracao;
    await usuarioEncontrado.save();

    // 3. O JWT temporário agora só leva o ID. Seguro!
    const tokenTemporario = jwt.sign(
      { id: usuarioEncontrado._id },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return res.status(200).json({
      mensagem: "Código enviado para seu e-mail!",
      requer2FA: true, 
      tokenTemporario: tokenTemporario
    });

  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao tentar fazer login." });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { tokenTemporario, codigoDigitado, salvarDispositivo } = req.body;
    
    // 1. Pega só o ID do token
    const decoded = jwt.verify(tokenTemporario, process.env.JWT_SECRET);
    const usuarioFinal = await Usuario.findById(decoded.id);

    // 2. Valida contra o banco de dados
    if (!usuarioFinal.codigo2FA || usuarioFinal.codigo2FA !== codigoDigitado) {
      return res.status(400).json({ erro: "Código inválido ou incorreto." });
    }
    if (Date.now() > usuarioFinal.expiracao2FA) {
      return res.status(400).json({ erro: "Este código expirou." });
    }

    // 3. Limpa os códigos do 2FA do banco pra não serem reaproveitados
    usuarioFinal.codigo2FA = null;
    usuarioFinal.expiracao2FA = null;
    await usuarioFinal.save();
    const tokenReal = jwt.sign(
      { id: usuarioFinal._id, nome: usuarioFinal.nome, email: usuarioFinal.email, cargo: usuarioFinal.cargo },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("authToken", tokenReal, { httpOnly: true, secure: true, sameSite: "none", partitioned: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    // 🛡️ NOVIDADE: Se o usuário marcou a caixinha, gera o cookie VIP de 180 dias
    if (salvarDispositivo) {
      const trustedToken = jwt.sign({ id: usuarioFinal._id }, process.env.JWT_SECRET, { expiresIn: "180d" });
      res.cookie("trustedDevice", trustedToken, { httpOnly: true, secure: true, sameSite: "none", partitioned: true, maxAge: 180 * 24 * 60 * 60 * 1000 });
    }

    return res.status(200).json({
      mensagem: "Login realizado com sucesso!",
      login: usuarioFinal.nome,
      email: usuarioFinal.email,
      avatarUrl: usuarioFinal.avatarUrl,
    });

  } catch (erro) {
    return res.status(400).json({ erro: "Código expirado. Faça login novamente." });
  }
};

exports.logout = (req, res) => {
  res.cookie("authToken", "", { httpOnly: true, secure: true, sameSite: "none", partitioned: true, expires: new Date(0) });
  return res.status(200).json({ mensagem: "Deslogado com sucesso!" });
};

exports.me = async (req, res) => {
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
};

exports.esqueciSenha = async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(404).json({ erro: "Email não encontrado na nossa base." });

    // 1. Gera o código e o tempo de expiração (15 minutos a partir de agora)
    const codigoPin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracao = new Date(Date.now() + 15 * 60 * 1000);
  
    usuario.codigoRecuperacao = codigoPin;
    usuario.expiracaoCodigo = expiracao;
    await usuario.save();

    const tokenParaOFront = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

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
};

exports.resetarSenha = async (req, res) => {
  try {
    const { token, codigoDigitado, novaSenha } = req.body;
    
    // 1. Descobre quem é o usuário pelo token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    // 2. Verifica se o código bate com o que está SALVO NO BANCO e se não expirou
    if (!usuario.codigoRecuperacao || usuario.codigoRecuperacao !== codigoDigitado) {
      return res.status(400).json({ erro: "Código inválido." });
    }
    if (Date.now() > usuario.expiracaoCodigo) {
      return res.status(400).json({ erro: "Este código expirou." });
    }

    // 3. Código correto! Atualiza a senha.
    const salt = await bcrypt.genSalt(10);
    usuario.senha = await bcrypt.hash(novaSenha, salt);
    
    // 4. Limpa os códigos do banco para não serem reusados!
    usuario.codigoRecuperacao = null;
    usuario.expiracaoCodigo = null;
    await usuario.save();

    return res.status(200).json({ mensagem: "Senha atualizada com sucesso!" });
  } catch (erro) {
    return res.status(400).json({ erro: "Sessão inválida ou expirada." });
  }
};
