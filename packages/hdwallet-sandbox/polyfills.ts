import { Buffer } from "buffer";

globalThis.global = globalThis;
globalThis.Buffer = Buffer;
globalThis.process = globalThis.process || ({ env: {}, version: "v18.0.0", browser: true } as unknown as NodeJS.Process);
