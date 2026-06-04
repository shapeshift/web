import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ThemeConfig } from '../types'

export type ThemeColors = {
  bg: string
  card: string
  accent: string
  borderColor?: string
  borderRadius?: string
  buttonVariant?: 'filled' | 'outline'
}

const THEME_PRESETS: {
  name: string
  dark: ThemeColors
  light: ThemeColors
}[] = [
  {
    name: 'Blue',
    dark: { bg: '#0a0a14', card: '#12121c', accent: '#3861fb' },
    light: { bg: '#e4e9ff', card: '#eef2ff', accent: '#3861fb' },
  },
  {
    name: 'Rose',
    dark: { bg: '#140a0f', card: '#1c1218', accent: '#f43f5e' },
    light: { bg: '#ffe6ea', card: '#fff0f2', accent: '#f43f5e' },
  },
  {
    name: 'Purple',
    dark: { bg: '#0e0a14', card: '#1a1424', accent: '#a855f7' },
    light: { bg: '#f1e6ff', card: '#f7f0ff', accent: '#a855f7' },
  },
  {
    name: 'Cyan',
    dark: { bg: '#0a1214', card: '#141d20', accent: '#06b6d4' },
    light: { bg: '#ddf5fb', card: '#ebf9fd', accent: '#06b6d4' },
  },
  {
    name: 'Green',
    dark: { bg: '#0a140e', card: '#141c18', accent: '#10b981' },
    light: { bg: '#ddf6e9', card: '#eafaf1', accent: '#10b981' },
  },
  {
    name: 'Orange',
    dark: { bg: '#14100a', card: '#1c1814', accent: '#f97316' },
    light: { bg: '#ffe9d8', card: '#fff2e8', accent: '#f97316' },
  },
  {
    name: 'Stucco',
    dark: {
      bg: '#0d1117',
      card: '#161b22',
      accent: '#bea989',
      borderColor: '#2a2520',
    },
    light: {
      bg: '#f5f3ee',
      card: '#fbf9f4',
      accent: '#b8941f',
      borderColor: '#d4cfc7',
    },
  },
]

const DEFAULT_DARK: ThemeColors = { bg: '#0a0a14', card: '#12121c', accent: '#3861fb' }
const DEFAULT_LIGHT: ThemeColors = { bg: '#f8f9fc', card: '#ffffff', accent: '#3861fb' }

const STORAGE_KEY = 'ssw-demo-config'

type StoredConfig = {
  partnerCode?: string
  darkColors?: ThemeColors
  lightColors?: ThemeColors
  selectedPreset?: string | null
}

const loadConfig = (): StoredConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredConfig) : {}
  } catch {
    return {}
  }
}

export const useDemoTheme = (theme: 'light' | 'dark') => {
  const [stored] = useState(loadConfig)
  const [partnerCode, setPartnerCode] = useState(stored.partnerCode ?? '')
  const [darkColors, setDarkColors] = useState<ThemeColors>(stored.darkColors ?? DEFAULT_DARK)
  const [lightColors, setLightColors] = useState<ThemeColors>(stored.lightColors ?? DEFAULT_LIGHT)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(stored.selectedPreset ?? null)

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ partnerCode, darkColors, lightColors, selectedPreset }),
      )
    } catch {
      // ignore write failures (e.g. storage unavailable)
    }
  }, [partnerCode, darkColors, lightColors, selectedPreset])

  const currentColors = theme === 'dark' ? darkColors : lightColors

  const themeConfig: ThemeConfig = useMemo(
    () => ({
      mode: theme,
      accentColor: currentColors.accent,
      backgroundColor: currentColors.bg,
      cardColor: currentColors.card,
      borderColor: currentColors.borderColor,
      borderRadius: currentColors.borderRadius,
      buttonVariant: currentColors.buttonVariant,
    }),
    [theme, currentColors],
  )

  const demoStyle = useMemo(
    () =>
      ({
        '--demo-page-bg': currentColors.bg,
        '--demo-page-accent': currentColors.accent,
      }) as React.CSSProperties,
    [currentColors],
  )

  return {
    partnerCode,
    setPartnerCode,
    darkColors,
    setDarkColors,
    lightColors,
    setLightColors,
    selectedPreset,
    setSelectedPreset,
    themeConfig,
    demoStyle,
  }
}

export type DemoThemeState = ReturnType<typeof useDemoTheme>

type DemoCustomizerProps = {
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  state: DemoThemeState
}

export const DemoCustomizer = ({ theme, setTheme, state }: DemoCustomizerProps) => {
  const {
    partnerCode,
    setPartnerCode,
    darkColors,
    setDarkColors,
    lightColors,
    setLightColors,
    selectedPreset,
    setSelectedPreset,
  } = state

  const currentColors = theme === 'dark' ? darkColors : lightColors
  const setCurrentColors = theme === 'dark' ? setDarkColors : setLightColors

  const applyPreset = useCallback(
    (preset: (typeof THEME_PRESETS)[number]) => {
      // Preserve non-color config (border radius, button style) across preset changes
      setDarkColors(prev => ({
        ...preset.dark,
        borderRadius: prev.borderRadius,
        buttonVariant: prev.buttonVariant,
      }))
      setLightColors(prev => ({
        ...preset.light,
        borderRadius: prev.borderRadius,
        buttonVariant: prev.buttonVariant,
      }))
      setSelectedPreset(preset.name)
    },
    [setDarkColors, setLightColors, setSelectedPreset],
  )

  // Manual color edits diverge from the preset, so clear the active-preset highlight
  const handleColorChange = useCallback(
    (patch: Partial<ThemeColors>) => {
      setCurrentColors(c => ({ ...c, ...patch }))
      setSelectedPreset(null)
    },
    [setCurrentColors, setSelectedPreset],
  )

  const [copied, setCopied] = useState(false)

  const copyConfig = useCallback(() => {
    const formatColors = (colors: ThemeColors, mode: string) => {
      const lines = [
        `    mode: "${mode}",`,
        `    backgroundColor: "${colors.bg}",`,
        `    cardColor: "${colors.card}",`,
        `    accentColor: "${colors.accent}",`,
      ]
      if (colors.borderColor) lines.push(`    borderColor: "${colors.borderColor}",`)
      if (colors.borderRadius) lines.push(`    borderRadius: "${colors.borderRadius}",`)
      if (colors.buttonVariant) lines.push(`    buttonVariant: "${colors.buttonVariant}",`)
      return lines.join('\n')
    }

    const code = `const themeConfig = {
  dark: {
${formatColors(darkColors, 'dark')}
  },
  light: {
${formatColors(lightColors, 'light')}
  },
};

// Usage:
<SwapWidget theme={themeConfig.dark} />
// or
<SwapWidget theme={themeConfig.light} />`

    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [darkColors, lightColors])

  return (
    <div className='demo-customizer'>
      <h3 className='demo-customizer-title'>Customize Widget</h3>

      <div className='demo-customizer-section'>
        <span className='demo-customizer-label'>Partner Code</span>
        <input
          type='text'
          value={partnerCode}
          onChange={e => setPartnerCode(e.target.value)}
          placeholder='your-partner-code'
          className='demo-color-text'
          style={{ width: '100%' }}
        />
      </div>

      <div className='demo-customizer-section'>
        <span className='demo-customizer-label'>Presets</span>
        <div className='demo-preset-grid'>
          {THEME_PRESETS.map(preset => {
            const previewColors = theme === 'dark' ? preset.dark : preset.light
            return (
              <button
                key={preset.name}
                className={`demo-preset-btn${selectedPreset === preset.name ? ' active' : ''}`}
                onClick={() => applyPreset(preset)}
                title={preset.name}
                type='button'
              >
                <div className='demo-preset-preview' style={{ background: previewColors.bg }}>
                  <div className='demo-preset-card' style={{ background: previewColors.card }} />
                  <div
                    className='demo-preset-accent'
                    style={{ background: previewColors.accent }}
                  />
                </div>
                <span className='demo-preset-name'>{preset.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className='demo-customizer-section'>
        <span className='demo-customizer-label'>Theme</span>
        <div className='demo-theme-toggle'>
          <button
            className={`demo-theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            type='button'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='5' />
              <path d='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42' />
            </svg>
            Light
          </button>
          <button
            className={`demo-theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
            type='button'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' />
            </svg>
            Dark
          </button>
        </div>
      </div>

      <div className='demo-customizer-section'>
        <span className='demo-customizer-label'>Background Color</span>
        <div className='demo-color-input-row'>
          <input
            type='color'
            value={currentColors.bg}
            onChange={e => handleColorChange({ bg: e.target.value })}
            className='demo-color-picker'
          />
          <input
            type='text'
            value={currentColors.bg}
            onChange={e => handleColorChange({ bg: e.target.value })}
            className='demo-color-text'
          />
        </div>
      </div>

      <div className='demo-customizer-section'>
        <span className='demo-customizer-label'>Card Color</span>
        <div className='demo-color-input-row'>
          <input
            type='color'
            value={currentColors.card}
            onChange={e => handleColorChange({ card: e.target.value })}
            className='demo-color-picker'
          />
          <input
            type='text'
            value={currentColors.card}
            onChange={e => handleColorChange({ card: e.target.value })}
            className='demo-color-text'
          />
        </div>
      </div>

      <div className='demo-customizer-section'>
        <span className='demo-customizer-label'>Accent Color</span>
        <div className='demo-color-input-row'>
          <input
            type='color'
            value={currentColors.accent}
            onChange={e => handleColorChange({ accent: e.target.value })}
            className='demo-color-picker'
          />
          <input
            type='text'
            value={currentColors.accent}
            onChange={e => handleColorChange({ accent: e.target.value })}
            className='demo-color-text'
          />
        </div>
      </div>

      <div className='demo-customizer-section'>
        <span className='demo-customizer-label'>Border Radius</span>
        <div className='demo-color-input-row'>
          <input
            type='range'
            min='0'
            max='20'
            value={currentColors.borderRadius ?? '16'}
            onChange={e => setCurrentColors(c => ({ ...c, borderRadius: e.target.value }))}
            className='demo-range-input'
          />
          <input
            type='text'
            value={`${currentColors.borderRadius ?? '16'}px`}
            readOnly
            className='demo-color-text'
            style={{ width: 60 }}
          />
        </div>
      </div>

      <div className='demo-customizer-section'>
        <span className='demo-customizer-label'>Button Style</span>
        <div className='demo-theme-toggle'>
          <button
            className={`demo-theme-btn ${
              currentColors.buttonVariant !== 'outline' ? 'active' : ''
            }`}
            onClick={() => setCurrentColors(c => ({ ...c, buttonVariant: 'filled' }))}
            type='button'
          >
            Filled
          </button>
          <button
            className={`demo-theme-btn ${
              currentColors.buttonVariant === 'outline' ? 'active' : ''
            }`}
            onClick={() => setCurrentColors(c => ({ ...c, buttonVariant: 'outline' }))}
            type='button'
          >
            Outline
          </button>
        </div>
      </div>

      <div className='demo-customizer-section'>
        <button className='demo-copy-btn' onClick={copyConfig} type='button'>
          {copied ? (
            <>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M20 6L9 17l-5-5' />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
                <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
              </svg>
              Copy Theme Config
            </>
          )}
        </button>
      </div>
    </div>
  )
}
