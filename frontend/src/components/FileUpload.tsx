import React, { useState, useRef, useCallback } from 'react';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess: (sessionId: string, logsProcessed: number, alertsGenerated: number, logFormat: string, incidentId?: string | null) => void;
}

const T = {
  bg:           "#080d16",
  surface:      "#0e1623",
  surfaceHover: "#121d2e",
  border:       "rgba(255,255,255,0.06)",
  borderHover:  "rgba(255,255,255,0.11)",
  primary:      "#818cf8",
  primaryDim:   "rgba(129,140,248,0.12)",
  critical:     "#fb7185",
  text:         "#f1f5f9",
  textSecondary:"#94a3b8",
};

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['log', 'txt', 'xml', 'csv', 'evtx'].includes(ext || '')) {
      setError('Unsupported format: Only .log, .txt, .xml, .csv, or .evtx supported.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('logfile', file);

      const xhr = new XMLHttpRequest();
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      xhr.open('POST', `${API_BASE}/api/logs/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      const result = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            let errMsg = 'Ingestion failed';
            try {
              errMsg = JSON.parse(xhr.responseText).error || errMsg;
            } catch (e) {}
            reject(new Error(errMsg));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      setUploadProgress(100);
      onUploadSuccess(result.sessionId, result.logsProcessed, result.alertsGenerated, result.logFormat ?? 'UNKNOWN', result.incidentId);
    } catch (err: any) {
      setError(err.message || 'Ingestion failure occurred.');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  }, [onUploadSuccess]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div style={{ marginBottom: '3rem' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".log,.txt,.xml,.csv,.evtx"
        style={{ display: 'none' }}
      />
      <div
        id="file-upload-zone"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          position: 'relative',
          padding: '64px 24px',
          borderRadius: '16px',
          border: isDragging ? '2px dashed rgba(6, 182, 212, 0.5)' : '2px dashed rgba(6, 182, 212, 0.2)',
          background: isDragging
            ? 'radial-gradient(ellipse at center, rgba(6,182,212,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)',
          cursor: 'pointer',
          textAlign: 'center',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)';
          e.currentTarget.style.background = 'radial-gradient(ellipse at center, rgba(6,182,212,0.08) 0%, transparent 70%)';
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
            e.currentTarget.style.background = 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)';
          }
        }}
      >
        {isUploading && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              width: `${uploadProgress}%`,
              background: T.primary,
              transition: 'width 0.1s ease',
            }}
          />
        )}

        <div style={{
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'center',
        }}>
          {isUploading ? (
            <Loader2 size={40} className="animate-spin" style={{ color: '#06b6d4' }} />
          ) : (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <div style={{
                position: 'absolute', inset: '-8px',
                borderRadius: '50%',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                animation: 'radar-ping 2s ease-out infinite'
              }} />
              <Shield size={40} style={{ color: '#06b6d4' }} />
            </div>
          )}
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          fontWeight: 600,
          color: T.text,
          marginBottom: '8px',
        }}>
          Load threat data
        </h3>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '14px',
          fontWeight: 400,
          color: T.textSecondary,
          marginBottom: '8px',
        }}>
          Drag and drop log files or click to browse — .log, .txt, .csv, .xml, .evtx
        </p>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '12.5px',
          fontWeight: 400,
          color: T.textSecondary,
          opacity: 0.8,
          marginBottom: '24px',
          marginTop: '0px',
        }}>
          Load system audit logs or EDR event streams to see threat detections, kill-chain reconstruction, and automated SOAR response workflows.
        </p>

        <button
          className="btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          style={{
            fontFamily: 'var(--font-display)',
            padding: '10px 20px',
            fontSize: '14px',
          }}
        >
          Browse Files
        </button>

        {error && (
          <div style={{
            marginTop: '1.25rem',
            padding: '8px 16px',
            background: 'rgba(251, 113, 133, 0.08)',
            border: `1px solid rgba(251, 113, 133, 0.25)`,
            borderRadius: '8px',
            color: T.critical,
            fontSize: '13px',
            fontFamily: 'var(--font-display)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
