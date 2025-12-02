from fastapi import FastAPI

app = FastAPI(title="Competitions Service")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "competitions-service"}
