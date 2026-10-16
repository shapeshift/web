import type { ReactNode } from 'react'
import { useMemo } from 'react'

import type { SwapWidgetProps, ThemeMode } from '../types'

type WidgetFrameProps = {
  theme: SwapWidgetProps['theme']
  children: ReactNode
}

export const WidgetFrame = ({ theme = 'dark', children }: WidgetFrameProps) => {
  const themeMode: ThemeMode = typeof theme === 'string' ? theme : theme.mode
  const themeConfig = typeof theme === 'object' ? theme : undefined

  const widgetStyle = useMemo(() => {
    if (!themeConfig) return undefined
    const style: Record<string, string> = {}
    if (themeConfig.accentColor) {
      style['--ssw-accent'] = themeConfig.accentColor
      style['--ssw-accent-light'] = `${themeConfig.accentColor}1a`
    }
    if (themeConfig.backgroundColor) {
      style['--ssw-bg-secondary'] = themeConfig.backgroundColor
      style['--ssw-bg-primary'] = themeConfig.backgroundColor
    }
    if (themeConfig.cardColor) {
      style['--ssw-bg-tertiary'] = themeConfig.cardColor
    }
    if (themeConfig.textColor) {
      style['--ssw-text-primary'] = themeConfig.textColor
    }
    if (themeConfig.borderRadius) {
      const base = parseFloat(themeConfig.borderRadius) || 0
      style['--ssw-radius-widget'] = `${base * 1.25}px`
      style['--ssw-radius-lg'] = `${base}px`
      style['--ssw-radius-md'] = `${Math.round(base * 0.875)}px`
      style['--ssw-radius-sm'] = `${Math.round(base * 0.625)}px`
      style['--ssw-radius-xs'] = `${Math.round(base * 0.375)}px`
      style['--ssw-radius-2xs'] = `${Math.round(base * 0.25)}px`
    }
    if (themeConfig.fontFamily) {
      style['--ssw-font-family'] = themeConfig.fontFamily
    }
    if (themeConfig.borderColor) {
      style['--ssw-border'] = themeConfig.borderColor
      style['--ssw-border-hover'] = themeConfig.borderColor
    }
    if (themeConfig.secondaryTextColor) {
      style['--ssw-text-secondary'] = themeConfig.secondaryTextColor
    }
    if (themeConfig.mutedTextColor) {
      style['--ssw-text-muted'] = themeConfig.mutedTextColor
    }
    if (themeConfig.inputColor) {
      style['--ssw-bg-input'] = themeConfig.inputColor
    }
    if (themeConfig.hoverColor) {
      style['--ssw-bg-hover'] = themeConfig.hoverColor
    }
    return Object.keys(style).length > 0 ? (style as React.CSSProperties) : undefined
  }, [themeConfig])

  return (
    <div
      className={`ssw-widget ${themeMode === 'light' ? 'ssw-light' : 'ssw-dark'}${
        themeConfig?.buttonVariant === 'outline' ? ' ssw-btn-outline' : ''
      }`}
      style={widgetStyle}
    >
      {children}
    </div>
  )
}
