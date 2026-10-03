# Audio Notes Platform

This is a full-stack web application built for the Gnani take-home assessment. It allows users to upload audio files of any length, transcribes them using Gnani's ASR API, and generates a concise summary using Google's Gemini AI.

## Tech Stack
* **Frontend**: Next.js (React), Tailwind CSS
* **Backend**: Python, FastAPI
* **Database & Storage**: Supabase (PostgreSQL + S3-compatible storage)
* **Audio Processing**: FFmpeg (via pydub) for chunking large files

## System Architecture
The application is designed to handle long-running audio transcriptions without blocking the main thread or timing out the client. 

When a user uploads a file, the FastAPI backend immediately saves it to Supabase Storage, creates a database record, and returns a 200 response with a job ID. The heavy lifting (chunking the audio to bypass the 60s REST API limit, calling the ASR API sequentially, and calling the LLM) is pushed to a background task. 

The Next.js frontend then polls the backend every few seconds to provide the user with live progress updates (Uploading -> Transcribing -> Summarizing -> Done).

For more details, see the `/architecture` page within the application.

## Local Setup

### Prerequisites
* Node.js (v18+)
* Python 3.9+
* FFmpeg installed on your system path

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/Scripts/activate # Windows
pip install -r requirements.txt
```
Create a `.env` file in the `backend` folder with your API keys:
`SUPABASE_URL`, `SUPABASE_KEY`, `GNANI_API_KEY`, `GEMINI_API_KEY`

Run the server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` to use the application.

## Author
Harsh Joshi
