// API Configuration
// Set your AssemblyAI API key here
// Get a free API key from: https://www.assemblyai.com/

const STORAGE_KEY = 'assemblyai_api_key';

/**
 * Get API key from:
 * 1. Environment variable (VITE_ASSEMBLY_AI_API_KEY)
 * 2. localStorage (if user entered it via UI)
 */
function getApiKey(): string | undefined {
  // First, check environment variable
  const envKey = import.meta.env.VITE_ASSEMBLY_AI_API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // Second, check localStorage
  const storedKey = localStorage.getItem(STORAGE_KEY);
  return storedKey || undefined;
}

/**
 * Save API key to localStorage
 */
export function saveApiKey(apiKey: string): void {
  localStorage.setItem(STORAGE_KEY, apiKey);
}

/**
 * Clear API key from localStorage
 */
export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const API_CONFIG = {
  // Set your API key here directly (or use .env file)
  // In .env file, use: VITE_ASSEMBLY_AI_API_KEY=your_key_here
  // (Vite requires VITE_ prefix for environment variables)
  ASSEMBLY_AI_API_KEY: getApiKey(),
};

