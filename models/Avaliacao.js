const mongoose = require("mongoose");

const AvaliacaoSchema = new mongoose.Schema({
  sujeito: { type: String, required: true },
  sabor: { type: String, required: true },
  valor: { type: Number, required: true },
  nota: { type: Number, required: true },
  valeu_a_pena: { type: Boolean, required: true },
  review: { type: String, required: false },
  foto_url: { type: String, required: true },
  likes: { type: [String], default: [] },
  musica_preview: { type: String, required: false, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Avaliacao", AvaliacaoSchema, "avaliacoes");
