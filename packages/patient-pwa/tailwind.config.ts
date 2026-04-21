import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Apple HIG Color Palette - Minimalist Black & White
      colors: {
        background: "#ffffff",
        foreground: "#000000",
        // Semantic colors
        primary: "#000000",
        secondary: "#f5f5f5",
        tertiary: "#e5e5e5",
        quaternary: "#d0d0d0",
        // Status colors (kept minimal)
        success: "#34c759",
        warning: "#ff9500",
        error: "#ff3b30",
        info: "#0a84ff",
      },
      // Apple HIG Typography
      fontSize: {
        xs: ["12px", { lineHeight: "1.4", letterSpacing: "0px" }],
        sm: ["13px", { lineHeight: "1.5", letterSpacing: "0px" }],
        base: ["17px", { lineHeight: "1.5", letterSpacing: "0px" }],
        lg: ["19px", { lineHeight: "1.5", letterSpacing: "0px" }],
        xl: ["22px", { lineHeight: "1.4", letterSpacing: "0px" }],
        "2xl": ["28px", { lineHeight: "1.3", letterSpacing: "0px" }],
        "3xl": ["34px", { lineHeight: "1.3", letterSpacing: "-0.3px" }],
        "4xl": ["40px", { lineHeight: "1.2", letterSpacing: "-0.4px" }],
      },
      // Apple HIG Spacing (8px base unit)
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
      },
      // Apple HIG Border Radius
      borderRadius: {
        none: "0",
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        full: "9999px",
      },
      // Apple HIG Shadows
      boxShadow: {
        none: "none",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
      // Responsive breakpoints (iPhone-first)
      screens: {
        xs: "375px",  // iPhone 12/13/14
        sm: "430px",  // iPhone 14 Pro Max
        md: "768px",  // iPad
        lg: "1024px", // iPad Pro
        xl: "1280px", // Desktop
      },
    },
    fontFamily: {
      sans: [
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        '"Noto Sans"',
        "sans-serif",
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
        '"Noto Color Emoji"',
      ],
      mono: [
        '"Courier New"',
        "Courier",
        "monospace",
      ],
    },
  },
  plugins: [],
};
export default config;
