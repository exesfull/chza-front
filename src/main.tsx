import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { UserProvider } from "@/hooks/use-user.tsx"
import { TeamsProvider } from "@/hooks/use-teams.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <UserProvider>
        <TeamsProvider>
          <App />
        </TeamsProvider>
      </UserProvider>
    </ThemeProvider>
  </StrictMode>
)
