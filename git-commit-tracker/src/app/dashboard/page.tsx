import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Commitline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your commit timeline visualization will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
