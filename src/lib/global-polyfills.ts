import { Buffer } from 'buffer'
import Process from 'process'

window.Buffer = Buffer
window.process = Process
globalThis.Buffer = Buffer
globalThis.process = Process
