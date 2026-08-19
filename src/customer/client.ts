import { AuthError } from './oauth';
import { getCustomerEndpoints } from './discovery';

/**
 * GraphQL transport for the Customer Account API.
 *
 * Unlike the Storefront API, this endpoint is per-shop, discovered at runtime,
 * and authenticated with the buyer's OAuth access token in the `Authorization`
 * header — sent raw, without a `Bearer` prefix.
 */

export interface CustomerUserError {
  field: string[] | null;
  message: string;
  code?: string | null;
}

export class CustomerApiError extends Error {
  readonly kind: 'unauthorized' | 'network' | 'graphql' | 'userError';
  constructor(kind: CustomerApiError['kind'], message: string) {
    super(message);
    this.name = 'CustomerApiError';
    this.kind = kind;
  }
}

export function assertNoUserErrors(errors: CustomerUserError[] | null | undefined): void {
  if (errors && errors.length > 0) {
    throw new CustomerApiError('userError', errors[0]!.message);
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Runs an operation as the signed-in customer.
 *
 * A 401 is surfaced as a distinct `unauthorized` kind so the auth store can
 * attempt a token refresh and retry once, rather than dumping the buyer back to
 * a sign-in screen every time an access token quietly ages out.
 */
export async function customerRequest<TData>(
  query: string,
  variables: Record<string, unknown>,
  accessToken: string,
): Promise<TData> {
  const endpoints = await getCustomerEndpoints();
  if (!endpoints) {
    throw new CustomerApiError('network', 'Could not reach Shopify. Check your connection.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoints.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Shopify answers 403 to requests without a User-Agent.
        'User-Agent': 'OwnlyClub/1.0 (Expo; React Native)',
        Authorization: accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    throw new CustomerApiError(
      'network',
      timedOut ? 'The request timed out. Please try again.' : 'Could not reach your account. Check your connection.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    throw new CustomerApiError('unauthorized', 'Your session has expired.');
  }
  if (!response.ok) {
    throw new CustomerApiError('network', `Your account could not be loaded (${response.status}).`);
  }

  const json = (await response.json()) as { data?: TData; errors?: { message: string }[] };
  if (json.errors && json.errors.length > 0) {
    throw new CustomerApiError('graphql', json.errors[0]!.message);
  }
  if (!json.data) {
    throw new CustomerApiError('graphql', 'Your account returned no data.');
  }
  return json.data;
}

export function describeCustomerError(error: unknown): string {
  if (error instanceof CustomerApiError) return error.message;
  if (error instanceof AuthError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
