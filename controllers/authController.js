const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Usuario = require("../models/Usuario");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.cadastro = async (req, res) => {
  // ... (Cole todo o miolo do seu antigo app.post("/api/auth/cadastro") aqui) ...
};

exports.login = async (req, res) => {
  // ... (Cole todo o miolo do seu antigo app.post("/api/auth/login") aqui) ...
};

exports.verify2FA = async (req, res) => {
  // ... (Cole todo o miolo do seu antigo app.post("/api/auth/verify-2fa") aqui) ...
};

exports.logout = (req, res) => {
  res.cookie("authToken", "", { httpOnly: true, secure: true, sameSite: "none", partitioned: true, expires: new Date(0) });
  return res.status(200).json({ mensagem: "Deslogado com sucesso!" });
};

exports.me = async (req, res) => {
  // ... (Cole todo o miolo do seu antigo app.get("/api/auth/me") aqui) ...
};

exports.esqueciSenha = async (req, res) => {
  // ... (Cole todo o miolo do seu antigo app.post("/api/esqueci-senha") aqui) ...
};

exports.resetarSenha = async (req, res) => {
  // ... (Cole todo o miolo do seu antigo app.post("/api/resetar-senha") aqui) ...
};
