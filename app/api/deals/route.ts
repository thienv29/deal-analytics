import { type NextRequest, NextResponse } from "next/server"

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

async function fetchAllDeals() {
  let allDeals = []
  let start = 0
  const baseUrl = "https://anhnguiclc.com/rest/1/dcqn591zbut35f5u/crm.deal.list.json"

  const fetchWithTimeout = async (url: string, timeout = 10000) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  while (true) {
    const url = `${baseUrl}?filter[CATEGORY_ID]=81&select[]=ID&select[]=TITLE&select[]=UF_CRM_6178C6D2EDA26&select[]=UF_CRM_1742537683&select[]=UF_CRM_1755499870&select[]=UF_CRM_1718938262&select[]=UF_CRM_1724832179&select[]=UF_CRM_6178C6D3035AF&select[]=UF_CRM_DEAL_1717076457153&select[]=UF_CRM_6178C6D30C6A9&select[]=UF_CRM_DEAL_1717076519247&select[]=UF_CRM_6178C6D31587F&select[]=DATE_CREATE&select[]=UF_CRM_1758164804&start=${start}`

    try {
      console.log("[v0] Fetching deals from:", url)
      const res = await fetchWithTimeout(url, 15000) // 15 second timeout

      if (!res.ok) {
        console.log("[v0] Response not OK:", res.status, res.statusText)
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      console.log("[v0] Received data:", { hasResult: !!data.result, resultLength: data.result?.length })

      if (!data.result || !Array.isArray(data.result)) {
        console.log("[v0] No more results, breaking")
        break
      }

      const mapped = data.result.map(mapItem)
      allDeals = allDeals.concat(mapped)
      console.log("[v0] Total deals so far:", allDeals.length)

      if (!("next" in data)) break
      start = data.next
    } catch (error) {
      console.error("[v0] Error fetching deals:", error)
      if (error.name === "AbortError") {
        throw new Error("Request timeout - CRM server took too long to respond")
      }
      throw error
    }
  }

  console.log("[v0] Final deals count:", allDeals.length)
  return allDeals
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Starting deals fetch...")
    const startTime = Date.now()

    const deals = await fetchAllDeals()

    const endTime = Date.now()
    console.log("[v0] Fetch completed in:", endTime - startTime, "ms")

    return NextResponse.json({
      success: true,
      data: deals,
      count: deals.length,
      fetchTime: endTime - startTime,
    })
  } catch (error) {
    console.error("[v0] API Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch deals",
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle sample data generation
    if (body.action === "sample") {
      const sampleData = [
        {
          ID: "1",
          TITLE: "Đăng ký A",
          schoolName: "Trường A",
          schoolType: "Tiểu học",
          ward: "Phường 1",
          studentName: "Nguyễn Văn A",
          grade: "Khối 1",
          className: "1/1",
          email: "a@example.com",
          parentOfStudentName: "Mẹ A",
          phone: "0901111111",
          address: "Addr 1",
          DATE_CREATE: "2025-09-01T10:00:00+07:00",
        },
        {
          ID: "2",
          TITLE: "Đăng ký B",
          schoolName: "Trường B",
          schoolType: "Tiểu học",
          ward: "Phường 2",
          studentName: "Trần Thị B",
          grade: "Khối 2",
          className: "2/1",
          email: null,
          parentOfStudentName: "Cha B",
          phone: null,
          address: "Addr 2",
          DATE_CREATE: "2025-08-15T09:00:00+07:00",
        },
      ]

      return NextResponse.json({
        success: true,
        data: sampleData,
        count: sampleData.length,
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ success: false, error: "Failed to process request" }, { status: 500 })
  }
}
