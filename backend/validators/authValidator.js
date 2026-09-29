const { body, validationResult } = require("express-validator");

const validateRegister = [
    body("first_name")
        .trim()
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("First name must be between 2 and 100 characters"),
    body("last_name")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage("Last name must not exceed 100 characters"),
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),
    body("phone")
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone("any")
        .withMessage("Please provide a valid phone number"),
    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array()
            });
        }
        next();
    }
];

const validateLogin = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),
    body("password")
        .notEmpty()
        .withMessage("Password is required"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateRegister,
    validateLogin
};
