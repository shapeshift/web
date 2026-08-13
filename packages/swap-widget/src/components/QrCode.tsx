import qrcodeGenerator from 'qrcode-generator'
import { useMemo } from 'react'

type QrCodeProps = {
  value: string
  size?: number
}

// Fixed black on white in both themes - scanners need the contrast
export const QrCode = ({ value, size = 180 }: QrCodeProps) => {
  const { path, dimension } = useMemo(() => {
    const qr = qrcodeGenerator(0, 'M')
    qr.addData(value)
    qr.make()

    const count = qr.getModuleCount()
    const margin = 2
    const segments: string[] = []

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) segments.push(`M${col + margin} ${row + margin}h1v1h-1z`)
      }
    }

    return { path: segments.join(''), dimension: count + margin * 2 }
  }, [value])

  return (
    <svg
      className='ssw-qr'
      width={size}
      height={size}
      viewBox={`0 0 ${dimension} ${dimension}`}
      role='img'
      aria-label='Deposit address QR code'
    >
      <rect width={dimension} height={dimension} fill='#ffffff' />
      <path d={path} fill='#000000' />
    </svg>
  )
}
