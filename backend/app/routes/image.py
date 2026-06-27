from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import traceback
from app.services.stability_service import StabilityService
from app.services.sam_service import SAMService

router = APIRouter()
sam_service = SAMService()

class GenerateImageRequest(BaseModel):
    prompt: str
    aspect_ratio: Optional[str] = "1:1"
    output_format: Optional[str] = "png"
    negative_prompt: Optional[str] = ""
    seed: Optional[int] = 0

class GenerateImageVariationRequest(BaseModel):
    base64: str
    prompt: Optional[str] = "Create variation of this image, high quality, realistic"
    strength: Optional[float] = 0.7
    output_format: Optional[str] = "png"
    negative_prompt: Optional[str] = ""
    seed: Optional[int] = 0

class SketchToImageRequest(BaseModel):
    base64: str
    prompt: str
    control_strength: Optional[float] = 0.7
    output_format: Optional[str] = "png"
    negative_prompt: Optional[str] = ""
    seed: Optional[int] = 0

class ReplaceObjectRequest(BaseModel):
    base64Original: str
    base64Masked: str
    prompt: str
    output_format: Optional[str] = "png"
    negative_prompt: Optional[str] = ""
    seed: Optional[int] = 0

class SegmentSamRequest(BaseModel):
    image: str
    x: float
    y: float
    display_width: float
    display_height: float

@router.post("/ai-demos/generate-image")
async def generate_image(request: GenerateImageRequest):
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp prompt để tạo ảnh.")
        
    api_key = os.getenv('STABILITY_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy STABILITY_API_KEY trong file .env. Vui lòng cấu hình STABILITY_API_KEY.")
        
    try:
        stability_service = StabilityService(api_key=api_key)
        # StabilityService is async, so we can await it directly!
        image_b64 = await stability_service.generate_image_async(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            output_format=request.output_format,
            negative_prompt=request.negative_prompt,
            seed=request.seed
        )
        return {
            "b64_json": image_b64
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-demos/generate-image-variation")
async def generate_image_variation(request: GenerateImageVariationRequest):
    if not request.base64:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp ảnh gốc để tạo biến thể.")
        
    api_key = os.getenv('STABILITY_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy STABILITY_API_KEY trong file .env.")
        
    try:
        stability_service = StabilityService(api_key=api_key)
        image_b64_res = await stability_service.generate_image_variation_async(
            image_b64=request.base64,
            prompt=request.prompt,
            strength=request.strength,
            output_format=request.output_format,
            negative_prompt=request.negative_prompt,
            seed=request.seed
        )
        return {
            "b64_json": image_b64_res
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-demos/sketch-to-image")
async def sketch_to_image(request: SketchToImageRequest):
    if not request.base64:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp nét vẽ phác thảo.")
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp prompt mô tả ảnh phác thảo.")
        
    api_key = os.getenv('STABILITY_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy STABILITY_API_KEY.")
        
    try:
        stability_service = StabilityService(api_key=api_key)
        image_b64_res = await stability_service.sketch_to_image_async(
            image_b64=request.base64,
            prompt=request.prompt,
            control_strength=request.control_strength,
            output_format=request.output_format,
            negative_prompt=request.negative_prompt,
            seed=request.seed
        )
        return {
            "image": image_b64_res
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-demos/replace-object")
async def replace_object(request: ReplaceObjectRequest):
    if not request.base64Original or not request.base64Masked:
        raise HTTPException(status_code=400, detail="Thiếu ảnh gốc hoặc ảnh mặt nạ.")
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp prompt để thay thế đối tượng.")
        
    api_key = os.getenv('STABILITY_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy STABILITY_API_KEY.")
        
    try:
        stability_service = StabilityService(api_key=api_key)
        image_b64_res = await stability_service.inpaint_async(
            image_b64=request.base64Original,
            mask_b64=request.base64Masked,
            prompt=request.prompt,
            output_format=request.output_format,
            negative_prompt=request.negative_prompt,
            seed=request.seed
        )
        return {
            "image": image_b64_res
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-demos/segment-sam")
async def segment_sam(request: SegmentSamRequest):
    try:
        mask_b64 = sam_service.segment_by_point(
            image_b64=request.image,
            x=request.x,
            y=request.y,
            display_width=request.display_width,
            display_height=request.display_height
        )
        return {
            "mask": mask_b64
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
