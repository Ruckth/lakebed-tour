export type ThemeMode = 'light' | 'dark' | 'system';

class ThemeState {
	mode = $state<ThemeMode>('system');
	dark = $state(false);

	init() {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem('theme') as ThemeMode | null;
		this.mode = stored ?? 'system';
		this.apply();

		// Listen for system preference changes
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (this.mode === 'system') this.apply();
		});
	}

	setMode(mode: ThemeMode) {
		this.mode = mode;
		if (mode === 'system') {
			localStorage.removeItem('theme');
		} else {
			localStorage.setItem('theme', mode);
		}
		this.apply();
	}

	cycle() {
		const modes: ThemeMode[] = ['light', 'dark', 'system'];
		const next = modes[(modes.indexOf(this.mode) + 1) % modes.length];
		this.setMode(next);
	}

	private apply() {
		if (typeof document === 'undefined' || typeof window === 'undefined') return;
		if (this.mode === 'system') {
			this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		} else {
			this.dark = this.mode === 'dark';
		}
		document.documentElement.classList.toggle('dark', this.dark);
	}
}

export const themeState = new ThemeState();
