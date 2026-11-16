import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
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

interface CachedModels {
  timestamp: number;
  models: Array<{
    name: string;
    workers: number;
    queued: number;
    eta: number;
    category: string;
    description: string;
  }>;
}

let modelCache: CachedModels | null = null;

const MODEL_DESCRIPTIONS: Record<string, { category: string; description: string }> = {
  Deliberate: {
    category: 'Allround & Detail',
    description: 'Ausgewogenes Diffusionsmodell für fotorealistische Szenen, Porträts und präzise Illustrationen.',
  },
  Dreamshaper: {
    category: 'Kreativ & Illustration',
    description: 'Vielseitig für Konzeptkunst, malerische Kompositionen und kontrastreiche Lichtstimmungen.',
  },
  'ICBINP - I Can\'t Believe It\'s Not Photography': {
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
  const maxPixels = 576 * 576; // 331,776 pixels (safe for anonymous AI Horde tier)
  while (w * h > maxPixels && (w > 320 || h > 320)) {
    if (w >= h && w > 320) {
      w -= 64;
    } else if (h > 320) {
      h -= 64;
    } else {
      break;
    }
  }
  return { width: w, height: h };
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Bildabruf fehlgeschlagen (HTTP ${resp.status})`);
  }
  const contentType = resp.headers.get('content-type') || 'image/webp';
  const arrayBuffer = await resp.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${contentType.split(';')[0]};base64,${base64}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      googleApiConnected: false,
      engines: ['aihorde', 'pollinations', 'huggingface', 'custom', 'procedural'],
    });
  });

  app.get('/api/models', async (_req, res) => {
    try {
      const now = Date.now();
      if (modelCache && now - modelCache.timestamp < 45_000) {
        res.json({
          aihorde: modelCache.models,
          pollinations: [
            { name: 'flux', label: 'Flux (Standard)', description: 'Ausgewogenes Open-Weight-Modell für scharfe Details und Bildkomposition.' },
            { name: 'turbo', label: 'SDXL Turbo (Schnell)', description: 'Sehr schnelle Generierung für schnelle Entwürfe.' },
            { name: 'flux-realism', label: 'Flux Realism', description: 'Optimiert für fotografische Texturen und Lichtführung.' },
            { name: 'flux-anime', label: 'Flux Anime', description: 'Stilisierte Illustrationen mit klaren Konturen.' },
            { name: 'flux-3d', label: 'Flux 3D Render', description: 'Plastische Materialien und Studio-Rendering.' },
          ],
          huggingface: [
            { name: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell (Black Forest Labs)', description: 'Schnelles Open-Source-Modell aus Deutschland (4–8 Schritte).' },
            { name: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'Stable Diffusion XL 1.0', description: 'Klassischer Open-Source-Standard für 1024×1024 px.' },
            { name: 'SG161222/Realistic_Vision_V5.1_noVAE', label: 'Realistic Vision V5.1', description: 'Detailreiche realistische Fotografie-Anmutung.' },
            { name: 'Lykon/DreamShaper', label: 'DreamShaper', description: 'Künstlerische und illustrierte Bildwelten.' },
          ],
        });
        return;
      }

      const resp = await fetch(`${AI_HORDE_BASE}/status/models?type=image`, {
        headers: { 'Client-Agent': CLIENT_AGENT },
      });
      if (!resp.ok) {
        throw new Error(`AI Horde Statusfehler: ${resp.status}`);
      }
      const raw = (await resp.json()) as HordeModelRaw[];
      const filtered = raw
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

      modelCache = { timestamp: now, models: filtered };
      res.json({
        aihorde: filtered,
        pollinations: [
          { name: 'flux', label: 'Flux (Standard)', description: 'Ausgewogenes Open-Weight-Modell für scharfe Details und Bildkomposition.' },
          { name: 'turbo', label: 'SDXL Turbo (Schnell)', description: 'Sehr schnelle Generierung für schnelle Entwürfe.' },
          { name: 'flux-realism', label: 'Flux Realism', description: 'Optimiert für fotografische Texturen und Lichtführung.' },
          { name: 'flux-anime', label: 'Flux Anime', description: 'Stilisierte Illustrationen mit klaren Konturen.' },
          { name: 'flux-3d', label: 'Flux 3D Render', description: 'Plastische Materialien und Studio-Rendering.' },
        ],
        huggingface: [
          { name: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell (Black Forest Labs)', description: 'Schnelles Open-Source-Modell aus Deutschland (4–8 Schritte).' },
          { name: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'Stable Diffusion XL 1.0', description: 'Klassischer Open-Source-Standard für 1024×1024 px.' },
          { name: 'SG161222/Realistic_Vision_V5.1_noVAE', label: 'Realistic Vision V5.1', description: 'Detailreiche realistische Fotografie-Anmutung.' },
          { name: 'Lykon/DreamShaper', label: 'DreamShaper', description: 'Künstlerische und illustrierte Bildwelten.' },
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Modelle konnten nicht geladen werden';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/generate/aihorde', async (req, res) => {
    try {
      const {
        prompt,
        negativePrompt = '',
        model = 'Deliberate',
        width = 512,
        height = 512,
        steps = 22,
        cfgScale = 7.5,
        sampler = 'k_euler_a',
        seed = '',
        apiKey = '',
      } = req.body ?? {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Bitte gib eine Bildbeschreibung (Prompt) ein.' });
        return;
      }

      const trimmedKey = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : '0000000000';
      const isAnonymous = trimmedKey === '0000000000';

      const dims = isAnonymous
        ? clampAnonymousDimensions(Number(width) || 512, Number(height) || 512)
        : {
            width: clampToMultipleOf64(Number(width) || 512, 256, 1024),
            height: clampToMultipleOf64(Number(height) || 512, 256, 1024),
          };

      const safeSteps = isAnonymous
        ? Math.max(10, Math.min(25, Number(steps) || 20))
        : Math.max(10, Math.min(50, Number(steps) || 25));

      const fullPrompt = negativePrompt && String(negativePrompt).trim()
        ? `${prompt.trim()} ### ${String(negativePrompt).trim()}`
        : prompt.trim();

      const payload: Record<string, unknown> = {
        prompt: fullPrompt,
        params: {
          sampler_name: sampler || 'k_euler_a',
          cfg_scale: Math.max(1, Math.min(20, Number(cfgScale) || 7.5)),
          width: dims.width,
          height: dims.height,
          steps: safeSteps,
          n: 1,
          ...(seed && String(seed).trim() ? { seed: String(seed).trim() } : {}),
        },
        nsfw: false,
        trusted_workers: false,
        slow_workers: true,
        censor_nsfw: true,
        r2: true,
        models: [model || 'Deliberate'],
      };

      const resp = await fetch(`${AI_HORDE_BASE}/generate/async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: trimmedKey,
          'Client-Agent': CLIENT_AGENT,
        },
        body: JSON.stringify(payload),
      });

      const data = (await resp.json()) as { id?: string; message?: string; kudos?: number; rc?: string };

      if (!resp.ok || !data.id) {
        res.status(resp.status >= 400 ? resp.status : 400).json({
          error: data.message || 'AI Horde hat die Anfrage abgelehnt. Bitte reduziere die Auflösung oder versuche ein anderes Modell.',
        });
        return;
      }

      res.json({
        id: data.id,
        kudos: data.kudos ?? 0,
        adjustedWidth: dims.width,
        adjustedHeight: dims.height,
        adjustedSteps: safeSteps,
        anonymous: isAnonymous,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verbindung zu AI Horde fehlgeschlagen';
      res.status(502).json({ error: message });
    }
  });

  app.get('/api/generate/aihorde/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const checkResp = await fetch(`${AI_HORDE_BASE}/generate/check/${encodeURIComponent(id)}`, {
        headers: { 'Client-Agent': CLIENT_AGENT },
      });

      if (!checkResp.ok) {
        const errBody = (await checkResp.json().catch(() => ({}))) as { message?: string };
        res.status(checkResp.status).json({
          error: errBody.message || 'Auftragsstatus konnte nicht abgefragt werden.',
        });
        return;
      }

      const check = (await checkResp.json()) as {
        finished: number;
        processing: number;
        restarted: number;
        waiting: number;
        done: boolean;
        faulted: boolean;
        wait_time: number;
        queue_position: number;
        is_possible: boolean;
      };

      if (check.faulted) {
        res.status(500).json({
          done: true,
          faulted: true,
          error: 'Ein Community-Worker konnte das Bild nicht fertigstellen. Bitte starte einen neuen Versuch.',
        });
        return;
      }

      if (!check.done) {
        res.json({
          done: false,
          waitTime: check.wait_time,
          queuePosition: check.queue_position,
          processing: check.processing,
          waiting: check.waiting,
          finished: check.finished,
          isPossible: check.is_possible,
        });
        return;
      }

      const statusResp = await fetch(`${AI_HORDE_BASE}/generate/status/${encodeURIComponent(id)}`, {
        headers: { 'Client-Agent': CLIENT_AGENT },
      });

      if (!statusResp.ok) {
        res.status(statusResp.status).json({ error: 'Ergebnisbild konnte nicht abgerufen werden.' });
        return;
      }

      const statusData = (await statusResp.json()) as {
        generations?: Array<{
          img: string;
          seed: string;
          model: string;
          worker_name?: string;
          censored?: boolean;
        }>;
      };

      const generations = statusData.generations ?? [];
      if (generations.length === 0) {
        res.status(500).json({ error: 'Keine Bilddaten vom Worker erhalten.' });
        return;
      }

      const images = await Promise.all(
        generations.map(async (gen) => {
          const dataUrl = gen.img.startsWith('http')
            ? await fetchImageAsDataUrl(gen.img)
            : `data:image/webp;base64,${gen.img}`;
          return {
            dataUrl,
            seed: gen.seed,
            model: gen.model,
            workerName: gen.worker_name || 'Community-GPU',
            censored: Boolean(gen.censored),
          };
        })
      );

      res.json({
        done: true,
        images,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Abrufen des Bildes';
      res.status(502).json({ error: message });
    }
  });

  app.delete('/api/generate/aihorde/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await fetch(`${AI_HORDE_BASE}/generate/status/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Client-Agent': CLIENT_AGENT },
      });
      res.json({ cancelled: true });
    } catch {
      res.json({ cancelled: true });
    }
  });

  app.post('/api/generate/pollinations', async (req, res) => {
    try {
      const {
        prompt,
        negativePrompt = '',
        model = 'flux',
        width = 768,
        height = 768,
        seed,
        apiKey = '',
      } = req.body ?? {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Bitte gib eine Bildbeschreibung (Prompt) ein.' });
        return;
      }

      const usedSeed = seed && String(seed).trim() ? String(seed).trim() : String(Math.floor(Math.random() * 2_000_000_000));
      const w = clampToMultipleOf64(Number(width) || 768, 256, 1280);
      const h = clampToMultipleOf64(Number(height) || 768, 256, 1280);

      const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}`);
      url.searchParams.set('width', String(w));
      url.searchParams.set('height', String(h));
      url.searchParams.set('model', String(model || 'flux'));
      url.searchParams.set('seed', usedSeed);
      url.searchParams.set('nologo', 'true');
      if (negativePrompt && String(negativePrompt).trim()) {
        url.searchParams.set('negative', String(negativePrompt).trim());
      }

      const headers: Record<string, string> = {};
      if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const resp = await fetch(url.toString(), { headers });
      if (!resp.ok) {
        if (resp.status === 402 || resp.status === 429) {
          res.status(429).json({
            error: 'Kostenloses Pollinations-Zeitlimit (1 Bild / 45 Sek.) erreicht. Bitte kurz warten, Pollinations-Key hinterlegen oder zu „AI Horde“ wechseln.',
          });
          return;
        }
        const text = await resp.text().catch(() => '');
        res.status(resp.status).json({
          error: `Pollinations-Fehler (${resp.status}): ${text.slice(0, 180) || 'Anfrage fehlgeschlagen'}`,
        });
        return;
      }

      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        res.status(502).json({ error: 'Pollinations hat kein gültiges Bild zurückgegeben.' });
        return;
      }

      const buffer = Buffer.from(await resp.arrayBuffer());
      const dataUrl = `data:${contentType.split(';')[0]};base64,${buffer.toString('base64')}`;

      res.json({
        dataUrl,
        seed: usedSeed,
        model: String(model || 'flux'),
        width: w,
        height: h,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verbindung zu Pollinations fehlgeschlagen';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/generate/huggingface', async (req, res) => {
    try {
      const {
        prompt,
        negativePrompt = '',
        model = 'black-forest-labs/FLUX.1-schnell',
        width = 768,
        height = 768,
        steps = 20,
        cfgScale = 7,
        apiKey = '',
      } = req.body ?? {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Bitte gib eine Bildbeschreibung (Prompt) ein.' });
        return;
      }
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        res.status(400).json({
          error: 'Für Hugging Face wird ein kostenloser Access Token benötigt. Hinterlege ihn unter „Verbindung“ oder nutze „AI Horde“ ohne Schlüssel.',
        });
        return;
      }

      const w = clampToMultipleOf64(Number(width) || 768, 256, 1024);
      const h = clampToMultipleOf64(Number(height) || 768, 256, 1024);

      const endpoint = `https://router.huggingface.co/hf-inference/models/${model}`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt.trim(),
          parameters: {
            negative_prompt: negativePrompt ? String(negativePrompt).trim() : undefined,
            width: w,
            height: h,
            num_inference_steps: Math.max(4, Math.min(50, Number(steps) || 20)),
            guidance_scale: Math.max(1, Math.min(20, Number(cfgScale) || 7)),
          },
        }),
      });

      if (resp.status === 503) {
        const errData = (await resp.json().catch(() => ({}))) as { estimated_time?: number };
        const wait = errData.estimated_time ? Math.ceil(errData.estimated_time) : 25;
        res.status(503).json({
          error: `Das Hugging-Face-Modell startet gerade auf dem Server (ca. ${wait} Sekunden). Bitte gleich erneut klicken.`,
        });
        return;
      }

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        res.status(resp.status).json({
          error: `Hugging-Face-Fehler (${resp.status}): ${errText.slice(0, 180) || 'Anfrage fehlgeschlagen'}`,
        });
        return;
      }

      const contentType = resp.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await resp.arrayBuffer());
      const dataUrl = `data:${contentType.split(';')[0]};base64,${buffer.toString('base64')}`;

      res.json({
        dataUrl,
        seed: String(Math.floor(Math.random() * 2_000_000_000)),
        model,
        width: w,
        height: h,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verbindung zu Hugging Face fehlgeschlagen';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/generate/custom', async (req, res) => {
    try {
      const {
        endpointUrl,
        endpointType = 'a1111',
        apiKey = '',
        prompt,
        negativePrompt = '',
        model = '',
        width = 512,
        height = 512,
        steps = 25,
        cfgScale = 7,
        sampler = 'Euler a',
        seed = -1,
      } = req.body ?? {};

      if (!endpointUrl || typeof endpointUrl !== 'string' || !endpointUrl.trim()) {
        res.status(400).json({ error: 'Bitte hinterlege zuerst deine Server-URL unter „Verbindung“.' });
        return;
      }
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Bitte gib eine Bildbeschreibung (Prompt) ein.' });
        return;
      }

      const cleanBase = endpointUrl.trim().replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const w = clampToMultipleOf64(Number(width) || 512, 256, 1536);
      const h = clampToMultipleOf64(Number(height) || 512, 256, 1536);

      if (endpointType === 'openai') {
        const resp = await fetch(`${cleanBase}/v1/images/generations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: model || undefined,
            prompt: prompt.trim(),
            size: `${w}x${h}`,
            n: 1,
            response_format: 'b64_json',
          }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          res.status(resp.status).json({ error: `Server-Fehler (${resp.status}): ${text.slice(0, 160)}` });
          return;
        }
        const json = (await resp.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
        const first = json.data?.[0];
        if (!first) {
          res.status(502).json({ error: 'Keine Bilddaten vom lokalen Server erhalten.' });
          return;
        }
        const dataUrl = first.b64_json
          ? `data:image/png;base64,${first.b64_json}`
          : await fetchImageAsDataUrl(first.url!);

        res.json({ dataUrl, seed: String(seed || 'auto'), model: model || 'Custom OpenAI-API', width: w, height: h });
        return;
      }

      // Default: Automatic1111 / SD WebUI Forge (/sdapi/v1/txt2img)
      const resp = await fetch(`${cleanBase}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: String(negativePrompt || '').trim(),
          width: w,
          height: h,
          steps: Number(steps) || 25,
          cfg_scale: Number(cfgScale) || 7,
          sampler_name: sampler || 'Euler a',
          seed: seed && !Number.isNaN(Number(seed)) ? Number(seed) : -1,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        res.status(resp.status).json({ error: `A1111-Server-Fehler (${resp.status}): ${text.slice(0, 160)}` });
        return;
      }

      const data = (await resp.json()) as { images?: string[]; info?: string };
      const b64 = data.images?.[0];
      if (!b64) {
        res.status(502).json({ error: 'Automatic1111 hat kein Bild geliefert.' });
        return;
      }

      res.json({
        dataUrl: b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`,
        seed: String(seed || 'auto'),
        model: model || 'Lokaler SD-Server',
        width: w,
        height: h,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lokaler Server nicht erreichbar';
      res.status(502).json({ error: `Lokaler Server nicht erreichbar: ${message}` });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build nicht gefunden. Bitte zuerst npm run build ausführen.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bildwerk Server läuft auf http://0.0.0.0:${PORT} (Ohne Google-API)`);
  });
}

startServer();
