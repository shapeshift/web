import { loadEnv } from 'vite'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')
Object.assign(process.env, env)
