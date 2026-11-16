import type { AspectPreset } from '../types';

export const ASPECT_PRESETS: AspectPreset[] = [
  { id: '1:1', label: '1:1 Quadrat', width: 768, height: 768, anonymousWidth: 512, anonymousHeight: 512 },
  { id: '4:3', label: '4:3 Querformat', width: 768, height: 576, anonymousWidth: 576, anonymousHeight: 448 },
  { id: '3:4', label: '3:4 Hochformat', width: 576, height: 768, anonymousWidth: 448, anonymousHeight: 576 },
  { id: '16:9', label: '16:9 Breitbild', width: 896, height: 512, anonymousWidth: 576, anonymousHeight: 320 },
];

export interface StylePreset {
  id: string;
  label: string;
  promptSuffix: string;
  recommendedModel: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'photo',
    label: 'Fotorealismus',
    promptSuffix: 'natural lighting, 35mm lens, sharp focus, authentic textures, editorial photography',
    recommendedModel: "ICBINP - I Can't Believe It's Not Photography",
  },
  {
    id: 'arch',
    label: 'Architektur',
    promptSuffix: 'architectural photography, minimalist lines, soft morning daylight, concrete and glass, wide angle',
    recommendedModel: 'AbsoluteReality',
  },
  {
    id: 'illustration',
    label: 'Editorial-Illustration',
    promptSuffix: 'detailed editorial illustration, tactile paper grain, balanced composition, rich muted tones',
    recommendedModel: 'Dreamshaper',
  },
  {
    id: 'watercolor',
    label: 'Aquarell & Tusche',
    promptSuffix: 'botanical ink and watercolor painting on cold-pressed cotton paper, delicate brushwork, natural pigments',
    recommendedModel: 'Deliberate',
  },
  {
    id: 'product',
    label: 'Produktstudio',
    promptSuffix: 'studio product photography on dark slate surface, diffused rim light, macro detail, commercial grade',
    recommendedModel: 'AlbedoBase XL (SDXL)',
  },
  {
    id: 'film',
    label: 'Analogfilm',
    promptSuffix: 'shot on Kodak Portra 400, subtle film grain, warm highlights, documentary composition',
    recommendedModel: 'Deliberate',
  },
];

export const EXAMPLE_PROMPTS: Array<{ title: string; prompt: string; styleId: string }> = [
  {
    title: 'Beton-Pavillon im Nebel',
    prompt: 'Minimalist concrete architectural pavilion in morning mist, pine trees, soft diffused daylight, Leica architectural photography',
    styleId: 'arch',
  },
  {
    title: 'Mechanische Uhr (Makro)',
    prompt: 'Mechanical wristwatch resting on dark brushed slate stone, warm studio rim lighting, sapphire glass reflection, macro photography',
    styleId: 'product',
  },
  {
    title: 'Botanisches Ginkgo-Blatt',
    prompt: 'Botanical watercolor and fine ink illustration of a ginkgo branch on textured handmade cream paper, scientific archive style',
    styleId: 'watercolor',
  },
  {
    title: 'Bergsee bei Sonnenaufgang',
    prompt: 'Calm alpine mountain lake at dawn, wooden pier, golden hour reflections, dramatic misty peaks, 35mm analog film photography',
    styleId: 'film',
  },
];

const DE_TO_EN_TERMS: Array<[RegExp, string]> = [
  [/\barchitektur\b/gi, 'architecture'],
  [/\bpavillon\b/gi, 'pavilion'],
  [/\bbeton\b/gi, 'concrete'],
  [/\bmorgennebel\b/gi, 'morning mist'],
  [/\bnebel\b/gi, 'mist'],
  [/\bwald\b/gi, 'forest'],
  [/\bbergsee\b/gi, 'alpine mountain lake'],
  [/\bberge\b/gi, 'mountains'],
  [/\bsonnenaufgang\b/gi, 'sunrise'],
  [/\bsonnenuntergang\b/gi, 'sunset'],
  [/\bkatze\b/gi, 'cat'],
  [/\bhund\b/gi, 'dog'],
  [/\bfuchs\b/gi, 'fox'],
  [/\bporträt\b/gi, 'portrait'],
  [/\bstadt\b/gi, 'city'],
  [/\bstraße\b/gi, 'street'],
  [/\bnacht\b/gi, 'night'],
  [/\bregen\b/gi, 'rain'],
  [/\bmeer\b/gi, 'ocean'],
  [/\bwasser\b/gi, 'water'],
  [/\bblumen\b/gi, 'flowers'],
  [/\bgemälde\b/gi, 'painting'],
  [/\baquarell\b/gi, 'watercolor'],
  [/\bfotografie\b/gi, 'photography'],
  [/\bmakroaufnahme\b/gi, 'macro photography'],
  [/\barmbanduhr\b/gi, 'mechanical wristwatch'],
  [/\bschiefer\b/gi, 'dark slate'],
  [/\bwüste\b/gi, 'desert'],
  [/\bweltenraum\b/gi, 'deep space'],
  [/\bleuchtturm\b/gi, 'lighthouse'],
  [/\bminimalistisch\b/gi, 'minimalist'],
  [/\bdetailliert\b/gi, 'highly detailed'],
];

export function optimizePromptForDiffusion(rawPrompt: string): string {
  let text = rawPrompt.trim();
  if (!text) return '';
  for (const [pattern, replacement] of DE_TO_EN_TERMS) {
    text = text.replace(pattern, replacement);
  }
  const hasQualityTail =
    text.toLowerCase().includes('lighting') ||
    text.toLowerCase().includes('sharp') ||
    text.toLowerCase().includes('detailed') ||
    text.toLowerCase().includes('photography');

  if (!hasQualityTail) {
    text = `${text}, balanced composition, crisp details, natural lighting`;
  }
  return text;
}
