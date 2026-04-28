import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 32% 91%)",
        background: "hsl(210 40% 98%)",
        foreground: "hsl(222 47% 11%)",
        muted: "hsl(210 20% 96%)",
        "muted-foreground": "hsl(215 16% 47%)",
        primary: "hsl(174 72% 28%)",
        "primary-foreground": "hsl(0 0% 100%)",
        accent: "hsl(38 92% 50%)",
        destructive: "hsl(0 72% 51%)",
      },
      boxShadow: {
        panel: "0 12px 40px -24px rgb(15 23 42 / 0.38)",
      },
    },
  },
  plugins: [],
};

export default config;
