"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts"
import { TrendingUp, Users, School, MapPin, Calendar, Phone, Mail, Target, Award } from "lucide-react"

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

interface AdvancedAnalyticsProps {
  data: Deal[]
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
  "#8DD1E1",
  "#D084D0",
]

export function AdvancedAnalytics({ data }: AdvancedAnalyticsProps) {
  const analytics = useMemo(() => {
    if (data.length === 0) return null

    const timeAnalysis = () => {
      const dailyMap = new Map<string, number>()
      const weeklyMap = new Map<string, number>()
      const monthlyMap = new Map<string, number>()

      data.forEach((deal) => {
        if (deal.DATE_CREATE) {
          const date = new Date(deal.DATE_CREATE)
          if (!isNaN(date.getTime())) {
            // Daily
            const dayKey = date.toISOString().split("T")[0]
            dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1)

            // Weekly
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            const weekKey = weekStart.toISOString().split("T")[0]
            weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1)

            // Monthly
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1)
          }
        }
      })

      const dailyData = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count, type: "daily" }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30) // Last 30 days

      const weeklyData = Array.from(weeklyMap.entries())
        .map(([date, count]) => ({ date, count, type: "weekly" }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-12) // Last 12 weeks

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([date, count]) => ({ date, count, type: "monthly" }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return { dailyData, weeklyData, monthlyData }
    }

    const contactQuality = () => {
      const hasEmail = data.filter((d) => d.email && d.email.trim()).length
      const hasPhone = data.filter((d) => d.phone && d.phone.trim()).length
      const hasBoth = data.filter((d) => d.email && d.email.trim() && d.phone && d.phone.trim()).length
      const hasNone =
        data.length - data.filter((d) => (d.email && d.email.trim()) || (d.phone && d.phone.trim())).length

      return [
        { name: "Có cả email & phone", value: hasBoth, color: "#00C49F" },
        { name: "Chỉ có email", value: hasEmail - hasBoth, color: "#0088FE" },
        { name: "Chỉ có phone", value: hasPhone - hasBoth, color: "#FFBB28" },
        { name: "Không có thông tin", value: hasNone, color: "#FF8042" },
      ]
    }

    const geoAnalysis = () => {
      const wardStats = new Map<string, { count: number; schools: Set<string>; grades: Set<string> }>()

      data.forEach((deal) => {
        const ward = deal.ward || "Không xác định"
        if (!wardStats.has(ward)) {
          wardStats.set(ward, { count: 0, schools: new Set(), grades: new Set() })
        }
        const stats = wardStats.get(ward)!
        stats.count++
        if (deal.schoolName) stats.schools.add(deal.schoolName)
        if (deal.grade) stats.grades.add(deal.grade)
      })

      return Array.from(wardStats.entries())
        .map(([ward, stats]) => ({
          ward,
          count: stats.count,
          schools: stats.schools.size,
          grades: stats.grades.size,
          density: stats.count / Math.max(stats.schools.size, 1),
        }))
        .sort((a, b) => b.count - a.count)
    }

    const schoolPerformance = () => {
      const schoolStats = new Map<
        string,
        {
          count: number
          wards: Set<string>
          grades: Set<string>
          contactRate: number
          withContact: number
        }
      >()

      data.forEach((deal) => {
        const school = deal.schoolName || "Không xác định"
        if (!schoolStats.has(school)) {
          schoolStats.set(school, {
            count: 0,
            wards: new Set(),
            grades: new Set(),
            contactRate: 0,
            withContact: 0,
          })
        }
        const stats = schoolStats.get(school)!
        stats.count++
        if (deal.ward) stats.wards.add(deal.ward)
        if (deal.grade) stats.grades.add(deal.grade)
        if ((deal.email && deal.email.trim()) || (deal.phone && deal.phone.trim())) {
          stats.withContact++
        }
      })

      return Array.from(schoolStats.entries())
        .map(([school, stats]) => ({
          school,
          count: stats.count,
          wards: stats.wards.size,
          grades: stats.grades.size,
          contactRate: (stats.withContact / stats.count) * 100,
          withContact: stats.withContact,
        }))
        .sort((a, b) => b.count - a.count)
    }

    const gradeAnalysis = () => {
      const gradeStats = new Map<
        string,
        { count: number; schools: Set<string>; contactRate: number; withContact: number }
      >()

      data.forEach((deal) => {
        const grade = deal.grade || "Không xác định"
        if (!gradeStats.has(grade)) {
          gradeStats.set(grade, { count: 0, schools: new Set(), contactRate: 0, withContact: 0 })
        }
        const stats = gradeStats.get(grade)!
        stats.count++
        if (deal.schoolName) stats.schools.add(deal.schoolName)
        if ((deal.email && deal.email.trim()) || (deal.phone && deal.phone.trim())) {
          stats.withContact++
        }
      })

      return Array.from(gradeStats.entries())
        .map(([grade, stats]) => ({
          grade,
          count: stats.count,
          schools: stats.schools.size,
          contactRate: (stats.withContact / stats.count) * 100,
          percentage: (stats.count / data.length) * 100,
        }))
        .sort((a, b) => b.count - a.count)
    }

    const timeData = timeAnalysis()
    const contactData = contactQuality()
    const geoData = geoAnalysis()
    const schoolData = schoolPerformance()
    const gradeData = gradeAnalysis()

    const kpis = {
      totalDeals: data.length,
      contactRate: (
        (data.filter((d) => (d.email && d.email.trim()) || (d.phone && d.phone.trim())).length / data.length) *
        100
      ).toFixed(1),
      avgDealsPerSchool: (data.length / new Set(data.map((d) => d.schoolName).filter(Boolean)).size).toFixed(1),
      topWard: geoData[0]?.ward || "N/A",
      topSchool: schoolData[0]?.school || "N/A",
      topGrade: gradeData[0]?.grade || "N/A",
    }

    return {
      timeData,
      contactData,
      geoData: geoData.slice(0, 15),
      schoolData: schoolData.slice(0, 15),
      gradeData,
      kpis,
    }
  }, [data])

  if (!analytics || data.length === 0) {
    return null
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`${label}: ${payload[0].value}`}</p>
          {payload[0].payload.contactRate && (
            <p className="text-sm text-muted-foreground">Tỷ lệ liên hệ: {payload[0].payload.contactRate.toFixed(1)}%</p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Phân tích nâng cao & Báo cáo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{analytics.kpis.totalDeals}</div>
                  <p className="text-xs text-muted-foreground">Tổng deals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{analytics.kpis.contactRate}%</div>
                  <p className="text-xs text-muted-foreground">Tỷ lệ liên hệ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{analytics.kpis.avgDealsPerSchool}</div>
                  <p className="text-xs text-muted-foreground">Deals/trường</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-lg font-bold truncate">{analytics.kpis.topGrade}</div>
                  <p className="text-xs text-muted-foreground">Khối hàng đầu</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                <div>
                  <div className="text-lg font-bold truncate">{analytics.kpis.topWard}</div>
                  <p className="text-xs text-muted-foreground">Khu vực hàng đầu</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                <div>
                  <div className="text-lg font-bold truncate">
                    {analytics.kpis.topSchool.split(" ").slice(0, 2).join(" ")}
                  </div>
                  <p className="text-xs text-muted-foreground">Trường hàng đầu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Chất lượng thông tin liên hệ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.contactData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => (percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : "")}
                  >
                    {analytics.contactData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {analytics.contactData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất theo khối học</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analytics.gradeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left" dataKey="count" fill="#0088FE" />
                  <Line yAxisId="right" type="monotone" dataKey="contactRate" stroke="#FF8042" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mật độ theo khu vực (Top 15)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {analytics.geoData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.ward}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.schools} trường • {item.grades} khối
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{item.count}</div>
                      <div className="text-xs text-muted-foreground">Mật độ: {item.density.toFixed(1)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Bảng xếp hạng trường học (Top 15)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {analytics.schoolData.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Badge variant={index < 3 ? "default" : "secondary"} className="min-w-8 justify-center">
                      {index + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.school}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.wards} khu vực • {item.grades} khối
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.count}</div>
                      <div className="text-xs text-muted-foreground">{item.contactRate.toFixed(1)}% liên hệ</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {analytics.timeData.monthlyData.length > 1 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Xu hướng theo thời gian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.timeData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} fontSize={12} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#8884D8" fill="#8884D8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tóm tắt hiệu suất</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="font-medium mb-3">Top 3 khối học</h4>
                <div className="space-y-2">
                  {analytics.gradeData.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{item.grade}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={item.percentage} className="w-16 h-2" />
                        <span className="text-xs text-muted-foreground">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Khu vực tiềm năng</h4>
                <div className="space-y-2">
                  {analytics.geoData.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm truncate">{item.ward}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Trường hàng đầu</h4>
                <div className="space-y-2">
                  {analytics.schoolData.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm truncate">{item.school.split(" ").slice(0, 3).join(" ")}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Chỉ số chất lượng</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tỷ lệ liên hệ</span>
                      <span>{analytics.kpis.contactRate}%</span>
                    </div>
                    <Progress value={Number.parseFloat(analytics.kpis.contactRate)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Phủ sóng trường</span>
                      <span>{new Set(data.map((d) => d.schoolName).filter(Boolean)).size}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Phủ sóng khu vực</span>
                      <span>{new Set(data.map((d) => d.ward).filter(Boolean)).size}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
