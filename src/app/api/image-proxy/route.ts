import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * SSRF protection: block requests to private/internal IP ranges and
 * non-HTTP(S) protocols. All external HTTPS/HTTP image URLs are allowed
 * so that video source cover images from any CDN can be proxied.
 *
 * Blocked ranges:
 *   - Loopback:          127.0.0.0/8, ::1
 *   - Private (RFC1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 *   - Link-local:        169.254.0.0/16, fe80::/10
 *   - Metadata services: 100.64.0.0/10 (AWS/GCP instance metadata)
 */
function isPrivateHost(hostname: string): boolean {
  // Reject IP literals in private/loopback ranges
  const ipv4 = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  );
  if (ipv4) {
    const [, a, b, c] = ipv4.map(Number);
    if (
      a === 127 || // loopback
      a === 10 || // RFC1918
      (a === 172 && b >= 16 && b <= 31) || // RFC1918
      (a === 192 && b === 168) || // RFC1918
      (a === 169 && b === 254) || // link-local
      (a === 100 && b >= 64 && b <= 127) // shared address (metadata)
    ) {
      return true;
    }
  }
  // Reject localhost and common internal hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '::1'
  ) {
    return true;
  }
  return false;
}

// OrionTV 兼容接口
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  // Validate URL structure
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  // Only allow HTTP(S)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Invalid image URL protocol' }, { status: 400 });
  }

  // Block internal/private network access (SSRF protection)
  if (isPrivateHost(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'Image host not allowed' }, { status: 403 });
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
