const rateLimit = require('express-rate-limit');

const commentLimiter = rateLimit({
  windowMs: 3 * 1000, // 3 seg
  max: 1,
  message: { 
    erro: "Calma aí, monstro! Você está comentando rápido demais. Tente novamente em 1 minuto." 
  }
});

const reviewLimiter = rateLimit({
  windowMs: 20 * 1000, // 20 seg
  max: 1,
  message: { 
    erro: "Você está postando avaliações rápido demais. Dê um tempo, monstro!" 
  }
});

// Exporte os dois
module.exports = {
  commentLimiter,
  reviewLimiter
};
