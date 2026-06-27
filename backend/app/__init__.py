from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
import os

# Import Routers
from app.routes.chat import router as chat_router
from app.routes.image import router as image_router

def create_app() -> FastAPI:
    # Load environment variables from .env
    load_dotenv()
    
    # Initialize FastAPI app
    app = FastAPI(title="Kinal AI Backend", version="1.0.0")
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Register routers
    app.include_router(chat_router)
    app.include_router(image_router)
    
    # Configure Jinja2 templates
    templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))
    
    # Route for serving the basic UI
    @app.get("/", response_class=HTMLResponse)
    async def home(request: Request):
        return templates.TemplateResponse(request, "index.html")
        
    return app
