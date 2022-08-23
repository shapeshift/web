// This is a Jest-friendly stub for use while testing. It will be swapped out for webpack.ts during build. See
// react-app-rewired.config.js for details.

export const reactAppEnvVars = (
  processEnv: Record<string, string | undefined>,
): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(processEnv).filter(([k]) => k.startsWith('REACT_APP_')))

// eslint-disable-next-line import/no-default-export
export default reactAppEnvVars(process.env)
