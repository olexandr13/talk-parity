import React, { useState, useEffect, useRef } from 'react';
import { RecordingControls } from './components/RecordingControls';
import { SpeakerStats } from './components/SpeakerStats';
import { ApiKeyInput } from './components/ApiKeyInput';
import { ApiInfo } from './components/ApiInfo';
import { History } from './components/History';
import { audioRecorderService } from './services/AudioRecorderService';
import { speakerDiarizationService } from './services/SpeakerDiarizationService';
import { HistoryService } from './services/HistoryService';
import { RecordingState, ApiRequestInfo, HistoryItem } from './types';
import { API_CONFIG } from './config';
import './App.css';

const App: React.FC = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0,
    speakers: [],
    error: null,
    apiInfo: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [processingElapsedTime, setProcessingElapsedTime] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [lastSavedTranscriptId, setLastSavedTranscriptId] = useState<string | null>(null);

  useEffect(() => {
    // Configure API key from:
    // 1. Environment variable (.env file with VITE_ prefix)
    // 2. localStorage (if user entered it via UI)
    const apiKey = API_CONFIG.ASSEMBLY_AI_API_KEY;
    
    if (apiKey && apiKey.trim()) {
      console.log('API key found and set');
      speakerDiarizationService.setApiKey(apiKey.trim());
      
      // Set up API info callback
      speakerDiarizationService.setApiInfoCallback((info) => {
        setRecordingState(prev => ({
          ...prev,
          apiInfo: info as ApiRequestInfo,
        }));
      });
      
      setApiKeySet(true);
      setShowApiKeyInput(false);
    } else {
      // Show API key input if not set
      setShowApiKeyInput(true);
    }

    // Load history from local storage
    const savedHistory = HistoryService.getHistory();
    setHistory(savedHistory);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      speakerDiarizationService.setRequestCallback(null);
    };
  }, []);

  // Update processing elapsed time from when processing started
  useEffect(() => {
    if (!recordingState.apiInfo?.processingStartTime || recordingState.apiInfo.transcriptStatus === 'completed' || recordingState.apiInfo.transcriptStatus === 'error') {
      setProcessingElapsedTime(0);
      return;
    }

    // Update elapsed time every 100ms for smooth updates
    const interval = setInterval(() => {
      const elapsed = Date.now() - (recordingState.apiInfo?.processingStartTime || 0);
      setProcessingElapsedTime(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [recordingState.apiInfo?.processingStartTime, recordingState.apiInfo?.transcriptStatus]);

  // Auto-save to history when processing completes successfully
  useEffect(() => {
    if (
      !recordingState.isProcessing &&
      recordingState.speakers.length > 0 &&
      recordingState.apiInfo?.transcriptId &&
      !currentHistoryId && // Don't save if we just loaded from history
      recordingState.apiInfo.transcriptId !== lastSavedTranscriptId // Don't save if already saved
    ) {
      // Auto-save with default name
      const now = new Date();
      const defaultName = `Recording ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      saveToHistory(defaultName);
      setLastSavedTranscriptId(recordingState.apiInfo.transcriptId);
    }
  }, [recordingState.isProcessing, recordingState.speakers.length, recordingState.apiInfo?.transcriptId, currentHistoryId, lastSavedTranscriptId]);

  const handleApiKeySet = () => {
    setApiKeySet(true);
    setShowApiKeyInput(false);
  };

  const startRecording = async () => {
    try {
      setRecordingState(prev => ({ ...prev, error: null }));
      await audioRecorderService.startRecording();
      startTimeRef.current = Date.now();
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
        speakers: [],
        error: null,
        apiInfo: null,
      }));
      setCurrentHistoryId(null); // Clear history ID for new recording

      // Update duration every second
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: Date.now() - startTimeRef.current,
        }));
      }, 1000);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to start recording. Please check microphone permissions.';
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        error: errorMessage,
      }));
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      setRecordingState(prev => ({ ...prev, error: null }));
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const audioBlob = await audioRecorderService.stopRecording();
      const finalDuration = Date.now() - startTimeRef.current;

      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: true,
        duration: finalDuration,
        error: null,
      }));

      // Process audio for speaker diarization
      await processAudio(audioBlob, finalDuration, 'recorded audio');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to stop recording.';
      console.error('Error stopping recording:', error);
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        error: errorMessage,
      }));
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setRecordingState(prev => ({ 
        ...prev, 
        error: null,
        isProcessing: true,
        speakers: [],
        duration: 0,
        apiInfo: null,
      }));
      setCurrentHistoryId(null); // Clear history ID for new upload

      console.log('📁 File selected for upload:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      });

      // Pass the File object directly to preserve original format
      // The transcribeWithDiarization method now accepts File objects
      console.log('📦 Audio file ready for processing:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Estimate duration if possible (for display purposes)
      // We'll get the actual duration from the API response
      const estimatedDuration = 0; // Will be updated after processing

      // Pass the File object directly - it will be handled correctly
      await processAudio(file, estimatedDuration, file.name);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to process uploaded file.';
      console.error('Error in handleFileUpload:', error);
      setRecordingState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
    }
  };


  const processAudio = async (audioBlob: Blob | File, totalDuration: number, _fileName?: string) => {
    try {
      console.log('Starting audio processing...', { 
        size: audioBlob.size, 
        duration: totalDuration,
        fileName: _fileName || 'recorded audio'
      });
      
      // Get diarization segments
      // Pass filename if it's a File object
      const fileName = audioBlob instanceof File ? audioBlob.name : undefined;
      const { segments, audioDuration } = await speakerDiarizationService.transcribeWithDiarization(
        audioBlob,
        fileName
      );

      console.log('Received segments:', segments);
      console.log('Number of segments:', segments.length);
      console.log('Audio duration from API:', audioDuration, 'ms');

      if (!segments || segments.length === 0) {
        throw new Error('No speech segments found in the audio');
      }

      // Use audio duration from API if available, otherwise use provided totalDuration
      const actualTotalDuration = audioDuration > 0 ? audioDuration : totalDuration;
      
      // Calculate speaker statistics with total audio duration
      const { speakers, totalDuration: calculatedTotalDuration } = speakerDiarizationService.calculateSpeakerStats(
        segments,
        actualTotalDuration
      );

      console.log('Calculated speakers:', speakers);
      console.log('Number of speakers:', speakers.length);
      console.log('Total audio duration:', calculatedTotalDuration, 'ms');

      if (!speakers || speakers.length === 0) {
        throw new Error('No speakers detected in the audio');
      }

      // Use the calculated total duration (includes audio duration from API)
      const finalTotalDuration = calculatedTotalDuration > 0 ? calculatedTotalDuration : actualTotalDuration;

      console.log('Final speakers with percentages:', speakers);
      console.log('Final total duration:', finalTotalDuration, 'ms');

      console.log('About to update state with speakers:', speakers);
      console.log('Current state before update:', recordingState);

      setRecordingState(prev => {
        const newState = {
          ...prev,
          speakers,
          isProcessing: false,
          duration: finalTotalDuration,
          error: null,
        };
        console.log('New state after update:', newState);
        return newState;
      });

      console.log('State update called');
    } catch (error: any) {
      console.error('Error processing audio:', error);
      console.error('Error stack:', error?.stack);
      
      // Show the actual error message from AssemblyAI
      let errorMessage = error?.message || 'Unknown error occurred';
      
      // Keep the full error message - don't simplify it
      // The error message from AssemblyAI contains important details
      
      setRecordingState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
    }
  };

  const reset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setRecordingState({
      isRecording: false,
      isProcessing: false,
      duration: 0,
      speakers: [],
      error: null,
      apiInfo: null,
    });
    setCurrentHistoryId(null);
    setLastSavedTranscriptId(null);
  };

  const handleSpeakerRename = (speakerId: string, newName: string) => {
    setRecordingState(prev => ({
      ...prev,
      speakers: prev.speakers.map(speaker =>
        speaker.id === speakerId
          ? { ...speaker, label: newName }
          : speaker
      ),
    }));
  };

  const saveToHistory = (name: string) => {
    if (!recordingState.apiInfo?.transcriptId) {
      console.error('No transcript ID available');
      return;
    }

    const historyItem: HistoryItem = {
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || 'Untitled Recording',
      transcriptId: recordingState.apiInfo.transcriptId,
      timestamp: Date.now(),
      speakers: recordingState.speakers,
      duration: recordingState.duration,
      apiInfo: recordingState.apiInfo,
    };

    HistoryService.addHistoryItem(historyItem);
    setHistory(HistoryService.getHistory());
    setCurrentHistoryId(historyItem.id);
  };

  const handleLoadHistoryItem = (item: HistoryItem) => {
    setRecordingState({
      isRecording: false,
      isProcessing: false,
      duration: item.duration,
      speakers: item.speakers,
      error: null,
      apiInfo: item.apiInfo || null,
    });
    setCurrentHistoryId(item.id);
  };

  const handleRenameHistoryItem = (id: string, newName: string) => {
    HistoryService.updateHistoryItem(id, { name: newName });
    setHistory(HistoryService.getHistory());
  };

  const handleDeleteHistoryItem = (id: string) => {
    HistoryService.deleteHistoryItem(id);
    setHistory(HistoryService.getHistory());
    
    // If we deleted the currently loaded item, clear the state
    if (currentHistoryId === id) {
      reset();
      setCurrentHistoryId(null);
    }
  };

  const handleClearHistory = () => {
    HistoryService.clearHistory();
    setHistory([]);
    setCurrentHistoryId(null);
  };

  return (
    <div className="app">
      {showApiKeyInput && (
        <ApiKeyInput 
          onApiKeySet={handleApiKeySet} 
          onClose={() => setShowApiKeyInput(false)}
        />
      )}
      <div className="app-container">
        <header className="header">
          <div className="header-top">
            <div>
              <div className="header-title-container">
                <span className="header-icon">🎙️</span>
                <h1 className="header-title">Talk parity</h1>
              </div>
            </div>
            <button
              className="settings-btn"
              onClick={() => setShowApiKeyInput(true)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
          {!apiKeySet && (
            <p className="header-warning">
              ⚠️ API key not set - recordings will fail. Click ⚙️ to add your API key.
            </p>
          )}
        </header>

        <RecordingControls
          isRecording={recordingState.isRecording}
          isProcessing={recordingState.isProcessing}
          duration={recordingState.duration}
          pollAttempts={recordingState.apiInfo?.pollAttempts}
          processingElapsedTime={processingElapsedTime > 0 ? processingElapsedTime : undefined}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onReset={reset}
          onFileUpload={handleFileUpload}
        />

        {(recordingState.isProcessing || recordingState.apiInfo) && (
          <ApiInfo apiInfo={recordingState.apiInfo} />
        )}

        <History
          history={history}
          onLoadItem={handleLoadHistoryItem}
          onRenameItem={handleRenameHistoryItem}
          onDeleteItem={handleDeleteHistoryItem}
          onClearHistory={handleClearHistory}
          activeItemId={currentHistoryId}
        />

        {recordingState.error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <h3 className="error-title">Error</h3>
              <p className="error-text">{recordingState.error}</p>
              <button 
                className="error-dismiss"
                onClick={() => setRecordingState(prev => ({ ...prev, error: null }))}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}


        {recordingState.speakers.length > 0 && (
          <SpeakerStats
            speakers={recordingState.speakers}
            totalDuration={recordingState.duration}
            onSpeakerRename={handleSpeakerRename}
          />
        )}

        {recordingState.speakers.length === 0 &&
          !recordingState.isRecording &&
          !recordingState.isProcessing &&
          !recordingState.error && (
            <div className="placeholder">
              <p className="placeholder-text">
                Start recording to analyze speaking time
              </p>
            </div>
          )}

        {/* Debug info - moved to bottom */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-info">
            <strong>Debug:</strong> 
            Speakers: {recordingState.speakers.length}, 
            Processing: {recordingState.isProcessing ? 'Yes' : 'No'},
            Error: {recordingState.error || 'None'}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

