export default function Architecture() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-white">
          System Architecture
        </h1>
        <p className="text-zinc-400 text-lg">
          A high-level overview of how the Audio Notes platform processes audio files asynchronously.
        </p>
      </div>

      <div className="glass rounded-3xl p-8 md:p-12 prose prose-invert max-w-none">
        <h2>The Flow</h2>
        <p>
          The system is designed to handle audio files of any length without blocking the user interface. 
          Here is the step-by-step lifecycle of an upload:
        </p>
        <ol>
          <li>
            <strong>Upload:</strong> The user selects a file and clicks upload. The Next.js frontend sends a 
            multipart form request to the FastAPI backend.
          </li>
          <li>
            <strong>Storage & DB (Synchronous):</strong> The backend receives the file, saves it temporarily, 
            uploads it to a <strong>Supabase Storage Bucket</strong>, and inserts a new row into the 
            <strong>Supabase Postgres Database</strong> with a status of <code>uploaded</code>. The backend immediately 
            returns a unique <code>file_id</code> to the frontend.
          </li>
          <li>
            <strong>Processing (Background):</strong> FastAPI's <code>BackgroundTasks</code> takes over. It updates 
            the database status to <code>transcribing</code>.
          </li>
          <li>
            <strong>Chunking & ASR:</strong> Since the Gnani ASR REST API has a 60-second limit, the background 
            worker uses <code>pydub</code> (FFmpeg) to split the audio into 50-second chunks. It calls the Gnani API 
            sequentially for each chunk and concatenates the transcript.
          </li>
          <li>
            <strong>Summarization:</strong> The status updates to <code>summarizing</code>. The full transcript is 
            sent to the <strong>Google Gemini 1.5 Flash</strong> model with a prompt to generate an executive summary 
            and bullet points.
          </li>
          <li>
            <strong>Completion:</strong> The status updates to <code>done</code>, and the transcript and summary are 
            saved to the database. The temporary local files are deleted.
          </li>
        </ol>

        <h2>Frontend Polling</h2>
        <p>
          Instead of keeping an HTTP request open for minutes (which causes timeouts on platforms like Vercel or Render), 
          the frontend uses a <strong>polling mechanism</strong>. Every 2 seconds, it pings the <code>/status/&#123;id&#125;</code> 
          endpoint. The UI updates dynamically based on the database status (<code>uploading</code> -> <code>uploaded</code> -> 
          <code>transcribing</code> -> <code>summarizing</code> -> <code>done</code>/<code>failed</code>).
        </p>

        <h2>Future Improvements (With more time)</h2>
        <ul>
          <li><strong>WebSockets:</strong> Replace polling with WebSockets for true real-time bidirectional status updates.</li>
          <li><strong>Message Queue:</strong> Use Redis + Celery (or BullMQ) instead of FastAPI BackgroundTasks for better reliability, retries, and persistence in case the server restarts.</li>
          <li><strong>Concurrent ASR:</strong> Process the audio chunks in parallel using `asyncio.gather` to dramatically speed up transcription for long files.</li>
        </ul>

        <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center">
          <span className="text-zinc-400">Built for the Gnani Internship Task</span>
          <a href="https://github.com/hj722005-gif" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-medium">
            View GitHub Profile &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
