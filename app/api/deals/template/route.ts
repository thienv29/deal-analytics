import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import * as XLSX from 'xlsx'
import { Deal } from "@/components/deals-analytics"
import {toTitleCase, normalizeVietnamPhone, removeVietnameseTones} from "@/lib/utils"

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

function styleTemplateSheetWithHighlights(ws: XLSX.WorkSheet, dealsData: Deal[], curriculumMap: Record<string, 'cũ' | 'mới'>) {
  if (!ws["!ref"]) return ws;

  // First apply basic styling
  styleSheetHeaderAndBorder(ws);

  const range = XLSX.utils.decode_range(ws["!ref"]);

  // Apply yellow background to rows with empty "Khóa học" (course) column
  const yellowFill = {
    patternType: "solid",
    fgColor: { rgb: "FFFFFF" }, // yellow
  };

  dealsData.forEach((deal, index) => {
    const rowIndex = index + 1; // +1 because header is row 0

    // Check if course is empty (no curriculum mapping)
    const schoolKey = deal.schoolName || ""
    const wardKey = deal.ward || ""
    const mapKey = `${schoolKey}-${wardKey}`
    const curriculumType = curriculumMap[mapKey]

    if (!curriculumType) {
      // Highlight yellow for empty/unmapped curriculum
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
    }
  });

  return ws;
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

export async function POST(request: NextRequest) {
  try {
    const { deals }: { deals: Deal[] } = await request.json()

    if (!deals || deals.length === 0) {
      return Response.json({ success: false, error: "No deals provided" }, { status: 400 })
    }

    // Curriculum mapping: school-ward -> "cũ" or "mới"
    const curriculumMap: Record<string, 'cũ' | 'mới'> = {
      'Hòa Bình-Sài Gòn': 'cũ',
      'Lê Ngọc Hân-Bến Thành': 'cũ',
      'Đinh Tiên Hoàng-Tân Định': 'mới',
      'Nguyễn Thái Bình-Bến Thành': 'mới',
      'Nguyễn Sơn Hà-Bàn Cờ': 'mới',
      'Nguyễn Thái Bình-Xóm Chiếu': 'cũ',
      'Đống Đa-Khánh Hội': 'cũ',
      'Phú Định-Bình Phú': 'cũ',
      'Chi Lăng-Thông Tây Hội': 'cũ',
      'An Hội-Thông Tây Hội': 'cũ',
      'Nguyễn Viết Xuân-An Nhơn': 'cũ',
      'Lê Quý Đôn-An Hội Tây': 'mới',
      'Hoàng Văn Thụ-An Nhơn': 'cũ',
      'Nguyễn Thị Minh Khai-Thông Tây Hội': 'cũ',
      'Phạm Ngũ Lão-Hạnh Thông': 'cũ',
      'Lê Thị Hồng Gấm-An Hội Tây': 'mới',
      'Kim Đồng-Gò Vấp': 'mới',
      'Lê Hoàn-An Hội Đông': 'mới',
      'Võ Thị Sáu-An Hội Đông': 'cũ',
      'Hanh Thông-Hạnh Thông': 'mới',
      'Đặng Thùy Trâm-An Hội Tây': 'mới',
      'Nguyễn Thượng Hiền-Hạnh Thông': 'mới',
      'Phan Chu Trinh-An Hội Đông': 'mới',
      'Lê Đức Thọ-An Hội Đông': 'cũ',
      'Hoàng Văn Thụ-Tân Sơn Nhất': 'mới',
      'Chi Lăng-Tân Hòa': 'cũ',
      'Lê Văn Sĩ-Tân Sơn Hòa': 'cũ',
      'Bành Văn Trân-Tân Sơn Nhất': 'mới',
      'Lê Thị Hồng Gấm-Bảy Hiền': 'cũ',
      'Trần Quốc Tuấn-Bảy Hiền': 'cũ',
      'Trường Thạnh-Long Phước': 'mới',
      'Linh Chiểu-Thủ Đức': 'cũ',
      'Đặng Văn Bất-Hiệp Bình': 'mới',
      'Nguyễn Thị Tư-An Khánh': 'cũ',
      'Giồng Ông Tố-Bình Trưng': 'mới'
    }

    // Step 1: Remove ALL entries that have duplicates based on email + student name combination
    const comboCounts: Record<string, number> = {}
    const comboDeals: Record<string, Deal[]> = {}

    // First pass: count occurrences and group deals
    for (const deal of deals) {
      const normalizedEmail = (deal.email || "").toLowerCase().trim()
      const studentName = deal.studentName ? normalizeTextForDuplicates(toTitleCase(deal.studentName)) : ""

      // Skip if both email and student name are empty
      if (!normalizedEmail && !studentName) continue

      // Create unique key from email + student name combination
      const comboKey = `${normalizedEmail}:::${studentName}`

      comboCounts[comboKey] = (comboCounts[comboKey] || 0) + 1
      if (!comboDeals[comboKey]) comboDeals[comboKey] = []
      comboDeals[comboKey].push(deal)
    }

    // Second pass: only keep deals that have unique combinations (no duplicates)
    const uniqueDeals = []
    for (const [comboKey, count] of Object.entries(comboCounts)) {
      if (count === 1) {
        // Only include if this combination appears exactly once
        uniqueDeals.push(...comboDeals[comboKey])
      }
      // Skip all combinations that appear more than once (duplicates)
    }

    // Step 2: Count email occurrences in the final unique deals
    const emailOccurrenceCount: Record<string, number> = {}
    uniqueDeals.forEach(deal => {
      const normalizedEmail = (deal.email || "").toLowerCase().trim()
      if (normalizedEmail) {
        emailOccurrenceCount[normalizedEmail] = (emailOccurrenceCount[normalizedEmail] || 0) + 1
      }
    })

    // Step 3: Query existing accounts to get current maximum numbers
    const existingAccounts: Record<string, number[]> = {}

    try {
      const connection = await connectToDatabase()

      // Get all usernames (we'll filter client-side)
      const [existingUserResults] = await connection.execute(
        'SELECT username FROM users'
      );

      console.log('[DEBUG] Found', (existingUserResults as any[]).length, 'existing users in database')

      // Group existing accounts by base email and collect existing numbers
      for (const row of existingUserResults as any[]) {
        const username = row.username || ""
        const normalizedUsername = username.toLowerCase().trim()

        // Find the base email this username corresponds to
        for (const deal of uniqueDeals) {
          const dealEmail = deal.email?.toLowerCase().trim()
          if (!dealEmail) continue

          // Check if this username starts with the deal email
          if (normalizedUsername.startsWith(dealEmail)) {
            if (!existingAccounts[dealEmail]) {
              existingAccounts[dealEmail] = []
            }

            // If exact match (no number), count as number 1
            if (normalizedUsername === dealEmail) {
              console.log('[DEBUG] Found exact match for', dealEmail, '-> number 1')
              existingAccounts[dealEmail].push(1)
            }
            // If it ends with a number after the email, extract that number
            else if (normalizedUsername.length > dealEmail.length && /^\d+$/.test(normalizedUsername.slice(dealEmail.length))) {
              const number = parseInt(normalizedUsername.slice(dealEmail.length))
              console.log('[DEBUG] Found numbered account for', dealEmail, '-> number', number)
              existingAccounts[dealEmail].push(number)
            }
          }
        }
      }

      // Debug logging
      for (const [email, numbers] of Object.entries(existingAccounts)) {
        console.log(`[DEBUG] ${email}: existing numbers [${numbers.join(', ')}]`)
      }

      await connection.end()
    } catch (dbError) {
      console.error('[API template export] Error querying existing accounts:', dbError)
      // Continue with empty existing accounts - numbering will start from 1
    }

    // Step 4: Sort unique deals by email
    const sortedDeals = uniqueDeals.sort((a, b) => {
      const emailA = (a.email || "").toLowerCase().trim()
      const emailB = (b.email || "").toLowerCase().trim()

      if (!emailA && !emailB) return 0
      if (!emailA) return 1  // Empty emails come after
      if (!emailB) return -1 // Empty emails come after

      return emailA.localeCompare(emailB)
    })

    // Step 5: Group deals by email to handle numbering per email group
    const emailGroups = sortedDeals.reduce((groups, deal) => {
      const email = (deal.email || "").toLowerCase().trim()
      if (!email) return groups

      if (!groups[email]) {
        groups[email] = []
      }
      groups[email].push(deal)
      return groups
    }, {} as Record<string, Deal[]>)

    // Step 6: Generate Excel data with proper username numbering per email group
    const excelData: Record<string, any>[] = []

    for (const [normalizedEmail, dealsGroup] of Object.entries(emailGroups)) {
      // Get existing account numbers for this email
      const existingNumbers = existingAccounts[normalizedEmail] || []
      const maxExistingNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0

      // Start numbering from: max(maxExisting + 1, 2) for additional accounts
      const startNumber = Math.max(maxExistingNumber + 1, 2)

      dealsGroup.forEach((deal, groupIndex) => {
        let username = deal.email || ""

        // Check if we have ANY existing accounts for this email
        const hasExistingAccounts = existingNumbers.length > 0

        if (!hasExistingAccounts && groupIndex === 0) {
          // No existing accounts: First occurrence gets bare email
          username = deal.email || ""
        } else {
          // Either we have existing accounts OR this is not the first occurrence:
          // All instances get numbered starting from startNumber
          const numberToUse = startNumber + groupIndex
          username = `${deal.email}${numberToUse}`
        }

        // Determine curriculum type based on school-ward combination
        const schoolKey = deal.schoolName || ""
        const wardKey = deal.ward?.split('Phường ')[1] || ""
        const mapKey = `${schoolKey}-${wardKey}`
        const curriculumType = curriculumMap[mapKey] // Leave empty if not found

        // Get grade number (assume grade is like "10", "11", "12" or "10 A", "11 B" etc.)
        let gradeNumber = deal.grade?.split(" ")[1]
        // Generate course name based on curriculum type
        let courseName = ""
        if (curriculumType === 'cũ') {
          courseName = `Tiếng Anh Toán - Khoa học thực nghiệm (khối ${gradeNumber})`
        } else if (curriculumType === 'mới') {
          courseName = `Tiếng Anh Toán - Khoa học thực nghiệm (k${gradeNumber})`
        }
        // If curriculumType is undefined (not mapped), courseName remains empty string

        excelData.push({
          "STT": "", // Leave STT column empty as requested
          "id": "",
          "Họ tên bé": toTitleCase(deal.studentName) || "",
          "Tên đăng nhập": username,
          "Email": deal.email || "",
          "Số điện thoại": normalizeVietnamPhone(deal.phone) || "",
          "Mật khẩu": "iclc2025", // Empty by default - passwords not available
          "Giới tính (1 - nam / 2- nữ / 3 khác)": "3", // Default empty - gender not in Deal model
          "Kích hoạt": deal.isDisabled === "1" ? "0" : "1", // 1 = activated (not disabled), 0 = deactivated (disabled)
          "Cấm tài khoản": deal.isDisabled === "1" ? "1" : "0", // 1 = banned (disabled), 0 = not banned (active)
          "Tên người liên hệ": toTitleCase(deal.parentOfStudentName) || "",
          "Trường": (deal.schoolName || "") + " - " + (deal.ward || ""),
          "Lớp": deal.className || "",
          "Nhóm": "FTDP, tih-" + removeVietnameseTones(deal.schoolName+ ' ' + deal.ward) + ", TKTC", // Default empty - no group field in Deal model
          "Khóa học": courseName,
        })
      })
    }

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    const colWidths = [
      { wch: 6 }, // STT
      { wch: 15 }, // id
      { wch: 25 }, // Họ tên bé
      { wch: 30 }, // Tên đăng nhập
      { wch: 30 }, // Email
      { wch: 15 }, // Số điện thoại
      { wch: 15 }, // Mật khẩu
      { wch: 30 }, // Giới tính
      { wch: 10 }, // Kích hoạt
      { wch: 15 }, // Cấm tài khoản
      { wch: 25 }, // Tên người liên hệ
      { wch: 25 }, // Trường
      { wch: 15 }, // Lớp
      { wch: 15 }, // Nhóm
      { wch: 15 }, // Khóa học
    ]
    ws['!cols'] = colWidths

    // Create workbook
    const wb = XLSX.utils.book_new()
    styleTemplateSheetWithHighlights(ws, sortedDeals, curriculumMap);
    XLSX.utils.book_append_sheet(wb, ws, "Template Export")

    // Generate file buffer
    const fileBuffer = XLSX.write(wb, { type: 'buffer' })

    // Return file for download
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template-export-${new Date().toISOString().split("T")[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error("Error exporting template:", error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
