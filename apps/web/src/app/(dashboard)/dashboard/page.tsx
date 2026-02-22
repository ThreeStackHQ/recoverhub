export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Dashboard
      </h1>
      <p className="text-muted-foreground">
        Recovery stats and failed payments will appear here.
      </p>
      
      {/* Dashboard content will be added in Sprint 2.5 (Recovery Dashboard UI) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 border rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Total Recovered MRR</h3>
          <p className="text-2xl font-bold mt-2">$0</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Success Rate</h3>
          <p className="text-2xl font-bold mt-2">0%</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Active Failed Payments</h3>
          <p className="text-2xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  )
}
