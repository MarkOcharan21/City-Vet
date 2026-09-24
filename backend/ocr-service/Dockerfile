# PaddleOCR sidecar — deployed as its own Koyeb service so receipt OCR keeps
# working in the cloud. Serve on 0.0.0.0:$PORT (Koyeb injects PORT).
FROM python:3.9-slim

WORKDIR /app

# OpenCV + PaddleOCR system deps (Paddle slim needs no extra rendering libs).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ocr_service.py .

ENV OCR_SERVICE_HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

EXPOSE 5001

CMD ["python", "ocr_service.py"]