from flask import Blueprint, request, jsonify
from app.services.stability_service import StabilityService
import os
import asyncio
import traceback

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
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@image_bp.route('/ai-demos/generate-image-variation', methods=['POST'])
def generate_image_variation():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Không nhận được dữ liệu yêu cầu."}), 400
        
    image_b64 = data.get('base64', '')
    if not image_b64:
        return jsonify({"error": "Vui lòng cung cấp ảnh gốc để tạo biến thể."}), 400
        
    prompt = data.get('prompt', 'Create variation of this image, high quality, realistic')
    strength = data.get('strength', 0.7)
    output_format = data.get('output_format', 'png')
    negative_prompt = data.get('negative_prompt', '')
    seed = data.get('seed', 0)
    
    try:
        api_key = os.getenv('STABILITY_API_KEY')
        if not api_key:
            return jsonify({"error": "Không tìm thấy STABILITY_API_KEY trong file .env."}), 500
            
        stability_service = StabilityService(api_key=api_key)
        image_b64_res = asyncio.run(stability_service.generate_image_variation_async(
            image_b64=image_b64,
            prompt=prompt,
            strength=strength,
            output_format=output_format,
            negative_prompt=negative_prompt,
            seed=seed
        ))
        
        return jsonify({
            "b64_json": image_b64_res
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@image_bp.route('/ai-demos/sketch-to-image', methods=['POST'])
def sketch_to_image():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Không nhận được dữ liệu yêu cầu."}), 400
        
    image_b64 = data.get('base64', '')
    if not image_b64:
        return jsonify({"error": "Vui lòng cung cấp nét vẽ phác thảo."}), 400
        
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"error": "Vui lòng cung cấp prompt mô tả ảnh phác thảo."}), 400
        
    control_strength = data.get('control_strength', 0.7)
    output_format = data.get('output_format', 'png')
    negative_prompt = data.get('negative_prompt', '')
    seed = data.get('seed', 0)
    
    try:
        api_key = os.getenv('STABILITY_API_KEY')
        if not api_key:
            return jsonify({"error": "Không tìm thấy STABILITY_API_KEY."}), 500
            
        stability_service = StabilityService(api_key=api_key)
        image_b64_res = asyncio.run(stability_service.sketch_to_image_async(
            image_b64=image_b64,
            prompt=prompt,
            control_strength=control_strength,
            output_format=output_format,
            negative_prompt=negative_prompt,
            seed=seed
        ))
        
        # Frontend expects 'image' key in sketch-to-image response
        return jsonify({
            "image": image_b64_res
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@image_bp.route('/ai-demos/replace-object', methods=['POST'])
def replace_object():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Không nhận được dữ liệu yêu cầu."}), 400
        
    image_b64 = data.get('base64Original', '')
    mask_b64 = data.get('base64Masked', '')
    
    if not image_b64 or not mask_b64:
        return jsonify({"error": "Thiếu ảnh gốc hoặc ảnh mặt nạ."}), 400
        
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"error": "Vui lòng cung cấp prompt để thay thế đối tượng."}), 400
        
    output_format = data.get('output_format', 'png')
    negative_prompt = data.get('negative_prompt', '')
    seed = data.get('seed', 0)
    
    try:
        api_key = os.getenv('STABILITY_API_KEY')
        if not api_key:
            return jsonify({"error": "Không tìm thấy STABILITY_API_KEY."}), 500
            
        stability_service = StabilityService(api_key=api_key)
        image_b64_res = asyncio.run(stability_service.inpaint_async(
            image_b64=image_b64,
            mask_b64=mask_b64,
            prompt=prompt,
            output_format=output_format,
            negative_prompt=negative_prompt,
            seed=seed
        ))
        
        # Frontend expects 'image' key in replace-object response
        return jsonify({
            "image": image_b64_res
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
