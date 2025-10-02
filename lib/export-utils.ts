import { Deal } from "@/components/deals-analytics"
import * as XLSX from 'xlsx'

export const exportToCSV = (filteredDeals: Deal[]) => {
  if (filteredDeals.length === 0) return

  const headers = [
    "ID",
    "Tên học sinh",
    "Tên phụ huynh",
    "Khối",
    "Lớp",
    "Email",
    "Số điện thoại",
    "Trường học",
    "Phường/Quận",
    "Địa chỉ",
    "Ngày tạo",
  ]

  const csvContent = [
    headers.join(","),
    ...filteredDeals.map((deal) =>
      [
        deal.ID || "",
        `"${(deal.studentName || "").replace(/"/g, '""')}"`,
        `"${(deal.parentOfStudentName || "").replace(/"/g, '""')}"`,
        deal.grade || "",
        `"${(deal.className || "").replace(/"/g, '""')}"`,
        deal.email || "",
        deal.phone || "",
        `"${(deal.schoolName || "").replace(/"/g, '""')}"`,
        `"${(deal.ward || "").replace(/"/g, '""')}"`,
        `"${(deal.address || "").replace(/"/g, '""')}"`,
        deal.DATE_CREATE || "",
      ].join(","),
    ),
  ].join("\n")

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `deals-export-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToJSON = (filteredDeals: Deal[]) => {
  if (filteredDeals.length === 0) return

  const jsonContent = JSON.stringify(filteredDeals, null, 2)
  const blob = new Blob([jsonContent], { type: "application/json" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `deals-export-${new Date().toISOString().split("T")[0]}.json`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToExcel = (filteredDeals: Deal[]) => {
  if (filteredDeals.length === 0) return

  // Prepare data for Excel export
  const excelData = filteredDeals.map((deal) => ({
    "ID": deal.ID || "",
    "Tên học sinh": deal.studentName || "",
    "Tên phụ huynh": deal.parentOfStudentName || "",
    "Khối": deal.grade || "",
    "Lớp": deal.className || "",
    "Email": deal.email || "",
    "Số điện thoại": deal.phone || "",
    "Trường học": deal.schoolName || "",
    "Phường/Quận": deal.ward || "",
    "Địa chỉ": deal.address || "",
    "Ngày tạo": deal.DATE_CREATE || "",
  })) as Record<string, string>[]

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const colWidths = [
    { wch: 10 }, // ID
    { wch: 20 }, // Tên học sinh
    { wch: 20 }, // Tên phụ huynh
    { wch: 10 }, // Khối
    { wch: 15 }, // Lớp
    { wch: 30 }, // Email
    { wch: 15 }, // Số điện thoại
    { wch: 25 }, // Trường học
    { wch: 20 }, // Phường/Quận
    { wch: 30 }, // Địa chỉ
    { wch: 20 }, // Ngày tạo
  ]
  ws['!cols'] = colWidths

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Deals Data")

  // Generate and download file
  const fileName = `deals-export-${new Date().toISOString().split("T")[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}
