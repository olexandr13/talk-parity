// Test script to upload test_audio.m4a to AssemblyAI and verify response
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env file
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (e) {
  // dotenv not installed, use config file
  const configPath = path.join(__dirname, 'src', 'config.ts');
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const apiKeyMatch = configContent.match(/ASSEMBLY_AI_API_KEY:\s*['"]([^'"]+)['"]/);
    if (apiKeyMatch) {
      process.env.API_KEY = apiKeyMatch[1];
    }
  }
}

const API_KEY = process.env.VITE_ASSEMBLY_AI_API_KEY ||
                process.env.API_KEY ||
                'f1b67411fddd4189872004b4a4d9c16a';
const API_URL = 'https://api.assemblyai.com/v2';

if (!API_KEY) {
  console.error('❌ API key not found');
  process.exit(1);
}

async function testUpload() {
  try {
    const audioPath = path.join(__dirname, 'test_audio.m4a');
    
    // Check if file exists
    if (!fs.existsSync(audioPath)) {
      console.error('❌ test_audio.m4a not found at:', audioPath);
      process.exit(1);
    }

    const stats = fs.statSync(audioPath);
    console.log('📁 File info:');
    console.log(`   Path: ${audioPath}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Type: audio/m4a`);

    // Step 1: Upload file
    console.log('\n📤 Step 1: Uploading file to AssemblyAI...');
    const formData = new FormData();
    
    // Read file as buffer
    const fileBuffer = fs.readFileSync(audioPath);
    
    // Append buffer with explicit filename and content type
    formData.append('file', fileBuffer, {
      filename: 'test_audio.m4a',
      contentType: 'audio/m4a',
      knownLength: fileBuffer.length
    });
    
    console.log('   File buffer size:', fileBuffer.length, 'bytes');
    console.log('   Content-Type: audio/m4a');

    const headers = {
      authorization: API_KEY,
      ...formData.getHeaders()
    };
    
    console.log('   Upload headers:', {
      authorization: '***',
      'content-type': headers['content-type']
    });

    const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
      headers: headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (!uploadResponse.data.upload_url) {
      throw new Error('No upload_url in response');
    }

    const uploadUrl = uploadResponse.data.upload_url;
    console.log('✅ Upload successful');
    console.log(`   Upload URL: ${uploadUrl}`);

    // Step 2: Start transcription
    console.log('\n📝 Step 2: Starting transcription with speaker diarization...');
    const transcriptResponse = await axios.post(
      `${API_URL}/transcript`,
      {
        audio_url: uploadUrl,
        speaker_labels: true,
        language_detection: true,
      },
      {
        headers: {
          authorization: API_KEY,
          'content-type': 'application/json',
        },
      }
    );

    const transcriptId = transcriptResponse.data.id;
    console.log('✅ Transcription started');
    console.log(`   Transcript ID: ${transcriptId}`);

    // Step 3: Poll for completion
    console.log('\n⏳ Step 3: Polling for completion...');
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(
        `${API_URL}/transcript/${transcriptId}`,
        {
          headers: {
            authorization: API_KEY,
          },
        }
      );

      const status = statusResponse.data.status;
      console.log(`   Attempt ${attempts + 1}/${maxAttempts}: Status = ${status}`);

      if (status === 'completed') {
        console.log('\n✅ Transcription completed!');
        
        const data = statusResponse.data;
        console.log('\n📊 Results:');
        console.log(`   Status: ${data.status}`);
        console.log(`   Utterances: ${data.utterances?.length || 0}`);
        console.log(`   Words: ${data.words?.length || 0}`);
        console.log(`   Text length: ${data.text?.length || 0} characters`);
        
        if (data.utterances && data.utterances.length > 0) {
          console.log('\n👥 Speaker Analysis:');
          
          // Group by speaker
          const speakerMap = new Map();
          data.utterances.forEach((utterance) => {
            const speaker = utterance.speaker || 'Unknown';
            if (!speakerMap.has(speaker)) {
              speakerMap.set(speaker, {
                count: 0,
                totalTime: 0,
                texts: []
              });
            }
            const speakerData = speakerMap.get(speaker);
            speakerData.count++;
            const duration = (utterance.end - utterance.start) / 1000; // seconds
            speakerData.totalTime += duration;
            if (utterance.text && utterance.text.trim().length > 10) {
              speakerData.texts.push(utterance.text.trim());
            }
          });

          speakerMap.forEach((data, speaker) => {
            console.log(`\n   ${speaker}:`);
            console.log(`      Segments: ${data.count}`);
            console.log(`      Total time: ${data.totalTime.toFixed(2)}s`);
            if (data.texts.length > 0) {
              console.log(`      Sample: "${data.texts[0].substring(0, 60)}..."`);
            }
          });

          console.log('\n✅ Test PASSED - Speaker diarization working correctly!');
          return;
        } else {
          console.log('\n⚠️  No utterances found in response');
          console.log('   Response keys:', Object.keys(data));
        }

        return;
      }

      if (status === 'error') {
        const error = statusResponse.data.error || 'Unknown error';
        console.error(`\n❌ Transcription failed: ${error}`);
        console.error('   Full error response:', JSON.stringify(statusResponse.data, null, 2));
        throw new Error(`Transcription failed: ${error}`);
      }

      attempts++;
    }

    throw new Error('Transcription timeout');
  } catch (error) {
    console.error('\n❌ Test FAILED:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

testUpload();
