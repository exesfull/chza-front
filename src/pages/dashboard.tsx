import { Card, CardHeader, CardDescription, CardTitle, CardAction, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react"

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle>$1,250.00</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Trending up this month
              <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Visitors for the last 6 months</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>New Customers</CardDescription>
            <CardTitle>1,234</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingDown className="size-3" />
                -20%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Down 20% this period
              <TrendingDown className="size-4" />
            </div>
            <div className="text-muted-foreground">Acquisition needs attention</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Active Accounts</CardDescription>
            <CardTitle>45,678</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Strong user retention
              <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Engagement exceed targets</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Growth Rate</CardDescription>
            <CardTitle>4.5%</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +4.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Steady performance increase
              <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Meets growth projections</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
