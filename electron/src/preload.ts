import * as Sentry from "@sentry/electron";
import { ipcRenderer } from 'electron'


ipcRenderer.send('@app/sentry-dsn')

ipcRenderer.once('@app/sentry-dsn', (event, SENTRY_DSN) => {
    Sentry.init({ dsn: SENTRY_DSN });
})