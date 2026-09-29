import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import joblib
from datetime import datetime

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

from training.prepare_data import (
    load_training_data,
    create_features
)
from utils.db import get_db_connection

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


def record_model_performance(model_name, stock_id, directional_acc, train_count, test_count):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO model_performance
            (model_name, stock_id, evaluation_date, directional_accuracy, training_samples, test_samples)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            model_name,
            stock_id,
            datetime.now().date(),
            float(directional_acc),
            int(train_count),
            int(test_count)
        ))
        conn.commit()
        cursor.close()
        conn.close()
        print(f"Model performance recorded in MySQL `model_performance` (Accuracy: {directional_acc:.2f}%)")
    except Exception as err:
        print(f"Warning: Could not record performance to database: {err}")


def train_model(stock_id=None):
    print("==================================================")
    print("StockSense — AI Model Training Pipeline")
    print("==================================================")

    if stock_id:
        print(f"Loading historical training data for stock ID: {stock_id}...")
        df = load_training_data(stock_id)
    else:
        print("Loading historical training data across all available stocks...")
        df = load_training_data(None)

    if df.empty:
        raise ValueError("No historical training data found in database.")

    df = create_features(df)
    print(f"Usable training records after feature engineering: {len(df)}")

    if len(df) < 20:
        raise ValueError(f"Not enough training records ({len(df)} records available, need at least 20).")

    X = df[FEATURE_COLUMNS]
    y = df["target"]

    print(f"Class Distribution: UP (1) = {(y == 1).sum()} | DOWN (0) = {(y == 0).sum()}")

    # Time-aware split: earlier records for training, latest for testing
    split_index = int(len(df) * 0.8)

    X_train = X.iloc[:split_index]
    X_test = X.iloc[split_index:]
    y_train = y.iloc[:split_index]
    y_test = y.iloc[split_index:]

    print(f"Training samples: {len(X_train)} | Testing samples: {len(X_test)}")

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced"
    )

    print("Training Random Forest Classifier...")
    model.fit(X_train, y_train)
    print("Model training completed successfully.")

    # Model Evaluation
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, zero_division=0)
    recall = recall_score(y_test, predictions, zero_division=0)
    f1 = f1_score(y_test, predictions, zero_division=0)

    print("\n--- Model Evaluation ---")
    print(f"Accuracy:  {accuracy * 100:.2f}%")
    print(f"Precision: {precision * 100:.2f}%")
    print(f"Recall:    {recall * 100:.2f}%")
    print(f"F1-Score:  {f1 * 100:.2f}%")

    print("\nClassification Report:")
    print(classification_report(y_test, predictions, zero_division=0))

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, predictions))

    print("\nFeature Importance:")
    for feature, imp in sorted(zip(FEATURE_COLUMNS, model.feature_importances_), key=lambda x: x[1], reverse=True):
        print(f"  {feature:<18}: {imp:.4f}")

    # Record metrics into DB
    record_model_performance(
        model_name="Random Forest Classifier",
        stock_id=stock_id,
        directional_acc=accuracy * 100,
        train_count=len(X_train),
        test_count=len(X_test)
    )

    # Save trained model
    models_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "models"
    )
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "stocksense_random_forest.joblib")
    joblib.dump(model, model_path)
    print(f"\nModel saved successfully to:\n{model_path}")
    print("==================================================")
    return model


if __name__ == "__main__":
    target_stock = int(sys.argv[1]) if len(sys.argv) > 1 else None
    train_model(target_stock)