"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

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

interface ChartsSectionProps {
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

export function ChartsSection({ data }: ChartsSectionProps) {
  const chartData = useMemo(() => {
    // Grade distribution
    const gradeMap = new Map<string, number>()
    data.forEach((deal) => {
      const grade = deal.grade || "(Không xác định)"
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1)
    })
    const gradeData = Array.from(gradeMap.entries())
      .map(([grade, count]) => ({ name: grade, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)

    // Ward distribution (top 10)
    const wardMap = new Map<string, number>()
    data.forEach((deal) => {
      const ward = deal.ward || "(Không xác định)"
      wardMap.set(ward, (wardMap.get(ward) || 0) + 1)
    })
    const wardData = Array.from(wardMap.entries())
      .map(([ward, count]) => ({ name: ward, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // School distribution (top 10)
    const schoolMap = new Map<string, number>()
    data.forEach((deal) => {
      const school = deal.schoolName || "(Không xác định)"
      schoolMap.set(school, (schoolMap.get(school) || 0) + 1)
    })
    const schoolData = Array.from(schoolMap.entries())
      .map(([school, count]) => ({ name: school, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // Timeline by month
    const monthMap = new Map<string, number>()
    data.forEach((deal) => {
      if (deal.DATE_CREATE) {
        const date = new Date(deal.DATE_CREATE)
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1)
        }
      }
    })
    const timelineData = Array.from(monthMap.entries())
      .map(([month, count]) => ({ name: month, value: count }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Contact status
    const withContact = data.filter((d) => (d.email && d.email.trim()) || (d.phone && d.phone.trim())).length
    const withoutContact = data.length - withContact
    const contactData = [
      { name: "Có thông tin liên hệ", value: withContact },
      { name: "Thiếu thông tin liên hệ", value: withoutContact },
    ]

    return {
      gradeData,
      wardData,
      schoolData,
      timelineData,
      contactData,
    }
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`${label}: ${payload[0].value}`}</p>
        </div>
      )
    }
    return null
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null // Don't show labels for slices smaller than 5%

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (data.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Biểu đồ phân tích</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grade Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Phân bố theo khối</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.gradeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Contact Status */}
          <Card>
            <CardHeader>
              <CardTitle>Tình trạng thông tin liên hệ</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.contactData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.contactData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#00C49F" : "#FF8042"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ward Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 phường/quận</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.wardData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => (percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : "")}
                  >
                    {chartData.wardData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* School Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 trường học</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.schoolData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Chart */}
        {chartData.timelineData.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Xu hướng theo thời gian (theo tháng)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} fontSize={12} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884D8"
                    strokeWidth={2}
                    dot={{ fill: "#8884D8", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Summary Statistics */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Thống kê tổng quan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{chartData.gradeData.length}</div>
                <div className="text-sm text-muted-foreground">Số khối khác nhau</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{chartData.schoolData.length}</div>
                <div className="text-sm text-muted-foreground">Số trường khác nhau</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{chartData.wardData.length}</div>
                <div className="text-sm text-muted-foreground">Số phường/quận khác nhau</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {(((chartData.contactData[0]?.value || 0) / data.length) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Tỷ lệ có thông tin liên hệ</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
