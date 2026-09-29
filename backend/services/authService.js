const bcrypt = require("bcrypt");
const db = require("../config/database");

const registerUser = async (userData) => {
    const {
        first_name,
        last_name,
        email,
        phone,
        password
    } = userData;

    // Check whether email already exists
    const [existingUsers] = await db.query(
        "SELECT id FROM users WHERE email = ?",
        [email]
    );

    if (existingUsers.length > 0) {
        throw new Error("Email already registered");
    }

    // If phone is provided, check if phone already exists
    if (phone && phone.trim() !== "") {
        const [existingPhones] = await db.query(
            "SELECT id FROM users WHERE phone = ?",
            [phone.trim()]
        );
        if (existingPhones.length > 0) {
            throw new Error("Phone number already registered");
        }
    }

    // Hash password with bcrypt
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user
    const [result] = await db.query(
        `INSERT INTO users
        (first_name, last_name, email, phone, password_hash)
        VALUES (?, ?, ?, ?, ?)`,
        [
            first_name,
            last_name || null,
            email,
            phone ? phone.trim() : null,
            password_hash
        ]
    );

    return {
        id: result.insertId,
        first_name,
        last_name: last_name || null,
        email,
        phone: phone ? phone.trim() : null,
        role: "user"
    };
};

const loginUser = async (email, password) => {
    // Find user by email
    const [users] = await db.query(
        `SELECT id, first_name, last_name, email, phone, password_hash, role
         FROM users
         WHERE email = ?`,
        [email]
    );

    if (users.length === 0) {
        throw new Error("Invalid email or password");
    }

    const user = users[0];

    // Compare entered password with hashed password
    const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatch) {
        throw new Error("Invalid email or password");
    }

    return user;
};

const getUserProfile = async (userId) => {
    const [users] = await db.query(
        `SELECT id, first_name, last_name, email, phone, role, created_at
         FROM users
         WHERE id = ?`,
        [userId]
    );

    if (users.length === 0) {
        throw new Error("User not found");
    }

    return users[0];
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};