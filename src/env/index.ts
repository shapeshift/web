// This is a test-friendly stub for use while testing. It will be swapped out for webpack.ts during build. See
// react-app-rewired.config.js for details.
// Note, if you need to stub out env vars for testing, you can do so in the setupVitest.ts for all tests, or per test with
// vi.hoisted(() => {
//   vi.stubEnv('REACT_APP_YOUR_FLAG', 'false')
// })

// eslint-disable-next-line import/no-default-export
export default Object.fromEntries(
  Object.entries(process.env).filter(([k]) => k.startsWith('REACT_APP_')),
)
