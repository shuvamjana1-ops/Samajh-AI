export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

const UTM_STORAGE_KEY = 'samajh_utm';

export function captureUtmFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const next: UtmParams = {};
    const source = params.get('utm_source')?.trim().slice(0, 120);
    const medium = params.get('utm_medium')?.trim().slice(0, 120);
    const campaign = params.get('utm_campaign')?.trim().slice(0, 120);
    if (source) next.utm_source = source;
    if (medium) next.utm_medium = medium;
    if (campaign) next.utm_campaign = campaign;
    if (Object.keys(next).length > 0) {
      window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore storage errors
  }
}

export function getStoredUtm(): UtmParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UtmParams;
    return {
      ...(typeof parsed.utm_source === 'string' ? { utm_source: parsed.utm_source } : {}),
      ...(typeof parsed.utm_medium === 'string' ? { utm_medium: parsed.utm_medium } : {}),
      ...(typeof parsed.utm_campaign === 'string' ? { utm_campaign: parsed.utm_campaign } : {}),
    };
  } catch {
    return {};
  }
}
