import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/connections/', '/settings/', '/api/'],
      },
    ],
    sitemap: 'https://recoverhub.threestack.io/sitemap.xml',
    host: 'https://recoverhub.threestack.io',
  };
}
