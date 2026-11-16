import type { HordeModelInfo, ModelsCatalog, SimpleModelInfo } from '../types';

const AI_HORDE_BASE = 'https://aihorde.net/api/v2';
const CLIENT_AGENT = 'BildwerkStudio:1.0:open';

interface HordeModelRaw {
  name: string;
  count: number;
  queued: number;
  jobs: number;
  eta: number;
  performance: number;
  type: string;
}

const MODEL_DESCRIPTIONS: Record<string, { category: string; description: string }> = {
  Deliberate: {
    category: 'Allround & Detail',
    description: 'Ausgewogenes Diffusionsmodell für fotorealistische Szenen, Porträts und präzise Illustrationen.',
  },
  Dreamshaper: {
    category: 'Kreativ & Illustration',
    description: 'Vielseitig für Konzeptkunst, malerische Kompositionen und kontrastreiche Lichtstimmungen.',
  },
  "ICBINP - I Can't Believe It's Not Photography": {
    category: 'Fotorealismus',
    description: 'Spezialisiert auf natürliche Kameraoptik, Hauttexturen und authentisches Tageslicht.',
  },
  AbsoluteReality: {
    category: 'Fotorealismus',
    description: 'Hohe Schärfe und feine Materialdetails für Architektur, Objekte und realistische Porträts.',
  },
  'AlbedoBase XL (SDXL)': {
    category: 'SDXL · Hochauflösend',
    description: 'Modernes SDXL-Basismodell mit starkem Textverständnis und natürlicher Farbbalance.',
  },
  'AlbedoBase XL 3.1': {
    category: 'SDXL · Hochauflösend',
    description: 'Weiterentwickelte SDXL-Variante mit hoher Detailtreue in Licht, Schatten und Komposition.',
  },
  'Juggernaut XL': {
    category: 'SDXL · Kino & Studio',
    description: 'Kinoähnliche Ausleuchtung und starke Tiefenschärfe für anspruchsvolle Szenen.',
  },
  'Nova Anime XL': {
    category: 'Anime & Grafik',
    description: 'Klare Linienführung und lebendige Farbpaletten für stilisierte Illustrationen.',
  },
  'Nova Flat XL': {
    category: 'Vektor & Grafik',
    description: 'Flächige Farbgebung und reduzierte Formen für Plakatkunst und Editorial-Grafik.',
  },
  stable_diffusion: {
    category: 'Klassik · Schnell',
    description: 'Klassisches Open-Source-Basismodell mit konstant hoher Worker-Verfügbarkeit.',
  },
  'Anything Diffusion': {
    category: 'Illustration',
    description: 'Saubere Konturen und harmonische Farbübergänge für gezeichnete Motive.',
  },
  Counterfeit: {
    category: 'Illustration',
    description: 'Fein abgestimmtes Modell für stilisierte Szenen und detailreiche Hintergründe.',
  },
};

export const POLLINATIONS_MODELS: SimpleModelInfo[] = [
  { name: 'flux', label: 'Flux (Standard)', description: 'Ausgewogenes Open-Weight-Modell für scharfe Details und Bildkomposition.' },
  { name: 'turbo', label: 'SDXL Turbo (Schnell)', description: 'Sehr schnelle Generierung für schnelle Entwürfe.' },
  { name: 'flux-realism', label: 'Flux Realism', description: 'Optimiert für fotografische Texturen und Lichtführung.' },
  { name: 'flux-anime', label: 'Flux Anime', description: 'Stilisierte Illustrationen mit klaren Konturen.' },
  { name: 'flux-3d', label: 'Flux 3D Render', description: 'Plastische Materialien und Studio-Rendering.' },
];

export const HUGGINGFACE_MODELS: SimpleModelInfo[] = [
  { name: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell (Black Forest Labs)', description: 'Schnelles Open-Source-Modell aus Deutschland (4–8 Schritte).' },
  { name: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'Stable Diffusion XL 1.0', description: 'Klassischer Open-Source-Standard für 1024×1024 px.' },
  { name: 'SG161222/Realistic_Vision_V5.1_noVAE', label: 'Realistic Vision V5.1', description: 'Detailreiche realistische Fotografie-Anmutung.' },
  { name: 'Lykon/DreamShaper', label: 'DreamShaper', description: 'Künstlerische und illustrierte Bildwelten.' },
];

function isBlockedModelName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('nsfw') ||
    lower.includes('hentai') ||
    lower.includes('porn') ||
    lower.includes('xxx') ||
    lower.includes('erotica') ||
    lower.includes('furry') ||
    lower.includes('yiff') ||
    lower.includes('pony')
  );
}

function clampToMultipleOf64(val: number, min = 256, max = 1024): number {
  const clamped = Math.max(min, Math.min(max, val));
  return Math.round(clamped / 64) * 64;
}

function clampAnonymousDimensions(width: number, height: number): { width: number; height: number } {
  let w = clampToMultipleOf64(width, 256, 768);
  let h = clampToMultipleOf64(height, 256, 768);
  const maxPixels = 576 * 576;
  while (w * h > maxPixels && (w > 320 || h > 320)) {
    if (w >= h && w > 320) w -= 64;
    else if (h > 320) h -= 64;
    else break;
  }
  return { width: w, height: h };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Bilddaten konnten nicht konvertiert werden.'));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Bilddaten.'));
    reader.readAsDataURL(blob);
  });
}

let cachedCatalog: { timestamp: number; data: ModelsCatalog } | null = null;

export async function fetchModelsCatalog(forceRefresh = false): Promise<ModelsCatalog> {
  const now = Date.now();
  if (!forceRefresh && cachedCatalog && now - cachedCatalog.timestamp < 45_000) {
    return cachedCatalog.data;
  }

  const resp = await fetch(`${AI_HORDE_BASE}/status/models?type=image`, {
    headers: { 'Client-Agent': CLIENT_AGENT },
  });

  if (!resp.ok) {
    throw new Error(`AI Horde Statusfehler (HTTP ${resp.status})`);
  }

  const raw = (await resp.json()) as HordeModelRaw[];
  const aihorde: HordeModelInfo[] = raw
    .filter((m) => m.count > 0 && !isBlockedModelName(m.name))
    .sort((a, b) => {
      const aKnown = MODEL_DESCRIPTIONS[a.name] ? 1 : 0;
      const bKnown = MODEL_DESCRIPTIONS[b.name] ? 1 : 0;
      if (aKnown !== bKnown) return bKnown - aKnown;
      return b.count - a.count;
    })
    .slice(0, 24)
    .map((m) => {
      const meta = MODEL_DESCRIPTIONS[m.name] ?? {
        category: m.name.toLowerCase().includes('xl') ? 'SDXL · Community' : 'SD 1.5 · Community',
        description: 'Aktives Open-Source-Modell im verteilten AI-Horde-Netzwerk.',
      };
      return {
        name: m.name,
        workers: m.count,
        queued: Math.round(m.queued),
        eta: m.eta,
        category: meta.category,
        description: meta.description,
      };
    });

  const data: ModelsCatalog = {
    aihorde,
    pollinations: POLLINATIONS_MODELS,
    huggingface: HUGGINGFACE_MODELS,
  };
  cachedCatalog = { timestamp: now, data };
  return data;
}

export async function submitAiHordeJob(params: {
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  seed: string;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<{
  id: string;
  adjustedWidth: number;
  adjustedHeight: number;
  adjustedSteps: number;
}> {
  const trimmedKey = params.apiKey.trim() || '0000000000';
  const isAnonymous = trimmedKey === '0000000000';

  const dims = isAnonymous
    ? clampAnonymousDimensions(params.width, params.height)
    : {
        width: clampToMultipleOf64(params.width, 256, 1024),
        height: clampToMultipleOf64(params.height, 256, 1024),
      };

  const safeSteps = isAnonymous
    ? Math.max(10, Math.min(25, params.steps))
    : Math.max(10, Math.min(50, params.steps));

  const fullPrompt = params.negativePrompt.trim()
    ? `${params.prompt.trim()} ### ${params.negativePrompt.trim()}`
    : params.prompt.trim();

  const resp = await fetch(`${AI_HORDE_BASE}/generate/async`, {
    method: 'POST',
    signal: params.signal,
    headers: {
      'Content-Type': 'application/json',
      apikey: trimmedKey,
      'Client-Agent': CLIENT_AGENT,
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      params: {
        sampler_name: params.sampler || 'k_euler_a',
        cfg_scale: Math.max(1, Math.min(20, params.cfgScale || 7.5)),
        width: dims.width,
        height: dims.height,
        steps: safeSteps,
        n: 1,
        ...(params.seed.trim() ? { seed: params.seed.trim() } : {}),
      },
      nsfw: false,
      trusted_workers: false,
      slow_workers: true,
      censor_nsfw: true,
      // Direct base64 output avoids cross-origin R2 fetch issues on GitHub Pages
      r2: false,
      models: [params.model || 'Deliberate'],
    }),
  });

  const data = (await resp.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!resp.ok || !data.id) {
    throw new Error(
      data.message || 'AI Horde hat die Anfrage abgelehnt. Bitte reduziere die Auflösung oder versuche ein anderes Modell.'
    );
  }

  return {
    id: data.id,
    adjustedWidth: dims.width,
    adjustedHeight: dims.height,
    adjustedSteps: safeSteps,
  };
}

export async function checkAiHordeJob(
  id: string,
  signal?: AbortSignal
): Promise<
  | {
      done: false;
      waitTime: number;
      queuePosition: number;
      processing: number;
    }
  | {
      done: true;
      dataUrl: string;
      seed: string;
      model: string;
      workerName: string;
    }
> {
  const checkResp = await fetch(`${AI_HORDE_BASE}/generate/check/${encodeURIComponent(id)}`, {
    signal,
    headers: { 'Client-Agent': CLIENT_AGENT },
  });

  if (!checkResp.ok) {
    const errBody = (await checkResp.json().catch(() => ({}))) as { message?: string };
    throw new Error(errBody.message || 'Auftragsstatus konnte nicht abgefragt werden.');
  }

  const check = (await checkResp.json()) as {
    done: boolean;
    faulted: boolean;
    wait_time: number;
    queue_position: number;
    processing: number;
  };

  if (check.faulted) {
    throw new Error('Ein Community-Worker konnte das Bild nicht fertigstellen. Bitte starte einen neuen Versuch.');
  }

  if (!check.done) {
    return {
      done: false,
      waitTime: check.wait_time,
      queuePosition: check.queue_position,
      processing: check.processing,
    };
  }

  const statusResp = await fetch(`${AI_HORDE_BASE}/generate/status/${encodeURIComponent(id)}`, {
    signal,
    headers: { 'Client-Agent': CLIENT_AGENT },
  });

  if (!statusResp.ok) {
    throw new Error('Ergebnisbild konnte nicht abgerufen werden.');
  }

  const statusData = (await statusResp.json()) as {
    generations?: Array<{
      img: string;
      seed: string;
      model: string;
      worker_name?: string;
    }>;
  };

  const gen = statusData.generations?.[0];
  if (!gen || !gen.img) {
    throw new Error('Keine Bilddaten vom Worker erhalten.');
  }

  const dataUrl = gen.img.startsWith('data:')
    ? gen.img
    : gen.img.startsWith('http')
      ? gen.img
      : `data:image/webp;base64,${gen.img}`;

  return {
    done: true,
    dataUrl,
    seed: gen.seed,
    model: gen.model,
    workerName: gen.worker_name || 'Community-GPU',
  };
}

export async function cancelAiHordeJob(id: string): Promise<void> {
  await fetch(`${AI_HORDE_BASE}/generate/status/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Client-Agent': CLIENT_AGENT },
  }).catch(() => {});
}

export async function generatePollinationsDirect(params: {
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  seed: string;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<{ dataUrl: string; seed: string; model: string; width: number; height: number }> {
  const usedSeed = params.seed.trim() || String(Math.floor(Math.random() * 2_000_000_000));
  const w = clampToMultipleOf64(params.width, 256, 1280);
  const h = clampToMultipleOf64(params.height, 256, 1280);

  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(params.prompt.trim())}`);
  url.searchParams.set('width', String(w));
  url.searchParams.set('height', String(h));
  url.searchParams.set('model', params.model || 'flux');
  url.searchParams.set('seed', usedSeed);
  url.searchParams.set('nologo', 'true');
  if (params.negativePrompt.trim()) {
    url.searchParams.set('negative', params.negativePrompt.trim());
  }

  const headers: Record<string, string> = {};
  if (params.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${params.apiKey.trim()}`;
  }

  const resp = await fetch(url.toString(), { headers, signal: params.signal });
  if (!resp.ok) {
    if (resp.status === 402 || resp.status === 429) {
      throw new Error(
        'Kostenloses Pollinations-Zeitlimit (1 Bild / 45 Sek.) erreicht. Bitte kurz warten, Pollinations-Key hinterlegen oder zu „AI Horde“ wechseln.'
      );
    }
    throw new Error(`Pollinations-Fehler (HTTP ${resp.status})`);
  }

  const blob = await resp.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('Pollinations hat kein gültiges Bild zurückgegeben.');
  }

  const dataUrl = await blobToDataUrl(blob);
  return { dataUrl, seed: usedSeed, model: params.model || 'flux', width: w, height: h };
}

export async function generateHuggingFaceDirect(params: {
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<{ dataUrl: string; seed: string; model: string; width: number; height: number }> {
  if (!params.apiKey.trim()) {
    throw new Error(
      'Für Hugging Face wird ein kostenloser Access Token benötigt. Hinterlege ihn unter „Verbindung“ oder nutze „AI Horde“ ohne Schlüssel.'
    );
  }

  const w = clampToMultipleOf64(params.width, 256, 1024);
  const h = clampToMultipleOf64(params.height, 256, 1024);

  const endpoint = `https://router.huggingface.co/hf-inference/models/${params.model}`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${params.apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: params.prompt.trim(),
      parameters: {
        negative_prompt: params.negativePrompt.trim() || undefined,
        width: w,
        height: h,
        num_inference_steps: Math.max(4, Math.min(50, params.steps || 20)),
        guidance_scale: Math.max(1, Math.min(20, params.cfgScale || 7)),
      },
    }),
  });

  if (resp.status === 503) {
    const errData = (await resp.json().catch(() => ({}))) as { estimated_time?: number };
    const wait = errData.estimated_time ? Math.ceil(errData.estimated_time) : 25;
    throw new Error(
      `Das Hugging-Face-Modell startet gerade auf dem Server (ca. ${wait} Sekunden). Bitte gleich erneut klicken.`
    );
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Hugging-Face-Fehler (${resp.status}): ${text.slice(0, 160) || 'Anfrage fehlgeschlagen'}`);
  }

  const blob = await resp.blob();
  const dataUrl = await blobToDataUrl(blob);
  return {
    dataUrl,
    seed: String(Math.floor(Math.random() * 2_000_000_000)),
    model: params.model,
    width: w,
    height: h,
  };
}

export async function generateCustomServerDirect(params: {
  endpointUrl: string;
  endpointType: 'a1111' | 'openai';
  apiKey: string;
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  seed: string;
  signal?: AbortSignal;
}): Promise<{ dataUrl: string; seed: string; model: string; width: number; height: number }> {
  const cleanBase = params.endpointUrl.trim().replace(/\/+$/, '');
  if (!cleanBase) {
    throw new Error('Bitte hinterlege zuerst deine Server-URL unter „Verbindung“.');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${params.apiKey.trim()}`;
  }

  const w = clampToMultipleOf64(params.width, 256, 1536);
  const h = clampToMultipleOf64(params.height, 256, 1536);

  try {
    if (params.endpointType === 'openai') {
      const resp = await fetch(`${cleanBase}/v1/images/generations`, {
        method: 'POST',
        signal: params.signal,
        headers,
        body: JSON.stringify({
          model: params.model || undefined,
          prompt: params.prompt.trim(),
          size: `${w}x${h}`,
          n: 1,
          response_format: 'b64_json',
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Server-Fehler (${resp.status}): ${text.slice(0, 140)}`);
      }
      const json = (await resp.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
      const first = json.data?.[0];
      if (!first) throw new Error('Keine Bilddaten vom Server erhalten.');
      const dataUrl = first.b64_json ? `data:image/png;base64,${first.b64_json}` : first.url!;
      return { dataUrl, seed: params.seed || 'auto', model: params.model || 'OpenAI-API', width: w, height: h };
    }

    const resp = await fetch(`${cleanBase}/sdapi/v1/txt2img`, {
      method: 'POST',
      signal: params.signal,
      headers,
      body: JSON.stringify({
        prompt: params.prompt.trim(),
        negative_prompt: params.negativePrompt.trim(),
        width: w,
        height: h,
        steps: params.steps || 25,
        cfg_scale: params.cfgScale || 7,
        sampler_name: params.sampler || 'Euler a',
        seed: params.seed && !Number.isNaN(Number(params.seed)) ? Number(params.seed) : -1,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`A1111-Server-Fehler (${resp.status}): ${text.slice(0, 140)}`);
    }

    const data = (await resp.json()) as { images?: string[] };
    const b64 = data.images?.[0];
    if (!b64) throw new Error('Automatic1111 hat kein Bild geliefert.');

    return {
      dataUrl: b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`,
      seed: params.seed || 'auto',
      model: params.model || 'Lokaler SD-Server',
      width: w,
      height: h,
    };
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        'Lokaler Server vom Browser blockiert oder nicht erreichbar. Starte Automatic1111/Forge mit „--cors-allow-origins=*“ (und bei HTTPS-Hosting ggf. über Tunnel/HTTPS).'
      );
    }
    throw err;
  }
}
