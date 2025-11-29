export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  /**
   * Request microphone access and start recording
   */
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      this.stream = stream;
      this.audioChunks = [];

      // Use WebM format for better browser compatibility
      const options: MediaRecorderOptions = {
        mimeType: this.getSupportedMimeType(),
      };

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }

  /**
   * Stop recording and return audio blob (converted to WAV for compatibility)
   */
  async stopRecording(): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          // Verify we have chunks
          if (this.audioChunks.length === 0) {
            reject(new Error('Recording is empty. Please record some audio.'));
            return;
          }

          // Create blob from chunks
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const originalBlob = new Blob(this.audioChunks, { type: mimeType });
          
          console.log('📦 Original audio blob created:', {
            size: originalBlob.size,
            type: originalBlob.type,
            chunks: this.audioChunks.length,
            mimeType: mimeType
          });

          // Convert to WAV format for better compatibility with AssemblyAI
          let wavBlob: Blob;
          try {
            console.log('🔄 Attempting WAV conversion...');
            wavBlob = await this.convertToWav(originalBlob);
            console.log('✅ WAV conversion successful:', {
              size: wavBlob.size,
              type: wavBlob.type,
              originalSize: originalBlob.size,
              originalType: originalBlob.type
            });
            
            // Verify the WAV blob is valid
            if (!wavBlob || wavBlob.size === 0) {
              throw new Error('WAV conversion produced empty blob');
            }
            
            // CRITICAL: Ensure the type is explicitly set to audio/wav
            if (wavBlob.type !== 'audio/wav') {
              console.warn('⚠️ WAV blob type mismatch:', wavBlob.type, '- recreating with correct type');
              const wavArrayBuffer = await wavBlob.arrayBuffer();
              wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
              console.log('✅ Recreated blob with correct type:', wavBlob.type);
            }
            
            // Final verification
            if (wavBlob.type !== 'audio/wav') {
              throw new Error(`WAV blob type is still incorrect: ${wavBlob.type}`);
            }
            
            console.log('✅ Final WAV blob verified:', {
              type: wavBlob.type,
              size: wavBlob.size
            });
          } catch (conversionError) {
            console.error('❌ WAV conversion failed:', conversionError);
            console.error('Conversion error details:', {
              error: conversionError,
              message: conversionError instanceof Error ? conversionError.message : 'Unknown',
              stack: conversionError instanceof Error ? conversionError.stack : undefined
            });
            // Don't fallback - throw error so user knows there's a problem
            throw new Error(`Failed to convert audio to WAV format: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}. Please try recording again.`);
          }
          
          // Stop all tracks to release microphone
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }

          this.mediaRecorder = null;
          this.audioChunks = [];
          
          resolve(wavBlob);
        } catch (error: any) {
          reject(new Error(`Failed to process recording: ${error?.message || 'Unknown error'}`));
        }
      };

      this.mediaRecorder.onerror = () => {
        reject(new Error('Recording error occurred'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Convert audio blob to WAV format for better compatibility
   */
  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 44100
      });
      this.audioContext = audioContext;

      console.log('Decoding audio data...');
      // Decode audio data
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Audio blob is empty');
      }
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Decoded audio buffer is empty');
      }
      
      console.log('Audio decoded:', {
        sampleRate: audioBuffer.sampleRate,
        length: audioBuffer.length,
        duration: audioBuffer.duration,
        numberOfChannels: audioBuffer.numberOfChannels
      });

      // Convert to WAV
      const wavBuffer = this.audioBufferToWav(audioBuffer);
      
      if (!wavBuffer || wavBuffer.byteLength === 0) {
        throw new Error('WAV buffer is empty');
      }
      
      // Verify WAV buffer has valid header before creating blob
      const headerBytes = new Uint8Array(wavBuffer, 0, 12);
      const headerString = String.fromCharCode(...headerBytes);
      if (!headerString.startsWith('RIFF') || !headerString.includes('WAVE')) {
        throw new Error('Invalid WAV file structure generated');
      }
      
      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      
      console.log('✅ WAV blob created and verified:', {
        size: wavBlob.size,
        type: wavBlob.type,
        header: headerString.substring(0, 8),
        dataSize: wavBuffer.byteLength
      });

      // Close audio context
      await audioContext.close();
      this.audioContext = null;

      return wavBlob;
    } catch (error: any) {
      console.error('Error in convertToWav:', error);
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      throw error;
    }
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF identifier
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        // Convert float (-1 to 1) to 16-bit signed integer
        const intSample = sample < 0 
          ? Math.max(-32768, Math.round(sample * 32768))
          : Math.min(32767, Math.round(sample * 32767));
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    // Verify WAV file structure
    if (offset !== bufferSize) {
      console.warn(`⚠️ WAV buffer size mismatch: expected ${bufferSize}, wrote ${offset}`);
    }
    
    // Verify WAV header
    const headerCheck = new Uint8Array(arrayBuffer.slice(0, 4));
    if (String.fromCharCode(...headerCheck) !== 'RIFF') {
      throw new Error('Invalid WAV header generated');
    }

    return arrayBuffer;
  }

  /**
   * Get the best supported MIME type for audio recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback to default
    return '';
  }

  /**
   * Check if recording is currently active
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

export const audioRecorderService = new AudioRecorderService();

