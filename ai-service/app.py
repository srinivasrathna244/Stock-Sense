from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from predictions.predictor import make_prediction


load_dotenv()


app = Flask(__name__)

CORS(app)


@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "service": "StockSense AI Service",
        "status": "running"
    })


@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "success": True,
        "service": "AI",
        "status": "healthy"
    })


@app.route("/predict", methods=["POST"])
def predict():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required."
            }), 400

        stock_id = data.get("stock_id")

        if not stock_id:
            return jsonify({
                "success": False,
                "message": "stock_id is required."
            }), 400

        result = make_prediction(
            int(stock_id)
        )

        return jsonify({
            "success": True,
            "prediction": result
        })

    except Exception as error:

        print(
            "Prediction error:",
            error
        )

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


if __name__ == "__main__":

    print(
        "StockSense AI Service running "
        "on http://localhost:8000"
    )

    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True
    )