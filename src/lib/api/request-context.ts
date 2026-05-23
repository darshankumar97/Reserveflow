import { headers } from "next/headers";

export const REQUEST_ID_HEADER = "x-request-id";

export type RequestContext = {
  requestId: string;
};

export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers();
  const existing = headersList.get(REQUEST_ID_HEADER);

  return {
    requestId: existing ?? crypto.randomUUID(),
  };
}

export function getRequestContextFromHeaders(
  request: Request,
): RequestContext {
  const existing = request.headers.get(REQUEST_ID_HEADER);

  return {
    requestId: existing ?? crypto.randomUUID(),
  };
}
