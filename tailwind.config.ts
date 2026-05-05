import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        }
      },
      keyframes: {
        "conflict-pulse": {
          "0%, 100%": { opacity: "0.18" },
          "50%": { opacity: "0.38" }
        },
        "page-enter": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.992)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "soft-pop": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "conflict-pulse": "conflict-pulse 1.4s ease-in-out infinite",
        "page-enter": "page-enter 360ms cubic-bezier(0.22, 1, 0.36, 1)",
        "soft-pop": "soft-pop 280ms cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
} satisfies Config;
