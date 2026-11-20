// Browser storage, per the tech stack:
//  - localStorage   → lasting preferences (theme, intro seen)
//  - sessionStorage → this tab's conversation state
// All access is guarded: storage can be unavailable (private mode, SSR).

export const prefs = {
  get(key: 'theme' | 'introSeen'): string | null {
    try {
      return localStorage.getItem(`gabai:${key}`);
    } catch {
      return null;
    }
  },
  set(key: 'theme' | 'introSeen', value: string) {
    try {
      localStorage.setItem(`gabai:${key}`, value);
    } catch {}
  },
};

export const session = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = sessionStorage.getItem(`gabai:${key}`);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      sessionStorage.setItem(`gabai:${key}`, JSON.stringify(value));
    } catch {}
  },
};
