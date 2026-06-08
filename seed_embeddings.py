import os
import json
import asyncio
import httpx
from database import SessionLocal
from models import SemanticRoute, Base, engine

# Ensure tables exist
Base.metadata.create_all(bind=engine)

DEEPINFRA_KEY = os.getenv("DEEPINFRA_API_KEY")

import argparse
import csv

def load_dataset(file_path: str) -> list:
    dataset = []
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return dataset
        
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext == '.json':
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # handle if JSON is a list of dicts
                if isinstance(data, list):
                    dataset = data
        elif ext == '.csv':
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Expect headers like 'text' and 'category'
                    if 'text' in row and 'category' in row:
                        dataset.append({
                            "text": row['text'],
                            "category": row['category'].upper()
                        })
        else:
            print("Error: Please provide a .json or .csv file.")
    except Exception as e:
        print(f"Error reading file: {e}")
        
    return dataset

async def get_embedding(text: str) -> list:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.deepinfra.com/v1/openai/embeddings",
            headers={"Authorization": f"Bearer {DEEPINFRA_KEY}"},
            json={
                "model": "sentence-transformers/paraphrase-MiniLM-L6-v2",
                "input": text
            },
            timeout=30.0
        )
        res.raise_for_status()
        return res.json()["data"][0]["embedding"]

async def seed(file_path: str):
    dataset = load_dataset(file_path)
    if not dataset:
        print("No valid data found to seed. Exiting.")
        return
        
    db = SessionLocal()
    # clear existing
    db.query(SemanticRoute).delete()
    db.commit()
    
    print(f"Seeding {len(dataset)} prompts into SemanticRoute database...")
    for item in dataset:
        print(f"Embedding: {item['text'][:30]}...")
        emb = await get_embedding(item["text"])
        route = SemanticRoute(
            prompt_text=item["text"],
            category=item["category"],
            embedding_json=json.dumps(emb)
        )
        db.add(route)
        await asyncio.sleep(0.5) # rate limit safety
        
    db.commit()
    db.close()
    print("Seeding complete! Database is now vectorized.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed database with prompt embeddings.")
    parser.add_argument("filepath", help="Path to the JSON or CSV dataset file.")
    args = parser.parse_args()

    if not DEEPINFRA_KEY:
        print("Set DEEPINFRA_API_KEY environment variable first.")
    else:
        asyncio.run(seed(args.filepath))
