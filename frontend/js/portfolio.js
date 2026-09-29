// ============================================================
// StockSense — Portfolio Page Logic
// ============================================================

let currentStockList = [];

async function loadPortfolioData() {
    if (!requireAuth()) return;

    try {
        const data = await getPortfolio();

        if (!data.success) {
            throw new Error(data.message || "Failed to load portfolio");
        }

        const portfolio = data.portfolio;
        const summary = portfolio.summary || {};

        // 1. Update Metrics
        document.getElementById("totalInvested").textContent =
            `₹${Number(summary.totalInvested || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

        document.getElementById("currentValue").textContent =
            `₹${Number(summary.currentValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

        const pnl = Number(summary.totalProfitLoss || 0);
        const pnlEl = document.getElementById("totalProfitLoss");
        pnlEl.textContent = `${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        pnlEl.className = `summary-value ${pnl >= 0 ? 'text-positive' : 'text-negative'}`;

        const ret = Number(summary.totalReturnPercent || 0);
        const retEl = document.getElementById("totalReturn");
        retEl.textContent = `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`;
        retEl.className = `summary-value ${ret >= 0 ? 'text-positive' : 'text-negative'}`;

        // 2. Render Holdings
        renderHoldings(portfolio.holdings || []);

    } catch (err) {
        console.error("Portfolio load error:", err);
        document.getElementById("holdingsContent").innerHTML = `
            <p style="color: var(--danger);">Unable to load portfolio: ${err.message}</p>
        `;
    }
}

function renderHoldings(holdings) {
    const container = document.getElementById("holdingsContent");

    if (holdings.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <h3>No active stock holdings</h3>
                <p style="color: var(--text-muted); margin-bottom: 16px;">Record your first simulated Buy trade to start tracking your virtual investments.</p>
                <button class="btn btn-primary" onclick="openTransactionModal()">+ Add Your First Trade</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Stock</th>
                        <th>Shares</th>
                        <th>Avg. Buy Price</th>
                        <th>Current Price</th>
                        <th>Invested</th>
                        <th>Current Value</th>
                        <th>Unrealized P&L</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${holdings.map(h => {
                        const isPositive = h.profitLoss >= 0;
                        return `
                            <tr>
                                <td>
                                    <strong>${h.symbol}</strong><br>
                                    <span style="font-size: 12px; color: var(--text-muted);">${h.companyName}</span>
                                </td>
                                <td><strong>${h.quantity}</strong></td>
                                <td>₹${Number(h.avgBuyPrice).toFixed(2)}</td>
                                <td>₹${Number(h.currentPrice).toFixed(2)}</td>
                                <td>₹${Number(h.investedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td><strong>₹${Number(h.currentValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                                <td class="${isPositive ? 'text-positive' : 'text-negative'}">
                                    <strong>${isPositive ? '+' : ''}₹${Number(h.profitLoss).toFixed(2)}</strong><br>
                                    <span style="font-size: 12px;">(${isPositive ? '+' : ''}${h.profitLossPercent}%)</span>
                                </td>
                                <td>
                                    <a href="stock.html?symbol=${encodeURIComponent(h.symbol)}" class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;">
                                        Analysis
                                    </a>
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

async function loadTransactionsData() {
    try {
        const container = document.getElementById("transactionsContent");
        container.innerHTML = "<p>Loading trade history...</p>";

        const data = await getPortfolioTransactions();

        if (!data.success || !data.transactions || data.transactions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <p style="color: var(--text-muted);">No transaction records found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Stock</th>
                            <th>Quantity</th>
                            <th>Price / Share</th>
                            <th>Total Amount</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.transactions.map(t => `
                            <tr>
                                <td>${new Date(t.transactionDate).toLocaleDateString()}</td>
                                <td>
                                    <span class="badge ${t.transactionType === 'BUY' ? 'badge-up' : 'badge-down'}">
                                        ${t.transactionType}
                                    </span>
                                </td>
                                <td><strong>${t.symbol}</strong> (${t.companyName})</td>
                                <td>${t.quantity}</td>
                                <td>₹${Number(t.pricePerShare).toFixed(2)}</td>
                                <td><strong>₹${Number(t.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                                <td>
                                    <button class="btn btn-outline" onclick="handleDeleteTransaction(${t.id})" style="padding: 4px 10px; font-size: 12px; color: var(--danger); border-color: #fca5a5;" title="Delete">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        console.error("Transactions load error:", err);
        document.getElementById("transactionsContent").innerHTML = `
            <p style="color: var(--danger);">Unable to load transactions: ${err.message}</p>
        `;
    }
}

async function handleDeleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction record?")) return;

    try {
        const res = await deletePortfolioTransaction(id);
        if (res.success) {
            showToast("Transaction deleted successfully", "info");
            loadPortfolioData();
            loadTransactionsData();
        }
    } catch (err) {
        showToast(err.message || "Failed to delete transaction", "error");
    }
}

function switchPortfolioTab(tab) {
    const holdingsBtn = document.getElementById("tabHoldingsBtn");
    const txBtn = document.getElementById("tabTransactionsBtn");
    const holdingsSec = document.getElementById("holdingsSection");
    const txSec = document.getElementById("transactionsSection");

    if (tab === "holdings") {
        holdingsBtn.classList.add("active");
        txBtn.classList.remove("active");
        holdingsSec.style.display = "block";
        txSec.style.display = "none";
        loadPortfolioData();
    } else {
        txBtn.classList.add("active");
        holdingsBtn.classList.remove("active");
        txSec.style.display = "block";
        holdingsSec.style.display = "none";
        loadTransactionsData();
    }
}

// Modal handling
async function openTransactionModal(preselectedSymbol = null, defaultType = "BUY") {
    const modal = document.getElementById("transactionModal");
    const select = document.getElementById("tradeSymbol");
    const typeSelect = document.getElementById("tradeType");
    const dateInput = document.getElementById("tradeDate");

    if (dateInput) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
    if (typeSelect) {
        typeSelect.value = defaultType;
    }

    if (currentStockList.length === 0) {
        try {
            const data = await getAllStocks();
            if (data.success && data.stocks) {
                currentStockList = data.stocks;
            }
        } catch (e) {
            console.warn("Stock options load error:", e);
        }
    }

    select.innerHTML = `<option value="">Select a stock...</option>` +
        currentStockList.map(s => `
            <option value="${s.symbol}" ${preselectedSymbol === s.symbol ? 'selected' : ''}>
                ${s.symbol} — ${s.company_name}
            </option>
        `).join("");

    if (preselectedSymbol) {
        updatePriceForSelectedStock(preselectedSymbol);
    }

    modal.style.display = "flex";
}

function closeTransactionModal() {
    document.getElementById("transactionModal").style.display = "none";
    document.getElementById("transactionForm").reset();
}

async function updatePriceForSelectedStock(symbol) {
    if (!symbol) return;
    try {
        const details = await getStockDetails(symbol);
        const price = details.market?.price || details.stock?.market?.price || details.price;
        if (price) {
            document.getElementById("tradePrice").value = Number(price).toFixed(2);
        }
    } catch (err) {
        console.warn("Could not prefill price:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadPortfolioData();

    // Auto fill price on stock change
    const select = document.getElementById("tradeSymbol");
    if (select) {
        select.addEventListener("change", (e) => {
            updatePriceForSelectedStock(e.target.value);
        });
    }

    // Handle Form Submit
    const form = document.getElementById("transactionForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const symbol = document.getElementById("tradeSymbol").value;
            const transaction_type = document.getElementById("tradeType").value;
            const quantity = Number(document.getElementById("tradeQuantity").value);
            const price_per_share = Number(document.getElementById("tradePrice").value);
            const transaction_date = document.getElementById("tradeDate").value;
            const submitBtn = document.getElementById("btnSubmitTrade");

            try {
                if (submitBtn) submitBtn.disabled = true;
                if (submitBtn) submitBtn.textContent = "Recording...";

                const res = await addPortfolioTransaction({
                    symbol,
                    transaction_type,
                    quantity,
                    price_per_share,
                    transaction_date
                });

                if (res.success) {
                    showToast(res.message || "Transaction recorded successfully", "success");
                    closeTransactionModal();
                    loadPortfolioData();
                    if (document.getElementById("transactionsSection").style.display === "block") {
                        loadTransactionsData();
                    }
                }
            } catch (err) {
                console.error("Trade recording error:", err);
                showToast(err.message || "Unable to record transaction", "error");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (submitBtn) submitBtn.textContent = "Record Transaction";
            }
        });
    }
});
