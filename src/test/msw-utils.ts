import { setupWorker, SetupWorkerApi } from 'msw'
import { setupServer, SetupServerApi } from 'msw/node'

function setupMsw() {
  let worker: SetupWorkerApi | undefined
  let server: SetupServerApi | undefined

  if (typeof global.process === 'undefined') {
    // Setup mock service worker for browser environment
    worker = setupWorker()
  } else {
    // Setup mock service server for node environment
    server = setupServer()
  }
  return { worker, server }
}

export const { worker, server } = setupMsw()
export const mock = (worker || server)!.use
export { graphql, rest } from 'msw'
