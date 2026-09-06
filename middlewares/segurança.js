const crypto = require("crypto");
const mongoSanitize = require("express-mongo-sanitize");

exports.antiNoSql = (req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  next();
};

exports.csrfProtection = (req, res, next) => {
  let csrfCookie = req.cookies._csrfSeguro;
  if (!csrfCookie) {
    csrfCookie = crypto.randomBytes(16).toString("hex");
    res.cookie("_csrfSeguro", csrfCookie, {
      httpOnly: true, secure: true, sameSite: "none", partitioned: true
    });
  }
  req.csrfToken = csrfCookie;

  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    const tokenNoHeader = req.headers["csrf-token"];
    if (!tokenNoHeader || tokenNoHeader !== csrfCookie) {
      console.log("🚫 Ataque CSRF Bloqueado!");
      return res.status(403).json({ erro: "Sessão inválida ou erro de segurança (CSRF)." });
    }
  }
  next();
};
