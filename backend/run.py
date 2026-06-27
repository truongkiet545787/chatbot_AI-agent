import uvicorn
import os
from dotenv import load_dotenv
from app import create_app

load_dotenv()

# Khởi tạo biến app ở mức top-level để Render/Gunicorn nhận diện được 'run:app'
app = create_app()

if __name__ == '__main__':
    # Allow port to be configured via PORT environment variable, default to 5000
    port = int(os.getenv('PORT', 5000))
    uvicorn.run("run:app", host="0.0.0.0", port=port, reload=True)

