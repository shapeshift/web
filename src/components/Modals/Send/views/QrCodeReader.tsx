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
  const [qrScanner, setQrScanner] = useState<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState<boolean>(false)

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

      if (!qrScanner) return

      setIsScanning(true)

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, qrScanner])

  useEffect(() => {
    if (!qrScanner) {
      // This should be inside a normal useEffect hook without dependencies so the scanner is initialized on mount and
      // the element exists in the DOM
      setQrScanner(
        new Html5Qrcode(qrcodeRegionId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        }),
      )
    }

    return () => {
      ;(async () => {
        if (qrScanner && isScanning) {
          setIsScanning(false)
          try {
            await qrScanner.stop()
            qrScanner.clear()
            // as Html5Qrcode is not designed to be inside a setState hook, isScanning is always false inside the qrScanner object
            // so it throws an error on stop() even if it really stop, we need to make it silent
          } catch (error) {}
        }
      })()
    }
  }, [setQrScanner, isScanning, setIsScanning, qrScanner])

  return <div id={qrcodeRegionId} />
}
