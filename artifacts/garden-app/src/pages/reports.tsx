import { format } from "date-fns";
import { 
  useGetWateringReport,
  useListWateringLogs,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Droplet, Droplets, Leaf } from "lucide-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Reports() {
  const { data: report, isLoading: isReportLoading } = useGetWateringReport();
  const { data: logs, isLoading: isLogsLoading } = useListWateringLogs();

  return (
    <Layout>
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Watering Reports</h1>
          <p className="text-muted-foreground mt-1">Track your garden's hydration over time.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-blue-500/10 p-4 rounded-full">
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Water Used (30d)</p>
                {isReportLoading ? <Skeleton className="h-8 w-24 mt-1" /> : (
                  <p className="text-3xl font-bold font-serif text-blue-700 dark:text-blue-400">
                    {(report?.totalAmountMl || 0) / 1000}L
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-green-500/10 p-4 rounded-full">
                <Leaf className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Watering Events (30d)</p>
                {isReportLoading ? <Skeleton className="h-8 w-24 mt-1" /> : (
                  <p className="text-3xl font-bold font-serif text-green-700 dark:text-green-400">
                    {report?.totalEvents || 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Daily Water Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {isReportLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : report?.dailyTotals && report.dailyTotals.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.dailyTotals}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(val) => format(new Date(val), "MMM d")} 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12} 
                          tickLine={false} 
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(val) => `${val}ml`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                          labelFormatter={(val) => format(new Date(val), "MMMM d, yyyy")}
                          formatter={(value) => [`${value}ml`, "Amount"]}
                        />
                        <Bar dataKey="amountMl" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No data available for the selected period.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Usage by Plant</CardTitle>
              </CardHeader>
              <CardContent>
                {isReportLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : report?.perPlant && report.perPlant.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plant</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.perPlant.map(plant => (
                        <TableRow key={plant.gardenPlantId}>
                          <TableCell className="font-medium">{plant.nickname}</TableCell>
                          <TableCell className="text-right">{plant.events}</TableCell>
                          <TableCell className="text-right">{plant.amountMl}ml</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No plant data available.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="font-serif">Watering Log</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {isLogsLoading ? (
                  <div className="space-y-4">
                    {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : logs && logs.length > 0 ? (
                  <div className="space-y-4">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="text-sm font-medium">{log.gardenPlantNickname}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{format(new Date(log.wateredAt), "MMM d, h:mm a")}</span>
                            <span>•</span>
                            <span className="capitalize">{log.source}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 text-sm">
                          <Droplet className="h-3 w-3" />
                          {log.amountMl}ml
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No watering logs found.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
