export function contentSecurityPolicy(nonce: string, origin?: string | null): string;
export function secureResponse(response: Response, options?: { nonce?: string; origin?: string | null }): Response;
