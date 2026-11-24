const DEMO_SESSION_STORAGE_KEY = 'apoia_edu_demo_sid';

export function clearStoredDemoSession(): void {
  try {
    window.sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage errors in restricted iframes
  }
}

export async function apiJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const extraHeaders: Record<string, string> = {};
  if (url.startsWith('/api/demo/')) {
    try {
      const savedSid = window.sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY);
      if (savedSid) {
        extraHeaders['X-Demo-Session'] = savedSid;
      }
    } catch {
      // ignore storage errors
    }
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
      ...(options.headers || {}),
    },
  });

  const returnedDemoSid = res.headers.get('X-Demo-Session');
  if (returnedDemoSid) {
    try {
      window.sessionStorage.setItem(DEMO_SESSION_STORAGE_KEY, returnedDemoSid);
    } catch {
      // ignore storage errors
    }
  }
  if (url === '/api/demo/end') {
    clearStoredDemoSession();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || `Erro na requisição (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}
