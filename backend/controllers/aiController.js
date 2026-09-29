const axios = require("axios");
const aiAssistantService = require("../services/aiAssistantService");
const db = require("../config/database");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Direct stock prediction from Python ML service
 */
const getStockPrediction = async (req, res) => {
    try {
        const { stockId } = req.params;

        if (!stockId) {
            return res.status(400).json({
                success: false,
                message: "Stock ID is required"
            });
        }

        const response = await axios.post(
            `${AI_SERVICE_URL}/predict`,
            {
                stock_id: Number(stockId)
            },
            {
                timeout: 10000
            }
        );

        return res.status(200).json({
            success: true,
            data: response.data.prediction
        });

    } catch (error) {
        console.error("AI prediction error:", error.message);

        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data?.message || "AI service error"
            });
        }

        return res.status(503).json({
            success: false,
            message: "AI service is unavailable"
        });
    }
};

/**
 * AI Assistant Chat Endpoint
 */
const chat = async (req, res) => {
    try {
        const { message, symbol, conversationHistory } = req.body;

        if (!message || message.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        const aiResponse = await aiAssistantService.generateResponse(message, symbol, conversationHistory || []);

        return res.status(200).json({
            success: true,
            ...aiResponse,
            timestamp: new Date()
        });

    } catch (error) {
        console.error("AI Assistant Chat error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to process AI assistant request"
        });
    }
};

module.exports = {
    getStockPrediction,
    chat
};