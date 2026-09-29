const express = require("express");

const {
    register,
    login,
    getProfile
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const { validateRegister, validateLogin } = require("../validators/authValidator");

const router = express.Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.get("/profile", protect, getProfile);
router.get("/me", protect, getProfile);

module.exports = router;