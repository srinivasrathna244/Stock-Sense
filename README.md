# StockSense — AI-Powered Stock Market Analysis Platform

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-v3.14.x-blue.svg)](https://www.python.org/)
[![MySQL](https://img.shields.io/badge/MySQL-v8.0-orange.svg)](https://www.mysql.com/)
[![Express](https://img.shields.io/badge/Express-v5.x-black.svg)](https://expressjs.com/)
[![Accuracy](https://img.shields.io/badge/AI%20Model%20Accuracy-91.75%25-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)]()

**StockSense** is an enterprise-grade, full-stack stock analysis and machine-learning intelligence platform. It combines real-time technical indicators, supervised Random Forest directional forecasting, multi-period financial charting, virtual portfolio simulation, and an intelligent conversational, multilingual AI market assistant.

---

## 🌟 Key Features

- **🔐 Robust Authentication & Entry Flow**: Immediate client-side routing on root `/`: unauthenticated visitors see Login/Register; authenticated users with valid JWT are routed to `dashboard.html`. Protected pages (`dashboard.html`, `stock.html`, `watchlist.html`, `portfolio.html`, `ai-chat.html`) enforce `requireAuth()` and BFCache back-button protection.
- **📈 Expanded 74+ Stock Universe**: Diverse Indian equities across 15+ sectors (IT, Banking, Finance, Auto, Pharma, Energy, FMCG, Metals, Telecom, Infrastructure, Power, Renewable Energy, Defence, Chemicals, Retail) and market caps (Large Cap, Mid Cap, Small Cap).
- **🔍 Intelligent Search & Discovery**: Real-time debounce search by symbol, company name, sector, and industry, with sector tabs, market cap pills, Top Gainers, Top Losers, and Most Active carousels.
- **📊 13 Technical Indicators**: SMA 20/50/200, EMA 20/50, RSI (14), MACD, MACD Signal & Histogram, Bollinger Bands, and Rolling Volatility computed from verified MySQL historical records.
- **🤖 High-Accuracy Random Forest AI (91.75% Directional Accuracy)**: Supervised multi-stock ML model trained on 1,939 feature vectors forecasting next-session directional movement (`UP`/`DOWN`), confidence score, and expected price target.
- **⚖️ Side-by-Side Stock Comparison**: Compare 2 or more stocks across prices, 1-month returns, RSI, MACD, and AI predictions (e.g. `TCS.BSE` vs `INFY.BSE`).
- **💬 Conversational Multilingual AI Assistant**:
  - **Natural Language Intent Recognition**: Understands complex queries ("What is happening with TCS?", "Why is Reliance predicted UP?", "What are the risks?").
  - **Multilingual Support**: Fluent English, Telugu (*"RSI ante enti?"*, *"TCS prediction enduku UP undi?"*, *"Naaku ee stock gurinchi simple ga cheppu"*), and code-mixed inputs.
  - **Session Memory & Context**: Understands follow-up questions (*"Why?"*, *"Compare with INFY"*, *"Explain its RSI"*).
  - **Dynamic Suggested Prompt Chips**: Relevant one-click follow-up questions tailored to every response.
- **📉 Interactive Multi-Period Financial Charts**: Responsive 1W, 1M, 3M, 6M, and 1Y charts powered by Chart.js.
- **⭐ Watchlist & 💼 Virtual Portfolio Tracker**: Real-time P&L tracking, cash outlay, return percentage, and simulated trade execution.
- **🛡️ Financial Safety & Guardrails**: Transparent disclaimers attached to all predictions and AI analyses clarifying outputs are probabilistic and not guaranteed financial advice.

---

## 🏗️ System Architecture

```
D:\StockSense
├── start.bat               # One-click startup script for Windows
├── ai-service/             # Python Flask ML Service (Port 8000)
│   ├── models/             # Trained joblib model (stocksense_random_forest.joblib)
│   ├── predictions/        # Multi-stock inference and persistence
│   ├── training/           # Feature preparation (prepare_data.py) & model trainer (train_model.py)
│   ├── utils/              # MySQL database connector
│   └── app.py              # Flask server entrypoint
├── backend/                # Node.js Express REST API (Port 5000)
│   ├── config/             # MySQL connection pool
│   ├── controllers/        # Controllers (auth, stock, watchlist, portfolio, market, news, ai)
│   ├── middleware/         # JWT Bearer token protection middleware
│   ├── routes/             # REST endpoints (/api/stocks, /api/auth, /api/ai, etc.)
│   ├── services/           # Market data cache fallback, technical indicators, AI assistant
│   ├── validators/         # Request validation rules
│   ├── test_expansion_suite.js  # 19 automated expansion & AI tests
│   ├── test_auth_flow.js        # 15 automated auth & routing tests
│   ├── test_suite.js            # 18 automated backend & indicators tests
│   └── server.js           # Main Express server
├── database/               # Database initialization & migrations
│   ├── schema.sql          # 12-table DDL schema
│   └── seed.sql            # Seed stocks & market indices
└── frontend/               # Modern Dashboard UI (Vanilla HTML5/CSS3/ES6 JS)
    ├── css/                # style.css, dashboard.css, login.css, stock.css
    ├── js/                 # api.js, auth.js, dashboard.js, stock.js, portfolio.js, watchlist.js, ai-chat.js
    ├── index.html          # Root client-side router (redirects to login or dashboard)
    ├── dashboard.html      # Market dashboard & stock discovery
    ├── stock.html          # Stock details, 13 indicators, AI prediction & trade modal
    ├── watchlist.html      # User watchlist
    ├── portfolio.html      # Virtual portfolio & trade execution
    ├── ai-chat.html        # Conversational AI assistant with memory & chips
    ├── login.html          # Sign In page
    └── register.html       # Sign Up page
```

---

## 🚀 Quick Start Guide

### 1. Manual Startup

**Terminal 1 — Backend:**
```bash
cd d:\StockSense\backend
npm start
# Server running at http://localhost:5000
```

**Terminal 2 — Python AI Service:**
```bash
cd d:\StockSense\ai-service
.\venv\Scripts\activate
python app.py
# AI service running at http://localhost:8000
```

---

## 🧪 Automated Testing

StockSense includes 52 automated tests covering all modules:

```bash
cd d:\StockSense\backend

# Run expansion, search, discovery, comparison & multilingual AI tests (19 tests)
node test_expansion_suite.js

# Run authentication & root entry routing tests (15 tests)
node test_auth_flow.js

# Run full backend indicators & quote tests (18 tests)
node test_suite.js
```

**Result: 52/52 Tests Passing (100%)**

---

## 📚 REST API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Login and obtain JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Bearer |
| `GET` | `/api/stocks` | Search, filter by sector/cap, sort, paginated stocks | Public |
| `GET` | `/api/stocks/sectors` | List distinct sectors with stock count | Public |
| `GET` | `/api/stocks/discovery` | Top gainers, top losers, most active equities | Public |
| `GET` | `/api/stocks/compare?symbols=A,B` | Side-by-side multi-stock comparison | Public |
| `GET` | `/api/stocks/:symbol/analysis` | Full stock profile, indicators & AI prediction | Public |
| `GET` | `/api/stocks/:symbol/history?period=1M` | OHLCV historical prices | Public |
| `GET` | `/api/stocks/:symbol/prediction` | AI Random Forest directional prediction | Public |
| `GET` | `/api/watchlist` | Get user's saved watchlist | Bearer |
| `POST` | `/api/watchlist` | Add stock to watchlist | Bearer |
| `DELETE` | `/api/watchlist/:symbol` | Remove stock from watchlist | Bearer |
| `GET` | `/api/portfolio` | Get virtual portfolio valuation & holdings | Bearer |
| `POST` | `/api/portfolio/transaction` | Record simulated BUY/SELL trade | Bearer |
| `POST` | `/api/ai/chat` | Conversational multilingual AI assistant with memory | Public/Bearer |
| `GET` | `/api/market/indices` | SENSEX & NIFTY 50 index prices | Public |

---

## ⚠️ Financial Safety & Disclaimer

StockSense is an educational and technical analysis tool. Predictions generated by the Random Forest model are probabilistic statistical classifications and **not guaranteed financial advice**. Always conduct independent research before making real-world financial investments.
