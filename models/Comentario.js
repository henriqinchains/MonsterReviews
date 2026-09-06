const mongoose = require("mongoose");

const ComentarioSchema = new mongoose.Schema({
  avaliacaoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Avaliacao', required: true },
  sujeito: { type: String, required: true },
  texto: { type: String, required: true },
  likes: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Comentario", ComentarioSchema, "comentarios");
