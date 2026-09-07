import { env } from 'cloudflare:workers';
import { workspaceConfig } from '../../../../core/workspace-config.mjs';
export function GET() {
  return Response.json(
    { config: workspaceConfig(env) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
