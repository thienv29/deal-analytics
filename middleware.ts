import { NextRequest, NextResponse } from 'next/server'

function checkBasicAuth(request: NextRequest, username: string, password: string): boolean {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) return false

  const base64Credentials = authHeader.split(' ')[1]
  if (!base64Credentials) return false

  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
  const [requestUsername, requestPassword] = credentials.split(':')

  return requestUsername === username && requestPassword === password
}

function sendAuthRequest(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Protected Area"',
    },
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect home page (admin section)
  if (pathname === '/' || pathname.startsWith('/deal')) {
    if (!checkBasicAuth(request, 'admin', 'admin')) {
      return sendAuthRequest()
    }
  }

  // Protect sales report page
  if (pathname === '/sales-report' || pathname.startsWith('/sales-report')) {
    if (!checkBasicAuth(request, 'nvkdiclc', 'nvkdiclc@123')) {
      return sendAuthRequest()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/sales-report/:path*', '/deal/:path*'],
}
