import os
import uuid
import time
import requests
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from pydub import AudioSegment
import imageio_ffmpeg
AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()
import tempfile

load_dotenv()

app = FastAPI(title="Audio Notes API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GNANI_API_KEY = os.getenv("GNANI_API_KEY")

class UploadResponse(BaseModel):
    id: str

def process_audio(file_id: str, file_path: str, original_filename: str, language_code: str):
    try:
        # Update status to transcribing
        supabase.table("transcripts").update({"status": "transcribing"}).eq("id", file_id).execute()
        
        # Load audio and split into 50 second chunks to respect Gnani's 60s limit
        audio = AudioSegment.from_file(file_path)
        chunk_length_ms = 25000 
        chunks = [audio[i:i+chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]
        
        full_transcript = ""
        
        for i, chunk in enumerate(chunks):
            # Export chunk to a temp file safely for Windows
            temp_audio = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            temp_name = temp_audio.name
            temp_audio.close() # Close it so other processes can access it
            
            chunk.export(temp_name, format="wav")
            
            # Call Gnani API
            url = "https://api.vachana.ai/stt/v3"
            headers = {
                "X-API-Key-ID": GNANI_API_KEY
            }
            with open(temp_name, "rb") as audio_file:
                files = {
                    "audio_file": audio_file
                }
                data = {
                    "language_code": language_code
                }
                
                response = requests.post(url, headers=headers, files=files, data=data)
                
            os.remove(temp_name)
                
            if response.status_code == 200:
                result = response.json()
                # Assuming standard gnani response structure
                # Depending on exact structure, we might need to adjust this parsing
                # Let's extract transcript, often it's in result['transcript'] or result['text']
                # Will try a few common keys
                res_data = response.json()
                chunk_text = res_data.get('transcript', res_data.get('text', res_data.get('text_string', '')))
                if not chunk_text and 'results' in res_data:
                    chunk_text = " ".join([r.get('transcript', '') for r in res_data['results']])
                full_transcript += chunk_text + " "
            else:
                raise Exception(f"Gnani API Error: {response.text}")
                    
        # Update status to summarizing
        supabase.table("transcripts").update({
            "status": "summarizing",
            "transcript": full_transcript.strip()
        }).eq("id", file_id).execute()
        
        # Call Gemini for summary via REST API with retries for 503 errors
        prompt = f"Summarize the following transcript into a concise paragraph. Also provide 3 bullet points with key takeaways.\n\nTranscript: {full_transcript}"
        
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"
        gemini_payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        gemini_headers = {"Content-Type": "application/json"}
        
        summary = ""
        max_retries = 3
        for attempt in range(max_retries):
            gemini_res = requests.post(gemini_url, json=gemini_payload, headers=gemini_headers)
            if gemini_res.status_code == 200:
                summary = gemini_res.json()["candidates"][0]["content"]["parts"][0]["text"]
                break
            elif attempt < max_retries - 1:
                time.sleep(2 ** attempt) # Exponential backoff
            else:
                raise Exception(f"Gemini API Error: {gemini_res.text}")
        
        # Update status to done
        supabase.table("transcripts").update({
            "status": "done",
            "summary": summary
        }).eq("id", file_id).execute()
        
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        # Update status to failed
        supabase.table("transcripts").update({
            "status": "failed",
            "summary": f"Failed: {str(e)}"
        }).eq("id", file_id).execute()
    finally:
        # Clean up original file
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/upload", response_model=UploadResponse)
async def upload_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...), language: str = Form("en-IN")):
    # Create DB Record
    file_id = str(uuid.uuid4())
    
    # Save file temporarily on backend
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"{file_id}_{file.filename}")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    # Upload to Supabase Storage
    try:
        with open(file_path, "rb") as f:
            supabase.storage.from_("audio_uploads").upload(f"{file_id}/{file.filename}", f)
    except Exception as e:
        print(f"Storage upload error (continuing anyway): {e}")

    # Insert into DB
    try:
        supabase.table("transcripts").insert({
            "id": file_id,
            "filename": file.filename,
            "status": "uploaded",
            "transcript": "",
            "summary": ""
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: Make sure the 'transcripts' table exists in Supabase. Error: {str(e)}")
        
    # Trigger background job
    background_tasks.add_task(process_audio, file_id, file_path, file.filename, language)
    
    return {"id": file_id}

@app.get("/status/{file_id}")
def get_status(file_id: str):
    response = supabase.table("transcripts").select("*").eq("id", file_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]

@app.get("/history")
def get_history():
    response = supabase.table("transcripts").select("*").order("created_at", desc=True).execute()
    return response.data
