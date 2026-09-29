# StockSense — System Architecture

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client ["Frontend Client (HTML5 / ES6 JS)"]
        UI_Router["Root Router (index.html)"]
        UI_Dashboard["Market Dashboard (dashboard.html)"]
        UI_Stock["Stock Details & Analysis (stock.html)"]
        UI_Chat["Conversational AI (ai-chat.html)"]
        UI_Portfolio["Virtual Portfolio (portfolio.html)"]
        UI_Watchlist["Watchlist (watchlist.html)"]
        UI_Auth["Auth Pages (login / register)"]
    end

    subgraph Backend ["Node.js Express Server (Port 5000)"]
        MW_Auth["JWT Middleware & BFCache Protection"]
        Ctrl_Stock["Stock Controller (Search, Discovery, Compare)"]
        Ctrl_AI["AI Controller & Assistant Service"]
        Ctrl_Port["Portfolio Controller (P&L Engine)"]
        Ctrl_Watch["Watchlist Controller"]
        Svc_Mkt["Market Data Service (Cache-First)"]
        Svc_Tech["Technical Analysis Service (13 Indicators)"]
    end

    subgraph AIService ["Python Flask ML Service (Port 8000)"]
        Predictor["Inference Engine (predictor.py)"]
        RF_Model["Random Forest Classifier (91.75% Accuracy)"]
        Trainer["Training Pipeline (train_model.py)"]
    end

    subgraph Database ["MySQL 8.0 Database (Port 3306)"]
        DB_Stocks["stocks (74 Equities)"]
        DB_Prices["stock_prices (6,027 Records)"]
        DB_Inds["technical_indicators (6,027 Computed Rows)"]
        DB_Preds["predictions"]
        DB_Users["users"]
        DB_Port["portfolios & transactions"]
        DB_Watch["watchlists"]
        DB_Sync["stock_data_sync_status"]
    end

    UI_Router --> UI_Auth
    UI_Router --> UI_Dashboard
    UI_Dashboard --> Ctrl_Stock
    UI_Stock --> Ctrl_Stock
    UI_Chat --> Ctrl_AI
    UI_Portfolio --> Ctrl_Port
    UI_Watchlist --> Ctrl_Watch

    Ctrl_Stock --> Svc_Mkt
    Ctrl_Stock --> Svc_Tech
    Ctrl_AI --> AIService
    Ctrl_AI --> DB_Stocks
    Ctrl_AI --> DB_Prices
    Ctrl_AI --> DB_Inds

    Svc_Mkt --> DB_Prices
    Svc_Tech --> DB_Inds
    AIService --> RF_Model
    AIService --> DB_Inds
    AIService --> DB_Preds
```

---

## Component Responsibilities

1. **Root Router & Auth**: Instant client-side redirect between unauthenticated login vs authenticated dashboard without exposing dashboard data.
2. **Catalog & Discovery**: High-performance multi-sector indexing, sector aggregations, real-time gainers/losers/volume calculations, and side-by-side comparative analytics.
3. **Indicator Engine**: Computes 13 technical indicators across rolling windows and persists them into MySQL.
4. **Random Forest Service**: Multi-stock ML classifier with 91.75% directional accuracy, outputting confidence scores and target prices.
5. **Conversational Assistant**: Context-aware natural language processor resolving user intents, executing multi-entity queries, supporting fluent Telugu and English, and maintaining conversation memory with dynamic suggested prompts.
