from flask import Blueprint, request, jsonify
from app.services.stability_service import StabilityService
import os
import asyncio

image_bp = Blueprint('image', __name__)

@image_bp.route('/ai-demos/generate-image', methods=['POST'])
def generate_image():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Không nhận được dữ liệu yêu cầu."}), 400
        
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"error": "Vui lòng cung cấp prompt để tạo ảnh."}), 400
        
    # Optional parameters (default to 1:1 aspect ratio and png format)
    aspect_ratio = data.get('aspect_ratio', '1:1')
    output_format = data.get('output_format', 'png')
    negative_prompt = data.get('negative_prompt', '')
    seed = data.get('seed', 0)
    
    try:
        api_key = os.getenv('STABILITY_API_KEY')
        if not api_key:
            return jsonify({"error": "Không tìm thấy STABILITY_API_KEY trong file .env. Vui lòng cấu hình STABILITY_API_KEY."}), 500
            
        stability_service = StabilityService(api_key=api_key)
        image_b64 = asyncio.run(stability_service.generate_image_async(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            output_format=output_format,
            negative_prompt=negative_prompt,
            seed=seed
        ))
        
        # The frontend expects the image data in base64 format under the key 'b64_json'
        return jsonify({
            "b64_json": image_b64
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



