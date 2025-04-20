import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import classification_report
import joblib
import nlpaug.augmenter.word as naw
import numpy as np
import nltk

# Download necessary NLTK resources
nltk.download("punkt")
nltk.download("wordnet")
nltk.download("omw-1.4")
nltk.download("averaged_perceptron_tagger")
nltk.download("averaged_perceptron_tagger_eng")

# Load dataset
data_path = "backend/data/dataset.csv"
df = pd.read_csv(data_path)

# Clean and prepare text
df['text'] = df['text'].astype(str).str.strip()
df = df[df['text'].str.len() > 0]  # remove empty texts

# Data Augmentation (Synonym replacement)
print("Applying data augmentation using synonym replacement...")
aug = naw.SynonymAug(aug_src='wordnet')
augmented_texts = []

for text in df['text']:
    try:
        augmented = aug.augment(text)
        if isinstance(augmented, str):
            augmented_texts.append(augmented)
        elif isinstance(augmented, list) and augmented:
            augmented_texts.append(augmented[0])
    except Exception as e:
        print(f"Augmentation failed for: {text[:60]}... | Error: {e}")
        augmented_texts.append(text)  # fallback to original

# Combine original and augmented texts
texts = df['text'].tolist() + augmented_texts

# Ensure all entries are clean strings
texts = [str(t).strip() for t in texts if isinstance(t, str) and len(t.strip()) > 0]

# Labels: duplicate and map
y = pd.concat([df['label'], df['label']], ignore_index=True)
label_map = {'sensitive': 1, 'not_sensitive': 0}
y = y.map(label_map)

# Initialize SentenceTransformer
model_name = 'sentence-transformers/all-MiniLM-L12-v2'
embedder = SentenceTransformer(model_name)

print("Generating sentence embeddings...")
print(f"Sample text: {texts[0]}")
print(f"Total texts: {len(texts)}")

embeddings = embedder.encode(texts, show_progress_bar=True)

# Cross-validation
print("\nRunning 5-Fold Cross-Validation on Logistic Regression...")
clf_cv = LogisticRegression(max_iter=1000)
scores = cross_val_score(clf_cv, embeddings, y, cv=5, scoring='f1_weighted')
print(f"Cross-validated F1 (weighted): {scores.mean():.4f} ± {scores.std():.4f}\n")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(embeddings, y, test_size=0.2, random_state=42)

# Final model training
clf = LogisticRegression(max_iter=1000)
clf.fit(X_train, y_train)

# Evaluation
y_pred = clf.predict(X_test)
print("Classification Report:")
print(classification_report(y_test, y_pred))

# Hard false positives/negatives
proba = clf.predict_proba(X_test)
print("\nHard examples with high confidence errors:")
for i, (true, pred, prob) in enumerate(zip(y_test, y_pred, proba)):
    if true != pred and max(prob) > 0.9:
        print(f"Text: {texts[i]} | True: {true} | Pred: {pred} | Confidence: {max(prob):.2f}")

# Save model
joblib.dump(clf, "backend/models/classifier.pkl")
joblib.dump(embedder, "backend/models/embedding_model.pkl")

print("\nModel training complete and saved successfully.")
