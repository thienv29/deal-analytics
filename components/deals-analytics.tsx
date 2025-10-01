"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import * as EmailValidator from 'email-validator';
import {
  RefreshCw,
  X,
  Download,
  TrendingUp,
  Users,
  MapPin,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Table,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
} from "lucide-react"
import * as XLSX from 'xlsx'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts"

interface Deal {
  ID: string
  TITLE?: string
  schoolName?: string
  schoolType?: string
  ward?: string
  studentName?: string
  grade?: string
  className?: string
  email?: string
  parentOfStudentName?: string
  phone?: string
  address?: string
  DATE_CREATE?: string
  schoolNameTmp?: string
}

interface DealsAnalyticsProps {
  onDataLoad?: (data: Deal[]) => void
}

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  const isValidEmail = (email: string): boolean => {
    return EmailValidator.validate(email)
  }

  // Function to remove Vietnamese accents and convert to lowercase
  const normalizeText = (text?: string): string => {
    if (!text || !text.trim()) return ""
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/đ/g, 'd') // Replace đ with d
      .replace(/Đ/g, 'D')
      .trim()
  }

export function DealsAnalytics({ onDataLoad }: DealsAnalyticsProps) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [gradeFilter, setGradeFilter] = useState("")
  const [schoolFilter, setSchoolFilter] = useState("")
  const [wardFilter, setWardFilter] = useState("")
  const [schoolWardPairFilter, setSchoolWardPairFilter] = useState("")
  const [duplicateEmailFilter, setDuplicateEmailFilter] = useState(false)
  const [emailValidityFilter, setEmailValidityFilter] = useState<'all' | 'valid' | 'invalid'>('all')
  const [schoolValidityFilter, setSchoolValidityFilter] = useState<'all' | 'valid' | 'invalid_empty'>('all')
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>()
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>()

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  const [sortField, setSortField] = useState<
    "schoolWard" | "school" | "ward" | "total" | "unique" | "duplicates" | "duplicateRate"
  >("total")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [tableSortField, setTableSortField] = useState<
    "ID" | "studentName" | "parentOfStudentName" | "grade" | "className" | "email" | "phone" | "schoolName" | "ward"
  >("ID")
  const [tableSortDirection, setTableSortDirection] = useState<"asc" | "desc">("asc")

  // Duplicate data tracking
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([])

  const filterOptions = useMemo(() => {
    const grades = Array.from(new Set(deals.map((d) => d.grade).filter(Boolean))).sort()
    const schools = Array.from(new Set(deals.map((d) => d.schoolName).filter(Boolean))).sort()
    const wards = Array.from(new Set(deals.map((d) => d.ward).filter(Boolean))).sort()
    const schoolWardPairs = Array.from(
      new Set(deals.filter((d) => d.schoolName && d.ward).map((d) => `${d.schoolName} - ${d.ward}`)),
    ).sort()

    return { grades, schools, wards, schoolWardPairs }
  }, [deals])

  const metrics = useMemo(() => {
    const total = filteredDeals.length
    const withContact = filteredDeals.filter((d) => (d.email && d.email.trim()) || (d.phone && d.phone.trim())).length
    const noContact = total - withContact

    return { total, withContact, noContact }
  }, [filteredDeals])

  useEffect(() => {
    let filtered = deals

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (deal) =>
          (deal.studentName || "").toLowerCase().includes(query) ||
          (deal.parentOfStudentName || "").toLowerCase().includes(query) ||
          (deal.email || "").toLowerCase().includes(query) ||
          (deal.phone || "").toLowerCase().includes(query),
      )
    }

    if (gradeFilter && gradeFilter !== "all") {
      filtered = filtered.filter((deal) => deal.grade === gradeFilter)
    }

    if (schoolWardPairFilter && schoolWardPairFilter !== "all") {
      const [selectedSchool, selectedWard] = schoolWardPairFilter.split(" - ")
      filtered = filtered.filter((deal) => deal.schoolName === selectedSchool && deal.ward === selectedWard)
    } else {
      if (schoolFilter && schoolFilter !== "all") {
        filtered = filtered.filter((deal) => deal.schoolName === schoolFilter)
      }
      if (wardFilter && wardFilter !== "all") {
        filtered = filtered.filter((deal) => deal.ward === wardFilter)
      }
    }

    if (duplicateEmailFilter) {
      const emailCounts = deals.reduce((acc: Record<string, number>, deal) => {
        const email = deal.email?.trim().toLowerCase()
        if (email) {
          acc[email] = (acc[email] || 0) + 1
        }
        return acc
      }, {})

      filtered = filtered.filter((deal) => {
        const email = deal.email?.trim().toLowerCase()
        return email && emailCounts[email] > 1
      })
    }

    if (emailValidityFilter === 'valid') {
      filtered = filtered.filter((deal) => {
        const email = deal.email?.trim()
        return email && isValidEmail(email)
      })
    } else if (emailValidityFilter === 'invalid') {
      filtered = filtered.filter((deal) => {
        const email = deal.email?.trim()
        return email && !isValidEmail(email)
      })
    }

    if (schoolValidityFilter === 'valid') {
      filtered = filtered.filter((deal) => {
        return !!deal.schoolName
      })
    } else if (schoolValidityFilter === 'invalid_empty') {
      filtered = filtered.filter((deal) => {
        return !deal.schoolName
      })
    }

    // Date filtering
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter((deal) => {
        if (!deal.DATE_CREATE) return false

        try {
          // Parse the date string "2025-09-15T11:44:52+07:00"
          const dealDate = new Date(deal.DATE_CREATE)
          if (isNaN(dealDate.getTime())) return false

          if (startDateFilter) {
            const start = new Date(startDateFilter)
            start.setHours(0, 0, 0, 0)
            if (dealDate < start) return false
          }

          if (endDateFilter) {
            const end = new Date(endDateFilter)
            end.setHours(23, 59, 59, 999)
            if (dealDate > end) return false
          }

          return true
        } catch (error) {
          console.error("Error parsing date:", deal.DATE_CREATE, error)
          return false
        }
      })
    }

    setFilteredDeals(filtered)
    setCurrentPage(1)
  }, [deals, searchQuery, gradeFilter, schoolFilter, wardFilter, schoolWardPairFilter, duplicateEmailFilter, emailValidityFilter, schoolValidityFilter, startDateFilter, endDateFilter])

  useEffect(() => {
    if (isInitialLoad) {
      fetchDeals()
      setIsInitialLoad(false)
    }
  }, [isInitialLoad])

  const fetchDeals = async () => {
    setLoading(true)
    setLoadingProgress(0)
    setLoadingMessage("Đang kết nối tới CRM...")

    try {
      setLoadingProgress(10)
      setLoadingMessage("Đang lấy dữ liệu cơ bản...")

      const basicResponse = await fetch("/api/deals/basic")
      const basicResult = await basicResponse.json()

      setLoadingProgress(30)
      setLoadingMessage("Đang xử lý dữ liệu...")

      if (basicResult.success) {
        setDeals(basicResult.data)
        onDataLoad?.(basicResult.data)

        setLoadingProgress(60)
        setLoadingMessage("Đang tính toán analytics...")

        if (basicResult.data.length > 0) {
          const analyticsRes = await fetch("/api/deals/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: basicResult.data }),
          })

          setLoadingProgress(80)
          setLoadingMessage("Đang hoàn thiện...")

          const analyticsResult = await analyticsRes.json()
          if (analyticsResult.success) {
            setAnalytics(analyticsResult.analytics)
          }
        }

        setLoadingProgress(100)
        setLoadingMessage("Hoàn tất!")

        setTimeout(() => {
          setLoadingMessage("")
        }, 1000)
      } else {
        console.error("Error fetching basic deals:", basicResult.error)
        setLoadingMessage("Lỗi khi lấy dữ liệu")
      }
    } catch (error) {
      console.error("Error fetching deals:", error)
      setLoadingMessage("Lỗi kết nối")
    } finally {
      setLoading(false)
      setTimeout(() => {
        setLoadingProgress(0)
      }, 2000)
    }
  }

  const loadSampleData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sample" }),
      })
      const result = await response.json()

      if (result.success) {
        setDeals(result.data)
        onDataLoad?.(result.data)
      }
    } catch (error) {
      console.error("Error loading sample data:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setGradeFilter("")
    setSchoolFilter("")
    setWardFilter("")
    setSchoolWardPairFilter("")
    setDuplicateEmailFilter(false)
    setEmailValidityFilter('all')
    setSchoolValidityFilter('all')
    setStartDateFilter(undefined)
    setEndDateFilter(undefined)
    setCurrentPage(1)
  }

  const clearData = () => {
    setDeals([])
    setFilteredDeals([])
    setAnalytics(null)
    clearFilters()
  }

  const sortedFilteredDeals = useMemo(() => {
    const sorted = [...filteredDeals].sort((a, b) => {
      let aValue = a[tableSortField] || ""
      let bValue = b[tableSortField] || ""

      // Convert to lowercase for string comparison
      if (typeof aValue === "string") aValue = aValue.toLowerCase()
      if (typeof bValue === "string") bValue = bValue.toLowerCase()

      if (tableSortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    return sorted
  }, [filteredDeals, tableSortField, tableSortDirection])

  const totalPages = Math.ceil(sortedFilteredDeals.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDeals = sortedFilteredDeals.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const chartData = useMemo(() => {
    if (!analytics) return null

    const gradeContactMatrix = Object.entries(analytics.gradeStats)
      .map(([grade, total]) => {
        const gradeDeals = deals.filter((d) => d.grade === grade)
        const withContact = gradeDeals.filter((d) => (d.email && d.email.trim()) || (d.phone && d.phone.trim())).length
        return {
          grade,
          total: total as number,
          withContact,
          withoutContact: (total as number) - withContact,
          contactRate: total ? ((withContact / (total as number)) * 100).toFixed(1) : 0,
        }
      })
      .sort((a, b) => a.grade.localeCompare(b.grade))

    const schoolWardCombos = deals.reduce((acc: Record<string, number>, deal) => {
      if (deal.schoolName && deal.ward) {
        const key = `${deal.schoolName}-${deal.ward}`
        acc[key] = (acc[key] || 0) + 1
      }
      return acc
    }, {})

    const contactCount = deals.filter((d) => (d.email && d.email.trim()) || (d.phone && d.phone.trim())).length

    console.log("[v0] School-ward combos calculated:", Object.keys(schoolWardCombos).length, "combos")

    const dailyDeals = deals.reduce((acc: Record<string, number>, deal) => {
      if (deal.DATE_CREATE) {
        try {
          // Handle different date formats: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss"
          let dateStr = deal.DATE_CREATE

          // Extract date part only
          if (dateStr.includes(" ")) {
            dateStr = dateStr.split(" ")[0]
          } else if (dateStr.includes("T")) {
            dateStr = dateStr.split("T")[0]
          }

          // Validate date format (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            acc[dateStr] = (acc[dateStr] || 0) + 1
          }
        } catch (error) {
          console.log("[v0] Error parsing date:", deal.DATE_CREATE)
        }
      }
      return acc
    }, {})

    const dailyDealsData = Object.entries(dailyDeals)
      .map(([date, count]) => {
        try {
          const dateObj = new Date(date + "T00:00:00") // Add time to avoid timezone issues
          return {
            date,
            deals: count,
            formattedDate: format(dateObj, "dd/MM"),
            sortDate: dateObj.getTime(),
          }
        } catch (error) {
          console.log("[v0] Error formatting date:", date)
          return null
        }
      })
      .filter(Boolean) // Remove null entries
      .sort((a: any, b: any) => a.sortDate - b.sortDate) // Sort by actual date
      .slice(-30) // Show last 30 days

    console.log("[v0] Daily deals data calculated:", dailyDealsData.length, "days")
    console.log("[v0] Sample daily data:", dailyDealsData.slice(0, 3))

    const schoolWardAnalysis = deals.reduce((acc: any, deal) => {
      if (deal.schoolName && deal.ward) {
        const key = `${deal.schoolName} - ${deal.ward}`
        if (!acc[key]) {
          acc[key] = {
            schoolWard: key,
            school: deal.schoolName,
            ward: deal.ward,
            total: 0,
            duplicates: 0,
            unique: 0,
            students: new Set(),
            duplicateStudents: new Set(),
          }
        }

        acc[key].total += 1

        // Check for duplicates based on student name or parent name
        const studentKey = deal.studentName?.trim().toLowerCase() || deal.parentOfStudentName?.trim().toLowerCase()
        if (studentKey) {
          if (acc[key].students.has(studentKey)) {
            acc[key].duplicates += 1
            acc[key].duplicateStudents.add(studentKey)
          } else {
            acc[key].students.add(studentKey)
            acc[key].unique += 1
          }
        } else {
          acc[key].unique += 1
        }
      }
      return acc
    }, {})

    const schoolWardDuplicateData = Object.values(schoolWardAnalysis)
      .map((item: any) => ({
        schoolWard: item.schoolWard,
        school: item.school,
        ward: item.ward,
        total: item.total,
        duplicates: item.duplicates,
        unique: item.unique,
        duplicateRate: item.total > 0 ? ((item.duplicates / item.total) * 100).toFixed(1) : 0,
      }))
      .filter((item: any) => item.total >= 3) // Only show pairs with at least 3 students
      .sort((a: any, b: any) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Convert string numbers to actual numbers for numeric fields
        if (sortField === "duplicateRate") {
          aValue = Number.parseFloat(aValue)
          bValue = Number.parseFloat(bValue)
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })

    return {
      gradeData: Object.entries(analytics.gradeStats)
        .map(([grade, count]) => ({ name: grade, value: count }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 10),
      contactData: [
        { name: "Có thông tin liên hệ", value: contactCount, fill: "#82ca9d" },
        { name: "Không có thông tin liên hệ", value: deals.length - contactCount, fill: "#ffc658" },
      ],
      schoolWardDuplicateData,
      dailyDealsData,
    }
  }, [analytics, deals, sortField, sortDirection])

  const exportToCSV = () => {
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

  const exportToJSON = () => {
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

  const exportToExcel = () => {
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

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const renderSortableHeader = (field: typeof sortField, label: string, align: "left" | "right" = "left") => (
    <th
      className={`p-3 font-medium cursor-pointer hover:bg-muted/30 select-none ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
        {label}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4" />
        )}
      </div>
    </th>
  )

  const handleTableSort = (field: typeof tableSortField) => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === "asc" ? "desc" : "asc")
    } else {
      setTableSortField(field)
      setTableSortDirection("asc")
    }
  }

  const renderTableSortableHeader = (field: typeof tableSortField, label: string) => (
    <th
      className="text-left p-2 font-medium cursor-pointer hover:bg-muted/30 select-none"
      onClick={() => handleTableSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {tableSortField === field ? (
          tableSortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4 opacity-30">
            <ChevronUp className="h-3 w-3" />
          </div>
        )}
      </div>
    </th>
  )

  // Group duplicates by name and email (normalized)
  const duplicateData = useMemo(() => {
    const duplicateGroups: Record<string, { name: string; email: string; count: number; deals: Deal[] }> = {}

    filteredDeals.forEach((deal) => {
      const studentName = normalizeText(deal.studentName)
      const parentName = normalizeText(deal.parentOfStudentName)
      const email = deal.email?.trim().toLowerCase() || ""

      // Use whichever name is available (student name takes precedence)
      const normalizedName = studentName || parentName

      if (normalizedName) {
        const key = `${normalizedName}:::${email}`

        if (!duplicateGroups[key]) {
          duplicateGroups[key] = {
            name: normalizedName,
            email,
            count: 0,
            deals: []
          }
        }

        duplicateGroups[key].count += 1
        duplicateGroups[key].deals.push(deal)
      }
    })

    // Only include groups with duplicates (count > 1)
    return Object.values(duplicateGroups)
      .filter((group) => group.count > 1)
      .sort((a, b) => b.count - a.count) // Sort by count descending
  }, [filteredDeals, normalizeText])

  const deleteDuplicateDeal = (dealId: string) => {
    setDeals(prev => prev.filter(deal => deal.ID !== dealId))
  }

  return (
    <div className="space-y-6">
      {loading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-900">{loadingMessage}</span>
                  <span className="text-sm text-blue-700">{loadingProgress}%</span>
                </div>
                <Progress value={loadingProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Deals Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            {deals.length > 0
              ? `Phân tích chi tiết ${deals.length} deals từ CRM với 20 API calls song song`
              : "Phân tích chi tiết dữ liệu deals từ CRM với 20 API calls song song"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={fetchDeals} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang tải..." : "Fetch từ CRM"}
          </Button>
          <Button variant="outline" onClick={loadSampleData} disabled={loading}>
            Load Sample
          </Button>
          {filteredDeals.length > 0 && (
            <>
              <Button variant="outline" onClick={exportToCSV} className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportToJSON} className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
              <Button variant="outline" onClick={exportToExcel} className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </>
          )}
          <Button variant="outline" onClick={clearData}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Enhanced Metrics with Icons */}
      {deals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{metrics.total}</div>
                  <p className="text-sm text-muted-foreground">Tổng deals</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{metrics.withContact}</div>
                  <p className="text-sm text-muted-foreground">Có thông tin liên hệ</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{metrics.noContact}</div>
                  <p className="text-sm text-muted-foreground">Thiếu thông tin liên hệ</p>
                </div>
                <X className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {metrics.total > 0 ? ((metrics.withContact / metrics.total) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ có contact</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && deals.length === 0 && (
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu</h3>
              <p className="text-gray-500 mb-4">Dữ liệu sẽ được tự động tải khi vào trang</p>
              <Button onClick={fetchDeals} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Tải lại dữ liệu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {deals.length > 0 && (
        <Tabs defaultValue="filters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="filters" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Bộ lọc & Tìm kiếm
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Biểu đồ phân tích
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Bảng dữ liệu
            </TabsTrigger>
          </TabsList>

          {/* Filters Tab */}
          <TabsContent value="filters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bộ lọc dữ liệu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tìm kiếm</label>
                    <input
                      type="text"
                      placeholder="Tên học sinh, phụ huynh, email, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Khối</label>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khối" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả khối</SelectItem>
                        {filterOptions.grades.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trường - Phường</label>
                    <Select value={schoolWardPairFilter} onValueChange={setSchoolWardPairFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trường - phường" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trường - phường</SelectItem>
                        {filterOptions.schoolWardPairs.slice(0, 50).map((pair) => (
                          <SelectItem key={pair} value={pair}>
                            {pair}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trường học</label>
                    <Select
                      value={schoolFilter}
                      onValueChange={setSchoolFilter}
                      disabled={!!schoolWardPairFilter && schoolWardPairFilter !== "all"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trường" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trường</SelectItem>
                        {filterOptions.schools.slice(0, 20).map((school) => (
                          <SelectItem key={school} value={school}>
                            {school}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phường/Quận</label>
                    <Select
                      value={wardFilter}
                      onValueChange={setWardFilter}
                      disabled={!!schoolWardPairFilter && schoolWardPairFilter !== "all"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phường/quận" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả phường/quận</SelectItem>
                        {filterOptions.wards.slice(0, 20).map((ward) => (
                          <SelectItem key={ward} value={ward}>
                            {ward}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lọc theo email</label>
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                      <input
                        type="checkbox"
                        id="duplicateEmail"
                        checked={duplicateEmailFilter}
                        onChange={(e) => setDuplicateEmailFilter(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor="duplicateEmail" className="text-sm cursor-pointer">
                        Chỉ hiện email bị trùng
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email hợp lệ</label>
                    <Select value={emailValidityFilter} onValueChange={(value) => setEmailValidityFilter(value as 'all' | 'valid' | 'invalid')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Hiện tất cả</SelectItem>
                        <SelectItem value="valid">Chỉ hiện email hợp lệ</SelectItem>
                        <SelectItem value="invalid">Chỉ hiện email không hợp lệ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trường hợp lệ</label>
                    <Select value={schoolValidityFilter} onValueChange={(value) => setSchoolValidityFilter(value as 'all' | 'valid' | 'invalid_empty')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Hiện tất cả</SelectItem>
                        <SelectItem value="valid">Chỉ hiện trường hợp lệ</SelectItem>
                        <SelectItem value="invalid_empty">Chỉ hiện trường không hợp lệ hoặc trống</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Từ ngày</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[280px] justify-start text-left font-normal",
                            !startDateFilter && "text-muted-foreground"
                          )}
                          data-empty={!startDateFilter}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDateFilter ? format(startDateFilter, "PPP") : <span>Chọn ngày bắt đầu</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={startDateFilter} onSelect={setStartDateFilter} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Đến ngày</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[280px] justify-start text-left font-normal",
                            !endDateFilter && "text-muted-foreground"
                          )}
                          data-empty={!endDateFilter}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDateFilter ? format(endDateFilter, "PPP") : <span>Chọn ngày kết thúc</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={endDateFilter} onSelect={setEndDateFilter} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={clearFilters} size="sm" className="w-fit bg-transparent">
                    <X className="h-4 w-4 mr-2" />
                    Xóa bộ lọc
                  </Button>

                  {(searchQuery ||
                    gradeFilter ||
                    schoolFilter ||
                    wardFilter ||
                    schoolWardPairFilter ||
                    duplicateEmailFilter ||
                    emailValidityFilter !== 'all' ||
                    schoolValidityFilter !== 'all' ||
                    startDateFilter ||
                    endDateFilter) && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground font-medium">Đang lọc:</span>
                      {schoolWardPairFilter && schoolWardPairFilter !== "all" && (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                          {schoolWardPairFilter}
                        </span>
                      )}
                      {gradeFilter && gradeFilter !== "all" && (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                          Khối {gradeFilter}
                        </span>
                      )}
                      {!schoolWardPairFilter && schoolFilter && schoolFilter !== "all" && (
                        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">
                          {schoolFilter}
                        </span>
                      )}
                      {!schoolWardPairFilter && wardFilter && wardFilter !== "all" && (
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                          {wardFilter}
                        </span>
                      )}
                      {duplicateEmailFilter && (
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                          Email trùng lặp
                        </span>
                      )}
                      {emailValidityFilter === 'valid' && (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                          Email hợp lệ
                        </span>
                      )}
                      {emailValidityFilter === 'invalid' && (
                        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">
                          Email không hợp lệ
                        </span>
                      )}
                      {schoolValidityFilter === 'valid' && (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                          Trường hợp lệ
                        </span>
                      )}
                      {schoolValidityFilter === 'invalid_empty' && (
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                          Trường không hợp lệ hoặc trống
                        </span>
                      )}
                      {searchQuery && (
                        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
                          "{searchQuery}"
                        </span>
                      )}
                      {startDateFilter && (
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium">
                          Từ {format(startDateFilter, "dd/MM/yyyy")}
                        </span>
                      )}
                      {endDateFilter && (
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium">
                          Đến {format(endDateFilter, "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            {chartData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Xu hướng deals theo ngày (30 ngày gần nhất)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={chartData.dailyDealsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="formattedDate"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={11}
                          interval={Math.max(0, Math.floor(chartData.dailyDealsData.length / 10))}
                        />
                        <YAxis />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0]?.payload
                              return (
                                <div className="bg-white p-3 border rounded shadow">
                                  <p className="font-medium">{label}</p>
                                  <p className="text-blue-600">Số deals: {data?.deals}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="deals" fill="#3b82f6" name="Số deals" />
                        <Line
                          type="monotone"
                          dataKey="deals"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                          name="Xu hướng"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* School-ward duplicate analysis chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Phân tích trùng lặp theo cặp Trường - Phường
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={500}>
                      <ComposedChart data={chartData.schoolWardDuplicateData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="schoolWard"
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          fontSize={10}
                          interval={0}
                        />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0]?.payload
                              return (
                                <div className="bg-white p-3 border rounded shadow">
                                  <p className="font-medium">{label}</p>
                                  <p>Tổng: {data?.total}</p>
                                  <p>Duy nhất: {data?.unique}</p>
                                  <p>Trùng lặp: {data?.duplicates}</p>
                                  <p>Tỷ lệ trùng: {data?.duplicateRate}%</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar yAxisId="left" dataKey="total" fill="#8884d8" name="Tổng" />
                        <Bar yAxisId="left" dataKey="unique" fill="#82ca9d" name="Duy nhất" />
                        <Bar yAxisId="left" dataKey="duplicates" fill="#ff7300" name="Trùng lặp" />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="duplicateRate"
                          stroke="#ff0000"
                          strokeWidth={2}
                          name="Tỷ lệ trùng %"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* School-ward deals summary table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Bảng tổng hợp Trường - Phường
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">STT</th>
                            {renderSortableHeader("school", "Trường học")}
                            {renderSortableHeader("ward", "Phường/Quận")}
                            {renderSortableHeader("total", "Tổng deals", "right")}
                            {renderSortableHeader("unique", "Duy nhất", "right")}
                            {renderSortableHeader("duplicates", "Trùng lặp", "right")}
                            {renderSortableHeader("duplicateRate", "Tỷ lệ trùng", "right")}
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.schoolWardDuplicateData.map((item: any, index: number) => (
                            <tr key={item.schoolWard} className="border-b hover:bg-muted/30">
                              <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                              <td className="p-3 text-sm font-medium">{item.school}</td>
                              <td className="p-3 text-sm">{item.ward}</td>
                              <td className="p-3 text-sm text-right font-medium">{item.total}</td>
                              <td className="p-3 text-sm text-right text-green-600">{item.unique}</td>
                              <td className="p-3 text-sm text-right text-orange-600">{item.duplicates}</td>
                              <td className="p-3 text-sm text-right">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    Number.parseFloat(item.duplicateRate) > 20
                                      ? "bg-red-100 text-red-800"
                                      : Number.parseFloat(item.duplicateRate) > 10
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {item.duplicateRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {chartData.schoolWardDuplicateData.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">Không có dữ liệu để hiển thị</div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Table Tab */}
          <TabsContent value="table" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Danh sách deals ({filteredDeals.length} kết quả)</CardTitle>
                  <div className="flex items-center gap-2">
                    {filteredDeals.length > 0 && (
                      <>
                        <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1 bg-transparent">
                          <Download className="h-3 w-3" />
                          CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToJSON} className="gap-1 bg-transparent">
                          <Download className="h-3 w-3" />
                          JSON
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1 bg-transparent">
                          <Download className="h-3 w-3" />
                          Excel
                        </Button>
                      </>
                    )}
                    <span className="text-sm text-muted-foreground">Hiển thị:</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">/ trang</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {renderTableSortableHeader("ID", "ID")}
                        {renderTableSortableHeader("studentName", "Học sinh")}
                        {renderTableSortableHeader("parentOfStudentName", "Tên phụ huynh")}
                        {renderTableSortableHeader("grade", "Khối")}
                        {renderTableSortableHeader("className", "Lớp")}
                        {renderTableSortableHeader("email", "Email")}
                        {renderTableSortableHeader("phone", "Phone")}
                        {renderTableSortableHeader("schoolName", "Trường")}
                        {renderTableSortableHeader("ward", "Phường/Quận")}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDeals.map((deal) => (
                        <tr key={deal.ID} className="border-b hover:bg-muted/50">
                          <td className="p-2 text-sm">{deal.ID}</td>
                          <td className="p-2 text-sm">{deal.studentName || "-"}</td>
                          <td className="p-2 text-sm">{deal.parentOfStudentName || "-"}</td>
                          <td className="p-2 text-sm">{deal.grade || "-"}</td>
                          <td className="p-2 text-sm">{deal.className || "-"}</td>
                          <td className="p-2 text-sm">{deal.email || "-"}</td>
                          <td className="p-2 text-sm">{deal.phone || "-"}</td>
                          <td className="p-2 text-sm">{deal.schoolName || "-"}</td>
                          <td className="p-2 text-sm">{deal.ward || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, sortedFilteredDeals.length)} của{" "}
                      {sortedFilteredDeals.length} kết quả
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Trước
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Sau
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Duplicate Data Table */}
            {duplicateData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Dữ liệu trùng lặp ({duplicateData.reduce((acc, group) => acc + group.deals.length, 0)} bản ghi trùng)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {duplicateData.map((group, groupIndex) => (
                      <div key={`${group.name}:::${group.email}`} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">Tên trùng:</span>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                {group.name}
                              </span>
                            </div>
                            {group.email && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">Email trùng:</span>
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                                  {group.email}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-muted-foreground">
                              ({group.count} bản ghi)
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left p-2 font-medium text-sm">ID</th>
                                <th className="text-left p-2 font-medium text-sm">Học sinh</th>
                                <th className="text-left p-2 font-medium text-sm">Tên phụ huynh</th>
                                <th className="text-left p-2 font-medium text-sm">Khối</th>
                                <th className="text-left p-2 font-medium text-sm">Lớp</th>
                                <th className="text-left p-2 font-medium text-sm">Phone</th>
                                <th className="text-left p-2 font-medium text-sm">Trường</th>
                                <th className="text-left p-2 font-medium text-sm">Phường/Quận</th>
                                <th className="text-left p-2 font-medium text-sm">Ngày tạo</th>
                                <th className="text-center p-2 font-medium text-sm">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.deals.map((deal, index) => (
                                <tr key={deal.ID} className="border-b hover:bg-muted/20">
                                  <td className="p-2 text-sm">{deal.ID}</td>
                                  <td className="p-2 text-sm">{deal.studentName || "-"}</td>
                                  <td className="p-2 text-sm">{deal.parentOfStudentName || "-"}</td>
                                  <td className="p-2 text-sm">{deal.grade || "-"}</td>
                                  <td className="p-2 text-sm">{deal.className || "-"}</td>
                                  <td className="p-2 text-sm">{deal.phone || "-"}</td>
                                  <td className="p-2 text-sm">{deal.schoolName || "-"}</td>
                                  <td className="p-2 text-sm">{deal.ward || "-"}</td>
                                  <td className="p-2 text-sm">{deal.DATE_CREATE ? new Date(deal.DATE_CREATE).toLocaleDateString('vi-VN') : "-"}</td>
                                  <td className="p-2 text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteDuplicateDeal(deal.ID)}
                                      className="h-8 px-2 text-xs hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Xóa
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
