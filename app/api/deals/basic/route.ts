const fieldMap = {
  UF_CRM_6178C6D2EDA26: "schoolName",
  UF_CRM_1742537683: "schoolType",
  UF_CRM_1755499870: "ward",
  UF_CRM_1718938262: "studentName",
  UF_CRM_1724832179: "grade",
  UF_CRM_6178C6D3035AF: "className",
  UF_CRM_DEAL_1717076457153: "email",
  UF_CRM_6178C6D30C6A9: "parentOfStudentName",
  UF_CRM_DEAL_1717076519247: "phone",
  UF_CRM_6178C6D31587F: "address",
  UF_CRM_1758164804: "schoolNameTmp",
  UF_CRM_1759402265: "isDisabled",
}

function mapItem(item: any) {
  const out: any = {}
  for (const k in item) {
    if (fieldMap[k as keyof typeof fieldMap]) {
      out[fieldMap[k as keyof typeof fieldMap]] = item[k]
    } else {
      out[k] = item[k]
    }
  }
  return out
}

export async function GET() {
  try {
    const baseUrl = "https://anhnguiclc.com/rest/1/dcqn591zbut35f5u/crm.deal.list.json"

    // First, get total count to determine how many parallel requests we need
    const countUrl = `${baseUrl}?filter[CATEGORY_ID]=81&filter[UF_CRM_1759402265]=N&select[]=ID&start=0`
    const countResponse = await fetch(countUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!countResponse.ok) {
      throw new Error(`HTTP error! status: ${countResponse.status}`)
    }

    const countData = await countResponse.json()
    const totalRecords = countData.total || 0

    console.log(`[v0] Total records available: ${totalRecords}`)

    // Calculate number of parallel requests needed (50 records per request)
    const recordsPerRequest = 50
    const totalRequests = Math.ceil(totalRecords / recordsPerRequest)
    const maxParallelRequests = 20

    let allDeals: any[] = []

    // Process in chunks of 20 parallel requests
    for (let chunk = 0; chunk < totalRequests; chunk += maxParallelRequests) {
      const chunkEnd = Math.min(chunk + maxParallelRequests, totalRequests)
      const promises = []

      console.log(`[v0] Starting parallel chunk ${chunk + 1}-${chunkEnd} of ${totalRequests}`)

      // Create parallel requests for this chunk
      for (let i = chunk; i < chunkEnd; i++) {
        const start = i * recordsPerRequest
        const url = `${baseUrl}?filter[CATEGORY_ID]=81&filter[UF_CRM_1759402265]=N&select[]=ID&select[]=TITLE&select[]=UF_CRM_6178C6D2EDA26&select[]=UF_CRM_1742537683&select[]=UF_CRM_1755499870&select[]=UF_CRM_1718938262&select[]=UF_CRM_1724832179&select[]=UF_CRM_6178C6D3035AF&select[]=UF_CRM_DEAL_1717076457153&select[]=UF_CRM_6178C6D30C6A9&select[]=UF_CRM_DEAL_1717076519247&select[]=UF_CRM_6178C6D31587F&select[]=DATE_CREATE&select[]=UF_CRM_1758164804&select[]=UF_CRM_1759402265&start=${start}`

        const promise = fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(30000), // 30 second timeout for each request
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          return data.result ? data.result.map(mapItem) : []
        }).catch((error) => {
          console.error(`Error in request for start=${start}:`, error.message)
          return [] // Return empty array on error to continue processing
        })

        promises.push(promise)
      }

      // Wait for all parallel requests in this chunk to complete
      const chunkResults = await Promise.all(promises)

      // Flatten and add to allDeals
      for (const batch of chunkResults) {
        allDeals = [...allDeals, ...batch]
      }

      console.log(`[v0] Completed chunk, total records so far: ${allDeals.length}`)
    }

    console.log(`[v0] Completed fetching all ${allDeals.length} records with parallel processing`)

    return Response.json({
      success: true,
      data: allDeals,
      total: allDeals.length,
      hasMore: false,
    })
  } catch (error) {
    console.error("Error fetching basic deals:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
