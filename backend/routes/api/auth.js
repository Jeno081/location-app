const express = require("express");
const router = express.Router();
const authController = require("../../controllers/authController");
const { verifyToken } = require("../../middleware/authMiddleware");

router.get("/bailleur-existe", authController.bailleurExiste);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", verifyToken, authController.logout);
router.get("/me", verifyToken, authController.me);

module.exports = router;