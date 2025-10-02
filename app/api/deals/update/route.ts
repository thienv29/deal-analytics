export async function POST(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return Response.json(
        {
          success: false,
          error: "Deal ID is required",
        },
        { status: 400 },
      )
    }

    const updateUrl =
      "https://anhnguiclc.com/rest/1/dcqn591zbut35f5u/crm.deal.update.json"

    const response = await fetch(updateUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        fields: {
          UF_CRM_1759402265: "Y",
        },
      }),
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.error) {
      return Response.json(
        {
          success: false,
          error: result.error_description || result.error,
        },
        { status: 500 },
      )
    }

    return Response.json({
      success: true,
      message: `Deal ${id} marked as disabled`,
    })
  } catch (error) {
    console.error("Error updating deal:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
