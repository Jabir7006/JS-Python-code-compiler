import { useState, useEffect } from "react";

const SETTINGS_KEY = "code-compiler-settings";

export interface Settings {
  aiProvider: "gemini" | "groq";
  geminiApiKey: string;
  groqApiKey: string;
}

const defaultSettings: Settings = {
  aiProvider: "gemini",
  geminiApiKey: "",
  groqApiKey: "",
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
}
