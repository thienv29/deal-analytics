import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let allDeals = []
        let start = 0
        let totalEstimate = 1000 // Initial estimate
        const baseUrl = "https://anhnguiclc.com/rest/1/dcqn591zbut35f5u/crm.deal.list.json"

        const fetchWithTimeout = async (url: string, timeout = 15000) => {
          const abortController = new AbortController()
          const timeoutId = setTimeout(() => abortController.abort(), timeout)

          try {
            const response = await fetch(url, {
              signal: abortController.signal,
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

        // Send initial progress
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              current: 0,
              total: totalEstimate,
              percentage: 0,
              message: "Bắt đầu fetch dữ liệu...",
            })}\n\n`,
          ),
        )

        while (true) {
          const url = `${baseUrl}?filter[CATEGORY_ID]=81&select[]=ID&select[]=TITLE&select[]=UF_CRM_6178C6D2EDA26&select[]=UF_CRM_1742537683&select[]=UF_CRM_1755499870&select[]=UF_CRM_1718938262&select[]=UF_CRM_1724832179&select[]=UF_CRM_6178C6D3035AF&select[]=UF_CRM_DEAL_1717076457153&select[]=UF_CRM_6178C6D30C6A9&select[]=UF_CRM_DEAL_1717076519247&select[]=UF_CRM_6178C6D31587F&select[]=DATE_CREATE&select[]=UF_CRM_1758164804&start=${start}`

          try {
            const res = await fetchWithTimeout(url)

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`)
            }

            const data = await res.json()

            if (!data.result || !Array.isArray(data.result)) {
              break
            }

            const mapped = data.result.map(mapItem)
            allDeals = allDeals.concat(mapped)

            // Update total estimate based on API response
            if (data.total && data.total > totalEstimate) {
              totalEstimate = data.total
            }

            // Calculate progress percentage
            const percentage = Math.min(Math.round((allDeals.length / totalEstimate) * 100), 100)

            // Send progress update
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  current: allDeals.length,
                  total: totalEstimate,
                  percentage,
                  message: `Đã tải ${allDeals.length} / ${totalEstimate} bản ghi...`,
                })}\n\n`,
              ),
            )

            if (!("next" in data)) break
            start = data.next

            // Small delay to prevent overwhelming the client
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message: error.message || "Lỗi khi fetch dữ liệu",
                })}\n\n`,
              ),
            )
            controller.close()
            return
          }
        }

        // Send completion
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              data: allDeals,
              total: allDeals.length,
              message: `Hoàn thành! Đã tải ${allDeals.length} bản ghi.`,
            })}\n\n`,
          ),
        )

        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: error.message || "Lỗi không xác định",
            })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
