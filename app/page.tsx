"use client"

import { useState } from "react"
import { DealsAnalytics } from "@/components/deals-analytics"

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

export default function HomePage() {
  const [dealsData, setDealsData] = useState<Deal[]>([])

  const handleDataLoad = (data: Deal[]) => {
    setDealsData(data)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <DealsAnalytics onDataLoad={handleDataLoad} />
      </div>
    </div>
  )
}
