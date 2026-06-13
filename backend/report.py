from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER
import os
from datetime import datetime

DARK   = colors.HexColor("#0F1117")
ACCENT = colors.HexColor("#00C896")
RED    = colors.HexColor("#FF4444")
ORANGE = colors.HexColor("#FF8C00")
YELLOW = colors.HexColor("#FFD700")
GREEN  = colors.HexColor("#00C896")
GRAY   = colors.HexColor("#888888")
LIGHT  = colors.HexColor("#F5F5F5")
WHITE  = colors.white

THREAT_COLORS = {"CRITICAL": RED, "HIGH": ORANGE, "MODERATE": YELLOW, "LOW": GREEN}

def generate_pdf_report(case: dict, output_path: str):
    doc    = SimpleDocTemplate(output_path, pagesize=A4,
                               leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm,  bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    title_s = ParagraphStyle("T", parent=styles["Normal"], fontSize=22,
                              textColor=DARK, fontName="Helvetica-Bold",
                              spaceAfter=4, alignment=TA_CENTER)
    sub_s   = ParagraphStyle("S", parent=styles["Normal"], fontSize=11,
                              textColor=GRAY, fontName="Helvetica",
                              spaceAfter=2, alignment=TA_CENTER)
    sec_s   = ParagraphStyle("Sec", parent=styles["Normal"], fontSize=12,
                              textColor=WHITE, fontName="Helvetica-Bold",
                              spaceAfter=6, spaceBefore=10, backColor=DARK,
                              leading=18, borderPad=6)
    body_s  = ParagraphStyle("B", parent=styles["Normal"], fontSize=10,
                              textColor=DARK, fontName="Helvetica",
                              spaceAfter=4, leading=14)
    foot_s  = ParagraphStyle("F", parent=styles["Normal"], fontSize=8,
                              textColor=GRAY, alignment=TA_CENTER)

    # Header
    story.append(Paragraph("🔍 CRIMESOLVER", title_s))
    story.append(Paragraph("AI-Powered Forensic Image Analysis Report", sub_s))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=12))

    # Case info
    case_id   = case.get("case_id",  "N/A")
    filename  = case.get("filename", "N/A")
    timestamp = case.get("timestamp", datetime.utcnow().isoformat())
    threat    = case.get("threat_level", {})
    t_level   = threat.get("level", "UNKNOWN") if isinstance(threat, dict) else str(threat)
    t_score   = threat.get("score", 0)         if isinstance(threat, dict) else 0
    t_color   = THREAT_COLORS.get(t_level, GRAY)

    tbl = Table([
        ["Case ID",   case_id,   "Date",   timestamp[:10]],
        ["File",      filename,  "Time",   timestamp[11:19] + " UTC"],
        ["Threat",    t_level,   "Score",  f"{t_score}/100"],
    ], colWidths=[3*cm, 7.5*cm, 3*cm, 7.5*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), LIGHT),
        ("BACKGROUND", (0,0),(0,-1),  DARK),
        ("BACKGROUND", (2,0),(2,-1),  DARK),
        ("TEXTCOLOR",  (0,0),(0,-1),  WHITE),
        ("TEXTCOLOR",  (2,0),(2,-1),  WHITE),
        ("TEXTCOLOR",  (1,2),(1,2),   t_color),
        ("FONTNAME",   (0,0),(-1,-1), "Helvetica"),
        ("FONTNAME",   (0,0),(0,-1),  "Helvetica-Bold"),
        ("FONTNAME",   (2,0),(2,-1),  "Helvetica-Bold"),
        ("FONTNAME",   (1,2),(1,2),   "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 9),
        ("PADDING",    (0,0),(-1,-1), 6),
        ("GRID",       (0,0),(-1,-1), 0.5, colors.HexColor("#DDDDDD")),
        ("ROWBACKGROUNDS", (0,0),(-1,-1), [LIGHT, WHITE]),
    ]))
    story.append(tbl); story.append(Spacer(1,12))

    # Scene classification
    story.append(Paragraph("  SCENE CLASSIFICATION", sec_s))
    clf    = case.get("classification", {})
    stype  = clf.get("scene_type","unknown").upper() if isinstance(clf,dict) else str(clf)
    sconf  = clf.get("confidence", 0) * 100          if isinstance(clf,dict) else 0
    probs  = clf.get("probabilities", {})             if isinstance(clf,dict) else {}
    sc_color = RED if stype == "VIOLENCE" else GREEN

    stbl = Table([["Scene Type", stype, "Confidence", f"{sconf:.1f}%"]],
                 colWidths=[3*cm, 7.5*cm, 3*cm, 7.5*cm])
    stbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), LIGHT),
        ("BACKGROUND", (0,0),(0,0),   DARK),
        ("BACKGROUND", (2,0),(2,0),   DARK),
        ("TEXTCOLOR",  (0,0),(0,0),   WHITE),
        ("TEXTCOLOR",  (2,0),(2,0),   WHITE),
        ("TEXTCOLOR",  (1,0),(1,0),   sc_color),
        ("FONTNAME",   (0,0),(-1,-1), "Helvetica"),
        ("FONTNAME",   (1,0),(1,0),   "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 10),
        ("PADDING",    (0,0),(-1,-1), 8),
        ("GRID",       (0,0),(-1,-1), 0.5, colors.HexColor("#DDDDDD")),
    ]))
    story.append(stbl)
    if probs:
        story.append(Spacer(1,6))
        ptbl = Table([["Class","Probability"]] +
                     [[k.title(), f"{v*100:.1f}%"] for k,v in probs.items()],
                     colWidths=[10*cm, 11*cm])
        ptbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0),   DARK),
            ("TEXTCOLOR",     (0,0),(-1,0),   WHITE),
            ("FONTNAME",      (0,0),(-1,0),   "Helvetica-Bold"),
            ("FONTNAME",      (0,1),(-1,-1),  "Helvetica"),
            ("FONTSIZE",      (0,0),(-1,-1),  9),
            ("PADDING",       (0,0),(-1,-1),  6),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),  [LIGHT, WHITE]),
            ("GRID",          (0,0),(-1,-1),  0.5, colors.HexColor("#DDDDDD")),
        ]))
        story.append(ptbl)
    story.append(Spacer(1,8))

    # Detections
    story.append(Paragraph("  DETECTED OBJECTS", sec_s))
    dets = case.get("detections", [])
    if dets:
        dtbl = Table(
            [["Object","Confidence","Dangerous","Bounding Box"]] + [
                [d.get("object","?").title(),
                 f"{d.get('confidence',0)*100:.1f}%",
                 "⚠️ YES" if d.get("is_dangerous") else "No",
                 (f"({d['box'].get('x1',0)},{d['box'].get('y1',0)}) → "
                  f"({d['box'].get('x2',0)},{d['box'].get('y2',0)})")
                  if d.get("box") else "—"]
                for d in dets
            ], colWidths=[4*cm, 4*cm, 3.5*cm, 9.5*cm])
        dtbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0),  DARK),
            ("TEXTCOLOR",     (0,0),(-1,0),  WHITE),
            ("FONTNAME",      (0,0),(-1,0),  "Helvetica-Bold"),
            ("FONTNAME",      (0,1),(-1,-1), "Helvetica"),
            ("FONTSIZE",      (0,0),(-1,-1), 9),
            ("PADDING",       (0,0),(-1,-1), 6),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [LIGHT, WHITE]),
            ("GRID",          (0,0),(-1,-1), 0.5, colors.HexColor("#DDDDDD")),
        ]))
        story.append(dtbl)
    else:
        story.append(Paragraph("No objects detected.", body_s))
    story.append(Spacer(1,8))

    # Description
    story.append(Paragraph("  FORENSIC DESCRIPTION", sec_s))
    story.append(Paragraph(case.get("description","N/A"), body_s))
    story.append(Spacer(1,8))

    # Validation
    story.append(Paragraph("  IMAGE AUTHENTICITY ANALYSIS", sec_s))
    val      = case.get("validation", {})
    img_info = val.get("image_info", {}) if isinstance(val, dict) else {}
    vtbl = Table([
        ["Valid Format", "✅ YES" if val.get("is_valid") else "❌ NO",
         "Authentic",    "✅ YES" if val.get("is_authentic") else "⚠️ TAMPERED"],
        ["ELA Score",    f"{val.get('ela_score',0):.2f}",
         "Threshold",    "15.0"],
        ["Resolution",   f"{img_info.get('width','?')}×{img_info.get('height','?')}",
         "File Size",    img_info.get("file_size","N/A")],
    ], colWidths=[4*cm, 7*cm, 4*cm, 6*cm])
    vtbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), LIGHT),
        ("BACKGROUND", (0,0),(0,-1),  DARK),
        ("BACKGROUND", (2,0),(2,-1),  DARK),
        ("TEXTCOLOR",  (0,0),(0,-1),  WHITE),
        ("TEXTCOLOR",  (2,0),(2,-1),  WHITE),
        ("FONTNAME",   (0,0),(-1,-1), "Helvetica"),
        ("FONTNAME",   (0,0),(0,-1),  "Helvetica-Bold"),
        ("FONTNAME",   (2,0),(2,-1),  "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 9),
        ("PADDING",    (0,0),(-1,-1), 6),
        ("GRID",       (0,0),(-1,-1), 0.5, colors.HexColor("#DDDDDD")),
    ]))
    story.append(vtbl)

    # Footer
    story.append(Spacer(1,20))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT))
    story.append(Spacer(1,6))
    story.append(Paragraph(
        f"Generated by CrimeSolver AI Platform | Case {case_id} | "
        f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC | For authorized forensic use only",
        foot_s
    ))

    doc.build(story)
    print(f"✅ PDF report generated: {output_path}")
