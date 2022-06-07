// This is used instead of index.js when building a webpack bundle. See
// react-app-rewired.config.js for details. (Note that because webpack treats
// env.json as a resource, require() will return its URL rather than its
// contents.)

// eslint-disable-next-line import/no-default-export
export default await (await fetch(require('./env.json'))).json()
