import js from '@eslint/js';
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import svelte from 'eslint-plugin-svelte';

const svelteRunesGlobals = {
	$state: 'readonly',
	$derived: 'readonly',
	$effect: 'readonly',
	$props: 'readonly',
	$bindable: 'readonly',
	$inspect: 'readonly',
	$host: 'readonly'
};

const tsFiles = ['**/*.{ts,tsx,mts,cts}', '**/*.svelte.ts'];

// Scope TypeScript flat configs to TS (otherwise the base config sets the TS parser for everything).
const tsRecommended = tsPlugin.configs['flat/recommended'].map((config) => ({
	...config,
	files: tsFiles
}));

export default [
	{
		ignores: [
			'node_modules/**',
			'.svelte-kit/**',
			'build/**',
			'dist/**',
			'.pnpm-store/**',
			'opensrc/**',
			'.claude/**',
			'convex/_generated/**'
		]
	},
	js.configs.recommended,
	...tsRecommended,
	...svelte.configs['flat/recommended'],
	...svelte.configs['flat/prettier'],
	{
		// Broad globals to avoid false positives across SvelteKit's mixed browser/server code.
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
				...svelteRunesGlobals
			}
		},
		rules: {
			// TypeScript/Svelte handle undefined names better than ESLint's no-undef.
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.{js,cjs,mjs}', '**/*.{ts,cts,mts}'],
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	}
];
