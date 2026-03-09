mkdir backend
cd backend
python -m venv venv
pip install -r requirements.txt

uvicorn app.main:app --reload


pip install agora-token-builder