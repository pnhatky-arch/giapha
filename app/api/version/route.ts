import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      app: 'giapha',
      build: 'diag-2026-10-02-01',
      source: 'main',
      expectedBaseSha: 'f38f8e0c741943861c1749b422d44144620b8839',
      generatedAt: '2026-10-02T07:50:00Z',
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    },
  );
}
