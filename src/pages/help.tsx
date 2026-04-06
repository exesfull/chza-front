export function HelpPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Помощь</h1>
        <p className="text-sm text-muted-foreground">Документация и поддержка</p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Документация</h3>
          <p className="text-sm text-muted-foreground">Руководства и примеры использования</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">FAQ</h3>
          <p className="text-sm text-muted-foreground">Часто задаваемые вопросы</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Поддержка</h3>
          <p className="text-sm text-muted-foreground">Связаться с нами</p>
        </div>
      </div>
    </div>
  )
}
