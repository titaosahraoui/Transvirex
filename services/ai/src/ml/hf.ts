import axios from 'axios';

const HF_TOKEN = process.env.HF_TOKEN ?? '';
const HF_API = 'https://api-inference.huggingface.co/models/HuggingFaceTB/SmolLM2-1.7B-Instruct';

export interface DriverCtx {
  name: string;
  distanceKm: number;
  currentLoad: number;
  acceptanceRate: number;
  zoneMatch: boolean;
  score: number;
}

export async function explainMatch(d: DriverCtx): Promise<string> {
  if (!HF_TOKEN) return fallback(d);

  const prompt =
    `<|im_start|>system\nTu es un assistant logistique. Réponds en français en une seule phrase courte (max 12 mots).\n<|im_end|>\n` +
    `<|im_start|>user\nPourquoi ${d.name} est un bon candidat ?\n` +
    `Distance: ${d.distanceKm.toFixed(1)}km, charge: ${d.currentLoad} mission(s), ` +
    `fiabilité: ${d.acceptanceRate.toFixed(0)}%, zone: ${d.zoneMatch ? 'oui' : 'non'}.\n` +
    `<|im_end|>\n<|im_start|>assistant\n`;

  try {
    const { data } = await axios.post(
      HF_API,
      { inputs: prompt, parameters: { max_new_tokens: 50, temperature: 0.3, return_full_text: false } },
      { headers: { Authorization: `Bearer ${HF_TOKEN}` }, timeout: 12000 }
    );
    const text: string = data[0]?.generated_text ?? '';
    return text.split(/[\n.!?]/)[0].trim() || fallback(d);
  } catch {
    return fallback(d);
  }
}

function fallback(d: DriverCtx): string {
  const parts: string[] = [];
  if (d.distanceKm < 5) parts.push('très proche');
  else if (d.distanceKm < 15) parts.push('proche');
  if (d.currentLoad === 0) parts.push('disponible');
  else if (d.currentLoad <= 2) parts.push('faible charge');
  if (d.acceptanceRate >= 90) parts.push('haute fiabilité');
  if (d.zoneMatch) parts.push('même zone');
  return (parts.length ? parts.join(', ') : `Score ${(d.score * 100).toFixed(0)}%`) + '.';
}
