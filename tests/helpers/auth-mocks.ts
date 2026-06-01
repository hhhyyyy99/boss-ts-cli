import { Cookie } from '../../src/types/index.js';

export function clientFactoryWithResponse(response: Record<string, unknown>) {
  return (_cookies: Cookie[]) => ({
    get: async () => response,
  });
}

export function clientFactoryWithError(error: Error) {
  return (_cookies: Cookie[]) => ({
    get: async () => {
      throw error;
    },
  });
}
