"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileAudio, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://localhost:8000";

type Status = "idle" | "uploading" | "uploaded" | "transcribing" | "summarizing" | "done" | "failed";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fileId, setFileId] = useState<string | null>(null);
  const [language, setLanguage] = useState("en-IN");
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setResult(null);
      setErrorMsg("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFileId(res.data.id);
      setStatus("uploaded");
    } catch (error: any) {
      console.error(error);
      setStatus("failed");
      const backendError = error.response?.data?.detail;
      setErrorMsg(backendError || "Failed to upload the file to the server. Is the backend running?");
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (fileId && ["uploaded", "transcribing", "summarizing"].includes(status)) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/status/${fileId}`);
          const currentStatus = res.data.status;
          setStatus(currentStatus as Status);
          
          if (currentStatus === "done" || currentStatus === "failed") {
            setResult(res.data);
            clearInterval(interval);
            if (currentStatus === "failed") setErrorMsg(res.data.summary);
          }
        } catch (error) {
          console.error("Polling error", error);
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [fileId, status]);

  const renderStatusIcon = () => {
    switch (status) {
      case "idle": return <UploadCloud className="w-12 h-12 text-zinc-400 mb-4" />;
      case "uploading": 
      case "uploaded":
      case "transcribing":
      case "summarizing":
        return <Loader2 className="w-12 h-12 text-indigo-500 mb-4 animate-spin" />;
      case "done": return <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />;
      case "failed": return <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "idle": return file ? file.name : "Select an audio file";
      case "uploading": return "Uploading to server...";
      case "uploaded": return "File saved. Waiting in queue...";
      case "transcribing": return "Extracting text with Gnani ASR...";
      case "summarizing": return "Generating summary with Google Gemini...";
      case "done": return "All done!";
      case "failed": return "Something went wrong.";
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center">
      
      <div className="text-center mb-12">
        <h1 className="text-4xl font-semibold tracking-tight mb-4 text-white">
          Audio Notes
        </h1>
        <p className="text-zinc-400 text-lg">
          Upload an audio file to generate a transcript and AI summary.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full glass rounded-3xl p-10 flex flex-col items-center text-center relative overflow-hidden"
      >
        <input 
          type="file" 
          accept="audio/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          disabled={status !== "idle" && status !== "done" && status !== "failed"}
        />
        
        {renderStatusIcon()}
        
        <h3 className="text-xl font-medium text-white mb-2">
          {getStatusMessage()}
        </h3>
        
        {status === "idle" && (
          <p className="text-sm text-zinc-500 mb-8">
            Supports MP3, WAV, FLAC. No strict length limit.
          </p>
        )}
        
        {status === "failed" && (
          <p className="text-sm text-rose-400 mb-8 max-w-md">
            {errorMsg}
          </p>
        )}

        {status === "idle" && (
          <div className="flex flex-col gap-4 items-center">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-black/20 border border-white/10 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 mb-4 max-w-[200px]"
            >
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">Hindi (India)</option>
            </select>
            <div className="flex gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
              >
                Choose File
              </button>
              {file && (
                <button 
                  onClick={handleUpload}
                  className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Upload & Process
                </button>
              )}
            </div>
          </div>
        )}

        {(status === "done" || status === "failed") && (
          <button 
            onClick={() => {
              setFile(null);
              setStatus("idle");
              setResult(null);
              setFileId(null);
            }}
            className="mt-6 px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
          >
            Process Another File
          </button>
        )}

        {/* Progress Bar Background */}
        {["uploading", "uploaded", "transcribing", "summarizing"].includes(status) && (
          <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/20 w-full">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: "0%" }}
              animate={{ 
                width: status === "uploading" ? "25%" : 
                       status === "uploaded" ? "50%" : 
                       status === "transcribing" ? "75%" : "95%" 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {status === "done" && result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mt-8 grid gap-8"
          >
            <div className="glass rounded-3xl p-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm">AI</span>
                Summary
              </h3>
              <div className="prose prose-invert max-w-none text-zinc-300">
                {/* Simple render of markdown-like bullets from Gemini */}
                {result.summary.split('\n').map((line: string, i: number) => (
                  <p key={i} className={line.startsWith('*') || line.startsWith('-') ? "ml-4" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-zinc-400" />
                Full Transcript
              </h3>
              <div className="p-4 rounded-xl bg-black/20 text-zinc-300 font-mono text-sm leading-relaxed max-h-96 overflow-y-auto">
                {result.transcript || "No transcript could be generated."}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
