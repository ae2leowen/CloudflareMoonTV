
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

import { logger } from '@/lib/logger';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  logger.info('api', 'server-config called: ', request.url);

  const config = await getConfig();
  const result = {
    SiteName: config.SiteConfig.SiteName,
    StorageType: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
  };
  return NextResponse.json(result);
}
