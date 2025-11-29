import axios from 'axios';
import { DiarizationSegment, Speaker } from '../types';

export interface ApiRequestCallback {
  (info: { method: string; url: string; status?: number; responseTime?: number; error?: string; responseData?: any }): void;
}

export interface ApiInfo {
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

export class SpeakerDiarizationService {
  private apiKey: string = '';
  private apiUrl: string = 'https://api.assemblyai.com/v2';
  private apiInfoCallback?: (info: ApiInfo) => void;
  private requestCallback: ApiRequestCallback | null = null;

  /**
   * Set callback to track API requests/responses
   */
  setRequestCallback(callback: ApiRequestCallback | null): void {
    this.requestCallback = callback;
  }

  /**
   * Set API key for AssemblyAI (or configure your preferred service)
   * You can get a free API key from https://www.assemblyai.com/
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Set callback to receive API request/response info
   */
  setApiInfoCallback(callback: (info: ApiInfo) => void): void {
    this.apiInfoCallback = callback;
  }

  /**
   * Update API info and notify callback
   */
  private updateApiInfo(info: ApiInfo): void {
    if (this.apiInfoCallback) {
      this.apiInfoCallback({ ...info });
    }
  }

  /**
   * Upload audio file and get transcript with speaker diarization
   * @param audioBlob - Audio blob or file to transcribe
   * @param fileName - Optional filename (if not provided, will be inferred from blob type)
   */
  async transcribeWithDiarization(audioBlob: Blob | File, fileName?: string): Promise<{ segments: DiarizationSegment[]; audioDuration: number }> {
    const startTime = Date.now();
    const apiInfo: ApiInfo = {
      uploadSize: audioBlob.size,
      processingStartTime: startTime, // Track when processing started
    };

    if (!this.apiKey) {
      throw new Error('API key not set. Please configure your AssemblyAI API key in the .env file or settings.');
    }

    // Validate audio blob
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Audio file is empty. Please record some audio first.');
    }

    if (audioBlob.size < 1000) {
      throw new Error('Audio file is too small. Please record at least a few seconds of audio.');
    }

    this.updateApiInfo(apiInfo);

    // Determine file extension and ensure proper MIME type
    let mimeType = audioBlob.type;
    
    // Use provided filename or infer from blob type
    if (!fileName) {
      if (audioBlob instanceof File) {
        fileName = audioBlob.name;
      } else {
        // Infer from MIME type
        if (mimeType.includes('wav')) {
          fileName = 'recording.wav';
        } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
          fileName = 'recording.mp3';
        } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
          fileName = 'recording.m4a';
        } else if (mimeType.includes('ogg')) {
          fileName = 'recording.ogg';
        } else if (mimeType.includes('webm')) {
          fileName = 'recording.wav'; // WebM should have been converted to WAV
        } else {
          fileName = 'recording.wav'; // Default
        }
      }
    }
    
    // If it's a File object, use it directly (preserves original format)
    // If it's a Blob, ensure proper MIME type
    if (!(audioBlob instanceof File)) {
      // Ensure proper MIME type for Blob
      if (!mimeType || mimeType === 'application/octet-stream' || mimeType === '') {
        // Infer from filename extension
        const ext = fileName.toLowerCase().split('.').pop();
        if (ext === 'wav') {
          mimeType = 'audio/wav';
        } else if (ext === 'mp3') {
          mimeType = 'audio/mpeg';
        } else if (ext === 'm4a' || ext === 'mp4') {
          mimeType = 'audio/mp4';
        } else if (ext === 'ogg') {
          mimeType = 'audio/ogg';
        } else if (ext === 'webm') {
          mimeType = 'audio/webm';
        } else {
          mimeType = 'audio/wav'; // Default
        }
        audioBlob = new Blob([audioBlob], { type: mimeType });
      }
    }

    console.log(`Uploading audio: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB, type: ${audioBlob.type}, filename: ${fileName}`);
    
    // Verify blob is valid
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Audio blob is empty or invalid');
    }
    
    console.log('🔍 Checking audio blob before upload:', {
      size: audioBlob.size,
      type: audioBlob.type,
      fileName: fileName
    });
    
    // Ensure we have a proper audio MIME type
    if (!audioBlob.type || audioBlob.type === 'application/octet-stream' || audioBlob.type === '') {
      console.error('❌ Blob has invalid MIME type:', audioBlob.type);
      console.error('This should not happen if WAV conversion succeeded!');
      throw new Error('Audio file has invalid format. WAV conversion may have failed. Please try recording again.');
    }
    
    // Double-check it's an audio type
    if (!audioBlob.type.startsWith('audio/')) {
      console.error('❌ Blob type is not audio:', audioBlob.type);
      throw new Error(`Invalid audio format: ${audioBlob.type}. Expected audio/wav or similar.`);
    }

    // Step 1: Upload audio file
    // Note: AssemblyAI expects raw binary data with Content-Type: application/octet-stream
    // NOT multipart/form-data, so we don't use FormData
    
    // Ensure we have a valid audio type before creating File
    let finalType = audioBlob.type;
    if (!finalType || finalType === 'application/octet-stream' || finalType === '') {
      // Infer type from filename extension
      if (fileName.endsWith('.wav')) {
        finalType = 'audio/wav';
      } else if (fileName.endsWith('.mp3')) {
        finalType = 'audio/mpeg';
      } else if (fileName.endsWith('.m4a') || fileName.endsWith('.mp4')) {
        finalType = 'audio/mp4'; // M4A uses audio/mp4 MIME type
      } else if (fileName.endsWith('.ogg')) {
        finalType = 'audio/ogg';
      } else if (fileName.endsWith('.webm')) {
        finalType = 'audio/webm';
      } else {
        finalType = 'audio/wav'; // Default fallback
      }
      console.warn('⚠️ Blob type was invalid, inferred from filename:', finalType);
    }
    
    // If it's already a File object, use it directly (preserves original format)
    // Otherwise, create a File object from the Blob to ensure MIME type is preserved
    let audioFile: File;
    if (audioBlob instanceof File) {
      // Use the original File object - it already has the correct format
      // Don't read it as ArrayBuffer - that could corrupt it
      audioFile = audioBlob;
      finalType = audioFile.type || finalType;
      console.log('📎 Using original File object:', {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size
      });
      
      // For File objects, validate by reading only the first few bytes (non-destructive)
      if (audioFile.size >= 12) {
        const headerSlice = audioFile.slice(0, 12);
        const headerArrayBuffer = await headerSlice.arrayBuffer();
        const headerBytes = new Uint8Array(headerArrayBuffer);
        const headerString = String.fromCharCode(...headerBytes);
        
        const isWav = headerString.startsWith('RIFF') && headerString.includes('WAVE');
        const isMp3 = headerBytes[0] === 0xFF && (headerBytes[1] & 0xE0) === 0xE0;
        const isM4a = headerBytes[4] === 0x66 && headerBytes[5] === 0x74 && 
                      headerBytes[6] === 0x79 && headerBytes[7] === 0x70;
        
        console.log('🔍 File format verification (uploaded file):', {
          fileName: audioFile.name,
          expectedType: finalType,
          header: Array.from(headerBytes.slice(0, 8)).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join(''),
          isWav,
          isMp3,
          isM4a,
          isValid: isWav || isMp3 || isM4a
        });
        
        if (!isWav && !isMp3 && !isM4a) {
          console.warn('⚠️ WARNING: File header does not match common audio formats');
          console.warn('   Header bytes:', Array.from(headerBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        }
      }
    } else {
      // For Blob (recorded audio), create File object
      // The Blob should already be a valid WAV from convertToWav
      audioFile = new File([audioBlob], fileName, { 
        type: finalType,
        lastModified: Date.now()
      });
      console.log('📎 Created File object from Blob:', {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size
      });
      
      // Validate WAV header for recorded audio (read only first 12 bytes)
      if (finalType === 'audio/wav' && audioFile.size >= 12) {
        const headerSlice = audioFile.slice(0, 12);
        const headerArrayBuffer = await headerSlice.arrayBuffer();
        const headerBytes = new Uint8Array(headerArrayBuffer);
        const headerString = String.fromCharCode(...headerBytes);
        
        const isWav = headerString.startsWith('RIFF') && headerString.includes('WAVE');
        console.log('🔍 WAV file header check (recorded audio):', {
          header: headerString,
          isValid: isWav
        });
        
        if (!isWav) {
          console.error('❌ CRITICAL: Recorded WAV file header is invalid!');
          console.error('   Header bytes:', Array.from(headerBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
          throw new Error('Generated WAV file is invalid. The file header does not match WAV format. Please try recording again.');
        }
      }
    }
    
    // Verify the file has content
    if (audioFile.size === 0) {
      throw new Error('Audio file is empty after conversion');
    }
    
    // Final verification
    if (!finalType || finalType === 'application/octet-stream' || !finalType.startsWith('audio/')) {
      console.error('❌ CRITICAL: File type is invalid after all checks!');
      console.error('Details:', {
        originalBlobType: audioBlob.type,
        finalType: finalType,
        fileName: fileName,
        blobSize: audioBlob.size
      });
      throw new Error(`Invalid audio file type: ${finalType}. The audio file format could not be determined.`);
    }

    const uploadUrl_full = `${this.apiUrl}/upload`;
    const uploadStartTime = Date.now();
    
    // Update API info with upload request URL
    this.updateApiInfo({
      ...apiInfo,
      uploadRequestUrl: uploadUrl_full,
    });
    
    if (this.requestCallback) {
      this.requestCallback({
        method: 'POST',
        url: uploadUrl_full,
      });
    }

    // According to AssemblyAI docs, we need to send raw binary data with Content-Type: application/octet-stream
    // NOT multipart/form-data. Read the file as ArrayBuffer and send it directly.
    console.log('📋 Preparing file for upload (raw binary):', {
      fileName: fileName,
      fileType: finalType,
      fileSize: audioFile.size
    });

    // Read the file as ArrayBuffer for raw binary upload
    const fileArrayBuffer = await audioFile.arrayBuffer();
    
    console.log('🚀 Uploading to AssemblyAI (raw binary):', {
      url: uploadUrl_full,
      fileName: audioFile.name,
      fileType: finalType,
      fileSize: fileArrayBuffer.byteLength,
      contentType: 'application/octet-stream'
    });
    
    const uploadResponse = await fetch(uploadUrl_full, {
      method: 'POST',
      headers: {
        authorization: this.apiKey,
        'Content-Type': 'application/octet-stream', // Raw binary data, not multipart/form-data
      },
      body: fileArrayBuffer, // Send raw binary data
    });
    
    console.log('📡 Upload response:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      headers: Object.fromEntries(uploadResponse.headers.entries())
    });

    const uploadResponseTime = Date.now() - uploadStartTime;

    if (!uploadResponse.ok) {
      let errorText = '';
      let errorData = null;
      try {
        errorData = await uploadResponse.json();
        errorText = errorData.error || JSON.stringify(errorData);
      } catch {
        errorText = await uploadResponse.text();
      }
      
      if (this.requestCallback) {
        this.requestCallback({
          method: 'POST',
          url: uploadUrl_full,
          status: uploadResponse.status,
          responseTime: uploadResponseTime,
          error: errorText,
          responseData: errorData,
        });
      }
      
      throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const uploadUrl = uploadData.upload_url;
    
    if (this.requestCallback) {
      this.requestCallback({
        method: 'POST',
        url: uploadUrl_full,
        status: uploadResponse.status,
        responseTime: uploadResponseTime,
        responseData: { upload_url: uploadUrl, ...uploadData },
      });
    }
    
    if (!uploadUrl) {
      throw new Error('Failed to get upload URL from API response');
    }

    // Step 2: Start transcription with speaker diarization
    const transcriptUrl = `${this.apiUrl}/transcript`;
    const transcriptStartTime = Date.now();
    
    // Update API info with transcript request URL
    this.updateApiInfo({
      ...apiInfo,
      uploadUrl: uploadUrl,
      uploadTime: uploadResponseTime,
      transcriptRequestUrl: transcriptUrl,
    });
    
    if (this.requestCallback) {
      this.requestCallback({
        method: 'POST',
        url: transcriptUrl,
      });
    }

    let transcriptResponse;
    try {
      transcriptResponse = await axios.post(
        transcriptUrl,
        {
          audio_url: uploadUrl,
          speaker_labels: true,
          language_detection: true,
        },
        {
          headers: {
            authorization: this.apiKey,
            'content-type': 'application/json',
          },
        },
      );
      
      const transcriptResponseTime = Date.now() - transcriptStartTime;
      
      if (this.requestCallback) {
        this.requestCallback({
          method: 'POST',
          url: transcriptUrl,
          status: transcriptResponse.status,
          responseTime: transcriptResponseTime,
          responseData: { id: transcriptResponse.data.id, status: transcriptResponse.data.status },
        });
      }
    } catch (error: any) {
      const transcriptResponseTime = Date.now() - transcriptStartTime;
      const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
      
      if (this.requestCallback) {
        this.requestCallback({
          method: 'POST',
          url: transcriptUrl,
          status: error?.response?.status,
          responseTime: transcriptResponseTime,
          error: errorMessage,
          responseData: error?.response?.data,
        });
      }
      
      throw new Error(`Failed to start transcription: ${errorMessage}`);
    }

    const transcriptId = transcriptResponse.data.id;
    
    if (!transcriptId) {
      throw new Error('Failed to get transcript ID from API response');
    }

    apiInfo.transcriptId = transcriptId;
    apiInfo.transcriptStatus = 'queued';
    this.updateApiInfo(apiInfo);

    // Step 3: Poll for completion
    const segments = await this.pollForCompletion(transcriptId, apiInfo);
    
    // Extract audio duration from segments if available
    const audioDuration = (segments as any).audioDuration || 0;
    delete (segments as any).audioDuration; // Clean up metadata

    apiInfo.totalProcessingTime = Date.now() - startTime;
    this.updateApiInfo(apiInfo);

    // Return segments with audio duration metadata
    return { segments, audioDuration };
  }

  /**
   * Poll transcription status until complete
   */
  private async pollForCompletion(transcriptId: string, apiInfo: ApiInfo): Promise<DiarizationSegment[]> {
    const maxAttempts = 60;
    let attempts = 0;
    const pollUrl = `${this.apiUrl}/transcript/${transcriptId}`;
    const pollStartTime = Date.now();
    
    // Update API info with poll request URL and start time
    this.updateApiInfo({
      ...apiInfo,
      pollRequestUrl: pollUrl,
      pollStartTime: pollStartTime,
    });

    while (attempts < maxAttempts) {
      try {
        const pollUrl = `${this.apiUrl}/transcript/${transcriptId}`;
        const pollStartTime = Date.now();
        
        if (attempts === 0 && this.requestCallback) {
          this.requestCallback({
            method: 'GET',
            url: pollUrl,
          });
        }

        const response = await axios.get(
          pollUrl,
          {
            headers: {
              authorization: this.apiKey,
            },
          },
        );

        const pollResponseTime = Date.now() - pollStartTime;
        const status = response.data.status;
        
        // Update API info with current status
        apiInfo.transcriptStatus = status;
        apiInfo.pollAttempts = attempts + 1;
        this.updateApiInfo(apiInfo);
        
        // Only log on first attempt, completion, or error
        if (attempts === 0 || status === 'completed' || status === 'error') {
          if (this.requestCallback) {
            this.requestCallback({
              method: 'GET',
              url: pollUrl,
              status: response.status,
              responseTime: pollResponseTime,
              responseData: { 
                status: status, 
                utterances_count: response.data.utterances?.length || 0,
                has_utterances: !!response.data.utterances,
              },
            });
          }
        }

        if (status === 'completed') {
          console.log('=== TRANSCRIPTION COMPLETED ===');
          console.log('Full response data:', JSON.stringify(response.data, null, 2));
          console.log('Response keys:', Object.keys(response.data));
          
          // AssemblyAI might return utterances or words array
          let utterances = response.data.utterances || [];
          
          console.log('Utterances from response:', utterances);
          console.log('Utterances type:', typeof utterances);
          console.log('Utterances is array:', Array.isArray(utterances));
          console.log('Utterances length:', utterances?.length);
          
          // If no utterances, check for words array (alternative format)
          if (utterances.length === 0 && response.data.words) {
            console.log('No utterances found, checking words array...');
            console.log('Words array:', response.data.words);
            // Group words by speaker if words array is available
            utterances = this.groupWordsBySpeaker(response.data.words);
            console.log('Grouped utterances from words:', utterances);
          }
          
          // Also check if there's a transcript with speaker_labels
          if (utterances.length === 0 && response.data.text) {
            console.log('Found text but no utterances. Checking for alternative format...');
            // Some responses might have speaker_labels in a different format
            if (response.data.speaker_labels) {
              console.log('Found speaker_labels:', response.data.speaker_labels);
            }
          }
          
          console.log('Final utterances array:', utterances);
          console.log('Utterances count:', utterances.length);
          
          if (utterances.length === 0) {
            console.error('=== NO UTTERANCES FOUND ===');
            console.error('Available data:', {
              hasUtterances: !!response.data.utterances,
              utterancesLength: response.data.utterances?.length || 0,
              hasWords: !!response.data.words,
              wordsLength: response.data.words?.length || 0,
              hasText: !!response.data.text,
              textLength: response.data.text?.length || 0,
              hasSpeakerLabels: !!response.data.speaker_labels,
              responseKeys: Object.keys(response.data)
            });
            console.error('Full response for debugging:', response.data);
            throw new Error('Transcription completed but no speech was detected. Please ensure the audio contains clear speech.');
          }
          
          const segments = this.parseDiarizationSegments(utterances);
          console.log('=== PARSED SEGMENTS ===', segments);
          
          // Get audio duration from API response (in milliseconds) or calculate from segments
          const audioDurationMs = response.data.audio_duration 
            ? response.data.audio_duration * 1000 // Convert seconds to ms
            : segments.length > 0 
              ? Math.max(...segments.map(s => s.end)) * 1000 // Max end time in ms
              : 0;
          
          // Store audio duration in segments metadata (we'll return it separately)
          (segments as any).audioDuration = audioDurationMs;
          
          return segments;
        }

        if (status === 'error') {
          const errorMessage = response.data.error || response.data.status_text || 'Unknown error occurred';
          console.error('Transcription error details:', response.data);
          throw new Error(`Transcription failed: ${errorMessage}`);
        }

        // Log progress for long transcriptions
        if (attempts % 10 === 0) {
          console.log(`Transcription in progress... (attempt ${attempts + 1}/${maxAttempts})`);
        }

        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error: any) {
        // If it's already a formatted error, rethrow it
        if (error?.response?.data?.error || error?.message) {
          throw error;
        }
        console.error('Error polling transcription:', error);
        throw new Error(`Failed to check transcription status: ${error?.message || 'Unknown error'}`);
      }
    }

    throw new Error('Transcription timeout - the audio file may be too long or the service is taking longer than expected.');
  }

  /**
   * Parse API response into diarization segments
   */
  private parseDiarizationSegments(utterances: any[]): DiarizationSegment[] {
    console.log('Parsing diarization segments, utterances:', utterances);
    
    if (!Array.isArray(utterances) || utterances.length === 0) {
      console.error('No utterances array or empty array received');
      throw new Error('No utterances found in transcription response');
    }

    const segments = utterances.map((utterance, index) => {
      console.log(`Processing utterance ${index}:`, utterance);
      
      // AssemblyAI returns speaker as a string like "A", "B", etc. or as a number
      const speakerLabel = utterance.speaker !== undefined && utterance.speaker !== null
        ? `Speaker ${utterance.speaker}`
        : 'Speaker Unknown';
      
      const segment = {
        speaker: speakerLabel,
        start: (utterance.start || 0) / 1000, // Convert ms to seconds
        end: (utterance.end || 0) / 1000,
        text: utterance.text || '', // Include transcript text
      };
      
      console.log(`Created segment ${index}:`, segment);
      return segment;
    });

    console.log('Parsed segments:', segments);
    return segments;
  }

  /**
   * Calculate speaker statistics from diarization segments
   * Returns speakers array and total audio duration
   */
  calculateSpeakerStats(segments: DiarizationSegment[], totalAudioDuration?: number): { speakers: Speaker[]; totalDuration: number } {
    console.log('Calculating speaker stats from segments:', segments);
    
    const speakerMap = new Map<string, { time: number; texts: string[] }>();

    // Calculate total speaking time per speaker and collect speech examples
    segments.forEach((segment, index) => {
      const duration = (segment.end - segment.start) * 1000; // Convert to ms
      const current = speakerMap.get(segment.speaker) || { time: 0, texts: [] };
      
      console.log(`Segment ${index}: speaker=${segment.speaker}, duration=${duration}ms, text length=${segment.text?.length || 0}`);
      
      // Add text if available and meaningful (not empty, at least 10 chars)
      if (segment.text && segment.text.trim().length >= 10) {
        current.texts.push(segment.text.trim());
      }
      
      speakerMap.set(segment.speaker, {
        time: current.time + duration,
        texts: current.texts,
      });
    });

    console.log('Speaker map:', Array.from(speakerMap.entries()));

    // Calculate total speaking time (sum of all detected speech)
    const totalSpeakingTime = Array.from(speakerMap.values()).reduce(
      (sum, data) => sum + data.time,
      0,
    );

    // Calculate total audio duration:
    // 1. Use provided totalAudioDuration if available
    // 2. Otherwise, use max end time from segments
    // 3. Fallback to totalSpeakingTime if no segments
    let calculatedTotalDuration = totalAudioDuration || 0;
    if (!calculatedTotalDuration && segments.length > 0) {
      calculatedTotalDuration = Math.max(...segments.map(s => s.end)) * 1000; // Convert to ms
    }
    if (!calculatedTotalDuration) {
      calculatedTotalDuration = totalSpeakingTime; // Fallback to speaking time only
    }

    console.log('Duration calculation:', {
      providedTotalDuration: totalAudioDuration,
      calculatedTotalDuration,
      totalSpeakingTime,
      maxSegmentEnd: segments.length > 0 ? Math.max(...segments.map(s => s.end)) * 1000 : 0
    });

    // Convert to Speaker array with percentages relative to total audio duration
    const speakers: Speaker[] = Array.from(speakerMap.entries()).map(
      ([label, data], index) => {
        // Get up to 3 speech examples (first, middle, last if available)
        const speechExamples = this.extractSpeechExamples(data.texts);
        
        // Store all phrases (all text segments from this speaker)
        const allPhrases = data.texts;
        
        // Calculate percentage based on total audio duration (including silence)
        const percentage = calculatedTotalDuration > 0 
          ? (data.time / calculatedTotalDuration) * 100 
          : 0;
        
        console.log(`Speaker ${label}: speakingTime=${data.time}ms, totalDuration=${calculatedTotalDuration}ms, percentage=${percentage}%, phrases=${allPhrases.length}`);
        
        return {
          id: `speaker-${index}`,
          label,
          speakingTime: data.time,
          percentage: percentage,
          speechExamples,
          allPhrases, // All phrases for this speaker
        };
      },
    );

    // Sort by speaking time (descending)
    const sortedSpeakers = speakers.sort((a, b) => b.speakingTime - a.speakingTime);
    
    return {
      speakers: sortedSpeakers,
      totalDuration: calculatedTotalDuration,
    };
  }

  /**
   * Group words array into utterances by speaker (fallback if utterances not available)
   */
  private groupWordsBySpeaker(words: any[]): any[] {
    if (!Array.isArray(words) || words.length === 0) {
      return [];
    }

    const utterances: any[] = [];
    let currentUtterance: any = null;

    words.forEach((word) => {
      if (!word.speaker && word.speaker !== 'A' && word.speaker !== 'B') {
        return; // Skip words without speaker
      }

      // Start new utterance if speaker changed or no current utterance
      if (!currentUtterance || currentUtterance.speaker !== word.speaker) {
        if (currentUtterance) {
          utterances.push(currentUtterance);
        }
        currentUtterance = {
          speaker: word.speaker,
          start: word.start,
          end: word.end,
          text: word.text || '',
        };
      } else {
        // Extend current utterance
        currentUtterance.end = word.end;
        currentUtterance.text += (currentUtterance.text ? ' ' : '') + (word.text || '');
      }
    });

    // Add last utterance
    if (currentUtterance) {
      utterances.push(currentUtterance);
    }

    return utterances;
  }

  /**
   * Extract representative speech examples from all segments
   * Returns up to 3 examples: first, middle (if available), and last
   */
  private extractSpeechExamples(texts: string[]): string[] {
    if (texts.length === 0) {
      return [];
    }

    const examples: string[] = [];
    
    // Always include the first example
    examples.push(texts[0]);

    // If there are multiple examples, include a middle one
    if (texts.length > 2) {
      const middleIndex = Math.floor(texts.length / 2);
      examples.push(texts[middleIndex]);
    }

    // If there are multiple examples, include the last one
    if (texts.length > 1) {
      examples.push(texts[texts.length - 1]);
    }

    // Limit to 3 examples max
    return examples.slice(0, 3);
  }
}

export const speakerDiarizationService = new SpeakerDiarizationService();

