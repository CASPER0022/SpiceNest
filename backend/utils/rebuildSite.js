// Asks Vercel to rebuild the website, so the ready-made product pages (frontend/scripts/prerender.js)
// show the new price, description or stock. Uses a Vercel deploy hook: set VERCEL_DEPLOY_HOOK_URL
// to the hook's URL (Vercel project > Settings > Git > Deploy Hooks). Without it this does nothing.
//
// The rebuild starts a minute after the last change, so several edits in a row make one build.
// Customers always see live data anyway; this only keeps link previews and search engines current.

const DELAY_MS = 60 * 1000;
let timer = null;

export function scheduleSiteRebuild(reason) {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) return;

  clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    try {
      const res = await fetch(hookUrl, { method: 'POST', signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`🔁 Website rebuild started (${reason})`);
    } catch (error) {
      console.error(`❌ Could not start the website rebuild (${reason}):`, error.message);
    }
  }, DELAY_MS);
}
