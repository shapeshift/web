import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode'
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
    const qrScanner = new Html5Qrcode(qrcodeRegionId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    })

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

      await qrScanner.start(
        isMobile ? { facingMode: 'environment' } : cameraId,
        {
          fps,
          qrbox,
        },
        (decodedText, result) => {
          qrCodeSuccessCallback(decodedText, result)
        },
        qrCodeErrorCallback as QrcodeErrorCallback,
      )
    })()

    return () => {
      ;(async () => {
        const scannerState = qrScanner.getState()

        if (scannerState === Html5QrcodeScannerState.SCANNING) {
          await qrScanner.stop()
          qrScanner.clear()
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId])

  return <div id={qrcodeRegionId} />
}
