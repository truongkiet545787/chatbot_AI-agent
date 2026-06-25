import os
import requests
import httpx

class StabilityService:
    def __init__(self, api_key=None, api_url=None):
        self.api_key = api_key or os.getenv('STABILITY_API_KEY')
        # Default to Stable Image Core API, but allow overriding via environment variable
        self.api_url = api_url or os.getenv('STABILITY_API_URL', 'https://api.stability.ai/v2beta/stable-image/generate/core')

    def generate_image(self, prompt, aspect_ratio="1:1", output_format="png", negative_prompt="", seed=0):
        if not self.api_key:
            raise ValueError("STABILITY_API_KEY is not configured in the environment variables.")

        headers = {
            "authorization": f"Bearer {self.api_key}",
            "accept": "application/json"
        }

        # Send text parameters via data (form data) as in the Colab notebook
        data = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format
        }
        if negative_prompt:
            data["negative_prompt"] = negative_prompt
        if seed:
            data["seed"] = str(seed)

        # Force requests to use multipart/form-data by passing an empty files dictionary, matching Colab
        files = {"none": ""}

        response = requests.post(self.api_url, headers=headers, files=files, data=data)

        if response.status_code == 200:
            response_json = response.json()
            image_b64 = response_json.get("image")
            if not image_b64:
                raise ValueError("No image data found in the Stability API response.")
            return image_b64
        else:
            try:
                error_detail = response.json()
            except Exception:
                error_detail = response.text
            raise RuntimeError(f"Stability API error (status {response.status_code}): {error_detail}")

    async def generate_image_async(self, prompt, aspect_ratio="1:1", output_format="png", negative_prompt="", seed=0):
        if not self.api_key:
            raise ValueError("STABILITY_API_KEY is not configured in the environment variables.")

        headers = {
            "authorization": f"Bearer {self.api_key}",
            "accept": "application/json"
        }

        data = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format
        }
        if negative_prompt:
            data["negative_prompt"] = negative_prompt
        if seed:
            data["seed"] = str(seed)

        # Force httpx to use multipart/form-data by passing an empty files dictionary
        files = {"none": ("", "")}

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(self.api_url, headers=headers, files=files, data=data)

        if response.status_code == 200:
            response_json = response.json()
            image_b64 = response_json.get("image")
            if not image_b64:
                raise ValueError("No image data found in the Stability API response.")
            return image_b64
        else:
            try:
                error_detail = response.json()
            except Exception:
                error_detail = response.text
            raise RuntimeError(f"Stability API error (status {response.status_code}): {error_detail}")

    async def generate_image_variation_async(self, image_b64, prompt, strength=0.7, output_format="png", negative_prompt="", seed=0):
        import base64
        if not self.api_key:
            raise ValueError("STABILITY_API_KEY is not configured in the environment variables.")

        headers = {
            "authorization": f"Bearer {self.api_key}",
            "accept": "application/json"
        }

        # Stability Image v2beta expects strength and mode parameter for image-to-image
        data = {
            "prompt": prompt,
            "strength": str(strength),
            "output_format": output_format,
            "mode": "image-to-image"
        }
        if negative_prompt:
            data["negative_prompt"] = negative_prompt
        if seed:
            data["seed"] = str(seed)

        image_bytes = base64.b64decode(image_b64)
        files = {
            "image": ("image.png", image_bytes, "image/png")
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(self.api_url, headers=headers, files=files, data=data)

        if response.status_code == 200:
            response_json = response.json()
            res_image_b64 = response_json.get("image")
            if not res_image_b64:
                raise ValueError("No image data found in the Stability API response.")
            return res_image_b64
        else:
            try:
                error_detail = response.json()
            except Exception:
                error_detail = response.text
            raise RuntimeError(f"Stability API error (status {response.status_code}): {error_detail}")

    async def sketch_to_image_async(self, image_b64, prompt, control_strength=0.7, output_format="png", negative_prompt="", seed=0):
        import base64
        if not self.api_key:
            raise ValueError("STABILITY_API_KEY is not configured in the environment variables.")

        headers = {
            "authorization": f"Bearer {self.api_key}",
            "accept": "application/json"
        }

        url = "https://api.stability.ai/v2beta/stable-image/control/sketch"

        data = {
            "prompt": prompt,
            "control_strength": str(control_strength),
            "output_format": output_format
        }
        if negative_prompt:
            data["negative_prompt"] = negative_prompt
        if seed:
            data["seed"] = str(seed)

        image_bytes = base64.b64decode(image_b64)
        files = {
            "image": ("sketch.png", image_bytes, "image/png")
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, files=files, data=data)

        if response.status_code == 200:
            response_json = response.json()
            res_image_b64 = response_json.get("image")
            if not res_image_b64:
                raise ValueError("No image data found in the Stability API response.")
            return res_image_b64
        else:
            try:
                error_detail = response.json()
            except Exception:
                error_detail = response.text
            raise RuntimeError(f"Stability API error (status {response.status_code}): {error_detail}")

    async def inpaint_async(self, image_b64, mask_b64, prompt, output_format="png", negative_prompt="", seed=0):
        import base64
        if not self.api_key:
            raise ValueError("STABILITY_API_KEY is not configured in the environment variables.")

        headers = {
            "authorization": f"Bearer {self.api_key}",
            "accept": "application/json"
        }

        url = "https://api.stability.ai/v2beta/stable-image/edit/inpaint"

        data = {
            "prompt": prompt,
            "output_format": output_format
        }
        if negative_prompt:
            data["negative_prompt"] = negative_prompt
        if seed:
            data["seed"] = str(seed)

        image_bytes = base64.b64decode(image_b64)
        mask_bytes = base64.b64decode(mask_b64)
        files = {
            "image": ("image.png", image_bytes, "image/png"),
            "mask": ("mask.png", mask_bytes, "image/png")
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, files=files, data=data)

        if response.status_code == 200:
            response_json = response.json()
            res_image_b64 = response_json.get("image")
            if not res_image_b64:
                raise ValueError("No image data found in the Stability API response.")
            return res_image_b64
        else:
            try:
                error_detail = response.json()
            except Exception:
                error_detail = response.text
            raise RuntimeError(f"Stability API error (status {response.status_code}): {error_detail}")



