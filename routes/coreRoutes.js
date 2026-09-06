const express = require("express");
const router = express.Router();
const coreController = require("../controllers/coreController");
const { upload } = require("../middlewares/upload");

// Avaliações
router.get("/avaliacoes", coreController.getAvaliacoes);
router.post("/avaliacoes", upload.single("foto"), coreController.postAvaliacao);
router.delete("/avaliacoes/:id", coreController.deleteAvaliacao);
router.post("/avaliacoes/:id/curtidas", coreController.curtirAvaliacao);

// Comentários
router.get("/avaliacoes/:id/comentarios", coreController.getComentarios);
router.post("/avaliacoes/:id/comentarios", coreController.postComentario);
router.delete("/comentarios/:id", coreController.deleteComentario);
router.post("/comentarios/:id/curtidas", coreController.curtirComentario);

// Stats & Users
router.get("/ranking", coreController.getRanking);
router.get("/estatisticas", coreController.getEstatisticas);
router.post("/usuarios/avatar", upload.single("fotoPerfil"), coreController.atualizarAvatar);

module.exports = router;
