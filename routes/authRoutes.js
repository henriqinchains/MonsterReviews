const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/cadastro", authController.cadastro);
router.post("/login", authController.login);
router.post("/verify-2fa", authController.verify2FA);
router.post("/logout", authController.logout);
router.get("/me", authController.me);
router.post("/esqueci-senha", authController.esqueciSenha);
router.post("/resetar-senha", authController.resetarSenha);

module.exports = router;
