import handler from 'vinext/server/fetch-handler';
import { secureResponse } from '../core/security.mjs';

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const response = await handler.fetch(request, env, ctx);
    return secureResponse(response);
  },
};
