'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts'
import * as XLSX from 'sheetjs-style'


interface SalesReport {
  school: string
  issued: number
  loggedIn: number
  totalRequests: number
  unprocessed: number
}

interface Student {
  id: number
  name: string
  username: string
  email: string
  phone: string
  class: string
  createdAt: string
  login_count: number
  last_login_at: string | null
}

interface StudentsData {
  success: boolean
  school: string
  students: Student[]
}

interface ReportData {
  success: boolean
  data: SalesReport[]
  summary: {
    totalSchools: number
    totalAccounts: number
    totalLoggedIn: number
    totalNeverLoggedIn: number
  }
}

export function SalesReport() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedView, setSelectedView] = useState('Tổng quan')
  const [studentsData, setStudentsData] = useState<StudentsData | null>(null)
  const [isStudentsLoading, setIsStudentsLoading] = useState(false)
  const [studentsSearch, setStudentsSearch] = useState('')

  useEffect(() => {
    fetch('/api/reports/sales')
      .then(response => response.json())
      .then(data => {
        setData(data)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    if (selectedView !== 'Tổng quan') {
      setStudentsSearch('') // Clear search when switching schools
      setIsStudentsLoading(true)
      fetch(`/api/reports/sales?school=${encodeURIComponent(selectedView)}`)
        .then(response => response.json())
        .then(students => {
          setStudentsData(students)
          setIsStudentsLoading(false)
        })
        .catch(err => {
          console.error('Error fetching students:', err)
          setIsStudentsLoading(false)
        })
    }
  }, [selectedView])

  const filteredData = useMemo(() => {
    if (!data) return []
    return data.data.filter(item =>
      (item.school || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  const filteredStudents = useMemo(() => {
    if (!studentsData || !studentsData.success) return []
    return studentsData.students.filter(student =>
      (student.name || "").toLowerCase().includes(studentsSearch.toLowerCase()) ||
      (student.username || "").toLowerCase().includes(studentsSearch.toLowerCase()) ||
      (student.email || "").toLowerCase().includes(studentsSearch.toLowerCase()) ||
      (student.class || "").toLowerCase().includes(studentsSearch.toLowerCase())
    )
  }, [studentsData, studentsSearch])

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

  // Export schools data to Excel
  const exportSchoolsToExcel = () => {
    if (!filteredData || filteredData.length === 0) return

    const excelData = filteredData.map((item, index) => ({
      "STT": index + 1,
      "Tên Trường": item.school || "",
      "Tài Khoản Đã Cấp": item.issued || 0,
      "Đã Đăng Nhập": item.loggedIn || 0,
      "Tổng Yêu Cầu": item.totalRequests || 0,
      "Chưa Xử Lý": item.unprocessed || 0,
    })) as Record<string, string | number>[]

    const ws = XLSX.utils.json_to_sheet(excelData)

    const colWidths = [
      { wch: 6 }, // STT
      { wch: 25 }, // Tên Trường
      { wch: 15 }, // Tài Khoản Đã Cấp
      { wch: 12 }, // Đã Đăng Nhập
      { wch: 12 }, // Tổng Yêu Cầu
      { wch: 12 }, // Chưa Xử Lý
    ]
    ws['!cols'] = colWidths

    // Style the sheet
    styleSheetHeaderAndBorder(ws)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách trường học")

    const fileName = `bao-cao-truong-hoc-${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Export students data to Excel
  const exportStudentsToExcel = () => {
    if (!filteredStudents || filteredStudents.length === 0) return

    const excelData = filteredStudents.map((student) => ({
      "ID": student.id || "",
      "Tên": student.name || "",
      "Username": student.username || "",
      "Email": student.email || "",
      "Số Điện Thoại": student.phone || "",
      "Lớp": student.class || "",
      "Số Lần Đăng Nhập": student.login_count || 0,
      "Đăng Nhập Cuối": student.last_login_at ? formatVietnamDateTime(student.last_login_at) : "Chưa đăng nhập",
      "Ngày Tạo": formatVietnamDateTime(student.createdAt),
    })) as Record<string, string | number>[]

    const ws = XLSX.utils.json_to_sheet(excelData)

    const colWidths = [
      { wch: 10 }, // ID
      { wch: 20 }, // Tên
      { wch: 20 }, // Username
      { wch: 30 }, // Email
      { wch: 15 }, // Số Điện Thoại
      { wch: 15 }, // Lớp
      { wch: 15 }, // Số Lần Đăng Nhập
      { wch: 20 }, // Đăng Nhập Cuối
      { wch: 20 }, // Ngày Tạo
    ]
    ws['!cols'] = colWidths

    // Style the sheet
    styleSheetHeaderAndBorder(ws)

    const wb = XLSX.utils.book_new()
    const sheetName = `Học viên ${selectedView}`.substring(0, 31) // Excel sheet names max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const fileName = `danh-sach-hoc-vien-${selectedView}-${new Date().toISOString().split("T")[0]}.xlsx`
      .replace(/[^a-z0-9\-_.]/gi, '_')
    XLSX.writeFile(wb, fileName)
  }

  // Helper function to style sheet header and border (copied from export-utils)
  const styleSheetHeaderAndBorder = (ws: XLSX.WorkSheet) => {
    if (!ws["!ref"]) return ws

    const range = XLSX.utils.decode_range(ws["!ref"])
    const headerRow = range.s.r

    const purpleFill = {
      patternType: "solid",
      fgColor: { rgb: "800080" },
    }
    const whiteFont = { color: { rgb: "FFFFFF" }, bold: true }
    const thinBorder = {
      top: { style: "thin", color: { auto: 1 } },
      bottom: { style: "thin", color: { auto: 1 } },
      left: { style: "thin", color: { auto: 1 } },
      right: { style: "thin", color: { auto: 1 } },
    }

    // Header
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: C })
      const cell = ws[cellAddress]
      if (cell) {
        cell.s = {
          fill: purpleFill,
          font: whiteFont,
          border: thinBorder,
          alignment: { horizontal: "center", vertical: "center" },
        }
      }
    }

    // Các ô còn lại: border
    for (let R = headerRow + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = ws[cellAddress]
        if (cell) {
          // nếu cell đã có style header thì merge, còn lại chỉ border
          cell.s = { ...(cell.s || {}), border: thinBorder }
        }
      }
    }

    return ws
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải báo cáo...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Lỗi: {error}</div>
      </div>
    )
  }

  if (!data || !data.success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Không thể tải dữ liệu báo cáo</div>
      </div>
    )
  }

  const totalAccounts = data.summary.totalAccounts
  const totalSchools = data.summary.totalSchools
  const totalLoggedIn = data.summary.totalLoggedIn
  const totalNeverLoggedIn = data.summary.totalNeverLoggedIn

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Báo Cáo Kinh Doanh - Tài Khoản Đã Cấp</h1>
        <p className="text-gray-600 mt-1">Thống kê số lượng tài khoản đã cấp theo trường học</p>
      </div>

      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="charts">Biểu Đồ</TabsTrigger>
          <TabsTrigger value="list">Danh Sách</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Trường Học</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSchools}</div>
                <p className="text-xs text-muted-foreground">
                  Trường có trong hệ thống
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Tài Khoản Đã Cấp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAccounts}</div>
                <p className="text-xs text-muted-foreground">
                  Tổng số tài khoản đã phát hành
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tài Khoản Đã Đăng Nhập</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLoggedIn}</div>
                <p className="text-xs text-muted-foreground">
                  Số tài khoản đã đăng nhập ít nhất 1 lần
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chưa Từng Đăng Nhập</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalNeverLoggedIn}</div>
                <p className="text-xs text-muted-foreground">
                  Tài khoản chưa đăng nhập lần nào (last_login_ip is null)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Tình Trạng Đăng Nhập</CardTitle>
                <CardDescription>Tỉ lệ tài khoản đã đăng nhập</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Đã Đăng Nhập', value: totalLoggedIn, fill: '#10b981' },
                        { name: 'Chưa Đăng Nhập', value: totalAccounts - totalLoggedIn, fill: '#e5e7eb' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Số Tài Khoản Đã Cấp Theo Trường</CardTitle>
                <CardDescription>Top các trường có nhiều tài khoản nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.data.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="school"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(label) => label} />
                    <Bar dataKey="issued" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chi Tiết Theo Trường</CardTitle>
                <CardDescription>So sánh tài khoản đã cấp vs đã đăng nhập</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data.data.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="school"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="issued" stackId="a" fill="#3b82f6" name="Đã Cấp" />
                    <Bar dataKey="loggedIn" stackId="b" fill="#10b981" name="Đã Đăng Nhập" />
                    <Line type="monotone" dataKey="unprocessed" stroke="#ef4444" strokeWidth={2} name="Chưa Xử Lý" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chi Tiết Theo Trường</CardTitle>
                  <CardDescription>
                    {selectedView === 'Tổng quan' ? 'Danh sách tổng quan các trường' : `Danh sách học viên trường ${selectedView}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={selectedView === 'Tổng quan' ? exportSchoolsToExcel : exportStudentsToExcel}
                    disabled={(selectedView === 'Tổng quan' ? filteredData : filteredStudents)?.length === 0}
                    variant="outline"
                  >
                    Xuất Excel
                  </Button>
                  <Select value={selectedView} onValueChange={setSelectedView}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Chọn trường" />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tổng quan">Tổng quan</SelectItem>
                    {data.data.map((item) => (
                      <SelectItem key={item.school} value={item.school}>
                        {item.school}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedView === 'Tổng quan' ? (
                <>
                  <div className="mb-4">
                    <Input
                      placeholder="Tìm kiếm trường học..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên Trường</TableHead>
                        <TableHead className="text-right">Tài Khoản Đã Cấp</TableHead>
                        <TableHead className="text-right">Đã Đăng Nhập</TableHead>
                        <TableHead className="text-right">Tổng Yêu Cầu</TableHead>
                        <TableHead className="text-right">Chưa Xử Lý</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.school}</TableCell>
                          <TableCell className="text-right">{item.issued}</TableCell>
                          <TableCell className="text-right">{item.loggedIn}</TableCell>
                          <TableCell className="text-right">{item.totalRequests}</TableCell>
                          <TableCell className="text-right">{item.unprocessed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <>
                  {isStudentsLoading ? (
                    <div className="text-center py-8">Đang tải danh sách học viên...</div>
                  ) : studentsData && studentsData.success ? (
                    <>
                      <div className="mb-4">
                        <Input
                          placeholder="Tìm kiếm học viên (tên, username, email, lớp)..."
                          value={studentsSearch}
                          onChange={(e) => setStudentsSearch(e.target.value)}
                          className="max-w-sm"
                        />
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Tên</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Số Điện Thoại</TableHead>
                            <TableHead>Lớp</TableHead>
                            <TableHead>Số Lần Đăng Nhập</TableHead>
                            <TableHead>Đăng Nhập Cuối</TableHead>
                            <TableHead>Ngày Tạo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>{student.id}</TableCell>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{student.username}</TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>{student.phone}</TableCell>
                              <TableCell>{student.class}</TableCell>
                              <TableCell className="text-right">{student.login_count}</TableCell>
                              <TableCell>{student.last_login_at ? new Date(student.last_login_at).toLocaleDateString('vi-VN') : 'Chưa đăng nhập'}</TableCell>
                              <TableCell>{new Date(student.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  ) : (
                    <div className="text-center py-8">Không có dữ liệu học viên</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
