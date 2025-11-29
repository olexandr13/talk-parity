# Who Talks - Web Service

# ! "PARITY" - name idea

A modern web application that records audio from the microphone and analyzes speaking time distribution, showing who talks and what percentage of the overall time each speaker uses.

## Features

- 🎤 Real-time audio recording from browser microphone
- 👥 Automatic speaker diarization (identifying different speakers)
- ⏱️ Speaking time tracking per speaker
- 📊 Visual display of speaking time percentages
- 🌐 Works in modern web browsers
- 📱 Responsive design for mobile and desktop

## Prerequisites

- Node.js (>= 16)
- Modern web browser with microphone support

## Installation

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

## Configuration

### Speaker Diarization API

The app uses AssemblyAI for speaker diarization. To use the real API:

1. Get a free API key from [AssemblyAI](https://www.assemblyai.com/)
2. Create a `.env` file in the `web/` directory:
```bash
VITE_ASSEMBLY_AI_API_KEY=your_api_key_here
```

**Important:** Vite requires environment variables to be prefixed with `VITE_` to be exposed to client-side code. The variable name must start with `VITE_` (e.g., `VITE_ASSEMBLY_AI_API_KEY`).

After creating/updating the `.env` file, restart the dev server for changes to take effect.

**Note:** The app includes mock data functionality for testing without an API key.

## Running the App

### Development Mode
```bash
npm run dev
```

This will start the development server at `http://localhost:3000` (or the next available port).

### Build for Production
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## Usage

1. **Grant Microphone Permission**: When you click "Start Recording", your browser will ask for microphone permission. Click "Allow".

2. **Start Recording**: Click "Start Recording" to begin capturing audio

3. **Stop Recording**: Click "Stop Recording" when finished

4. **View Results**: The app will process the audio and display:
   - Total recording duration
   - List of speakers identified
   - Speaking time per speaker
   - Percentage of total time each speaker talked
   - Visual progress bars showing distribution

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── RecordingControls.tsx    # Recording UI controls
│   │   ├── RecordingControls.css
│   │   ├── SpeakerStats.tsx          # Speaker statistics display
│   │   └── SpeakerStats.css
│   ├── services/
│   │   ├── AudioRecorderService.ts   # Audio recording logic (Web Audio API)
│   │   └── SpeakerDiarizationService.ts # Speaker diarization API
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   ├── App.tsx                       # Main app component
│   ├── App.css
│   ├── main.tsx                      # App entry point
│   └── index.css
├── index.html                        # HTML template
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Vite configuration
└── README.md
```

## Technologies Used

- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Web Audio API**: Browser audio recording
- **AssemblyAI**: Speaker diarization API (optional)
- **axios**: HTTP client for API calls

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may have limited codec support)
- Mobile browsers with microphone support

## Development Notes

- The app includes mock data functionality for testing without API configuration
- Audio is recorded using the Web Audio API (MediaRecorder)
- Audio format defaults to WebM with Opus codec for best compatibility
- Speaker labels are automatically generated (Speaker A, Speaker B, etc.)
- The app handles permission requests automatically
- All audio processing happens client-side until upload to AssemblyAI

## License

MIT

