import React, { useState } from 'react';
import { speakerDiarizationService } from '../services/SpeakerDiarizationService';
import './ApiKeyInput.css';

interface ApiKeyInputProps {
  onApiKeySet: () => void;
  onClose?: () => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySet, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      speakerDiarizationService.setApiKey(apiKey.trim());
      setIsVisible(false);
      onApiKeySet();
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="api-key-input-overlay" onClick={(e) => {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
    }}>
      <div className="api-key-input-card">
        <div className="api-key-header">
          <h2 className="api-key-title">AssemblyAI API Key</h2>
          {onClose && (
            <button 
              className="api-key-close-btn"
              onClick={onClose}
              title="Close"
            >
              ×
            </button>
          )}
        </div>
        <p className="api-key-description">
          To process real audio recordings, you need an AssemblyAI API key.
          <br />
          <a 
            href="https://www.assemblyai.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="api-key-link"
          >
            Get a free API key here
          </a>
        </p>
        <form onSubmit={handleSubmit} className="api-key-form">
          <input
            type="password"
            className="api-key-field"
            placeholder="Enter your AssemblyAI API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoFocus
          />
          <div className="api-key-buttons">
            <button type="submit" className="btn btn-primary">
              Save API Key
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleSkip}
            >
              Skip (Mock Mode)
            </button>
          </div>
        </form>
        <p className="api-key-note">
          Note: You can also set it via environment variable <code>ASSEMBLY_AI_API_KEY</code> in your <code>.env</code> file
          <br />
          <small>(Use <code>VITE_ASSEMBLY_AI_API_KEY</code> in .env - Vite requires the <code>VITE_</code> prefix)</small>
        </p>
      </div>
    </div>
  );
};

