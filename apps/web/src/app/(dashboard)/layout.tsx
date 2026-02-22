export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Sidebar navigation will be added in Sprint 1.5 */}
      <div className="p-8">
        {children}
      </div>
    </div>
  )
}
