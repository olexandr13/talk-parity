import React from 'react';
import { ApiRequestInfo } from '../types';
import './ApiInfo.css';

interface ApiInfoProps {
  apiInfo: ApiRequestInfo | null;
}

export const ApiInfo: React.FC<ApiInfoProps> = ({ apiInfo }) => {
  if (!apiInfo) {
    return null;
  }

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatTime = (ms?: number): string => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="api-info">
      <h3 className="api-info-title">API Request Info</h3>
      <div className="api-info-grid">
        <div className="api-info-item">
          <span className="api-info-label">File Size:</span>
          <span className="api-info-value">{formatBytes(apiInfo.uploadSize)}</span>
        </div>
        {apiInfo.uploadTime && (
          <div className="api-info-item">
            <span className="api-info-label">Upload Time:</span>
            <span className="api-info-value">{formatTime(apiInfo.uploadTime)}</span>
          </div>
        )}
        {apiInfo.transcriptId && (
          <div className="api-info-item">
            <span className="api-info-label">Transcript ID:</span>
            <span className="api-info-value api-info-id">{apiInfo.transcriptId}</span>
          </div>
        )}
        {apiInfo.transcriptStatus && (
          <div className="api-info-item">
            <span className="api-info-label">Status:</span>
            <span className={`api-info-value api-info-status api-info-status-${apiInfo.transcriptStatus.toLowerCase()}`}>
              {apiInfo.transcriptStatus}
            </span>
          </div>
        )}
        {apiInfo.totalProcessingTime && (
          <div className="api-info-item">
            <span className="api-info-label">Processing Time:</span>
            <span className="api-info-value">{formatTime(apiInfo.totalProcessingTime)}</span>
          </div>
        )}
        {apiInfo.uploadRequestUrl && (
          <div className="api-info-item api-info-item-full">
            <span className="api-info-label">Upload Request URL:</span>
            <span className="api-info-value api-info-url">{apiInfo.uploadRequestUrl}</span>
          </div>
        )}
        {apiInfo.transcriptRequestUrl && (
          <div className="api-info-item api-info-item-full">
            <span className="api-info-label">Transcript Request URL:</span>
            <span className="api-info-value api-info-url">{apiInfo.transcriptRequestUrl}</span>
          </div>
        )}
        {apiInfo.pollRequestUrl && (
          <div className="api-info-item api-info-item-full">
            <span className="api-info-label">Poll Request URL:</span>
            <span className="api-info-value api-info-url">{apiInfo.pollRequestUrl}</span>
          </div>
        )}
        {apiInfo.uploadUrl && (
          <div className="api-info-item api-info-item-full">
            <span className="api-info-label">Upload URL (from response):</span>
            <span className="api-info-value api-info-url">{apiInfo.uploadUrl}</span>
          </div>
        )}
      </div>
    </div>
  );
};
