export async function POST(request: Request) {
  try {
    const { data } = await request.json()

    if (!Array.isArray(data)) {
      throw new Error("Invalid data format")
    }

    // Generate analytics from the provided data
    const analytics = {
      // Grade distribution
      gradeStats: data.reduce((acc: any, deal: any) => {
        const grade = deal.grade || "Không xác định"
        acc[grade] = (acc[grade] || 0) + 1
        return acc
      }, {}),

      // Ward distribution
      wardStats: data.reduce((acc: any, deal: any) => {
        const ward = deal.ward || "Không xác định"
        acc[ward] = (acc[ward] || 0) + 1
        return acc
      }, {}),

      // School distribution
      schoolStats: data.reduce((acc: any, deal: any) => {
        const school = deal.schoolName || "Không xác định"
        acc[school] = (acc[school] || 0) + 1
        return acc
      }, {}),

      // Contact quality
      contactStats: {
        total: data.length,
        withEmail: data.filter((d: any) => d.email && d.email.trim()).length,
        withPhone: data.filter((d: any) => d.phone && d.phone.trim()).length,
        withBoth: data.filter((d: any) => d.email && d.email.trim() && d.phone && d.phone.trim()).length,
        withNone: data.filter((d: any) => !(d.email && d.email.trim()) && !(d.phone && d.phone.trim())).length,
      },

      // Time analysis
      timeStats: data.reduce((acc: any, deal: any) => {
        if (deal.DATE_CREATE) {
          const date = new Date(deal.DATE_CREATE)
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            acc[monthKey] = (acc[monthKey] || 0) + 1
          }
        }
        return acc
      }, {}),
    }

    return Response.json({
      success: true,
      analytics,
    })
  } catch (error) {
    console.error("Error generating analytics:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
