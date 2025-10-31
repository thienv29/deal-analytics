import { connectToDatabase } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const school = searchParams.get('school')

  if (school) {
    // Return students for specific school
    try {
      const connection = await connectToDatabase()

      const [users] = await connection.execute(
        `SELECT
          u.id, u.name, u.username, u.email, u.phone, u.class, u.created_at as createdAt,
          u.last_login_ip,
          COALESCE(ul.login_count, 0) as login_count,
          ul.last_login_at
        FROM users u
        LEFT JOIN (
          SELECT
            user_id,
            COUNT(*) as login_count,
            MAX(created_at) as last_login_at
          FROM user_login_logs
          GROUP BY user_id
        ) ul ON u.id = ul.user_id
        WHERE u.school = ?`,
        [school]
      )

      await connection.end()

      return Response.json({
        success: true,
        school,
        students: users,
      })
    } catch (error) {
      console.error('Error fetching school students:', error)
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  }

  // Standard report logic
  try {
    // Connect to database
    const connection = await connectToDatabase()

    // Query school and count of issued accounts from users table
    const [accountsResult] = await connection.execute(
      'SELECT school, COUNT(*) as issued FROM users WHERE school IS NOT NULL GROUP BY school ORDER BY school'
    )

    // Query school and count of logged in accounts (assuming there's a condition for logged in)
    const [loginsResult] = await connection.execute(
      'SELECT school, COUNT(*) as loggedIn FROM users WHERE school IS NOT NULL AND last_login_ip IS NOT NULL GROUP BY school ORDER BY school'
    )

    await connection.end()

    const schoolAccounts = new Map()
    ;(accountsResult as any[]).forEach((row: any) => {
      schoolAccounts.set(row.school, row.issued)
    })

    const schoolLogins = new Map()
    ;(loginsResult as any[]).forEach((row: any) => {
      schoolLogins.set(row.school, row.loggedIn)
    })

    // Now fetch deals data from the basic API to correlate
    let schoolRequests: any = {}
    try {
      const dealsResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/api/deals/basic`
      )
      const dealsData = await dealsResponse.json()

      if (dealsData.success) {
        // Calculate requests per school
        schoolRequests = dealsData.data.reduce((acc: any, deal: any) => {
          const schoolName = deal.schoolName || 'Unknown'
          const ward = deal.ward || ''
          const key = ward ? `${schoolName} - ${ward}` : schoolName
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})
      } else {
        console.warn('Failed to fetch deals data:', dealsData.error)
        // Continue with 0 requests
      }
    } catch (error) {
      console.warn('Error fetching deals data:', error)
      // Continue with 0 requests for all schools
    }

    console.log('School Requests:', schoolAccounts.size)
    // Format report data - include schools that have requests or specific ones
    const specificSchools = [
      'Trần Quốc Tuấn - Phường Bảy Hiền',
      'Đống Đa - Phường Khánh Hội',
      'Chi Lăng - Phường Tân Hòa',
      'Nguyễn Sơn Hà - Phường Bàn Cờ'
    ]
    const report = Array.from(schoolAccounts.entries())
      .map(([school, issued]: [string, number]) => ({
        school: school,
        issued: issued,
        loggedIn: schoolLogins.get(school) || 0,
        totalRequests: schoolRequests[school] || 0,
        unprocessed: Math.max(0, (schoolRequests[school] || 0) - issued),
      }))
      .filter(
        (item) =>
          item.totalRequests > 0 || specificSchools.includes(item.school)
      )

    const totalAccounts = report.reduce((sum, item) => sum + item.issued, 0)
    const totalLoggedIn = report.reduce((sum, item) => sum + item.loggedIn, 0)
    const totalNeverLoggedIn = totalAccounts - totalLoggedIn

    console.log('Report generated with', report.length, 'schools')

    return Response.json({
      success: true,
      data: report,
      summary: {
        totalSchools: report.length,
        totalAccounts,
        totalLoggedIn,
        totalNeverLoggedIn,
      },
    })
  } catch (error) {
    console.error('Error generating sales report:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
