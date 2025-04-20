from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib

# Load the pre-trained models
classifier = joblib.load("backend/models/classifier.pkl")
embedder = joblib.load("backend/models/embedding_model.pkl")

app = FastAPI(title="Context-Aware DLP API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] to allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextData(BaseModel):
    text: str

@app.post("/predict")
def predict_text(data: TextData):
    # Generate an embedding for the input text
    text_embedding = embedder.encode([data.text])

    # Predict the class and probability
    pred = classifier.predict(text_embedding)[0]
    proba = classifier.predict_proba(text_embedding)[0]

    # Confidence score = probability of predicted label
    confidence = proba[pred]

    # Convert prediction to label
    label_map = {0: "not_sensitive", 1: "sensitive"}
    result = label_map[pred]

    low_confidence = bool(confidence < 0.6)

    return {
        "text": data.text,
        "prediction": result,
        "raw_label": int(pred),
        "confidence": round(float(confidence), 4),
        "probabilities": {
            "not_sensitive": round(float(proba[0]), 4),
            "sensitive": round(float(proba[1]), 4)
        },
        "low_confidence_flag": low_confidence
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
