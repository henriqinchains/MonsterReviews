const rateLimit = require('express-rate-limit');

// A regra para os comentários (5 por minuto)
const commentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5,
  message: { 
    erro: "Calma aí, monstro! Você está comentando rápido demais. Tente novamente em 1 minuto." 
  }
});

// Não esquece de exportar para poder usar em outros lugares!
module.exports = {
  commentLimiter
};
