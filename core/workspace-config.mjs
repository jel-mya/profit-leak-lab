export function workspaceConfig(env) {
  if (env?.CLOUD_WORKSPACE_ENABLED !== 'true') return null;
  const url = env.SUPABASE_URL;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== 'string' || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)
    || typeof publishableKey !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publishableKey)) return null;
  return { url, publishableKey };
}
