'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'


interface SalesReport {
  school: string
  issued: number
  loggedIn: number
  totalRequests: number
  unprocessed: number
}

interface ReportData {
  success: boolean
  data: SalesReport[]
  summary: {
    totalSchools: number
    totalAccounts: number
    totalLoggedIn: number
  }
}

export function SalesReport() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Báo Cáo Kinh Doanh - Tài Khoản Đã Cấp</h1>
        <p className="text-gray-600 mt-1">Thống kê số lượng tài khoản đã cấp theo trường học</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Tổng Tài Khoản Đã Đăng Nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoggedIn}</div>
            <p className="text-xs text-muted-foreground">
              Tổng số tài khoản đã đăng nhập
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chi Tiết Theo Trường</CardTitle>
          <CardDescription>
            Danh sách các trường và số lượng tài khoản đã cấp
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {data.data.map((item, index) => (
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
        </CardContent>
      </Card>
    </div>
  )
}
