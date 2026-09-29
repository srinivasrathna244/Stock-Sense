import pandas as pd
import numpy as np
from utils.db import get_db_connection


STOCK_ID = 1


def load_prices(stock_id):

    connection = get_db_connection()

    query = """
        SELECT
            trading_date,
            open_price,
            high_price,
            low_price,
            close_price,
            volume
        FROM stock_prices
        WHERE stock_id = %s
        ORDER BY trading_date ASC
    """

    df = pd.read_sql(
        query,
        connection,
        params=(stock_id,)
    )

    connection.close()

    return df


def calculate_indicators(df):

    df = df.copy()

    # Convert price columns to numeric
    price_columns = [
        "open_price",
        "high_price",
        "low_price",
        "close_price",
        "volume"
    ]

    for column in price_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    close = df["close_price"]

    # -----------------------------
    # SMA
    # -----------------------------

    df["sma_20"] = close.rolling(
        window=20,
        min_periods=20
    ).mean()

    df["sma_50"] = close.rolling(
        window=50,
        min_periods=50
    ).mean()

    df["sma_200"] = close.rolling(
        window=200,
        min_periods=200
    ).mean()

    # -----------------------------
    # EMA
    # -----------------------------

    df["ema_20"] = close.ewm(
        span=20,
        adjust=False
    ).mean()

    df["ema_50"] = close.ewm(
        span=50,
        adjust=False
    ).mean()

    # -----------------------------
    # RSI
    # -----------------------------

    delta = close.diff()

    gain = delta.clip(
        lower=0
    )

    loss = -delta.clip(
        upper=0
    )

    avg_gain = gain.rolling(
        window=14,
        min_periods=14
    ).mean()

    avg_loss = loss.rolling(
        window=14,
        min_periods=14
    ).mean()

    rs = avg_gain / avg_loss.replace(
        0,
        np.nan
    )

    df["rsi"] = 100 - (
        100 / (1 + rs)
    )

    # -----------------------------
    # MACD
    # -----------------------------

    ema_12 = close.ewm(
        span=12,
        adjust=False
    ).mean()

    ema_26 = close.ewm(
        span=26,
        adjust=False
    ).mean()

    df["macd"] = ema_12 - ema_26

    df["macd_signal"] = df["macd"].ewm(
        span=9,
        adjust=False
    ).mean()

    df["macd_histogram"] = (
        df["macd"] -
        df["macd_signal"]
    )

    # -----------------------------
    # Bollinger Bands
    # -----------------------------

    df["bollinger_middle"] = close.rolling(
        window=20,
        min_periods=20
    ).mean()

    rolling_std = close.rolling(
        window=20,
        min_periods=20
    ).std()

    df["bollinger_upper"] = (
        df["bollinger_middle"] +
        (2 * rolling_std)
    )

    df["bollinger_lower"] = (
        df["bollinger_middle"] -
        (2 * rolling_std)
    )

    # -----------------------------
    # Volatility
    # -----------------------------

    daily_returns = close.pct_change()

    df["volatility"] = daily_returns.rolling(
        window=20,
        min_periods=20
    ).std()

    return df


def save_indicators(df, stock_id):

    connection = get_db_connection()

    cursor = connection.cursor()

    query = """
        INSERT INTO technical_indicators (
            stock_id,
            trading_date,
            sma_20,
            sma_50,
            sma_200,
            ema_20,
            ema_50,
            rsi,
            macd,
            macd_signal,
            macd_histogram,
            bollinger_upper,
            bollinger_middle,
            bollinger_lower,
            volatility
        )
        VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            sma_20 = VALUES(sma_20),
            sma_50 = VALUES(sma_50),
            sma_200 = VALUES(sma_200),
            ema_20 = VALUES(ema_20),
            ema_50 = VALUES(ema_50),
            rsi = VALUES(rsi),
            macd = VALUES(macd),
            macd_signal = VALUES(macd_signal),
            macd_histogram = VALUES(macd_histogram),
            bollinger_upper = VALUES(bollinger_upper),
            bollinger_middle = VALUES(bollinger_middle),
            bollinger_lower = VALUES(bollinger_lower),
            volatility = VALUES(volatility)
    """

    for _, row in df.iterrows():

        def value(column):

            value = row[column]

            if pd.isna(value):
                return None

            return float(value)

        data = (
            stock_id,
            row["trading_date"],
            value("sma_20"),
            value("sma_50"),
            value("sma_200"),
            value("ema_20"),
            value("ema_50"),
            value("rsi"),
            value("macd"),
            value("macd_signal"),
            value("macd_histogram"),
            value("bollinger_upper"),
            value("bollinger_middle"),
            value("bollinger_lower"),
            value("volatility")
        )

        cursor.execute(
            query,
            data
        )

    connection.commit()

    cursor.close()
    connection.close()


if __name__ == "__main__":

    print("Loading historical stock prices...")

    df = load_prices(STOCK_ID)

    print(
        f"Historical prices loaded: {len(df)}"
    )

    if df.empty:

        print(
            "No historical price data found."
        )

    else:

        print(
            "Calculating technical indicators..."
        )

        df = calculate_indicators(df)

        print(
            "Saving indicators to MySQL..."
        )

        save_indicators(
            df,
            STOCK_ID
        )

        print(
            "Technical indicators saved successfully."
        )

        print(
            f"Indicator rows processed: {len(df)}"
        )