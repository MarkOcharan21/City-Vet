# -*- coding: utf-8 -*-
"""
PaddleOCR sidecar service for the Pet Vet System backend.

Accepts a receipt image via multipart POST and returns the recognized text
plus per-line detections as JSON. Runs on 127.0.0.1:5001 by default and is
only called by the Node.js backend (never exposed to the LAN).

Endpoint:  POST /ocr      (multipart field: "image", optional: "refine" = 1)
           GET  /health

When refine=1 the receipt is OCR'ed twice — once on the original photo and once
on an adaptive-threshold binarized copy of the *same* geometry — and the two
line lists are merged by bounding-box overlap. Binarization recovers very faint
table rows (common on Treasury ORs) and doing it at the same resolution as the
first pass keeps the boxes aligned so merging is exact.

All boxes are returned normalized to 0..1 (relative to the working image) so the
frontend can compare/group detections independently of the photo resolution.
"""

import os
import tempfile
import threading
import time

import cv2
import numpy as np
from flask import Flask, jsonify, request
from paddleocr import PaddleOCR

app = Flask(__name__)

# The model is built once during startup (main thread) so no request thread
# ever races on construction and no deadlock can pin the lock. Inference is
# still serialized because PaddleOCR predictors are not thread-safe.
_ocr = None
_ocr_lock = threading.Lock()

_MAX_SIDE = 2400  # matches the PaddleOCR det limit


def build_ocr():
    return PaddleOCR(
        use_angle_cls=True,
        lang="en",
        show_log=False,
        det_limit_side_len=_MAX_SIDE,
    )


def warm_up():
    """Construct the model before serving requests (downloads models on first boot)."""
    global _ocr
    started = time.time()
    print("Warming up PaddleOCR (first boot downloads models, this can take a while)...", flush=True)
    _ocr = build_ocr()
    print(f"PaddleOCR ready in {time.time() - started:.1f}s.", flush=True)


# ---------------------------------------------------------------------------
# Image preparation helpers
# ---------------------------------------------------------------------------

def prepare_image(data):
    """Decode the upload, downscale so the longest side is <= _MAX_SIDE and
    return a grayscale 0..255 numpy array. Paddle reports boxes in the exact
    space of the image it is given, so working at the det limit keeps every
    detection comparable across passes."""
    raw = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if raw is None:
        raise ValueError("Could not decode the uploaded image.")
    h, w = raw.shape[:2]
    scale = min(1.0, _MAX_SIDE / float(max(h, w)))
    if scale < 1.0:
        nw = max(1, int(round(w * scale)))
        nh = max(1, int(round(h * scale)))
        raw = cv2.resize(raw, (nw, nh), interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(raw, cv2.COLOR_BGR2GRAY)


def binarize(image):
    """Adaptive-threshold binarization that lifts faint/gray print (the typical
    Treasury OR item rows) while keeping the same geometry as `image`."""
    blurred = cv2.GaussianBlur(image, (3, 3), 0)
    block = max(15, (min(image.shape) // 8) | 1)  # odd & roughly scale-aware
    block = min(block, 99)
    thresh = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block,
        10,
    )
    # Merge OCR noise dots and strengthen thin strokes a touch.
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    return cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

def run_inference(image):
    """OCR one in-memory image (grayscale uint8). Returns raw Paddle result."""
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    try:
        cv2.imwrite(tmp.name, image)
        tmp.close()
        with _ocr_lock:
            return _ocr.ocr(tmp.name, cls=True)
    finally:
        try:
            os.remove(tmp.name)
        except OSError:
            pass


def raw_lines(result):
    """Flatten the Paddle result into [box, text, confidence] rows."""
    out = []
    for page in result or []:
        for det in page or []:
            box = det[0] if isinstance(det[0], list) else []
            text = ""
            conf = 0.0
            if len(det) > 1 and isinstance(det[1], (list, tuple)) and det[1]:
                text = str(det[1][0] or "").strip()
                try:
                    conf = round(float(det[1][1]), 4)
                except (TypeError, ValueError):
                    conf = 0.0
            if text:
                out.append([box, text, conf])
    return out


def rect(box):
    xs = [p[0] for p in box]
    ys = [p[1] for p in box]
    return min(xs), min(ys), max(xs), max(ys)


def box_iou(a, b):
    ax0, ay0, ax1, ay1 = rect(a)
    bx0, by0, bx1, by1 = rect(b)
    ix = max(0.0, min(ax1, bx1) - max(ax0, bx0))
    iy = max(0.0, min(ay1, by1) - max(ay0, by0))
    inter = ix * iy
    if inter <= 0:
        return 0.0
    aa = (ax1 - ax0) * (ay1 - ay0)
    bb = (bx1 - bx0) * (by1 - by0)
    return inter / float(aa + bb - inter)


def merge_passes(primary, fine):
    """Merge two line lists (same geometry). Where boxes overlap by more than
    half, keep the higher-confidence reading; non-overlapping lines from the
    binarized pass are appended (they recovered faint text the first pass
    missed)."""
    out = list(primary)
    for [box, text, conf] in fine:
        best = -1
        best_iou = 0.0
        for i, pd in enumerate(out):
            ov = box_iou(box, pd[0])
            if ov > best_iou:
                best_iou = ov
                best = i
        if best >= 0 and best_iou > 0.5:
            if conf > out[best][2]:
                out[best] = [box, text, conf]
        else:
            out.append([box, text, conf])
    return out


def to_normalized(lines, width, height):
    out = []
    for [box, text, conf] in lines:
        nb = [[round(max(0.0, min(1.0, p[0] / width)), 5), round(max(0.0, min(1.0, p[1] / height)), 5)] for p in box]
        out.append({"text": text, "confidence": conf, "box": nb})
    return out


def sort_lines(lines):
    """Order detections top-to-bottom (then left-to-right)."""
    lines.sort(key=lambda ln: (
        round(sum(p[1] for p in ln[0]) / max(1, len(ln[0])), 3),
        round(sum(p[0] for p in ln[0]) / max(1, len(ln[0])), 3),
    ))
    return lines


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"success": True, "service": "paddle-ocr", "ready": _ocr is not None})


@app.route("/ocr", methods=["POST"])
def ocr_image():
    if _ocr is None:
        return jsonify({"success": False, "error": "OCR service still warming up."}), 503

    if "image" not in request.files:
        return jsonify({"success": False, "error": "Missing 'image' multipart field."}), 400

    refine = request.form.get("refine", "") in ("1", "true", "True", "yes")
    data = request.files["image"].read()
    if not data:
        return jsonify({"success": False, "error": "Empty image upload."}), 400

    started = time.time()
    try:
        image = prepare_image(data)
        height, width = image.shape[:2]

        primary = sort_lines(raw_lines(run_inference(image)))

        passes = 1
        merged = primary
        if refine:
            fine = sort_lines(raw_lines(run_inference(binarize(image))))
            merged = to_normalized(merge_passes(primary, fine), width, height)
            passes = 2
        else:
            merged = to_normalized(primary, width, height)

        merged.sort(key=lambda ln: (
            round(sum(p[1] for p in ln["box"]) / 4, 3),
            round(sum(p[0] for p in ln["box"]) / 4, 3),
        ))

        confidences = [ln["confidence"] for ln in merged if ln["confidence"] > 0]
        avg_conf = round(sum(confidences) / len(confidences), 4) if confidences else 0.0
        text_blob = "\n".join(ln["text"] for ln in merged if ln["text"])

        return jsonify({
            "success": True,
            "engine": "paddle",
            "text": text_blob,
            "confidence": avg_conf,
            "lines": merged,
            "passes": passes,
            "elapsed_ms": round((time.time() - started) * 1000),
        })
    except Exception as exc:  # noqa: BLE001 - surface any OCR failure to the caller
        return jsonify({"success": False, "error": str(exc)}), 500


if __name__ == "__main__":
    warm_up()
    port = int(os.environ.get("OCR_SERVICE_PORT", "5001"))
    print(f"Starting PaddleOCR service on http://127.0.0.1:{port}", flush=True)
    app.run(host="127.0.0.1", port=port, threaded=True)