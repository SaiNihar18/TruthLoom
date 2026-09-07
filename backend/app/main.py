from fastapi import FastAPI

app = FastAPI(title="TruthLoom")


@app.get("/health")
def health():
    return {"status": "ok"}
