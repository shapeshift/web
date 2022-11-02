// This is a Jest-friendly stub for use while testing. It will be swapped out for webpack.ts during build. See
// react-app-rewired.config.js for details.

// eslint-disable-next-line import/no-default-export
export default Object.fromEntries(
  Object.entries(process.env).filter(([k]) => k.startsWith('REACT_APP_')),
)
