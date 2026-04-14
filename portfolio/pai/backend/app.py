from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

from routes.tasks import tasks_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(tasks_bp, url_prefix='/api')

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
