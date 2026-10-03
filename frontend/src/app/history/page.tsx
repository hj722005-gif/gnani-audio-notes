"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, FileAudio, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";

const API_URL = "http://localhost:8000";

type UploadRecord = {
  id: string;
  filename: string;
  status: string;
  transcript: string;
  summary: string;
  created_at: string;
};

export default function History() {
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UploadRecord | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/history`);
        setHistory(res.data);
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "failed": return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default: return <Clock className="w-4 h-4 text-indigo-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-white">
          Upload History
        </h1>
        <p className="text-zinc-400 text-lg">
          View all your past audio transcriptions and summaries.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-3">
          {history.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-zinc-400">
              No history found.
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`text-left p-4 rounded-2xl transition-all ${
                  selectedItem?.id === item.id 
                    ? "bg-indigo-500/20 border border-indigo-500/50" 
                    : "glass hover:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-white truncate pr-4">{item.filename}</div>
                  <div className="shrink-0 pt-1">{getStatusIcon(item.status)}</div>
                </div>
                <div className="flex items-center text-xs text-zinc-500 gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-2">
          {selectedItem ? (
            <div className="glass rounded-3xl p-8 flex flex-col h-full">
              <h2 className="text-2xl font-semibold text-white mb-6 truncate">
                {selectedItem.filename}
              </h2>

              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Status</h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-sm">
                    {getStatusIcon(selectedItem.status)}
                    <span className="capitalize">{selectedItem.status}</span>
                  </div>
                </div>

                {selectedItem.summary && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">AI</span>
                      Summary
                    </h3>
                    <div className="prose prose-sm prose-invert max-w-none text-zinc-300">
                      {selectedItem.summary.split('\n').map((line, i) => (
                        <p key={i} className={line.startsWith('*') || line.startsWith('-') ? "ml-4" : ""}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.transcript && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileAudio className="w-4 h-4" />
                      Transcript
                    </h3>
                    <div className="p-4 rounded-xl bg-black/20 text-zinc-400 font-mono text-xs leading-relaxed max-h-64 overflow-y-auto">
                      {selectedItem.transcript}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass rounded-3xl p-8 h-full flex items-center justify-center text-zinc-500 text-sm text-center">
              Select an item from the history list to view its details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
