export interface Speaker {
  id: string;
  label: string;
  speakingTime: number; // in milliseconds
  percentage: number;
  speechExamples: string[]; // Sample quotes from this speaker (first, middle, last)
  allPhrases: string[]; // All phrases/utterances from this speaker
}

export interface DiarizationSegment {
  speaker: string;
  start: number; // in seconds
  end: number; // in seconds
  text?: string; // Transcript text for this segment
}

export interface ApiRequestInfo {
  uploadUrl?: string;
  uploadRequestUrl?: string; // The URL used to upload the file
  transcriptRequestUrl?: string; // The URL used to start transcription
  pollRequestUrl?: string; // The URL used to poll for status
  uploadSize?: number;
  uploadTime?: number;
  transcriptId?: string;
  transcriptStatus?: string;
  pollAttempts?: number;
  pollStartTime?: number; // Timestamp when polling started
  processingStartTime?: number; // Timestamp when processing started
  totalProcessingTime?: number;
}

export interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number; // in milliseconds
  speakers: Speaker[];
  error: string | null;
  apiInfo: ApiRequestInfo | null;
}

export interface HistoryItem {
  id: string; // Unique identifier for the history item
  name: string; // User-provided name for the recording
  transcriptId: string; // AssemblyAI transcript ID
  timestamp: number; // When this was created
  speakers: Speaker[]; // Speaker data
  duration: number; // Total duration in milliseconds
  apiInfo?: ApiRequestInfo; // Optional API info
}

