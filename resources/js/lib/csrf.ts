function readCookie(name: string): string | null {
  const prefix = `${name}=`;

  for (const segment of document.cookie.split(';')) {
    const cookie = segment.trim();

    if (cookie.startsWith(prefix)) {
      return cookie.slice(prefix.length);
    }
  }

  return null;
}

type CsrfHeaderValues = {
  csrfToken: string;
  xsrfToken: string;
};

function getCsrfHeaderValues(): CsrfHeaderValues {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
  const xsrfCookie = readCookie('XSRF-TOKEN');

  return {
    csrfToken,
    xsrfToken: xsrfCookie ? decodeURIComponent(xsrfCookie) : '',
  };
}

async function refreshCsrfToken(): Promise<string> {
  const response = await fetch('/csrf-token', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const fallback = getCsrfHeaderValues();
    return fallback.csrfToken || fallback.xsrfToken;
  }

  const payload = (await response.json()) as { token?: string };
  const fallback = getCsrfHeaderValues();
  const refreshedToken = payload.token ?? fallback.csrfToken ?? fallback.xsrfToken;

  return refreshedToken;
}

export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const execute = async (overrideCsrfToken?: string): Promise<Response> => {
    const headers = new Headers(init.headers ?? {});
    const { csrfToken, xsrfToken } = getCsrfHeaderValues();
    const finalCsrfToken = overrideCsrfToken || csrfToken;

    if (finalCsrfToken) {
      headers.set('X-CSRF-TOKEN', finalCsrfToken);
    }

    if (xsrfToken) {
      headers.set('X-XSRF-TOKEN', xsrfToken);
    }

    headers.set('X-Requested-With', 'XMLHttpRequest');

    return fetch(input, {
      ...init,
      credentials: 'include',
      headers,
    });
  };

  let response = await execute();

  if (response.status !== 419) {
    return response;
  }

  const refreshedToken = await refreshCsrfToken();
  response = await execute(refreshedToken);

  return response;
}
