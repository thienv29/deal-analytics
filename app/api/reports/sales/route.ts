import { connectToDatabase } from '@/lib/db'

export async function GET() {
  try {
    // Connect to database
    const connection = await connectToDatabase()

    // Query distinct schools from users table
    const [schoolsResult] = await connection.execute(
      'SELECT DISTINCT school FROM users WHERE school IS NOT NULL ORDER BY school'
    )

    await connection.end()

    const schools = schoolsResult as any[]

    // Now fetch deals data from the basic API to correlate
    let schoolAccounts: any = {}
    try {
      const dealsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/deals/basic`)
      const dealsData = await dealsResponse.json()

      if (dealsData.success) {
        // Calculate accounts per school
        schoolAccounts = dealsData.data.reduce((acc: any, deal: any) => {
          const schoolName = deal.schoolName || 'Unknown'
          const ward = deal.ward || ''
          const key = ward ? `${schoolName} - ${ward}` : schoolName
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})
      } else {
        console.warn('Failed to fetch deals data:', dealsData.error)
        // Continue with 0 accounts
      }
    } catch (error) {
      console.warn('Error fetching deals data:', error)
      // Continue with 0 accounts for all schools
    }

    // Format report data - only include schools that have deals
    const report = schools.map((school: any) => ({
      school: school.school,
      accountsIssued: schoolAccounts[school.school] || 0,
    })).filter((item: any) => item.accountsIssued > 0)

    const accountCounts = Object.values(schoolAccounts) as number[]
    const totalAccounts = accountCounts.reduce((sum: number, count: number) => sum + count, 0)

    return Response.json({
      success: true,
      data: report,
      summary: {
        totalSchools: schools.length,
        totalAccounts,
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
