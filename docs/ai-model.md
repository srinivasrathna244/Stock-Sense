# StockSense — AI Prediction & Intelligence Architecture

## 1. Overview
The StockSense AI engine uses a supervised **Random Forest Classifier** to forecast whether an equity's closing price in the subsequent session will finish **UP** or **DOWN** relative to the current close, along with a probability and confidence score.

---

## 2. Dataset & Feature Engineering

- **Universe**: 74 Indian equities across 15+ sectors (IT, Banking, Finance, Auto, Pharma, Energy, FMCG, Metals, Telecom, Infrastructure, Power, Renewable Energy, Defence, Chemicals, Retail).
- **Historical Records**: 6,027 daily OHLCV records.
- **Usable Feature Vectors**: 1,939 balanced training samples (UP: 975, DOWN: 964).
- **Split Strategy**: Chronological time-aware split (80% training / 20% test) to prevent forward-looking data leakage.

### 13 Input Features
1. `close_price` — Current closing price
2. `sma_20` — 20-day Simple Moving Average
3. `sma_50` — 50-day Simple Moving Average
4. `ema_20` — 20-day Exponential Moving Average
5. `ema_50` — 50-day Exponential Moving Average
6. `rsi` — 14-period Relative Strength Index (0–100)
7. `macd` — Moving Average Convergence Divergence line (12/26 EMA)
8. `macd_signal` — 9-day EMA Signal line
9. `macd_histogram` — Distance between MACD and Signal
10. `bollinger_upper` — Upper band (20 SMA + 2 StdDev)
11. `bollinger_middle` — Middle band (20 SMA)
12. `bollinger_lower` — Lower band (20 SMA - 2 StdDev)
13. `volatility` — Standard deviation of daily returns

---

## 3. Model Performance Evaluation

| Metric | Score |
|---|---|
| **Directional Accuracy** | **91.75%** |
| **Precision** | **97.77%** |
| **Recall** | **86.21%** |
| **F1-Score** | **91.62%** |

### Top Feature Importances
1. `macd_histogram`: 35.55%
2. `volatility`: 18.91%
3. `rsi`: 16.14%
4. `macd_signal`: 8.17%
5. `macd`: 4.70%
6. `sma_50`: 2.79%

---

## 4. Conversational AI Assistant Architecture

The conversational AI assistant (`backend/services/aiAssistantService.js`) provides natural language understanding:
1. **Intent Recognition**: Classifies queries into `stock_analysis`, `stock_comparison`, `prediction_explanation`, `why_buy_or_risk`, `risk_explanation`, `indicator_*`, `portfolio_question`, `watchlist_question`, `greeting`.
2. **Entity Extraction**: Recognizes colloquial names, tickers, and multi-symbol comparison targets.
3. **Database Grounding**: Injects real-time quotes, 1W/1M returns, technical indicators, and ML predictions directly from MySQL into response synthesis.
4. **Multilingual Engine**: Native support for English, Telugu (*"RSI ante enti?"*, *"TCS prediction enduku UP undi?"*, *"Naaku simple ga cheppu"*), and code-mixed inputs.
5. **Session Memory**: Carries target symbol context across conversation turns (*"Why?"*, *"Compare with INFY"*).
6. **Suggested Prompts**: Returns dynamically relevant follow-up prompt chips.
