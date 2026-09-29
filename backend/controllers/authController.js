const authService = require("../services/authService");
const generateToken = require("../utils/generateToken");

const register = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.message === "Email already registered" || error.message === "Phone number already registered") {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || "Registration failed"
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await authService.loginUser(email, password);
        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        if (error.message === "Invalid email or password") {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || "Login failed"
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.id);

        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error("Get profile error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch user profile"
        });
    }
};

module.exports = {
    register,
    login,
    getProfile
};