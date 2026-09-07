import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        surface3: "var(--surface-3)",
        border: "var(--border)",
        ink: "var(--ink)",
        inkSoft: "var(--ink-soft)",
        inkFaint: "var(--ink-faint)",
        accent: "var(--accent)",
        accentInk: "var(--accent-ink)",
        accentSoft: "var(--accent-soft)",
        indigo: "var(--indigo)",
        indigoSoft: "var(--indigo-soft)",
        good: "var(--good)",
        goodSoft: "var(--good-soft)",
        warn: "var(--warn)",
        warnSoft: "var(--warn-soft)",
        critical: "var(--critical)",
        criticalSoft: "var(--critical-soft)"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"]
      },
      boxShadow: {
        card: "var(--shadow)"
      },
      borderRadius: {
        xl2: "20px"
      }
    }
  },
  plugins: []
};

export default config;
