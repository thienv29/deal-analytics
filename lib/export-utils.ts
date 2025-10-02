import { Deal } from "@/components/deals-analytics"
import * as XLSX from 'sheetjs-style'

function styleSheetHeaderAndBorder(ws: XLSX.WorkSheet) {
  if (!ws["!ref"]) return ws; // không có data thì thôi

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const headerRow = range.s.r; // thường là 0

  const purpleFill = {
    patternType: "solid",
    fgColor: { rgb: "800080" }, // tím
  };
  const whiteFont = { color: { rgb: "FFFFFF" }, bold: true };
  const thinBorder = {
    top: { style: "thin", color: { auto: 1 } },
    bottom: { style: "thin", color: { auto: 1 } },
    left: { style: "thin", color: { auto: 1 } },
    right: { style: "thin", color: { auto: 1 } },
  };

  // Header
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: C });
    const cell = ws[cellAddress];
    if (cell) {
      cell.s = {
        fill: purpleFill,
        font: whiteFont,
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }

  // Các ô còn lại: border
  for (let R = headerRow + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (cell) {
        // nếu cell đã có style header thì merge, còn lại chỉ border
        cell.s = { ...(cell.s || {}), border: thinBorder };
      }
    }
  }

  return ws;
}

// Function to normalize text for duplicate detection
function sortDealsByEmail(deals: Deal[]): Deal[] {
  return [...deals].sort((a, b) => {
    const emailA = a.email?.trim() || ""
    const emailB = b.email?.trim() || ""

    if (emailA && emailB) {
      return emailA.localeCompare(emailB)
    } else if (emailA) {
      return -1 // emailA has value, comes before emailB (empty)
    } else if (emailB) {
      return 1 // emailB has value, comes after emailA (empty)
    } else {
      return 0 // both empty
    }
  })
}

function normalizeTextForDuplicates(text?: string): string {
  if (!text || !text.trim()) return ""
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/đ/g, 'd') // Replace đ with d
    .replace(/Đ/g, 'D')
    .trim()
}

function styleDealsSheetWithDuplicates(ws: XLSX.WorkSheet, dealsData: Deal[]) {
  if (!ws["!ref"]) return ws;

  // First apply basic styling
  styleSheetHeaderAndBorder(ws);

  // Detect duplicate groups
  const duplicateGroups: Record<string, Set<number>> = {} // key -> set of row indices
  const normalizedDeals = dealsData.map((deal, index) => {
    const studentName = normalizeTextForDuplicates(deal.studentName)
    const parentName = normalizeTextForDuplicates(deal.parentOfStudentName)
    const email = deal.email?.trim().toLowerCase() || ""

    // Use whichever name is available (student name takes precedence)
    const normalizedName = studentName || parentName

    return {
      normalizedName,
      email,
      rowIndex: index + 1, // +1 because header is row 0
      key: normalizedName ? `${normalizedName}:::${email}` : ""
    }
  })

  // Group by duplicate key
  normalizedDeals.forEach((item, index) => {
    if (item.key) {
      if (!duplicateGroups[item.key]) {
        duplicateGroups[item.key] = new Set()
      }
      duplicateGroups[item.key].add(item.rowIndex)
    }
  })

  // Apply yellow background to duplicate rows (where group has more than 1 item)
  const yellowFill = {
    patternType: "solid",
    fgColor: { rgb: "FFFF00" }, // yellow
  };

  const range = XLSX.utils.decode_range(ws["!ref"]);

  Object.values(duplicateGroups).forEach(rowIndices => {
    if (rowIndices.size > 1) { // Only highlight if more than 1 duplicate
      rowIndices.forEach(rowIndex => {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: C });
          const cell = ws[cellAddress];
          if (cell) {
            cell.s = {
              ...(cell.s || {}),
              fill: yellowFill
            };
          }
        }
      })
    }
  })

  return ws;
}
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

  // Format date function for Vietnam timezone
  const formatVietnamDateTime = (dateString?: string): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  const sortedDeals = sortDealsByEmail(filteredDeals)

  // Prepare data for Excel export
  const excelData = sortedDeals.map((deal) => ({
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
    "Ngày tạo": formatVietnamDateTime(deal.DATE_CREATE),
    "Trường (PH tự nhập)": deal.schoolNameTmp || "",
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
    { wch: 30 }, // Ngày tạo
  ]
  ws['!cols'] = colWidths

  // Create workbook
  const wb = XLSX.utils.book_new()
  styleSheetHeaderAndBorder(ws);
  XLSX.utils.book_append_sheet(wb, ws, "Deals Data")

  // Generate and download file
  const fileName = `deals-export-${new Date().toISOString().split("T")[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export const exportDuplicateDataToExcel = (
  duplicateData: { name: string; email: string; count: number; deals: Deal[] }[],
  correctDataSelections: Record<string, string[]>,
  exportGrouped: boolean = true
) => {
  if (duplicateData.length === 0) return

  // Format date function for Vietnam timezone
  const formatVietnamDateTime = (dateString?: string): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  // Prepare data for Excel export
  const excelData: Record<string, any>[] = []
  const fileSuffix = exportGrouped ? "grouped" : "flat"

  if (exportGrouped) {
    duplicateData.forEach((group, groupIndex) => {
      // Add group header
      excelData.push({
        "Nhóm trùng lặp": `Nhóm ${groupIndex + 1}: ${group.name} - ${group.email || 'Không có email'}`,
        "Nhóm": groupIndex + 1,
        "Tên trùng": group.name,
        "Email trùng": group.email || 'Không có email',
        "Số lượng": group.count,
        "ID": "",
        "Tên học sinh": "",
        "Tên phụ huynh": "",
        "Khối": "",
        "Lớp": "",
        "Email": "",
        "Số điện thoại": "",
        "Trường học": "",
        "Phường/Quận": "",
        "Địa chỉ": "",
        "Ngày tạo": "",
        "Đánh dấu dữ liệu đúng (x)": "",
      })

      // Add deals in this group
      const correctIds = correctDataSelections[group.name + ":::" + (group.email || "")] || []

      group.deals.forEach((deal) => {
        excelData.push({
          "Nhóm trùng lặp": "",
          "Nhóm": "",
          "Tên trùng": "",
          "Email trùng": "",
          "Số lượng": "",
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
          "Ngày tạo": formatVietnamDateTime(deal.DATE_CREATE),
          "Đánh dấu dữ liệu đúng (x)": correctIds.includes(deal.ID) ? "x" : "",
        })
      })

      // Add empty row between groups
      excelData.push({
        "Nhóm trùng lặp": "",
        "Nhóm": "",
        "Tên trùng": "",
        "Email trùng": "",
        "Số lượng": "",
        "ID": "",
        "Tên học sinh": "",
        "Tên phụ huynh": "",
        "Khối": "",
        "Lớp": "",
        "Email": "",
        "Số điện thoại": "",
        "Trường học": "",
        "Phường/Quận": "",
        "Địa chỉ": "",
        "Ngày tạo": "",
        "Đánh dấu dữ liệu đúng (x)": "",
      })
    })
  } else {
    // Flat export - all duplicates in one list
    const allDeals: Deal[] = []
    const dealInfo: Record<string, { groupName: string; groupEmail: string; isCorrect: boolean }> = {}

    duplicateData.forEach((group) => {
      const correctIds = correctDataSelections[group.name + ":::" + (group.email || "")] || []

      group.deals.forEach((deal) => {
        allDeals.push(deal)
        dealInfo[deal.ID] = {
          groupName: group.name,
          groupEmail: group.email || "",
          isCorrect: correctIds.includes(deal.ID)
        }
      })
    })

      const sortedDeals = sortDealsByEmail(allDeals)

      sortedDeals.forEach((deal) => {
        const info = dealInfo[deal.ID]
        excelData.push({
          "Nhóm trùng lặp": `${info.groupName} - ${info.groupEmail || 'Không có email'}`,
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
          "Ngày tạo": formatVietnamDateTime(deal.DATE_CREATE),
          "Đánh dấu dữ liệu đúng (x)": info.isCorrect ? "✓" : "",
        })
      })
  }

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData)

  // Set column widths based on export type
  const colWidths = exportGrouped ? [
    { wch: 25 }, // Nhóm trùng lặp
    { wch: 8 },  // Nhóm
    { wch: 20 }, // Tên trùng
    { wch: 30 }, // Email trùng
    { wch: 10 }, // Số lượng
    { wch: 10 }, // ID
    { wch: 20 }, // Tên học sinh
    { wch: 20 }, // Tên phụ huynh
    { wch: 8 },  // Khối
    { wch: 15 }, // Lớp
    { wch: 30 }, // Email
    { wch: 15 }, // Số điện thoại
    { wch: 25 }, // Trường học
    { wch: 20 }, // Phường/Quận
    { wch: 30 }, // Địa chỉ
    { wch: 20 }, // Ngày tạo
    { wch: 20 }, // Đánh dấu dữ liệu đúng (x)
  ] : [
    { wch: 30 }, // Nhóm trùng lặp
    { wch: 10 }, // ID
    { wch: 20 }, // Tên học sinh
    { wch: 20 }, // Tên phụ huynh
    { wch: 8 },  // Khối
    { wch: 15 }, // Lớp
    { wch: 30 }, // Email
    { wch: 15 }, // Số điện thoại
    { wch: 25 }, // Trường học
    { wch: 20 }, // Phường/Quận
    { wch: 30 }, // Địa chỉ
    { wch: 20 }, // Ngày tạo
    { wch: 20 }, // Đánh dấu dữ liệu đúng (x)
  ]
  ws['!cols'] = colWidths

  // Create workbook
  const wb = XLSX.utils.book_new()
  const sheetName = exportGrouped ? "Duplicate Data (Grouped)" : "Duplicate Data (Flat)"
  styleSheetHeaderAndBorder(ws);
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Generate and download file
  const fileName = `duplicate-data-export-${fileSuffix}-${new Date().toISOString().split("T")[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export const exportSummaryAndDuplicateToExcel = (
  summaryData: any[],
  duplicateData: { name: string; email: string; count: number; deals: Deal[] }[],
  correctDataSelections: Record<string, string[]>,
  exportDuplicateGrouped: boolean = true
) => {
  if (summaryData.length === 0 && duplicateData.length === 0) return

  // Format date function for Vietnam timezone
  const formatVietnamDateTime = (dateString?: string): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary Data
  if (summaryData.length > 0) {
    const summaryExcelData = summaryData.map((item: any, index: number) => ({
      "STT": index + 1,
      "Trường học": item.school || "",
      "Phường/Quận": item.ward || "",
      "Tổng deals": item.total || 0,
      "Duy nhất": item.unique || 0,
      "Trùng lặp": item.duplicates || 0,
      "Tỷ lệ trùng": item.duplicateRate || "",
    }))

    const summaryWs = XLSX.utils.json_to_sheet(summaryExcelData)
    const summaryColWidths = [
      { wch: 6 }, // STT
      { wch: 25 }, // Trường học
      { wch: 20 }, // Phường/Quận
      { wch: 12 }, // Tổng deals
      { wch: 12 }, // Duy nhất
      { wch: 12 }, // Trùng lặp
      { wch: 15 }, // Tỷ lệ trùng
    ]
    summaryWs['!cols'] = summaryColWidths
    styleSheetHeaderAndBorder(summaryWs);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Bảng tổng hợp")
  }

  // Sheet 2: Duplicate Data
  if (duplicateData.length > 0) {
    const duplicateExcelData: Record<string, any>[] = []
    const fileSuffix = exportDuplicateGrouped ? "grouped" : "flat"

    if (exportDuplicateGrouped) {
      duplicateData.forEach((group, groupIndex) => {
        // Add group header
        duplicateExcelData.push({
          "Nhóm trùng lặp": `Nhóm ${groupIndex + 1}: ${group.name} - ${group.email || 'Không có email'}`,
          "Nhóm": groupIndex + 1,
          "Tên trùng": group.name,
          "Email trùng": group.email || 'Không có email',
          "Số lượng": group.count,
          "ID": "",
          "Tên học sinh": "",
          "Tên phụ huynh": "",
          "Khối": "",
          "Lớp": "",
          "Email": "",
          "Số điện thoại": "",
          "Trường học": "",
          "Phường/Quận": "",
          "Địa chỉ": "",
          "Ngày tạo": "",
          "Đánh dấu dữ liệu đúng (x)": "",
        })

        // Add deals in this group
        const correctIds = correctDataSelections[group.name + ":::" + (group.email || "")] || []

        group.deals.forEach((deal) => {
          duplicateExcelData.push({
            "Nhóm trùng lặp": "",
            "Nhóm": "",
            "Tên trùng": "",
            "Email trùng": "",
            "Số lượng": "",
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
            "Ngày tạo": formatVietnamDateTime(deal.DATE_CREATE),
            "Đánh dấu dữ liệu đúng (x)": correctIds.includes(deal.ID) ? "✓" : "",
          })
        })

        // Add empty row between groups
        duplicateExcelData.push({
          "Nhóm trùng lặp": "",
          "Nhóm": "",
          "Tên trùng": "",
          "Email trùng": "",
          "Số lượng": "",
          "ID": "",
          "Tên học sinh": "",
          "Tên phụ huynh": "",
          "Khối": "",
          "Lớp": "",
          "Email": "",
          "Số điện thoại": "",
          "Trường học": "",
          "Phường/Quận": "",
          "Địa chỉ": "",
          "Ngày tạo": "",
          "Đánh dấu dữ liệu đúng (x)": "",
        })
      })
    } else {
      // Flat export - all duplicates in one list
      const allDeals: Deal[] = []
      const dealInfo: Record<string, { groupName: string; groupEmail: string; isCorrect: boolean }> = {}

      duplicateData.forEach((group) => {
        const correctIds = correctDataSelections[group.name + ":::" + (group.email || "")] || []

        group.deals.forEach((deal) => {
          allDeals.push(deal)
          dealInfo[deal.ID] = {
            groupName: group.name,
            groupEmail: group.email || "",
            isCorrect: correctIds.includes(deal.ID)
          }
        })
      })

      const sortedDeals = sortDealsByEmail(allDeals)

      sortedDeals.forEach((deal) => {
        const info = dealInfo[deal.ID]
        duplicateExcelData.push({
          "Nhóm trùng lặp": `${info.groupName} - ${info.groupEmail || 'Không có email'}`,
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
          "Ngày tạo": formatVietnamDateTime(deal.DATE_CREATE),
          "Đánh dấu dữ liệu đúng (x)": info.isCorrect ? "✓" : "",
        })
      })
    }

    const duplicateWs = XLSX.utils.json_to_sheet(duplicateExcelData)

    // Set column widths based on export type
    let duplicateColWidths
    if (exportDuplicateGrouped) {
      duplicateColWidths = [
        { wch: 25 }, // Nhóm trùng lặp
        { wch: 8 },  // Nhóm
        { wch: 20 }, // Tên trùng
        { wch: 30 }, // Email trùng
        { wch: 10 }, // Số lượng
        { wch: 10 }, // ID
        { wch: 20 }, // Tên học sinh
        { wch: 20 }, // Tên phụ huynh
        { wch: 8 },  // Khối
        { wch: 15 }, // Lớp
        { wch: 30 }, // Email
        { wch: 15 }, // Số điện thoại
        { wch: 25 }, // Trường học
        { wch: 20 }, // Phường/Quận
        { wch: 30 }, // Địa chỉ
        { wch: 20 }, // Ngày tạo
        { wch: 20 }, // Đánh dấu dữ liệu đúng
      ]
    } else {
      duplicateColWidths = [
        { wch: 30 }, // Nhóm trùng lặp
        { wch: 10 }, // ID
        { wch: 20 }, // Tên học sinh
        { wch: 20 }, // Tên phụ huynh
        { wch: 8 },  // Khối
        { wch: 15 }, // Lớp
        { wch: 30 }, // Email
        { wch: 15 }, // Số điện thoại
        { wch: 25 }, // Trường học
        { wch: 20 }, // Phường/Quận
        { wch: 30 }, // Địa chỉ
        { wch: 20 }, // Ngày tạo
        { wch: 20 }, // Đánh dấu dữ liệu đúng
      ]
    }
    duplicateWs['!cols'] = duplicateColWidths
    styleSheetHeaderAndBorder(duplicateWs);
    XLSX.utils.book_append_sheet(wb, duplicateWs, exportDuplicateGrouped ? "Dữ liệu trùng lặp (Grouped)" : "Dữ liệu trùng lặp (Flat)")
  }

  // Generate and download file
  const fileName = `summary-and-duplicate-export-${new Date().toISOString().split("T")[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export const exportMultiFormat = (
  options: {
    format?: 'json' | 'csv' | 'excel'
    includeSummary?: boolean
    includeDeals?: boolean
    includeDuplicates?: boolean
    summaryData?: any[]
    dealsData?: Deal[]
    duplicateData?: { name: string; email: string; count: number; deals: Deal[] }[]
    correctDataSelections?: Record<string, string[]>
    duplicateExportGrouped?: boolean
  }
) => {
  const {
    format = 'excel',
    includeSummary = false,
    includeDeals = false,
    includeDuplicates = false,
    summaryData = [],
    dealsData = [],
    duplicateData = [],
    correctDataSelections = {},
    duplicateExportGrouped = true,
  } = options

  // Check if at least one type is selected and has data
  const hasSummaryData = includeSummary && summaryData.length > 0
  const hasDealsData = includeDeals && dealsData.length > 0
  const hasDuplicateData = includeDuplicates && duplicateData.length > 0

  if (!hasSummaryData && !hasDealsData && !hasDuplicateData) {
    return
  }

  if (format === 'excel') {
    // Use the existing Excel multi-sheet export
    return exportMultiSheetExcel({
      includeSummary,
      includeDeals,
      includeDuplicates,
      summaryData,
      dealsData,
      duplicateData,
      correctDataSelections,
      duplicateExportGrouped,
    })
  } else if (format === 'json') {
    // Export JSON with multiple data types
    const jsonData: any = {}

    if (hasSummaryData) {
      jsonData.summary = summaryData
    }

    if (hasDealsData) {
      jsonData.deals = dealsData
    }

    if (hasDuplicateData) {
      if (duplicateExportGrouped) {
        jsonData.duplicatesGrouped = duplicateData.map(group => ({
          name: group.name,
          email: group.email,
          count: group.count,
          isCorrectSelected: correctDataSelections[group.name + ":::" + (group.email || "")] || [],
          deals: group.deals
        }))
      } else {
        // Flat export
        const allDeals: Deal[] = []
        const dealInfo: Record<string, { groupName: string; groupEmail: string; isCorrect: boolean }> = {}

        duplicateData.forEach((group) => {
          const correctIds = correctDataSelections[group.name + ":::" + (group.email || "")] || []

          group.deals.forEach((deal) => {
            allDeals.push(deal)
            dealInfo[deal.ID] = {
              groupName: group.name,
              groupEmail: group.email || "",
              isCorrect: correctIds.includes(deal.ID)
            }
          })
        })

        jsonData.duplicatesFlat = allDeals.map(deal => ({
          ...deal,
          duplicateInfo: dealInfo[deal.ID]
        }))
      }
    }

    // Download JSON
    const jsonContent = JSON.stringify(jsonData, null, 2)
    const blob = new Blob([jsonContent], { type: "application/json" })

    // Generate filename
    const selectedTypes = []
    if (hasSummaryData) selectedTypes.push("summary")
    if (hasDealsData) selectedTypes.push("deals")
    if (hasDuplicateData) selectedTypes.push(duplicateExportGrouped ? "duplicates-grouped" : "duplicates-flat")

    const fileName = `export-${selectedTypes.join("-")}-${new Date().toISOString().split("T")[0]}.json`
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

  } else if (format === 'csv') {
    // Export multiple CSV files
    if (hasDealsData) {
      setTimeout(() => exportToCSV(dealsData), 0)
    }
    if (hasSummaryData) {
      const summaryCsvData = summaryData.map((item: any, index: number) => ({
        "STT": index + 1,
        "Truong hoc": item.school || "",
        "Phuong/Quan": item.ward || "",
        "Tong deals": item.total || 0,
        "Duy nhat": item.unique || 0,
        "Trung lap": item.duplicates || 0,
        "Ty le trung": item.duplicateRate || "",
      }))
      setTimeout(() => {
        exportArrayToCSV(summaryCsvData, `export-summary-${new Date().toISOString().split("T")[0]}.csv`)
      }, 100)
    }
    if (hasDuplicateData) {
      setTimeout(() => {
        if (duplicateExportGrouped) {
          exportDuplicateDataToExcel(duplicateData, correctDataSelections, true)
          // For CSV, we'll still export as the Excel format but as a single CSV
          exportDuplicateDataToExcel(duplicateData, correctDataSelections, duplicateExportGrouped)
        } else {
          exportDuplicateDataToExcel(duplicateData, correctDataSelections, false)
        }
      }, 200)
    }
  }
}

// Helper function for CSV export
const exportArrayToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return

  const headers = Object.keys(data[0]).join(",")
  const csvContent = [
    headers,
    ...data.map(row =>
      Object.values(row).map(val =>
        `"${String(val || "").replace(/"/g, '""')}"`
      ).join(",")
    ),
  ].join("\n")

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportMultiSheetExcel = (
  options: {
    includeSummary?: boolean
    includeDeals?: boolean
    includeDuplicates?: boolean
    summaryData?: any[]
    dealsData?: Deal[]
    duplicateData?: { name: string; email: string; count: number; deals: Deal[] }[]
    correctDataSelections?: Record<string, string[]>
    duplicateExportGrouped?: boolean
  }
) => {
  const {
    includeSummary = false,
    includeDeals = false,
    includeDuplicates = false,
    summaryData = [],
    dealsData = [],
    duplicateData = [],
    correctDataSelections = {},
    duplicateExportGrouped = true,
  } = options

  // Check if at least one type is selected and has data
  const hasSummaryData = includeSummary && summaryData.length > 0
  const hasDealsData = includeDeals && dealsData.length > 0
  const hasDuplicateData = includeDuplicates && duplicateData.length > 0

  if (!hasSummaryData && !hasDealsData && !hasDuplicateData) {
    return
  }

  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary Data (if selected and has data)
  if (hasSummaryData) {
    const summaryExcelData = summaryData.map((item: any, index: number) => ({
      "STT": index + 1,
      "Trường học": item.school || "",
      "Phường/Quận": item.ward || "",
      "Tổng deals": item.total || 0,
      "Duy nhất": item.unique || 0,
      "Trùng lặp": item.duplicates || 0,
      "Tỷ lệ trùng": item.duplicateRate || "",
    }))

    const summaryWs = XLSX.utils.json_to_sheet(summaryExcelData)
    const summaryColWidths = [
      { wch: 6 }, // STT
      { wch: 25 }, // Trường học
      { wch: 20 }, // Phường/Quận
      { wch: 12 }, // Tổng deals
      { wch: 12 }, // Duy nhất
      { wch: 12 }, // Trùng lặp
      { wch: 15 }, // Tỷ lệ trùng
    ]
    summaryWs['!cols'] = summaryColWidths
    styleSheetHeaderAndBorder(summaryWs);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Bảng tổng hợp")
  }

  // Format date function for Vietnam timezone
  const formatVietnamDateTime = (dateString?: string): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  // Sheet 2: Deals List (if selected and has data)
  if (hasDealsData) {
    const sortedDeals = sortDealsByEmail(dealsData)

    const dealsExcelData = sortedDeals.map((deal) => ({
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
      "Ngày tạo": formatVietnamDateTime(deal.DATE_CREATE),
    }))

    const dealsWs = XLSX.utils.json_to_sheet(dealsExcelData)
    const dealsColWidths = [
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
    dealsWs['!cols'] = dealsColWidths
    styleDealsSheetWithDuplicates(dealsWs, sortedDeals);
    XLSX.utils.book_append_sheet(wb, dealsWs, "Danh sách deals")
  }

  // Sheet 3: Duplicate Data (if selected and has data)
  if (hasDuplicateData) {
    const duplicateExcelData: Record<string, any>[] = []

    if (duplicateExportGrouped) {
      duplicateData.forEach((group, groupIndex) => {
        // Add group header
        duplicateExcelData.push({
          "Nhóm trùng lặp": `Nhóm ${groupIndex + 1}: ${group.name} - ${group.email || 'Không có email'}`,
          "Nhóm": groupIndex + 1,
          "Tên trùng": group.name,
          "Email trùng": group.email || 'Không có email',
          "Số lượng": group.count,
          "ID": "",
          "Tên học sinh": "",
          "Tên phụ huynh": "",
          "Khối": "",
          "Lớp": "",
          "Email": "",
          "Số điện thoại": "",
          "Trường học": "",
          "Phường/Quận": "",
          "Địa chỉ": "",
          "Ngày tạo": "",
          "Đánh dấu dữ liệu đúng (x)": "",
        })

        // Add deals in this group
        const correctIds = correctDataSelections[group.name + ":::" + (group.email || "")] || []

        group.deals.forEach((deal) => {
          duplicateExcelData.push({
            "Nhóm trùng lặp": "",
            "Nhóm": "",
            "Tên trùng": "",
            "Email trùng": "",
            "Số lượng": "",
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
            "Ngày tạo": formatVietnamDateTime(deal.DATE_CREATE),
            "Đánh dấu dữ liệu đúng (x)": correctIds.includes(deal.ID) ? "✓" : "",
          })
        })

        // Add empty row between groups
        duplicateExcelData.push({
          "Nhóm trùng lặp": "",
          "Nhóm": "",
          "Tên trùng": "",
          "Email trùng": "",
          "Số lượng": "",
          "ID": "",
          "Tên học sinh": "",
          "Tên phụ huynh": "",
          "Khối": "",
          "Lớp": "",
          "Email": "",
          "Số điện thoại": "",
          "Trường học": "",
          "Phường/Quận": "",
          "Địa chỉ": "",
          "Ngày tạo": "",
          "Đánh dấu dữ liệu đúng (x)": "",
        })
      })
    } else {
      // Flat export - all duplicates in one list
      const allDeals: Deal[] = []
      const dealInfo: Record<string, { groupName: string; groupEmail: string; isCorrect: boolean }> = {}

      duplicateData.forEach((group) => {
        const correctIds = correctDataSelections[group.name + ":::" + (group.email || "")] || []

        group.deals.forEach((deal) => {
          allDeals.push(deal)
          dealInfo[deal.ID] = {
            groupName: group.name,
            groupEmail: group.email || "",
            isCorrect: correctIds.includes(deal.ID)
          }
        })
      })

      const sortedDeals = sortDealsByEmail(allDeals)

      sortedDeals.forEach((deal) => {
        const info = dealInfo[deal.ID]
        duplicateExcelData.push({
          "Nhóm trùng lặp": `${info.groupName} - ${info.groupEmail || 'Không có email'}`,
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
          "Ngày tạo": formatVietnamDateTime(deal.DATE_CREATE),
          "Đánh dấu dữ liệu đúng (x)": info.isCorrect ? "✓" : "",
        })
      })
    }

    const duplicateWs = XLSX.utils.json_to_sheet(duplicateExcelData)

    // Set column widths based on export type
    let duplicateColWidths
    if (duplicateExportGrouped) {
      duplicateColWidths = [
        { wch: 25 }, // Nhóm trùng lặp
        { wch: 8 },  // Nhóm
        { wch: 20 }, // Tên trùng
        { wch: 30 }, // Email trùng
        { wch: 10 }, // Số lượng
        { wch: 10 }, // ID
        { wch: 20 }, // Tên học sinh
        { wch: 20 }, // Tên phụ huynh
        { wch: 8 },  // Khối
        { wch: 15 }, // Lớp
        { wch: 30 }, // Email
        { wch: 15 }, // Số điện thoại
        { wch: 25 }, // Trường học
        { wch: 20 }, // Phường/Quận
        { wch: 30 }, // Địa chỉ
        { wch: 20 }, // Ngày tạo
        { wch: 20 }, // Đánh dấu dữ liệu đúng
      ]
    } else {
      duplicateColWidths = [
        { wch: 30 }, // Nhóm trùng lặp
        { wch: 10 }, // ID
        { wch: 20 }, // Tên học sinh
        { wch: 20 }, // Tên phụ huynh
        { wch: 8 },  // Khối
        { wch: 15 }, // Lớp
        { wch: 30 }, // Email
        { wch: 15 }, // Số điện thoại
        { wch: 25 }, // Trường học
        { wch: 20 }, // Phường/Quận
        { wch: 30 }, // Địa chỉ
        { wch: 20 }, // Ngày tạo
        { wch: 20 }, // Đánh dấu dữ liệu đúng
      ]
    }
    duplicateWs['!cols'] = duplicateColWidths
    styleSheetHeaderAndBorder(duplicateWs);
    XLSX.utils.book_append_sheet(wb, duplicateWs, duplicateExportGrouped ? "Dữ liệu trùng lặp (Grouped)" : "Dữ liệu trùng lặp (Flat)")
  }

  // Generate selected types string for filename
  const selectedTypes = []
  if (hasSummaryData) selectedTypes.push("summary")
  if (hasDealsData) selectedTypes.push("deals")
  if (hasDuplicateData) selectedTypes.push("duplicates")

  const fileName = `export-${selectedTypes.join("-")}-${new Date().toISOString().split("T")[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}
