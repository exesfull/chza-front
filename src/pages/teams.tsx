export function TeamsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Мои команды</h1>
        <p className="text-sm text-muted-foreground">Управление командами и участниками</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["Acme Inc", "Acme Corp.", "Evil Corp."].map((team) => (
          <div key={team} className="rounded-lg border p-4">
            <h3 className="font-medium">{team}</h3>
            <p className="text-sm text-muted-foreground">5 участников</p>
          </div>
        ))}
      </div>
    </div>
  )
}
