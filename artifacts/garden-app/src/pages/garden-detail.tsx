import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetGardenPlant,
  getGetGardenPlantQueryKey,
  useUpdateGardenPlant,
  useDeleteGardenPlant,
  useLogWatering,
  useGetSoilReading,
  getGetSoilReadingQueryKey,
  useGetSoilHistory,
  getGetSoilHistoryQueryKey,
  useGenerateCareRoutine,
  getListGardenQueryKey,
  GardenPlantHealthStatus
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Thermometer, Droplet, Wind, Sun, Beaker, Leaf, Trash2, Edit2, Calendar, ShieldAlert } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const editSchema = z.object({
  nickname: z.string().min(1, "Nickname is required"),
  location: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
  healthStatus: z.enum(["thriving", "healthy", "watch", "struggling"] as const),
});

export default function GardenPlantDetail() {
  const [, params] = useRoute("/garden/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: plant, isLoading: isPlantLoading } = useGetGardenPlant(id, {
    query: { enabled: !!id, queryKey: getGetGardenPlantQueryKey(id) }
  });

  const { data: soil } = useGetSoilReading(id, {
    query: { enabled: !!id, queryKey: getGetSoilReadingQueryKey(id) }
  });

  const { data: soilHistory } = useGetSoilHistory(id, {
    query: { enabled: !!id, queryKey: getGetSoilHistoryQueryKey(id) }
  });

  const updatePlant = useUpdateGardenPlant();
  const deletePlant = useDeleteGardenPlant();
  const logWatering = useLogWatering();
  const generateRoutine = useGenerateCareRoutine();

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: {
      nickname: plant?.nickname || "",
      location: plant?.location || "",
      notes: plant?.notes || "",
      healthStatus: plant?.healthStatus || "healthy",
    },
  });

  const onEdit = async (values: z.infer<typeof editSchema>) => {
    try {
      await updatePlant.mutateAsync({ id, data: values });
      queryClient.invalidateQueries({ queryKey: getGetGardenPlantQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListGardenQueryKey() });
      setIsEditOpen(false);
      toast({ title: "Plant updated" });
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  const onDelete = async () => {
    try {
      await deletePlant.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListGardenQueryKey() });
      toast({ title: "Plant deleted" });
      setLocation("/garden");
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };

  const onWater = async () => {
    try {
      await logWatering.mutateAsync({ data: { gardenPlantId: id, amountMl: 500, source: "manual" } });
      queryClient.invalidateQueries({ queryKey: getGetGardenPlantQueryKey(id) });
      toast({ title: "Watering logged", description: "Your plant says thank you!" });
    } catch (e: any) {
      toast({ title: "Failed to log", description: e.message, variant: "destructive" });
    }
  };

  const onGenerateRoutine = async () => {
    try {
      await generateRoutine.mutateAsync({ data: { gardenPlantId: id } });
      queryClient.invalidateQueries({ queryKey: getGetGardenPlantQueryKey(id) });
      toast({ title: "Routine generated", description: "A custom care routine has been created." });
    } catch (e: any) {
      toast({ title: "Failed to generate", description: e.message, variant: "destructive" });
    }
  };

  if (isPlantLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!plant) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <h2 className="text-2xl font-serif font-bold">Plant not found</h2>
          <Button onClick={() => setLocation("/garden")} className="mt-4">Back to Garden</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden bg-card border border-card-border shadow-sm">
          <div className="absolute inset-0 h-48 bg-gradient-to-br from-primary/20 to-secondary/20" />
          <div className="relative pt-12 px-6 pb-6 sm:px-10 flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-background shadow-md shrink-0">
              <img src={plant.catalogPlant.imageUrl} alt={plant.nickname} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">{plant.nickname}</h1>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium w-fit mx-auto md:mx-0
                  ${plant.healthStatus === 'thriving' ? 'bg-green-500/20 text-green-900 dark:text-green-100' :
                    plant.healthStatus === 'healthy' ? 'bg-blue-500/20 text-blue-900 dark:text-blue-100' :
                    plant.healthStatus === 'watch' ? 'bg-orange-500/20 text-orange-900 dark:text-orange-100' :
                    'bg-red-500/20 text-red-900 dark:text-red-100'}`}
                >
                  {plant.healthStatus ? plant.healthStatus.charAt(0).toUpperCase() + plant.healthStatus.slice(1) : 'Unknown'}
                </span>
              </div>
              <p className="text-lg text-muted-foreground italic mb-2">{plant.catalogPlant.commonName}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Leaf className="h-4 w-4" /> {plant.location}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Planted {format(new Date(plant.plantedAt), "MMM yyyy")}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button size="lg" className="rounded-full shadow-sm" onClick={onWater} disabled={logWatering.isPending}>
                <Droplets className="h-5 w-5 mr-2" />
                Water Now
              </Button>
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Plant</DialogTitle>
                  </DialogHeader>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
                      <FormField control={editForm.control} name="nickname" render={({ field }) => (
                        <FormItem><FormLabel>Nickname</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={editForm.control} name="location" render={({ field }) => (
                        <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={editForm.control} name="healthStatus" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="thriving">Thriving</SelectItem>
                              <SelectItem value="healthy">Healthy</SelectItem>
                              <SelectItem value="watch">Watch</SelectItem>
                              <SelectItem value="struggling">Struggling</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={updatePlant.isPending}>Save Changes</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" className="rounded-full"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {plant.nickname}?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently remove this plant and all its data from your garden.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Soil Monitoring */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-serif">Soil Conditions</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Live sensor readings</p>
                </div>
                {soil && (
                  <span className={`px-2 py-1 rounded text-xs font-medium
                    ${soil.status === 'optimal' ? 'bg-green-500/20 text-green-900' :
                      soil.status === 'watch' ? 'bg-orange-500/20 text-orange-900' :
                      'bg-red-500/20 text-red-900'}`}
                  >
                    {soil.status.toUpperCase()}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {soil ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-muted p-4 rounded-xl text-center">
                      <Thermometer className="h-5 w-5 text-orange-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{soil.temperatureC}°C</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Temp</div>
                    </div>
                    <div className="bg-muted p-4 rounded-xl text-center">
                      <Droplet className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{soil.moisturePct}%</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Moisture</div>
                    </div>
                    <div className="bg-muted p-4 rounded-xl text-center">
                      <Wind className="h-5 w-5 text-teal-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{soil.humidityPct}%</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Humidity</div>
                    </div>
                    <div className="bg-muted p-4 rounded-xl text-center">
                      <Beaker className="h-5 w-5 text-purple-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{soil.ph}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">pH Level</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">No current soil readings.</div>
                )}
                
                {soilHistory && soilHistory.length > 0 && (
                  <div className="h-[250px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={soilHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="recordedAt" tickFormatter={(val) => format(new Date(val), "HH:mm")} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                          labelFormatter={(val) => format(new Date(val), "MMM d, HH:mm")}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="moisturePct" name="Moisture %" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="temperatureC" name="Temp °C" stroke="#f97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Care Routine */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-serif">Care Routine</CardTitle>
                {!plant.careRoutine && (
                  <Button variant="outline" size="sm" onClick={onGenerateRoutine} disabled={generateRoutine.isPending}>
                    {generateRoutine.isPending ? "Generating..." : "Generate Routine"}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {plant.careRoutine ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-4">
                      <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Droplets className="h-4 w-4" /> Water every {plant.careRoutine.wateringFrequencyDays} days ({plant.careRoutine.wateringAmountMl}ml)
                      </div>
                      <div className="bg-secondary/30 text-secondary-foreground px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Sun className="h-4 w-4" /> {plant.careRoutine.sunlight}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground">Specific Tasks</h4>
                      <div className="space-y-3">
                        {plant.careRoutine.tasks.map((task, i) => (
                          <div key={i} className="flex gap-3 p-3 rounded-lg border border-border bg-card">
                            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                              <p className="text-xs font-medium text-primary mt-1">{task.frequency}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">Generated {format(new Date(plant.careRoutine.generatedAt), "MMM d, yyyy")}</p>
                      <Button variant="ghost" size="sm" onClick={onGenerateRoutine} disabled={generateRoutine.isPending}>Regenerate</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShieldAlert className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">No care routine established yet.</p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">Generate a personalized care routine based on this plant's species and your local region.</p>
                    <Button onClick={onGenerateRoutine} disabled={generateRoutine.isPending}>
                      {generateRoutine.isPending ? "Generating..." : "Generate Routine"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Recent Watering */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Recent Watering</CardTitle>
              </CardHeader>
              <CardContent>
                {plant.recentWatering && plant.recentWatering.length > 0 ? (
                  <div className="space-y-4">
                    {plant.recentWatering.map(log => (
                      <div key={log.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-500/10 p-2 rounded-full">
                            <Droplet className="h-4 w-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{format(new Date(log.wateredAt), "MMM d, h:mm a")}</p>
                            <p className="text-xs text-muted-foreground capitalize">{log.source}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">{log.amountMl}ml</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No watering history.</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Reminders */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Upcoming Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                {plant.upcomingReminders && plant.upcomingReminders.length > 0 ? (
                  <div className="space-y-3">
                    {plant.upcomingReminders.map(rem => (
                      <div key={rem.id} className="flex gap-3 p-3 rounded-lg border border-border bg-card">
                        <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{rem.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(rem.scheduledAt), "MMM d")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming reminders.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
