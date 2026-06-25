from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    # Allow port to be configured via PORT environment variable, default to 5000
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, port=port)
