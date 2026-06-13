from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn, uuid, os
from datetime import datetime

from analyzer import CrimeAnalyzer
from report   import generate_pdf_report
from database import init_db, save_case, get_all_cases, get_case_by_id, delete_case_by_id

app = FastAPI(title="CrimeSolver API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

UPLOAD_DIR  = os.path.join(os.path.dirname(__file__), "uploads")
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
os.makedirs(UPLOAD_DIR,  exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

analyzer = CrimeAnalyzer()
init_db()

@app.get("/")
def home():
    return {"message": "CrimeSolver AI API is running"}

@app.get("/health")
@app.head("/health")
def health():
    return {
        "status":       "running",
        "models_ready": analyzer.models_ready,
        "yolo_custom":  analyzer.yolo_custom  is not None,
        "yolo_coco":    analyzer.yolo_coco    is not None,
        "classifier":   analyzer.classifier   is not None,
        "timestamp":    datetime.utcnow().isoformat(),
    }

@app.post("/validate")
async def validate_image(file: UploadFile = File(...)):
    img_bytes = await file.read()
    return analyzer.validate_image(img_bytes, file.filename)

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    img_bytes = await file.read()
    ext      = os.path.splitext(file.filename)[1] or ".jpg"
    case_id  = str(uuid.uuid4())[:8].upper()
    img_path = os.path.join(UPLOAD_DIR, f"{case_id}{ext}")

    with open(img_path, "wb") as f:
        f.write(img_bytes)

    result = analyzer.analyze(img_path, img_bytes, file.filename)
    result["case_id"]    = case_id
    result["filename"]   = file.filename
    result["timestamp"]  = datetime.utcnow().isoformat()
    result["image_path"] = img_path

    ann_path = result.get("annotated_image", "")
    result["annotated_image_url"] = (
        f"/annotated/{os.path.basename(ann_path)}"
        if ann_path and os.path.exists(ann_path) else None
    )

    save_case(result)
    return result

@app.get("/annotated/{filename}")
async def get_annotated(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Annotated image not found")
    return FileResponse(path, media_type="image/jpeg")

@app.post("/analyze/batch")
async def analyze_batch(files: list[UploadFile] = File(...)):
    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 images per batch")
    results = []
    for file in files:
        img_bytes = await file.read()
        ext      = os.path.splitext(file.filename)[1] or ".jpg"
        case_id  = str(uuid.uuid4())[:8].upper()
        img_path = os.path.join(UPLOAD_DIR, f"{case_id}{ext}")
        with open(img_path, "wb") as f:
            f.write(img_bytes)
        result = analyzer.analyze(img_path, img_bytes, file.filename)
        result.update({"case_id": case_id, "filename": file.filename,
                        "timestamp": datetime.utcnow().isoformat(), "image_path": img_path})
        save_case(result)
        results.append({"case_id": case_id, "filename": file.filename,
                         "threat_level": result["threat_level"],
                         "scene_type": result["classification"]["scene_type"]})
    return {"batch_size": len(results), "results": results}

@app.get("/cases")
def list_cases():
    return {"cases": get_all_cases()}

@app.get("/cases/{case_id}")
def get_case(case_id: str):
    case = get_case_by_id(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    return case

@app.delete("/cases/{case_id}")
def delete_case(case_id: str):
    if not delete_case_by_id(case_id):
        raise HTTPException(404, f"Case {case_id} not found")
    return {"message": f"Case {case_id} deleted"}

@app.get("/report/{case_id}")
def get_report(case_id: str):
    case = get_case_by_id(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    pdf_path = os.path.join(REPORTS_DIR, f"case_{case_id}.pdf")
    generate_pdf_report(case, pdf_path)
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"CrimeSolver_Case_{case_id}.pdf")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)