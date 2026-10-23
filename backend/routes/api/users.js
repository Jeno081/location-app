const express = require("express");
const router = express.Router();
const userController = require("../../controllers/userController");
const passwordResetController = require("../../controllers/passwordResetController");
const upload = require("../../middleware/avatarUpload");
const { persistUploads } = require("../../services/fileStore");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.get("/profil", verifyToken, userController.getProfil);
router.put("/profil", verifyToken, userController.updateProfil);
router.post("/photo-profil", verifyToken, upload.single("photo"), persistUploads, userController.uploadPhotoProfil);
router.put("/changer-mot-de-passe", verifyToken, userController.changerMotDePasse);
router.put("/onboarding-vu", verifyToken, userController.marquerOnboardingVu);

router.get("/mes-locataires", verifyToken, requireRole("bailleur"), userController.getMesLocataires);
router.get("/demandes-reinitialisation", verifyToken, requireRole("bailleur"), passwordResetController.getDemandes);
router.post("/demandes-reinitialisation/:id/generer", verifyToken, requireRole("bailleur"), passwordResetController.genererPourDemande);
router.delete("/:id", verifyToken, requireRole("bailleur"), userController.deleteLocataire);

module.exports = router;