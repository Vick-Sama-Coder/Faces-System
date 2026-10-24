import { create } from 'zustand';

export const THEME_STORAGE_KEY = 'faces.theme';
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

const VALID_PREFERENCES = ['system', 'light', 'dark'];
const LIGHT_THEME_COLOR = '#6D35C8';
const DARK_THEME_COLOR = '#0D0B14';

function getSystemTheme() {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
}

function readPreference() {
    if (typeof window === 'undefined') return 'system';
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
        return 'system';
    }
}

function resolveTheme(preference) {
    if (preference === 'dark') return 'dark';
    if (preference === 'light') return 'light';
    return getSystemTheme();
}

function applyTheme(theme) {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }
}

function initialTheme() {
    if (typeof document === 'undefined') return 'light';

    // O script inline do index.html já resolveu o tema antes do primeiro paint.
    // Reutilizamos esse valor para o React arrancar exatamente com o mesmo tema.
    const applied = document.documentElement.dataset.theme;
    if (applied === 'light' || applied === 'dark') return applied;

    return resolveTheme(readPreference());
}

const initialPreference = readPreference();
const initialResolvedTheme = initialTheme();
applyTheme(initialResolvedTheme);

export const useThemeStore = create((set, get) => ({
    preference: initialPreference,
    resolvedTheme: initialResolvedTheme,

    setPreference: (preference) => {
        if (!VALID_PREFERENCES.includes(preference)) return;

        try {
            if (preference === 'system') {
                window.localStorage.removeItem(THEME_STORAGE_KEY);
            } else {
                window.localStorage.setItem(THEME_STORAGE_KEY, preference);
            }
        } catch {
            // A preferência continua válida durante a sessão mesmo sem storage.
        }

        const resolvedTheme = resolveTheme(preference);
        applyTheme(resolvedTheme);
        set({ preference, resolvedTheme });
    },

    // Chamado apenas pelo listener global. Se houver uma escolha explícita,
    // alterações do sistema operativo não devem mexer no tema.
    syncSystemTheme: () => {
        if (get().preference !== 'system') return;
        const resolvedTheme = getSystemTheme();
        applyTheme(resolvedTheme);
        if (resolvedTheme !== get().resolvedTheme) set({ resolvedTheme });
    }
}));
