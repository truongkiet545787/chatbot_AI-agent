import base64
from io import BytesIO
from PIL import Image
import numpy as np
from ultralytics import SAM
import logging
import torch

logger = logging.getLogger(__name__)

class SAMService:
    def __init__(self, model_path=None):
        import os
        self.model_path = model_path or os.getenv('SAM_MODEL_NAME', 'mobile_sam.pt')
        self.model = None

    def load_model(self):
        if self.model is None:
            logger.info(f"Loading SAM model from {self.model_path}...")
            # If mobile_sam.pt is not present, ultralytics will automatically download it.
            self.model = SAM(self.model_path)
            logger.info("SAM model loaded successfully.")
        return self.model

    def segment_by_point(self, image_b64: str, x: float, y: float, display_width: float, display_height: float) -> str:
        """
        Runs MobileSAM on the input image using a point prompt.
        Returns the base64-encoded binary mask (PNG format).
        """
        # Load model
        model = self.load_model()

        # Decode image
        image_data = base64.b64decode(image_b64)
        img = Image.open(BytesIO(image_data)).convert("RGB")
        img_width, img_height = img.size

        # Scale coordinate to original image size
        x_orig = x * (img_width / display_width)
        y_orig = y * (img_height / display_height)
        
        # Clip coordinates to image boundary
        x_orig = max(0, min(x_orig, img_width - 1))
        y_orig = max(0, min(y_orig, img_height - 1))

        # Determine device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[SAM] Click coordinate on display: ({x}, {y}) on size ({display_width}x{display_height})")
        print(f"[SAM] Scaled coordinate on original image ({img_width}x{img_height}): ({x_orig}, {y_orig})")
        print(f"[SAM] Running inference on device: {device}")

        # Run inference
        # points expects [[x, y]], labels expects [1] for foreground
        results = model.predict(img, points=[[x_orig, y_orig]], labels=[1], device=device, verbose=False)
        result = results[0]

        if result.masks is None:
            raise ValueError("No segment masks found for the clicked point.")

        # Get the first mask as boolean numpy array
        mask_np = result.masks.data[0].cpu().numpy() # Shape: (H, W)

        # Create an RGBA image where background is transparent and foreground is white/opaque
        h, w = mask_np.shape
        rgba_mask = np.zeros((h, w, 4), dtype=np.uint8)
        rgba_mask[mask_np > 0] = [255, 255, 255, 255]
        rgba_mask[mask_np == 0] = [0, 0, 0, 0]
        
        mask_img = Image.fromarray(rgba_mask, mode='RGBA')

        # Save to PNG and return as base64
        buffered = BytesIO()
        mask_img.save(buffered, format="PNG")
        mask_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return mask_b64
