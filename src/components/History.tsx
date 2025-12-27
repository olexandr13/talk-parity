import React, { useState } from 'react';
import { HistoryItem } from '../types';
import './History.css';

interface HistoryProps {
  history: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onRenameItem: (id: string, newName: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  activeItemId: string | null;
}

export const History: React.FC<HistoryProps> = ({
  history,
  onLoadItem,
  onRenameItem,
  onDeleteItem,
  onClearHistory,
  activeItemId,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStartEdit = (item: HistoryItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onRenameItem(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <button 
          className="history-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="history-icon">📚</span>
          <h2 className="history-title">History ({history.length})</h2>
          <span className="history-chevron">{isExpanded ? '▼' : '▶'}</span>
        </button>
        {isExpanded && history.length > 0 && (
          <button
            className="clear-history-btn"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all history?')) {
                onClearHistory();
              }
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className={`history-item ${activeItemId === item.id ? 'history-item-active' : ''}`}>
              <div className="history-item-main">
                {editingId === item.id ? (
                  <div className="history-item-edit">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(item.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="history-edit-input"
                      autoFocus
                    />
                    <button
                      className="history-edit-save"
                      onClick={() => handleSaveEdit(item.id)}
                    >
                      ✓
                    </button>
                    <button
                      className="history-edit-cancel"
                      onClick={handleCancelEdit}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="history-item-info">
                      <div className="history-item-name">{item.name}</div>
                      <div className="history-item-meta">
                        <span className="history-item-date">{formatDate(item.timestamp)}</span>
                        <span className="history-item-separator">•</span>
                        <span className="history-item-duration">{formatDuration(item.duration)}</span>
                        <span className="history-item-separator">•</span>
                        <span className="history-item-speakers">
                          {item.speakers.length} speaker{item.speakers.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="history-item-transcript-id">
                        ID: {item.transcriptId}
                      </div>
                    </div>
                    <div className="history-item-actions">
                      <button
                        className="history-item-btn history-load-btn"
                        onClick={() => onLoadItem(item)}
                        title="Show statistics for this recording"
                      >
                        📊 Show stat
                      </button>
                      <button
                        className="history-item-btn history-rename-btn"
                        onClick={() => handleStartEdit(item)}
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        className="history-item-btn history-delete-btn"
                        onClick={() => {
                          if (window.confirm(`Delete "${item.name}"?`)) {
                            onDeleteItem(item.id);
                          }
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
