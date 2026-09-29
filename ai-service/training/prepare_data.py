import pandas as pd
from utils.db import get_db_connection


def load_training_data(stock_id=None):
    connection = get_db_connection()

    if stock_id:
        query = """
            SELECT
                sp.stock_id,
                sp.trading_date,
                sp.close_price,
                ti.sma_20,
                ti.sma_50,
                ti.ema_20,
                ti.ema_50,
                ti.rsi,
                ti.macd,
                ti.macd_signal,
                ti.macd_histogram,
                ti.bollinger_upper,
                ti.bollinger_middle,
                ti.bollinger_lower,
                ti.volatility
            FROM stock_prices sp
            INNER JOIN technical_indicators ti
                ON sp.stock_id = ti.stock_id
                AND sp.trading_date = ti.trading_date
            WHERE sp.stock_id = %s
            ORDER BY sp.trading_date ASC
        """
        params = (stock_id,)
    else:
        query = """
            SELECT
                sp.stock_id,
                sp.trading_date,
                sp.close_price,
                ti.sma_20,
                ti.sma_50,
                ti.ema_20,
                ti.ema_50,
                ti.rsi,
                ti.macd,
                ti.macd_signal,
                ti.macd_histogram,
                ti.bollinger_upper,
                ti.bollinger_middle,
                ti.bollinger_lower,
                ti.volatility
            FROM stock_prices sp
            INNER JOIN technical_indicators ti
                ON sp.stock_id = ti.stock_id
                AND sp.trading_date = ti.trading_date
            ORDER BY sp.stock_id ASC, sp.trading_date ASC
        """
        params = None

    df = pd.read_sql(
        query,
        connection,
        params=params
    )

    connection.close()
    return df


def create_features(df):
    if df.empty:
        return df

    df = df.copy()

    # Make sure prices are numeric
    df["close_price"] = pd.to_numeric(
        df["close_price"],
        errors="coerce"
    )

    # If dataset has multiple stocks, shift per stock_id
    if "stock_id" in df.columns:
        df["next_close"] = df.groupby("stock_id")["close_price"].shift(-1)
    else:
        df["next_close"] = df["close_price"].shift(-1)

    # 1 = next session price goes up; 0 = goes down or same
    df["target"] = (
        df["next_close"] > df["close_price"]
    ).astype(int)

    feature_columns = [
        "close_price",
        "sma_20",
        "sma_50",
        "ema_20",
        "ema_50",
        "rsi",
        "macd",
        "macd_signal",
        "macd_histogram",
        "bollinger_upper",
        "bollinger_middle",
        "bollinger_lower",
        "volatility"
    ]

    for col in feature_columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop missing indicators
    df = df.dropna(subset=feature_columns)

    # Drop rows without future price target
    df = df.dropna(subset=["next_close"])

    return df


if __name__ == "__main__":
    print("Loading StockSense training data for all stocks...")
    df = load_training_data()
    print(f"Total historical rows loaded: {len(df)}")

    if df.empty:
        print("No training data available in MySQL.")
    else:
        df_processed = create_features(df)
        print(f"Training records after feature engineering: {len(df_processed)}")
        print("\nColumns:", df_processed.columns.tolist())
        print("\nSample training data:")
        print(df_processed.tail())