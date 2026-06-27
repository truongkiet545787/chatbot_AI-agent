FROM python:3.10-slim

WORKDIR /app

# Install system packages required by OpenCV / PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt-lists/*

# Install PyTorch CPU first for fast download
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install dependencies from backend directory
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ .

# Hugging Face Spaces listens on port 7860 by default
EXPOSE 7860

# Start Uvicorn on port 7860
CMD ["uvicorn", "app:create_app", "--host", "0.0.0.0", "--port", "7860", "--factory"]
