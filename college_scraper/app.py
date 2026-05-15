from flask import Flask, jsonify, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

# 🔹 LOAD DATA ONCE (important for 250+)
with open("colleges.json", encoding="utf-8") as f:
    DATA = json.load(f)

# ---------- HOME ----------
@app.route("/")
def home():
    return "College API running 🚀"

# ---------- GET ALL (WITH PAGINATION) ----------
@app.route("/colleges")
def colleges():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))

    start = (page - 1) * limit
    end = start + limit

    return jsonify({
        "total": len(DATA),
        "page": page,
        "data": DATA[start:end]
    })

# ---------- SEARCH ----------
@app.route("/search")
def search():
    query = request.args.get("q", "").lower()

    result = [
        c for c in DATA
        if query in c["name"].lower()
    ]

    return jsonify(result[:20])

# ---------- TOP COLLEGES ----------
@app.route("/top")
def top():
    sorted_data = sorted(
        DATA,
        key=lambda x: float(x.get("highest", 0) or 0),
        reverse=True
    )

    return jsonify(sorted_data[:10])

if __name__ == "__main__":
    app.run(debug=True)