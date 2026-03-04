import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Allowed image host domains to prevent SSRF attacks.
 * Only requests targeting these domains are proxied.
 */
const ALLOWED_IMAGE_DOMAINS = [
  'img1.doubanio.com',
  'img2.doubanio.com',
  'img3.doubanio.com',
  'img9.doubanio.com',
  'img.doubanio.com',
  'movie.douban.com',
  'pic.nf.migu.cn',
  'gips0.baidu.com',
  'gips1.baidu.com',
  'gips2.baidu.com',
  'gips3.baidu.com',
];

// OrionTV 兼容接口
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  // SSRF protection: validate URL and restrict to allowed domains
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Invalid image URL protocol' }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_DOMAINS.includes(parsedUrl.hostname)) {
    return NextResponse.json(
      { error: 'Image domain not allowed' },
      { status: 403 }
    );
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      headers: {
        Referer: 'https://movie.douban.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: imageResponse.statusText },
        { status: imageResponse.status }
      );
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!imageResponse.body) {
      return NextResponse.json(
        { error: 'Image response has no body' },
        { status: 500 }
      );
    }

    // 创建响应头
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // 设置缓存头（可选）
    headers.set('Cache-Control', 'public, max-age=15720000, s-maxage=15720000'); // 缓存半年
    headers.set('CDN-Cache-Control', 'public, s-maxage=15720000');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15720000');

    // 直接返回图片流
    return new Response(imageResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching image' },
      { status: 500 }
    );
  }
}
