import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://grounddesing.pro';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE,              lastModified: now, changeFrequency: 'weekly',  priority: 1 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/login`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${BASE}/register`,lastModified: now, changeFrequency: 'yearly',  priority: 0.6 },
  ];
}
