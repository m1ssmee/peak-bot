// Vercel entry point. An Express app is already a (req, res) handler, so it is
// the serverless function — the whole app runs behind the rewrite in vercel.json.
export { default } from '../server/index.js';
