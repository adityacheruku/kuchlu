
import { NextResponse, type NextRequest } from 'next/server';

// This middleware sets the required headers for ffmpeg to work correctly.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

  return response;
}
