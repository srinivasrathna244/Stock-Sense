// ============================================================
// StockSense — Conversational AI Assistant Logic
// ============================================================

const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const typingIndicator = document.getElementById("typingIndicator");
const btnSendChat = document.getElementById("btnSendChat");
const clearChatBtn = document.getElementById("clearChatBtn");

// Maintain conversation memory in session
let conversationHistory = [];
let currentActiveSymbol = null;

// Markdown & Table Parser
function formatMarkdown(text) {
    if (!text) return "";
    let html = text;

    // Headers
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");

    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Markdown Tables
    const tableRegex = /\|(.+)\|\n\|[-|\s]+\|\n((?:\|.+\|\n?)+)/g;
    html = html.replace(tableRegex, (match, headerLine, bodyLines) => {
        const headers = headerLine.split("|").map(h => h.trim()).filter(Boolean);
        const headerHtml = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;

        const rows = bodyLines.trim().split("\n").map(row => {
            const cells = row.split("|").map(c => c.trim()).filter(Boolean);
            return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
        }).join("");

        return `<table><thead>${headerHtml}</thead><tbody>${rows}</tbody></table>`;
    });

    // Bullet points
    html = html.replace(/^\* (.*$)/gim, "<li>$1</li>");
    html = html.replace(/((?:<li>.*?<\/li>\s*)+)/gs, "<ul>$1</ul>");

    // Line breaks
    html = html.replace(/\n\n/g, "<p></p>");

    return html;
}

function appendUserMessage(text) {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble message-user";
    bubble.innerHTML = `
        <div>${escapeHtml(text)}</div>
        <div class="message-time" style="color: rgba(255,255,255,0.8);">You • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    chatMessages.insertBefore(bubble, typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendAiMessage(data) {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble message-ai";

    const formattedContent = formatMarkdown(data.reply);
    const disclaimerHtml = data.disclaimer ? `
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-color); font-size: 11px; color: var(--text-muted);">
            ⚠️ <em>${data.disclaimer}</em>
        </div>
    ` : '';

    // Dynamic suggested prompt chips
    let chipsHtml = "";
    if (data.suggestedPrompts && data.suggestedPrompts.length > 0) {
        chipsHtml = `
            <div class="prompt-chips-container">
                ${data.suggestedPrompts.map(p => `<button class="prompt-chip" onclick="sendQuickPrompt('${escapeHtml(p)}')">${escapeHtml(p)}</button>`).join("")}
            </div>
        `;
    }

    bubble.innerHTML = `
        <div>${formattedContent}</div>
        ${chipsHtml}
        ${disclaimerHtml}
        <div class="message-time">StockSense AI • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    chatMessages.insertBefore(bubble, typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function handleSendMessage(messageText) {
    const text = messageText || (chatInput ? chatInput.value.trim() : "");
    if (!text) return;

    appendUserMessage(text);
    if (chatInput) chatInput.value = "";

    // Track user message in conversation history
    conversationHistory.push({ role: "user", content: text });

    try {
        typingIndicator.style.display = "block";
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (btnSendChat) btnSendChat.disabled = true;

        const response = await sendChatMessage(text, currentActiveSymbol, conversationHistory);

        typingIndicator.style.display = "none";
        appendAiMessage(response);

        // Update active symbol if recognized
        if (response.symbol) {
            currentActiveSymbol = response.symbol;
        }

        // Add to history
        conversationHistory.push({
            role: "assistant",
            content: response.reply,
            symbol: response.symbol || (response.symbols ? response.symbols[0] : null)
        });

    } catch (err) {
        typingIndicator.style.display = "none";
        appendAiMessage({
            reply: `I encountered an issue analyzing your query: ${err.message}. Please ensure the backend and AI services are running.`,
            disclaimer: "StockSense provides educational market analysis and AI-generated predictions."
        });
    } finally {
        if (btnSendChat) btnSendChat.disabled = false;
        if (chatInput) chatInput.focus();
    }
}

function sendQuickPrompt(prompt) {
    handleSendMessage(prompt);
}

if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
        conversationHistory = [];
        currentActiveSymbol = null;
        chatMessages.innerHTML = `
            <div class="message-bubble message-ai">
                <h3>Session Cleared 🧹</h3>
                <p>How can I assist you with your market analysis?</p>
                <div class="message-time">StockSense AI</div>
            </div>
            <div class="typing-indicator" id="typingIndicator">
                AI is analyzing stock data & generating response...
            </div>
        `;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get("q");
    const compareParam = urlParams.get("compare");

    if (compareParam) {
        const symbols = compareParam.split(",");
        setTimeout(() => {
            handleSendMessage(`Compare ${symbols.join(" and ")}`);
        }, 300);
    } else if (initialQuery) {
        setTimeout(() => {
            handleSendMessage(initialQuery);
        }, 300);
    }

    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleSendMessage();
        });
    }
});
