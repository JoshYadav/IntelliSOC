import { useState, useRef, useCallback } from 'react';
import { UploadCloud, Lock, Loader2, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess: (sessionId: string, logsProcessed: number, alertsGenerated: number) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'log' && ext !== 'txt') {
      setError('Only .log and .txt files are supported');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('logfile', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/logs/upload');

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
            reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      setUploadProgress(100);
      onUploadSuccess(result.sessionId, result.logsProcessed, result.alertsGenerated);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  }, [onUploadSuccess]);

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
    <div className="animate-fade-in-up" style={{ marginBottom: '2rem' }}>
      <div
        id="file-upload-zone"
        className="glass-card hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 ease-in-out"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          position: 'relative',
          padding: '3.5rem 2rem',
          borderRadius: 'var(--radius)',
          border: `2px dashed ${isDragging ? 'var(--color-accent-cyan)' : 'var(--color-border-hover)'}`,
          background: isDragging
            ? 'rgba(6, 182, 212, 0.05)'
            : 'var(--color-bg-card)',
          cursor: 'pointer',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Progress bar overlay */}
        {isUploading && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '4px',
              width: `${uploadProgress}%`,
              background: 'var(--gradient-primary)',
              transition: 'width 0.3s ease',
              borderRadius: '0 2px 2px 0',
            }}
          />
        )}

        {/* Upload icon */}
        <div style={{
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'center',
          filter: isDragging ? 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.6))' : 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.05))',
          color: isDragging ? 'var(--color-accent-cyan)' : 'var(--color-text-secondary)',
          transition: 'all 0.3s ease',
        }}>
          {isUploading ? (
            <Loader2 size={56} className="animate-spin text-blue-500" />
          ) : isDragging ? (
            <UploadCloud size={64} className="scale-110 transition-transform text-cyan-400" />
          ) : (
            <Lock size={56} />
          )}
        </div>

        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem',
        }}>
          {isUploading
            ? `Processing logs... ${uploadProgress}%`
            : isDragging
              ? 'Drop your log file here'
              : 'Upload System Log File'
          }
        </h3>

        <p style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
        }}>
          {isUploading
            ? 'Analyzing for cyber threats...'
            : 'Drag & drop a .log or .txt file, or click to browse'
          }
        </p>

        {error && (
          <p style={{
            marginTop: '1.25rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-critical)',
            fontSize: '0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '1.25rem auto 0 auto',
          }}>
            <AlertCircle size={16} /> {error}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".log,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
