import handler from 'vinext/server/fetch-handler';
import { contentSecurityPolicy, secureResponse } from '../core/security.mjs';
import { workspaceConfig } from '../core/workspace-config.mjs';

const worker = {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const config = workspaceConfig(env);
    const nonce = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18))),
    );
    const headers = new Headers(request.headers);
    headers.set(
      'Content-Security-Policy',
      contentSecurityPolicy(nonce, config?.url ?? null),
    );
    headers.delete('Content-Security-Policy-Report-Only');
    const response = await handler.fetch(
      new Request(request, { headers }),
      env,
      ctx,
    );
    return secureResponse(response, { nonce, origin: config?.url ?? null });
  },
};
export default worker;
