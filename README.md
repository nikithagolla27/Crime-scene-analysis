# 🔍 CrimeSolver — AI-Powered Forensic Image Analysis Platform

<div align="center">

![CrimeSolver Banner](https://img.shields.io/badge/CrimeSolver-AI%20Forensic%20Platform-00ff9d?style=for-the-badge&logo=shield&logoColor=black)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6B35?style=flat-square)](https://ultralytics.com)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**An AI-powered forensic image analysis platform that combines dual YOLO object detection, EfficientNet scene classification, and ELA tamper detection to generate professional forensic reports.**

[🚀 Live Demo](https://crimesolver-web.onrender.com/) ·

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [AI Models](#-ai-models)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Screenshots](#-screenshots)
- [Deployment](#-deployment)
- [Training Details](#-training-details)

---

## 🧠 Overview

CrimeSolver is a full-stack forensic image analysis platform built for law enforcement and security professionals. Upload any crime scene image and within seconds receive:

- **Object detection** with tactical bounding box overlays
- **Scene classification** (violent vs non-violent)
- **Image authenticity verification** using Error Level Analysis (ELA)
- **Threat scoring** on a 0–100 scale
- **Downloadable PDF forensic reports**
- **Case management dashboard** with search and filtering

The platform uses a **dual-model YOLO pipeline** — a pretrained YOLOv8s (80 COCO classes) for general objects like persons, knives, vehicles, and a custom-trained YOLOv8 gun detector (91.1% mAP50) for weapon-specific detection.

---

## ✨ Features

### 🖼️ Image Analysis
- Drag-and-drop or click-to-upload image ingestion
- Supports JPG, PNG, WEBP, BMP up to 20MB
- Real-time step-by-step analysis progress (Validating → Detecting → Classifying)
- Annotated image overlay with OCR-style tactical bounding boxes

### 🔍 AI Detection
- **Dual YOLO pipeline**: COCO pretrained + custom gun specialist model
- Detects 80+ object classes including persons, knives, vehicles, weapons
- Confidence scores per detected object with source tagging (`coco` / `custom`)
- Dangerous object flagging with visual indicators

### 🎯 Scene Classification
- EfficientNet-B0 classifier trained on real violence dataset
- Binary classification: **Violence** vs **Normal**
- Per-class probability breakdown with animated bar charts
- 99.5% validation accuracy on test set

### 🛡️ Image Authenticity
- **Error Level Analysis (ELA)** — detects JPEG manipulation and compression artifacts
- Magic byte validation for file format verification
- EXIF metadata extraction (camera, date, GPS if available)
- MD5 hash for evidence integrity verification
- Tamper probability score (threshold: 15.0)

### 📊 Threat Assessment
| Level | Score Range | Color |
|-------|-------------|-------|
| 🔴 CRITICAL | 70 – 100 | Red |
| 🟠 HIGH | 40 – 69 | Orange |
| 🟡 MODERATE | 20 – 39 | Yellow |
| 🟢 LOW | 0 – 19 | Green |

### 📄 Forensic Reports
- Auto-generated multi-line forensic report (`forensic_report` field)
- PDF export via ReportLab with case info, detections, scene classification, authenticity analysis
- Terminal-style report viewer in the UI with blinking cursor

### 🗂️ Case Management
- SQLite database storing all analyzed cases
- Search by Case ID, filename, or scene type
- Filter by threat level (Critical / High / Moderate / Low)
- Sort by newest, oldest, threat level, or score
- One-click PDF download per case
- Case deletion with confirmation

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI framework |
| React Router DOM | 6.x | Client-side routing |
| Axios | 1.x | HTTP client |
| React Dropzone | 14.x | Drag & drop upload |
| Lucide React | 0.383 | Icon library |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.111.0 | REST API framework |
| Uvicorn | 0.30.1 | ASGI server |
| Python Multipart | 0.0.9 | File upload handling |
| ReportLab | 4.4.x | PDF generation |

### AI / ML
| Technology | Version | Purpose |
|-----------|---------|---------|
| PyTorch | 2.10.0 | Deep learning framework |
| Torchvision | 0.25.0 | Image transforms |
| Ultralytics | 8.4.x | YOLOv8 inference |
| EfficientNet-B0 | — | Scene classification backbone |
| OpenCV | 4.13.x | Image annotation & processing |
| Pillow | 11.x | Image I/O |
| NumPy | 2.x | Numerical operations |

### Database & Storage
| Technology | Purpose |
|-----------|---------|
| SQLite | Case storage (zero-config) |
| Local filesystem | Image & report storage |

---

## 🤖 AI Models

### Model 1 — Custom YOLOv8 Gun Detector
```
Architecture : YOLOv8 (Ultralytics)
Dataset      : Kaggle — issaisasank/guns-object-detection (333 images)
Train / Val  : 266 / 67 images
mAP50        : 0.911
Precision    : 0.878
Recall       : 0.851
File         : models/best.pt (21.5 MB)
ONNX Export  : models/best.onnx (42.7 MB)
```

### Model 2 — YOLOv8s COCO (Pretrained)
```
Architecture : YOLOv8s (small)
Dataset      : COCO 2017 (80 classes)
Classes used : person, knife, car, motorcycle, bicycle,
               truck, bus, bottle, backpack, cell phone, scissors, etc.
Confidence   : 0.25 threshold
File         : yolov8s.pt (auto-downloaded)
```

### Model 3 — EfficientNet-B0 Violence Classifier
```
Architecture : EfficientNet-B0
Dataset      : Kaggle — mohamedmustafa/real-life-violence-situations-dataset
Classes      : ['normal', 'violence']
Train / Val  : 760 / 190 images (balanced 380 per class)
Val Accuracy : 99.5% (Epoch 5, stable through Epoch 30)
File         : models/crime_classifier_best.pt (15.6 MB)
TorchScript  : models/crime_classifier.torchscript (16.1 MB)
```

### Dual Detection Pipeline Logic
```
Image Input
    │
    ├── [1] YOLOv8s COCO  (conf ≥ 0.25)
    │       └── Detects: person, knife, car, etc.
    │
    ├── [2] Custom YOLO   (conf ≥ 0.50, no box overlap with COCO)
    │       └── Detects: gun only
    │
    └── [3] IoU Deduplication → Merge → Sort by confidence
```

---

## 📁 Project Structure

```
CrimeSolver/
│
├── 📁 models/                          # Trained AI model weights
│   ├── best.pt                         # Custom YOLOv8 gun detector
│   ├── best.onnx                       # ONNX export (faster CPU)
│   ├── crime_classifier_best.pt        # EfficientNet-B0 classifier
│   ├── crime_classifier.torchscript    # TorchScript export
│   └── class_names.json               # Class label mapping
│
├── 📁 backend/                         # FastAPI backend
│   ├── main.py                         # API routes & endpoints
│   ├── analyzer.py                     # Core AI analysis engine
│   ├── database.py                     # SQLite operations
│   ├── report.py                       # PDF report generation
│   ├── requirements.txt                # Python dependencies
│   ├── uploads/                        # Uploaded & annotated images
│   ├── reports/                        # Generated PDF reports
│   └── crimesolver.db                  # SQLite database (auto-created)
│
├── 📁 frontend/                        # React frontend
│   ├── public/
│   ├── src/
│   │   ├── App.js                      # Router & layout
│   │   ├── App.css                     # Global design system
│   │   ├── index.js
│   │   ├── components/
│   │   │   ├── Navbar.js               # Navigation + status
│   │   │   └── Navbar.css
│   │   └── pages/
│   │       ├── AnalyzePage.js          # Main analysis UI
│   │       ├── AnalyzePage.css
│   │       ├── CasesPage.js            # Case archive
│   │       └── CasesPage.css
│   └── package.json
│
├── Dockerfile                          # Container config
├── render.yaml                         # Render deployment config
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/crimesolver.git
cd crimesolver
```

### 2. Add model files
Place your trained model files in the `models/` folder:
```
models/best.pt
models/crime_classifier_best.pt
models/class_names.json
```

### 3. Start the Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Expected output:
```
✅ Custom YOLO loaded from .../models/best.pt
⬇️  Loading YOLOv8s pretrained (COCO)...
✅ YOLOv8s COCO ready
✅ Classifier loaded
✅ Database initialized
INFO: Uvicorn running on http://127.0.0.1:8000
```

### 4. Start the Frontend
```bash
# Open a new terminal
cd frontend
npm install
npm start
```

### 5. Open in browser
| URL | Description |
|-----|-------------|
| http://localhost:3000 | React frontend |
| http://localhost:8000/docs | Interactive API (Swagger) |
| http://localhost:8000/health | Backend health check |

---

## 📡 API Reference

### `GET /health`
Returns server status and model load state.
```json
{
  "status": "running",
  "models_ready": true,
  "yolo_custom": true,
  "yolo_coco": true,
  "classifier": true,
  "timestamp": "2026-03-13T12:00:00"
}
```

### `POST /analyze`
Upload an image for full AI analysis.
- **Body**: `multipart/form-data` with `file` field
- **Returns**: Complete analysis result including detections, classification, threat level, forensic report, and annotated image URL

```json
{
  "case_id": "A1B2C3D4",
  "filename": "scene.jpg",
  "timestamp": "2026-03-13T12:53:03",
  "classification": { "scene_type": "violence", "confidence": 0.89, "probabilities": {...} },
  "detections": [
    { "object": "person", "confidence": 0.91, "source": "coco", "is_dangerous": false, "box": {...} },
    { "object": "gun",    "confidence": 0.76, "source": "custom", "is_dangerous": true, "box": {...} }
  ],
  "threat_level": { "level": "CRITICAL", "score": 82.0, "color": "red" },
  "description": "Short summary...",
  "forensic_report": "CRIME SCENE REPORT\n\nPossible Crime Type: ...",
  "annotated_image_url": "/annotated/A1B2C3D4_annotated.jpg",
  "validation": { "is_valid": true, "is_authentic": true, "ela_score": 3.6, ... }
}
```

### `GET /annotated/{filename}`
Serves the annotated image with bounding boxes.

### `GET /cases`
Returns all stored cases ordered by newest first.

### `GET /cases/{case_id}`
Returns a single case by ID.

### `DELETE /cases/{case_id}`
Deletes a case from the database.

### `GET /report/{case_id}`
Generates and downloads a PDF forensic report.

### `POST /validate`
Validates image authenticity only (without full analysis).

### `POST /analyze/batch`
Analyze up to 10 images at once.

---

## 🖼️ Screenshots

### Analysis Page
> Upload evidence image → Dual YOLO detection → Scene classification → Threat scoring

### Case Archive
> Search, filter, sort all analyzed cases with threat level badges

### PDF Report
> Professional forensic report with case metadata, detections table, authenticity analysis

---

## ☁️ Deployment

### Option 1 — Render (Recommended)

**Backend:**
1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect repo → Select `backend/` as root
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variable: `PYTHON_VERSION=3.13`

**Frontend:**
1. Go to Render → New Static Site
2. Build command: `npm install && npm run build`
3. Publish directory: `build`
4. Set env var: `REACT_APP_API_URL=https://your-backend.onrender.com`

> **Live Demo:** `https://crimesolver.onrender.com` *(replace with your URL after deployment)*

---

### Option 2 — Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./models:/app/models
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
```

---

### Option 3 — Railway

```bash
railway login
railway init
railway up
```

---

## 🧪 Training Details

Models were trained on Google Colab (T4 GPU).

### YOLO Training
```python
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
model.train(data='dataset.yaml', epochs=50, imgsz=640, batch=16)
```

### EfficientNet Training
```python
# Dataset: 380 violence + 380 normal frames
# Optimizer: Adam, lr=1e-4
# Epochs: 30, best checkpoint at Epoch 5
# Val Accuracy: 99.5%
```

### Dataset Sources
| Model | Dataset | Source |
|-------|---------|--------|
| Gun YOLO | guns-object-detection | Kaggle |
| Violence Classifier | real-life-violence-situations-dataset | Kaggle |
| COCO YOLO | COCO 2017 | Pretrained (Ultralytics) |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---



## ⚠️ Disclaimer

> CrimeSolver is built for **educational and research purposes only**. It is intended to assist authorized forensic analysts and security professionals. Do not use for unauthorized surveillance or illegal activity. AI detections are probabilistic and should not be used as sole evidence in legal proceedings.

---

<div align="center">
  <sub>Built with ❤️ using React, FastAPI, and YOLOv8</sub>
</div>
