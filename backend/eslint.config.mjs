import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Osnovna ESLint konfiguracija za backend
export default tseslint.config(
  // Ignoriraj direktorije i datoteke koje ne želimo lintati ili uzrokuju probleme
  { 
    ignores: [
      'dist/**', 
      'node_modules/**', 
      'prisma/**', 
      'vitest.config.ts', 
      'scripts/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs'
    ] 
  },
  {
    // Koristi jednostavnija pravila za početak - bez TypeScript type checking
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended
    ],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node
      }
    },
    rules: {
      // Jednostavnija pravila za početak
      '@typescript-eslint/no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_', 
        'varsIgnorePattern': '^_' 
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Isključujemo stroga pravila na početku
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      
      // Server aplikacije često koriste console.log
      'no-console': 'off'
    },
  }
);
