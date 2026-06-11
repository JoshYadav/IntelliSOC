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
      xhr.open('POST', 'https://intellisoc-9vgd.onrender.com/api/logs/upload');

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
          border: `1px dashed ${isDragging ? T.primary : T.border}`,
          background: isDragging ? T.primaryDim : T.surface,
          cursor: 'pointer',
          textAlign: 'center',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = T.primary;
          e.currentTarget.style.background = T.surfaceHover;
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.background = T.surface;
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
            <Loader2 size={40} className="animate-spin" style={{ color: T.primary }} />
          ) : (
            <Shield size={40} style={{ color: T.primary }} />
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
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          style={{
            background: T.primaryDim,
            border: `1px solid ${T.primary}`,
            color: T.primary,
            borderRadius: '10px',
            padding: '10px 20px',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(129, 140, 248, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = T.primaryDim;
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
