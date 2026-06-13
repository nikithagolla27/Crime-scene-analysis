import cv2
import torch
import numpy as np
import io
import os
import hashlib
import json
import uuid

from PIL import Image
from torchvision import transforms, models
import torch.nn as nn
from ultralytics import YOLO

MODELS_DIR = os.path.join(os.path.dirname(__file__), "../models")

def _load_class_names():
    p = os.path.join(MODELS_DIR, "class_names.json")
    if os.path.exists(p):
        with open(p) as f:
            return json.load(f)
    return {"classifier": ["normal", "violence"]}

CRIME_CLASSES = _load_class_names().get("classifier", ["normal", "violence"])

DANGEROUS_OBJECTS = {"gun", "knife", "weapon", "blood", "fire"}

VAL_TF = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],
                         [0.229,0.224,0.225])
])

class CrimeAnalyzer:

    def __init__(self):

        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.yolo_coco = None
        self.yolo_custom = None
        self.classifier = None

        self.models_ready = False

        self._load_models()

        self.models_ready = True

    def _load_models(self):

        try:

            print("Loading YOLOv8 COCO model...")
            self.yolo_coco = YOLO("yolov8s.pt")

            custom_path = os.path.join(MODELS_DIR, "best.pt")

            if os.path.exists(custom_path):
                print("Loading custom weapon model...")
                self.yolo_custom = YOLO(custom_path)

            classifier_path = os.path.join(
                MODELS_DIR,
                "crime_classifier_best.pt"
            )

            if os.path.exists(classifier_path):

                print("Loading scene classifier...")

                model = models.efficientnet_b0()

                model.classifier[1] = nn.Linear(
                    model.classifier[1].in_features,
                    len(CRIME_CLASSES)
                )

                checkpoint = torch.load(
                    classifier_path,
                    map_location=self.device,
                    weights_only=False
                )

                state = checkpoint["model_state_dict"] \
                    if isinstance(checkpoint, dict) else checkpoint

                model.load_state_dict(state)

                self.classifier = model.to(self.device).eval()

        except Exception as e:

            print("Model loading error:", e)

    def validate_image(self, img_bytes, filename):

        issues = []
        warnings = []

        try:

            pil = Image.open(io.BytesIO(img_bytes))

            width, height = pil.size

        except Exception as e:

            return {
                "is_valid": False,
                "is_authentic": False,
                "ela_score": 0,
                "issues": [str(e)],
                "warnings": [],
                "metadata": {},
                "image_info": {}
            }

        ela_score = self._calculate_ela(pil)

        authentic = ela_score < 15

        if not authentic:
            warnings.append("Possible manipulation detected")

        return {

            "is_valid": True,
            "is_authentic": authentic,
            "ela_score": round(ela_score, 2),
            "ela_threshold": 15.0,
            "issues": issues,
            "warnings": warnings,
            "metadata": {
                "filename": filename
            },
            "image_info": {
                "width": width,
                "height": height,
                "md5_hash": hashlib.md5(img_bytes).hexdigest()
            }
        }

    def _calculate_ela(self, pil, quality=90):

        try:

            buffer = io.BytesIO()

            rgb = pil.convert("RGB")

            rgb.save(buffer, "JPEG", quality=quality)

            buffer.seek(0)

            recompressed = Image.open(buffer)

            diff = np.abs(
                np.array(rgb, dtype=np.float32)
                - np.array(recompressed, dtype=np.float32)
            )

            return float(np.mean(diff))

        except:
            return 0

    def _detect_objects(self, image_path):

        detections = []

        try:

            if self.yolo_coco:

                results = self.yolo_coco(image_path, conf=0.25)[0]

                for box in results.boxes:

                    cls_id = int(box.cls[0])

                    confidence = float(box.conf[0])

                    label = self.yolo_coco.names[cls_id]

                    xyxy = box.xyxy[0].tolist()

                    detections.append({

                        "object": label,

                        "confidence": round(confidence, 3),

                        "box": {
                            "x1": int(xyxy[0]),
                            "y1": int(xyxy[1]),
                            "x2": int(xyxy[2]),
                            "y2": int(xyxy[3])
                        },

                        "is_dangerous": label in DANGEROUS_OBJECTS
                    })

            if self.yolo_custom:

                results = self.yolo_custom(image_path, conf=0.4)[0]

                for box in results.boxes:

                    confidence = float(box.conf[0])

                    xyxy = box.xyxy[0].tolist()

                    detections.append({

                        "object": "gun",

                        "confidence": round(confidence, 3),

                        "box": {
                            "x1": int(xyxy[0]),
                            "y1": int(xyxy[1]),
                            "x2": int(xyxy[2]),
                            "y2": int(xyxy[3])
                        },

                        "is_dangerous": True
                    })

        except Exception as e:

            print("Detection error:", e)

        return detections

    def _classify_scene(self, pil_image):

        if not self.classifier:
            return {"scene_type": "unknown", "confidence": 0}

        try:

            tensor = VAL_TF(pil_image).unsqueeze(0).to(self.device)

            with torch.no_grad():

                probs = torch.softmax(
                    self.classifier(tensor),
                    dim=1
                )[0]

            idx = probs.argmax().item()

            return {

                "scene_type": CRIME_CLASSES[idx],

                "confidence": round(float(probs[idx]), 3)
            }

        except:

            return {"scene_type": "unknown", "confidence": 0}

    def _override_scene(self, classification, detections):

        objects = [d["object"] for d in detections]

        if any(o in ["gun", "knife", "weapon"] for o in objects):

            classification["scene_type"] = "violence"

            classification["confidence"] = max(
                classification["confidence"],
                0.9
            )

        return classification

    def _calculate_threat(self, classification, detections):

        score = 0

        objects = [d["object"] for d in detections]

        if any(o in DANGEROUS_OBJECTS for o in objects):
            score += 60

        if classification["scene_type"] == "violence":
            score += 30

        score = min(score, 100)

        if score >= 70:
            level = "CRITICAL"
        elif score >= 40:
            level = "HIGH"
        elif score >= 20:
            level = "MODERATE"
        else:
            level = "LOW"

        return {"level": level, "score": score}

    def _generate_description(self, classification, detections):

        objects = [d["object"] for d in detections]

        if "gun" in objects:
            crime = "Armed Robbery"

        elif "knife" in objects:
            crime = "Assault with Weapon"

        elif classification["scene_type"] == "violence":
            crime = "Violent Activity"

        else:
            crime = "Normal Activity"

        counts = {}

        for obj in objects:
            counts[obj] = counts.get(obj, 0) + 1

        obj_text = ", ".join(
            f"{v}× {k}" for k, v in counts.items()
        )

        return f"Predicted Crime Type: {crime}. Objects detected: {obj_text}. Evidence logged for review."

    def _generate_police_report(self, description, threat, detections):

        case_id = str(uuid.uuid4())[:8]

        objects = [d["object"] for d in detections]

        evidence = ", ".join(set(objects)) if objects else "No evidence"

        return f"""
CRIME SCENE REPORT

Case ID: {case_id}

Threat Level: {threat['level']} ({threat['score']}/100)

Evidence Detected:
{evidence}

Description:
{description}

Recommended Action:
Immediate law enforcement review recommended.

AI Forensic System Analysis Complete.
""".strip()

    def _annotate_image(self, image_path, detections):

        img = cv2.imread(image_path)

        if img is None:
            return image_path

        for d in detections:

            b = d["box"]

            x1,y1,x2,y2 = b["x1"],b["y1"],b["x2"],b["y2"]

            color = (0,255,0)

            if d["object"] in DANGEROUS_OBJECTS:
                color = (0,0,255)

            label = f"{d['object']} {int(d['confidence']*100)}%"

            cv2.rectangle(img,(x1,y1),(x2,y2),color,2)

            cv2.putText(
                img,
                label,
                (x1,y1-5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                2
            )

        base,ext = os.path.splitext(image_path)

        output = f"{base}_annotated{ext}"

        cv2.imwrite(output,img)

        return output

    def analyze(self, img_path, img_bytes, filename):

        validation = self.validate_image(img_bytes, filename)

        pil_image = Image.open(img_path).convert("RGB")

        detections = self._detect_objects(img_path)

        classification = self._classify_scene(pil_image)

        classification = self._override_scene(
            classification,
            detections
        )

        description = self._generate_description(
            classification,
            detections
        )

        threat = self._calculate_threat(
            classification,
            detections
        )

        annotated = self._annotate_image(
            img_path,
            detections
        )

        report = self._generate_police_report(
            description,
            threat,
            detections
        )

        return {

            "validation": validation,

            "classification": classification,

            "detections": detections,

            "description": description,

            "forensic_report": report,

            "threat_level": threat,

            "annotated_image": annotated,

            "dangerous_objects": [
                d for d in detections
                if d["object"] in DANGEROUS_OBJECTS
            ]
        }