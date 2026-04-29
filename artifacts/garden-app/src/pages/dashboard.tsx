import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, isToday, isTomorrow } from "date-fns";
import { 
  useGetDashboardSummary, 
  useGetRecentActivity, 
  useListReminders,
  useListGarden,
  useCompleteReminder,
  getListRemindersQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Droplets, ThermometerSun, Leaf, AlertCircle, Clock, CheckCircle } from "lucide-react";
import Layout from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();
  const { data: reminders, isLoading: isLoadingReminders } = useListReminders({ upcoming: true });
  const { data: garden, isLoading: isLoadingGarden } = useListGarden();
  const completeReminder = useCompleteReminder();
  const queryClient = useQueryClient();

  const handleCompleteReminder = async (id: number) => {
    await completeReminder.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const renderSummaryCards = () => {
    if (isLoadingSummary) {
      return Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />);
    }
    
    return (
      <>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Total Plants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-primary">{summary?.totalPlants || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.healthyPlants || 0} healthy
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-destructive">{summary?.plantsNeedingAttention || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Review their health status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold">{summary?.dueRemindersToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.overdueReminders || 0} overdue tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Watered This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-green-600">{summary?.wateredThisWeek || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep up the good work
            </p>
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <Layout>
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-primary">Good Morning</h1>
          <p className="text-muted-foreground mt-2 text-lg">Here's what's happening in your garden today.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {renderSummaryCards()}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-serif font-bold">Today's Tasks</h2>
                <Link href="/reminders" className="text-sm text-primary hover:underline">View all</Link>
              </div>
              
              <div className="space-y-3">
                {isLoadingReminders ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                ) : reminders?.length === 0 ? (
                  <div className="text-center py-8 bg-card rounded-xl border border-card-border">
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                    <p className="font-medium text-foreground">All caught up!</p>
                    <p className="text-sm text-muted-foreground">Your garden is fully tended to.</p>
                  </div>
                ) : (
                  reminders?.slice(0, 5).map((reminder) => (
                    <Card key={reminder.id} className="overflow-hidden">
                      <div className="flex items-center p-4 gap-4">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="rounded-full flex-shrink-0"
                          onClick={() => handleCompleteReminder(reminder.id)}
                          disabled={completeReminder.isPending}
                        >
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground hover:text-green-500 transition-colors" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{reminder.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {reminder.gardenPlantNickname && (
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {reminder.gardenPlantNickname}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(reminder.scheduledAt), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-serif font-bold">Quick Access</h2>
                <Link href="/garden" className="text-sm text-primary hover:underline">View garden</Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {isLoadingGarden ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
                ) : garden?.slice(0, 6).map((plant) => (
                  <Link key={plant.id} href={`/garden/${plant.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full transition-all hover:border-primary/50 group">
                      <div className="aspect-square relative overflow-hidden rounded-t-xl bg-muted">
                        <img 
                          src={plant.catalogPlant.imageUrl} 
                          alt={plant.nickname}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-medium truncate">{plant.nickname}</p>
                        <p className="text-xs text-muted-foreground truncate">{plant.catalogPlant.commonName}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-card p-5 rounded-xl border border-card-border">
              <h3 className="font-serif font-bold text-lg mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {isLoadingActivity ? (
                  Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                ) : activity?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                ) : (
                  activity?.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="mt-0.5">
                        {item.kind === 'watering' && <Droplets className="h-4 w-4 text-blue-500" />}
                        {item.kind === 'plant_added' && <Leaf className="h-4 w-4 text-green-500" />}
                        {item.kind === 'reminder' && <Clock className="h-4 w-4 text-orange-500" />}
                        {item.kind === 'care_generated' && <CheckCircle2 className="h-4 w-4 text-purple-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(item.occurredAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
