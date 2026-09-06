const jwt = require("jsonwebtoken");

// Só deixa passar quem tem o cookie de sessão válido
exports.verificarSessao = (req, res, next) => {
  const token = req.cookies.authToken;
  if (!token) return res.status(401).json({ erro: "Acesso negado. Faça login." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Pendura os dados do usuário na requisição!
    next();
  } catch (err) {
    return res.status(401).json({ erro: "Sessão inválida ou expirada." });
  }
};
