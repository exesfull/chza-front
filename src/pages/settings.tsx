export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground">Настройки приложения и профиля</p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Профиль</h3>
          <p className="text-sm text-muted-foreground">Управление данными профиля</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Уведомления</h3>
          <p className="text-sm text-muted-foreground">Настройка уведомлений</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Безопасность</h3>
          <p className="text-sm text-muted-foreground">Пароль и двухфакторная аутентификация</p>
        </div>
      </div>
    </div>
  )
}
