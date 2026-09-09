import qrcodeGenerator from 'qrcode-generator'
import { useMemo } from 'react'

type QrCodeProps = {
  value: string
  logo?: string
  size?: number
}

// A fifth of the code, well inside the 30% that 'H' error correction can afford to lose
const LOGO_SCALE = 0.2

export const QrCode = ({ value, logo, size = 180 }: QrCodeProps) => {
  const { path, dimension } = useMemo(() => {
    const qr = qrcodeGenerator(0, 'H')
    qr.addData(value)
    qr.make()

    const count = qr.getModuleCount()
    // The 4-module quiet zone ISO/IEC 18004 requires - anything less and some scanners refuse
    const margin = 4
    const segments: string[] = []

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) segments.push(`M${col + margin} ${row + margin}h1v1h-1z`)
      }
    }

    return { path: segments.join(''), dimension: count + margin * 2 }
  }, [value])

  const logoBox = useMemo(() => {
    const width = dimension * LOGO_SCALE
    const padding = width * 0.12
    const plate = width + padding * 2
    const offset = (dimension - plate) / 2

    return { width, plate, offset, inset: offset + padding, radius: plate * 0.22 }
  }, [dimension])

  return (
    <svg
      className='ssw-qr'
      width={size}
      height={size}
      viewBox={`0 0 ${dimension} ${dimension}`}
      role='img'
      aria-label='Deposit address QR code'
    >
      {/* Fixed black on white in both themes - scanners need the contrast */}
      <rect width={dimension} height={dimension} fill='#ffffff' />
      <path d={path} fill='#000000' />
      {logo && (
        <>
          <rect
            x={logoBox.offset}
            y={logoBox.offset}
            width={logoBox.plate}
            height={logoBox.plate}
            rx={logoBox.radius}
            fill='#ffffff'
          />
          <image
            x={logoBox.inset}
            y={logoBox.inset}
            width={logoBox.width}
            height={logoBox.width}
            href={logo}
            preserveAspectRatio='xMidYMid meet'
          />
        </>
      )}
    </svg>
  )
}
