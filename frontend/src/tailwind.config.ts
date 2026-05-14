import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      colors: {
        primary: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',   /* main primary — teal-600 */
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        status: {
          pending:           '#d97706',   /* amber-600 */
          'pending-bg':      '#fef3c7',   /* amber-100 */
          'pending-text':    '#92400e',   /* amber-800 */
          proses:            '#0d9488',   /* teal-600 */
          'proses-bg':       '#ccfbf1',   /* teal-100 */
          'proses-text':     '#134e4a',   /* teal-900 */
          selesai:           '#16a34a',   /* green-600 */
          'selesai-bg':      '#dcfce7',   /* green-100 */
          'selesai-text':    '#14532d',   /* green-900 */
          dibatalkan:        '#dc2626',   /* red-600 */
          'dibatalkan-bg':   '#fee2e2',   /* red-100 */
          'dibatalkan-text': '#7f1d1d',   /* red-900 */
        },
        sidebar: {
          DEFAULT: '#0f172a',   /* slate-900 */
          hover:   '#1e293b',   /* slate-800 */
          active:  '#0f172a',
          border:  '#1e293b',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
