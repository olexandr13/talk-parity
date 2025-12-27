import React, { useState } from 'react';
import { Speaker } from '../types';
import './SpeakerStats.css';

interface SpeakerStatsProps {
  speakers: Speaker[];
  totalDuration: number;
  onSpeakerRename?: (speakerId: string, newName: string) => void;
}

// Define consistent colors for each speaker
const SPEAKER_COLORS = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#FFC107', // Amber
  '#F44336', // Red
];

const getSpeakerColor = (index: number): string => {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
};

export const SpeakerStats: React.FC<SpeakerStatsProps> = ({
  speakers,
  totalDuration,
  onSpeakerRename,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [expandedPhrases, setExpandedPhrases] = useState<Set<string>>(new Set());

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Calculate total speaking time and silence
  const totalSpeakingTime = speakers.reduce((sum, speaker) => sum + speaker.speakingTime, 0);
  const silenceTime = totalDuration - totalSpeakingTime;
  const silencePercentage = totalDuration > 0 ? (silenceTime / totalDuration) * 100 : 0;

  const handleEditClick = (speaker: Speaker) => {
    if (onSpeakerRename) {
      setEditingId(speaker.id);
      setEditValue(speaker.label);
    }
  };

  const handleSave = (speakerId: string) => {
    if (onSpeakerRename && editValue.trim()) {
      onSpeakerRename(speakerId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, speakerId: string) => {
    if (e.key === 'Enter') {
      handleSave(speakerId);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="speaker-stats">
      <h2 className="stats-title">Speaking Time Distribution</h2>
      
      <div className="stats-summary">
        <div className="summary-item">
          <span className="summary-label">Total Duration:</span>
          <span className="summary-value">{formatTime(totalDuration)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Speakers Detected:</span>
          <span className="summary-value">{speakers.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Speaking Time:</span>
          <span className="summary-value">{formatTime(totalSpeakingTime)}</span>
        </div>
        {silenceTime > 0 && (
          <div className="summary-item">
            <span className="summary-label">Silence:</span>
            <span className="summary-value">{formatTime(silenceTime)} ({silencePercentage.toFixed(1)}%)</span>
          </div>
        )}
      </div>

      {/* Percentage Distribution Blocks */}
      <div className="percentage-blocks-container">
        {/* With Silence */}
        <div className="percentage-block">
          <h3 className="percentage-block-title">With Silence</h3>
          <div className="percentage-visualization">
            {speakers.map((speaker, index) => (
              <div
                key={speaker.id}
                className="percentage-segment"
                style={{ 
                  width: `${speaker.percentage}%`,
                  backgroundColor: getSpeakerColor(index)
                }}
                title={`${speaker.label}: ${speaker.percentage.toFixed(1)}%`}
              >
                <div className="percentage-segment-content">
                  <span className="percentage-speaker-name">{speaker.label}</span>
                  <span className="percentage-label">{speaker.percentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
            {silenceTime > 0 && silencePercentage > 0.1 && (
              <div
                className="percentage-segment percentage-segment-silence"
                style={{ 
                  width: `${silencePercentage}%`,
                  backgroundColor: '#9E9E9E'
                }}
                title={`Silence: ${silencePercentage.toFixed(1)}%`}
              >
                <div className="percentage-segment-content">
                  <span className="percentage-label">{silencePercentage.toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Without Silence */}
        <div className="percentage-block">
          <h3 className="percentage-block-title">Without Silence</h3>
          <div className="percentage-visualization">
            {speakers.map((speaker, index) => {
              const percentageWithoutSilence = totalSpeakingTime > 0 
                ? (speaker.speakingTime / totalSpeakingTime) * 100 
                : 0;
              return (
                <div
                  key={speaker.id}
                  className="percentage-segment"
                  style={{ 
                    width: `${percentageWithoutSilence}%`,
                    backgroundColor: getSpeakerColor(index)
                  }}
                  title={`${speaker.label}: ${percentageWithoutSilence.toFixed(1)}%`}
                >
                  <div className="percentage-segment-content">
                    <span className="percentage-speaker-name">{speaker.label}</span>
                    <span className="percentage-label">{percentageWithoutSilence.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="speakers-list">
        {speakers.map((speaker, index) => (
          <div key={speaker.id} className="speaker-item" style={{ borderLeftColor: getSpeakerColor(index) }}>
            <div className="speaker-header">
              {editingId === speaker.id ? (
                <div className="speaker-edit-container">
                  <input
                    type="text"
                    className="speaker-edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSave(speaker.id)}
                    onKeyDown={(e) => handleKeyDown(e, speaker.id)}
                    autoFocus
                    maxLength={50}
                  />
                  <div className="speaker-edit-hint">Press Enter to save, Esc to cancel</div>
                </div>
              ) : (
                <div className="speaker-label-container">
                  <span 
                    className={`speaker-label ${onSpeakerRename ? 'editable' : ''}`}
                    onClick={() => handleEditClick(speaker)}
                    title={onSpeakerRename ? 'Click to rename' : ''}
                  >
                    {speaker.label}
                  </span>
                  {onSpeakerRename && (
                    <button
                      className="speaker-edit-btn"
                      onClick={() => handleEditClick(speaker)}
                      title="Rename speaker"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}
              <span className="speaker-percentage">
                {speaker.percentage.toFixed(1)}%
              </span>
            </div>
            
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ 
                  width: `${speaker.percentage}%`,
                  backgroundColor: getSpeakerColor(index)
                }}
              ></div>
            </div>
            
            <div className="speaker-time">
              {formatTime(speaker.speakingTime)}
            </div>

            {/* All Phrases - Collapsible Spoiler */}
            {speaker.allPhrases && speaker.allPhrases.length > 0 && (
              <div className="all-phrases-section">
                <button
                  className="all-phrases-toggle"
                  onClick={() => {
                    const newExpanded = new Set(expandedPhrases);
                    if (newExpanded.has(speaker.id)) {
                      newExpanded.delete(speaker.id);
                    } else {
                      newExpanded.add(speaker.id);
                    }
                    setExpandedPhrases(newExpanded);
                  }}
                  aria-expanded={expandedPhrases.has(speaker.id)}
                >
                  <span className="all-phrases-toggle-icon">
                    {expandedPhrases.has(speaker.id) ? '▼' : '▶'}
                  </span>
                  <span className="all-phrases-toggle-text">
                    All Phrases ({speaker.allPhrases.length})
                  </span>
                </button>
                {expandedPhrases.has(speaker.id) && (
                  <div className="all-phrases-content">
                    {speaker.allPhrases.map((phrase, idx) => (
                      <div key={idx} className="all-phrases-item">
                        <span className="all-phrases-number">{idx + 1}.</span>
                        <span className="all-phrases-text">"{phrase}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {/* Show silence as a separate item if there's significant silence */}
        {silenceTime > 0 && silencePercentage > 0.1 && (
          <div className="speaker-item speaker-item-silence">
            <div className="speaker-header">
              <div className="speaker-label-container">
                <span className="speaker-label">Silence</span>
              </div>
              <span className="speaker-percentage">
                {silencePercentage.toFixed(1)}%
              </span>
            </div>
            
            <div className="progress-bar-container">
              <div
                className="progress-bar progress-bar-silence"
                style={{ width: `${silencePercentage}%` }}
              ></div>
            </div>
            
            <div className="speaker-time">
              {formatTime(silenceTime)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

