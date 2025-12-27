import { HistoryItem } from '../types';

const HISTORY_STORAGE_KEY = 'talk-parity-history';

export class HistoryService {
  /**
   * Get all history items from local storage
   */
  static getHistory(): HistoryItem[] {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const items = JSON.parse(stored) as HistoryItem[];
      // Sort by timestamp, newest first
      return items.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error loading history from localStorage:', error);
      return [];
    }
  }

  /**
   * Add a new item to history
   */
  static addHistoryItem(item: HistoryItem): void {
    try {
      const history = this.getHistory();
      history.unshift(item); // Add to beginning
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving to history:', error);
      throw new Error('Failed to save to history. Storage may be full.');
    }
  }

  /**
   * Update an existing history item (e.g., rename)
   */
  static updateHistoryItem(id: string, updates: Partial<HistoryItem>): void {
    try {
      const history = this.getHistory();
      const index = history.findIndex(item => item.id === id);
      if (index !== -1) {
        history[index] = { ...history[index], ...updates };
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      }
    } catch (error) {
      console.error('Error updating history item:', error);
      throw new Error('Failed to update history item.');
    }
  }

  /**
   * Delete a history item
   */
  static deleteHistoryItem(id: string): void {
    try {
      const history = this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting history item:', error);
      throw new Error('Failed to delete history item.');
    }
  }

  /**
   * Get a single history item by ID
   */
  static getHistoryItem(id: string): HistoryItem | null {
    const history = this.getHistory();
    return history.find(item => item.id === id) || null;
  }

  /**
   * Clear all history
   */
  static clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing history:', error);
      throw new Error('Failed to clear history.');
    }
  }
}
