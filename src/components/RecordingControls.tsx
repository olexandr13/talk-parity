import React from 'react';
import './RecordingControls.css';

interface RecordingControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  pollAttempts?: number;
  processingElapsedTime?: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReset: () => void;
  onFileUpload?: (file: File) => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isProcessing,
  duration,
  pollAttempts,
  processingElapsedTime,
  onStartRecording,
  onStopRecording,
  onReset,
  onFileUpload,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatProcessingTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      // Validate file type
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg', 'audio/x-m4a'];
      const isValidType = validTypes.some(type => file.type.includes(type.split('/')[1])) || 
                         file.name.match(/\.(wav|mp3|m4a|mp4|webm|ogg)$/i);
      
      if (!isValidType) {
        alert('Please select a valid audio file (WAV, MP3, M4A, MP4, WebM, or OGG)');
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 100MB.');
        return;
      }

      if (file.size === 0) {
        alert('Selected file is empty.');
        return;
      }

      onFileUpload(file);
    }
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="recording-controls">
      <div className="duration-display">
        <span className="duration-label">Duration:</span>
        <span className="duration-value">{formatDuration(duration)}</span>
      </div>

      <div className="controls-buttons">
        {!isRecording && !isProcessing && (
          <>
            <button
              className="btn btn-primary"
              onClick={onStartRecording}
              disabled={isProcessing}
            >
              🎤 Start Recording
            </button>
            {onFileUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.wav,.mp3,.m4a,.mp4,.webm,.ogg"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleUploadClick}
                  disabled={isProcessing}
                >
                  📁 Upload Audio File
                </button>
              </>
            )}
          </>
        )}

        {isRecording && (
          <button
            className="btn btn-danger"
            onClick={onStopRecording}
          >
            ⏹️ Stop Recording
          </button>
        )}

        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <span>
              Processing audio...
              {pollAttempts !== undefined && pollAttempts > 0 && (
                <span className="processing-attempts"> (attempt {pollAttempts})</span>
              )}
              {processingElapsedTime !== undefined && processingElapsedTime > 0 && (
                <span className="processing-time"> • {formatProcessingTime(processingElapsedTime)}</span>
              )}
            </span>
          </div>
        )}

        {!isRecording && !isProcessing && duration > 0 && (
          <button
            className="btn btn-secondary"
            onClick={onReset}
          >
            🔄 Reset
          </button>
        )}
      </div>
    </div>
  );
};

