import type { CorsOptions, CorsOptionsDelegate, CorsRequest } from 'cors'
import cors from 'cors'

const corsOptionsDelegate: CorsOptionsDelegate = (
  _req: CorsRequest,
  cb: (err: Error | null, options?: CorsOptions) => void,
) => {
  cb(null, { origin: true })
}

export const corsMiddleware = cors(corsOptionsDelegate)
