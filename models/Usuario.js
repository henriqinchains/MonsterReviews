const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true },
  cargo: { type: String, enum: ["user", "admin"], default: "user" },
  codigoRecuperacao: { type: String, default: null },
  expiracaoCodigo: { type: Date, default: null },
  avatarUrl: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Usuario", UsuarioSchema, "usuarios");
