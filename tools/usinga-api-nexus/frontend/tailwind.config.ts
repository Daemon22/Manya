import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        panel: "#f8fafb",
        line: "#dbe3ea",
        signal: "#0f766e",
        pulse: "#b42318",
        amber: "#b7791f"
      }
    }
  },
  plugins: []
};

export default config;

