import os
import joblib
import pandas as pd
from datetime import datetime

from utils.db import get_db_connection

MODEL_PATH = os.path.join(
    os.path.dirname(
        os.path.dirname(__file__)
    ),
    "models",
    "stocksense_random_forest.joblib"
)

FEATURE_COLUMNS = [
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


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Trained model not found at {MODEL_PATH}. Please train the model first."
        )
    return joblib.load(MODEL_PATH)


def get_latest_indicators(stock_id):
    connection = get_db_connection()

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
        ORDER BY sp.trading_date DESC
        LIMIT 1
    """

    df = pd.read_sql(
        query,
        connection,
        params=(stock_id,)
    )

    connection.close()
    return df


def save_prediction_to_db(stock_id, trading_date, current_price, predicted_price, change_pct, direction, confidence):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO predictions
            (stock_id, prediction_date, target_date, current_price, predicted_price, expected_change_percent, direction, confidence_score, model_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Random Forest')
        """
        cursor.execute(query, (
            int(stock_id),
            trading_date,
            datetime.now().date(),
            float(current_price),
            float(predicted_price),
            float(change_pct),
            direction,
            float(confidence)
        ))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as err:
        print(f"Warning: Could not save prediction to DB: {err}")


def make_prediction(stock_id):
    model = load_model()
    df = get_latest_indicators(stock_id)

    if df.empty:
        raise ValueError(f"No historical price and indicator data found for stock ID {stock_id}.")

    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    missing_columns = [
        col for col in FEATURE_COLUMNS
        if pd.isna(df.iloc[0][col])
    ]

    if missing_columns:
        raise ValueError("Missing technical indicator values: " + ", ".join(missing_columns))

    X = df[FEATURE_COLUMNS]

    prediction = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]

    down_probability = float(probabilities[0])
    up_probability = float(probabilities[1])

    if prediction == 1:
        direction = "UP"
        probability = up_probability
        change_pct = round(probability * 2.5, 2)
    else:
        direction = "DOWN"
        probability = down_probability
        change_pct = round(-probability * 2.5, 2)

    cur_price = float(df.iloc[0]["close_price"])
    pred_price = round(cur_price * (1 + change_pct / 100), 2)
    trading_date = str(df.iloc[0]["trading_date"])

    # Persist prediction
    save_prediction_to_db(
        stock_id=stock_id,
        trading_date=trading_date,
        current_price=cur_price,
        predicted_price=pred_price,
        change_pct=change_pct,
        direction=direction,
        confidence=round(probability * 100, 2)
    )

    return {
        "stockId": int(stock_id),
        "tradingDate": trading_date,
        "currentPrice": cur_price,
        "predictedPrice": pred_price,
        "expectedChangePercent": change_pct,
        "prediction": direction,
        "probability": round(probability, 4),
        "confidence": f"{probability * 100:.2f}%",
        "model": "Random Forest Classifier",
        "disclaimer": "AI prediction is a probabilistic estimate and not financial advice."
    }


if __name__ == "__main__":
    import sys
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    print(f"Running prediction for Stock ID: {target}")
    res = make_prediction(target)
    print("Prediction Result:", res)