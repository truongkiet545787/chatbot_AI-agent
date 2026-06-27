import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == '__main__':
    # Allow port to be configured via PORT environment variable, default to 5000
    port = int(os.getenv('PORT', 5000))
    # We use factory=True because create_app is an application factory function
    uvicorn.run("app:create_app", host="0.0.0.0", port=port, factory=True, reload=True)
