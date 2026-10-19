const express = require("express");
const router = express.Router();
const userController = require("../../controllers/userController");
const upload = require("../../middleware/avatarUpload");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.get("/profil", verifyToken, userController.getProfil);
router.put("/profil", verifyToken, userController.updateProfil);
router.post("/photo-profil", verifyToken, upload.single("photo"), userController.uploadPhotoProfil);
router.put("/changer-mot-de-passe", verifyToken, userController.changerMotDePasse);
router.put("/onboarding-vu", verifyToken, userController.marquerOnboardingVu);

router.get("/mes-locataires", verifyToken, requireRole("bailleur"), userController.getMesLocataires);
router.delete("/:id", verifyToken, requireRole("bailleur"), userController.deleteLocataire);

module.exports = router;