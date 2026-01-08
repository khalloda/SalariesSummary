import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

interface Config {
  bonus: {
    showHalves: boolean;
  };
}

const CONFIG_FILE = join(process.cwd(), 'config.json');
const DEFAULT_CONFIG: Config = {
  bonus: {
    showHalves: false
  }
};

// Cache config to avoid reading file on every request
let cachedConfig: Config | null = null;
let lastModified: number = 0;

/**
 * Load configuration from file
 */
export function loadConfig(): Config {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      // Merge with defaults to ensure all keys exist
      return {
        ...DEFAULT_CONFIG,
        ...config,
        bonus: {
          ...DEFAULT_CONFIG.bonus,
          ...(config.bonus || {})
        }
      };
    }
  } catch (error) {
    console.warn('Error loading config file, using defaults:', error);
  }
  
  // Create default config file if it doesn't exist
  try {
    saveConfig(DEFAULT_CONFIG);
  } catch (error) {
    console.warn('Could not create config file:', error);
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Config): void {
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    // Clear cache when saving
    cachedConfig = null;
    lastModified = 0;
  } catch (error) {
    console.error('Error saving config file:', error);
    throw error;
  }
}

/**
 * Get cached config (refreshes if file changed)
 */
export function getCachedConfig(): Config {
  try {
    if (existsSync(CONFIG_FILE)) {
      const stats = statSync(CONFIG_FILE);
      const mtime = stats.mtimeMs;
      
      // Reload if file was modified or cache is empty
      if (!cachedConfig || mtime > lastModified) {
        cachedConfig = loadConfig();
        lastModified = mtime;
      }
      
      return cachedConfig;
    }
  } catch (error) {
    console.warn('Error reading config file:', error);
  }
  
  if (!cachedConfig) {
    cachedConfig = DEFAULT_CONFIG;
  }
  
  return cachedConfig;
}

/**
 * Get bonus halves visibility setting
 */
export function shouldShowBonusHalves(): boolean {
  const config = getCachedConfig();
  return config.bonus.showHalves;
}

/**
 * Set bonus halves visibility setting
 */
export function setShowBonusHalves(show: boolean): void {
  const config = getCachedConfig();
  config.bonus.showHalves = show;
  saveConfig(config);
  // Update cache
  cachedConfig = config;
}

