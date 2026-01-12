import { useState, useMemo, useCallback } from "react";
import {
  RainbowKitProvider,
  ConnectButton,
  getDefaultConfig,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, useAccount, useWalletClient } from "wagmi";
import { mainnet, polygon, arbitrum, optimism, base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SwapWidget } from "../components/SwapWidget";
import type { ThemeConfig } from "../types";
import "@rainbow-me/rainbowkit/styles.css";
import "./App.css";

const config = getDefaultConfig({
  appName: "ShapeShift Swap Widget",
  projectId: "demo-project-id",
  chains: [mainnet, polygon, arbitrum, optimism, base],
  ssr: false,
});

const queryClient = new QueryClient();

type ThemeColors = {
  bg: string;
  card: string;
  accent: string;
};

const THEME_PRESETS: Array<{
  name: string;
  dark: ThemeColors;
  light: ThemeColors;
}> = [
  {
    name: "Blue",
    dark: { bg: "#0a0a14", card: "#12121c", accent: "#3861fb" },
    light: { bg: "#f8f9fc", card: "#ffffff", accent: "#3861fb" },
  },
  {
    name: "Rose",
    dark: { bg: "#140a0f", card: "#1c1218", accent: "#f43f5e" },
    light: { bg: "#fef2f4", card: "#ffffff", accent: "#f43f5e" },
  },
  {
    name: "Purple",
    dark: { bg: "#0e0a14", card: "#1a1424", accent: "#a855f7" },
    light: { bg: "#faf5ff", card: "#ffffff", accent: "#a855f7" },
  },
  {
    name: "Cyan",
    dark: { bg: "#0a1214", card: "#141d20", accent: "#06b6d4" },
    light: { bg: "#f0fdff", card: "#ffffff", accent: "#06b6d4" },
  },
  {
    name: "Green",
    dark: { bg: "#0a140e", card: "#141c18", accent: "#10b981" },
    light: { bg: "#f0fdf6", card: "#ffffff", accent: "#10b981" },
  },
  {
    name: "Orange",
    dark: { bg: "#14100a", card: "#1c1814", accent: "#f97316" },
    light: { bg: "#fff8f3", card: "#ffffff", accent: "#f97316" },
  },
];

const DemoContent = () => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showCustomizer, setShowCustomizer] = useState(true);

  const [darkColors, setDarkColors] = useState<ThemeColors>({
    bg: "#0a0a14",
    card: "#12121c",
    accent: "#3861fb",
  });

  const [lightColors, setLightColors] = useState<ThemeColors>({
    bg: "#f8f9fc",
    card: "#ffffff",
    accent: "#3861fb",
  });

  const currentColors = theme === "dark" ? darkColors : lightColors;
  const setCurrentColors = theme === "dark" ? setDarkColors : setLightColors;

  const themeConfig: ThemeConfig = useMemo(
    () => ({
      mode: theme,
      accentColor: currentColors.accent,
      backgroundColor: currentColors.bg,
      cardColor: currentColors.card,
    }),
    [theme, currentColors],
  );

  const applyPreset = (preset: (typeof THEME_PRESETS)[0]) => {
    setDarkColors(preset.dark);
    setLightColors(preset.light);
  };

  const [copied, setCopied] = useState(false);

  const copyConfig = useCallback(() => {
    const code = `const themeConfig = {
  dark: {
    mode: "dark",
    backgroundColor: "${darkColors.bg}",
    cardColor: "${darkColors.card}",
    accentColor: "${darkColors.accent}",
  },
  light: {
    mode: "light",
    backgroundColor: "${lightColors.bg}",
    cardColor: "${lightColors.card}",
    accentColor: "${lightColors.accent}",
  },
};

// Usage:
<SwapWidget theme={themeConfig.dark} />
// or
<SwapWidget theme={themeConfig.light} />`;

    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [darkColors, lightColors]);

  const handleSwapSuccess = (txHash: string) => {
    console.log("Swap successful:", txHash);
  };

  const handleSwapError = (error: Error) => {
    console.error("Swap failed:", error);
  };

  const demoStyle = useMemo(
    () =>
      ({
        "--demo-page-bg": currentColors.bg,
        "--demo-page-accent": currentColors.accent,
      }) as React.CSSProperties,
    [currentColors],
  );

  return (
    <div className={`demo-app ${theme}`} style={demoStyle}>
      <header className="demo-header">
        <a
          href="https://shapeshift.com"
          className="demo-logo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="28" height="28" viewBox="0 0 57 62" fill="currentColor">
            <path d="M51.67 5.1L48.97 21.3L39.37 10L51.67 5.1ZM49.03 28.27L51.43 37.14L33.06 42.2L49.03 28.27ZM9.03 23.8L18.88 10.93H35.99L46.92 23.8H9.03ZM45.66 26.99L27.85 42.53L9.7 26.99H45.66ZM15.58 10.01L6.78 21.51L4.08 5.17L15.58 10.01ZM22.57 42.2L4.02 37.15L6.56 28.48L22.57 42.2ZM25.99 46.43L22.49 50.28C19.53 47.46 16.26 44.96 12.78 42.83L25.99 46.43ZM42.98 42.77C39.5 44.94 36.24 47.47 33.29 50.32L29.72 46.42L42.98 42.77ZM55.73 0.06L36.42 7.75H18.42L0 0L4.18 25.3L0.17 38.99L10.65 45.26C15.61 48.23 20.06 51.94 23.86 56.3L27.94 60.97L32.23 56.06C35.9 51.84 40.18 48.22 44.95 45.29L55.23 38.99L51.52 25.31L55.73 0.06Z" />
          </svg>
          <span className="demo-logo-text">ShapeShift</span>
        </a>

        <div className="demo-header-actions">
          <button
            className="demo-customize-btn"
            onClick={() => setShowCustomizer(!showCustomizer)}
            type="button"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Customize
          </button>
          <ConnectButton showBalance={false} />
        </div>
      </header>

      <main className="demo-main">
        <div className="demo-content">
          <div className="demo-hero">
            <h1 className="demo-title">Swap Widget</h1>
            <p className="demo-subtitle">
              Embeddable multi-chain swap widget powered by ShapeShift
            </p>
          </div>

          <div className="demo-layout">
            {showCustomizer && (
              <div className="demo-customizer">
                <h3 className="demo-customizer-title">Customize Widget</h3>

                <div className="demo-customizer-section">
                  <label className="demo-customizer-label">Presets</label>
                  <div className="demo-preset-grid">
                    {THEME_PRESETS.map((preset) => {
                      const previewColors =
                        theme === "dark" ? preset.dark : preset.light;
                      return (
                        <button
                          key={preset.name}
                          className="demo-preset-btn"
                          onClick={() => applyPreset(preset)}
                          title={preset.name}
                          type="button"
                        >
                          <div
                            className="demo-preset-preview"
                            style={{ background: previewColors.bg }}
                          >
                            <div
                              className="demo-preset-card"
                              style={{ background: previewColors.card }}
                            />
                            <div
                              className="demo-preset-accent"
                              style={{ background: previewColors.accent }}
                            />
                          </div>
                          <span className="demo-preset-name">
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="demo-customizer-section">
                  <label className="demo-customizer-label">Theme</label>
                  <div className="demo-theme-toggle">
                    <button
                      className={`demo-theme-btn ${
                        theme === "light" ? "active" : ""
                      }`}
                      onClick={() => setTheme("light")}
                      type="button"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                      Light
                    </button>
                    <button
                      className={`demo-theme-btn ${
                        theme === "dark" ? "active" : ""
                      }`}
                      onClick={() => setTheme("dark")}
                      type="button"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                      Dark
                    </button>
                  </div>
                </div>

                <div className="demo-customizer-section">
                  <label className="demo-customizer-label">
                    Background Color
                  </label>
                  <div className="demo-color-input-row">
                    <input
                      type="color"
                      value={currentColors.bg}
                      onChange={(e) =>
                        setCurrentColors((c) => ({ ...c, bg: e.target.value }))
                      }
                      className="demo-color-picker"
                    />
                    <input
                      type="text"
                      value={currentColors.bg}
                      onChange={(e) =>
                        setCurrentColors((c) => ({ ...c, bg: e.target.value }))
                      }
                      className="demo-color-text"
                    />
                  </div>
                </div>

                <div className="demo-customizer-section">
                  <label className="demo-customizer-label">Card Color</label>
                  <div className="demo-color-input-row">
                    <input
                      type="color"
                      value={currentColors.card}
                      onChange={(e) =>
                        setCurrentColors((c) => ({
                          ...c,
                          card: e.target.value,
                        }))
                      }
                      className="demo-color-picker"
                    />
                    <input
                      type="text"
                      value={currentColors.card}
                      onChange={(e) =>
                        setCurrentColors((c) => ({
                          ...c,
                          card: e.target.value,
                        }))
                      }
                      className="demo-color-text"
                    />
                  </div>
                </div>

                <div className="demo-customizer-section">
                  <label className="demo-customizer-label">Accent Color</label>
                  <div className="demo-color-input-row">
                    <input
                      type="color"
                      value={currentColors.accent}
                      onChange={(e) =>
                        setCurrentColors((c) => ({
                          ...c,
                          accent: e.target.value,
                        }))
                      }
                      className="demo-color-picker"
                    />
                    <input
                      type="text"
                      value={currentColors.accent}
                      onChange={(e) =>
                        setCurrentColors((c) => ({
                          ...c,
                          accent: e.target.value,
                        }))
                      }
                      className="demo-color-text"
                    />
                  </div>
                </div>

                <div className="demo-customizer-section">
                  <label className="demo-customizer-label">Connection</label>
                  <div className="demo-connection-info">
                    {isConnected ? (
                      <>
                        <span className="demo-connected-badge">Connected</span>
                        <span className="demo-address">
                          {address?.slice(0, 6)}...{address?.slice(-4)}
                        </span>
                      </>
                    ) : (
                      <span className="demo-disconnected">Not connected</span>
                    )}
                  </div>
                </div>

                <div className="demo-customizer-section">
                  <button
                    className="demo-copy-btn"
                    onClick={copyConfig}
                    type="button"
                  >
                    {copied ? (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy Theme Config
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="demo-widget-container">
              <SwapWidget
                apiKey="test-api-key-123"
                theme={themeConfig}
                walletClient={walletClient ?? undefined}
                onSwapSuccess={handleSwapSuccess}
                onSwapError={handleSwapError}
                showPoweredBy={true}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="demo-footer">
        <p>Built with ❤️ by ShapeShift DAO</p>
      </footer>
    </div>
  );
};

export const App = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={{
            lightMode: lightTheme(),
            darkMode: darkTheme(),
          }}
        >
          <DemoContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
