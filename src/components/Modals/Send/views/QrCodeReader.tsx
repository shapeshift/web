import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import type {
  QrcodeErrorCallback,
  QrcodeSuccessCallback,
  QrDimensions,
} from 'html5-qrcode/esm/core'
import React, { useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'

import type { DOMExceptionCallback } from './QrCodeScanner'

const qrcodeRegionId = 'reader'

type QrCodeReaderProps = {
  fps: number
  qrbox: number | QrDimensions
  qrCodeSuccessCallback: QrcodeSuccessCallback
  qrCodeErrorCallback: QrcodeErrorCallback | DOMExceptionCallback
}

export const QrCodeReader: React.FC<QrCodeReaderProps> = ({
  fps,
  qrbox,
  qrCodeSuccessCallback,
  qrCodeErrorCallback,
}) => {
  const [cameraId, setCameraId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!cameraId) {
        try {
          const devices = await Html5Qrcode.getCameras()

          if (devices?.length) {
            setCameraId(devices[0].id)
          }
        } catch (e) {
          // Errors on getCameras() are caused by browser native APIs exception e.g not supported, permission not granted etc
          const error = e as DOMException['message']
          ;(qrCodeErrorCallback as DOMExceptionCallback)(error)
        }

        return
      }

      const html5QrCode = new Html5Qrcode(qrcodeRegionId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })

      await html5QrCode.start(
        isMobile ? { facingMode: 'environment' } : cameraId,
        {
          fps,
          qrbox,
        },
        (decodedText, result) => {
          qrCodeSuccessCallback(decodedText, result)
          html5QrCode.stop()
        },
        qrCodeErrorCallback as QrcodeErrorCallback,
      )

      return () => {
        html5QrCode.clear()
      }
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId])

  return <div id={qrcodeRegionId} />
}
