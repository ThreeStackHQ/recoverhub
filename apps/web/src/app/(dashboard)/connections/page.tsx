export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Stripe Connections
      </h1>
      <p className="text-muted-foreground">
        Connect your Stripe account to start recovering failed payments.
      </p>
      
      {/* Connection UI will be added in Sprint 1.7 (Stripe Connection UI) */}
      <div className="text-center py-12 border rounded-lg">
        <p className="text-sm text-muted-foreground">
          Connect Stripe button placeholder (Sprint 1.7)
        </p>
      </div>
    </div>
  )
}
