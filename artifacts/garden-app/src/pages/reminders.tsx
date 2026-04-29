import { useState } from "react";
import { format, isToday, isTomorrow, isPast, isFuture } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListReminders,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
  useCompleteReminder,
  getListRemindersQueryKey,
  useListGarden,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Clock, Droplets, Leaf, Search, Calendar, ShieldAlert, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const reminderSchema = z.object({
  gardenPlantId: z.coerce.number().min(1, "Select a plant"),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["water", "fertilize", "prune", "inspect", "other"] as const),
  scheduledAt: z.string().min(1, "Date is required"),
  repeatDays: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export default function Reminders() {
  const [filter, setFilter] = useState<"all" | "upcoming">("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: garden } = useListGarden();
  const { data: reminders, isLoading } = useListReminders({ upcoming: filter === "upcoming" });

  const createReminder = useCreateReminder();
  const completeReminder = useCompleteReminder();
  const deleteReminder = useDeleteReminder();

  const form = useForm<z.infer<typeof reminderSchema>>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      gardenPlantId: 0,
      title: "",
      type: "water",
      scheduledAt: new Date().toISOString().split('T')[0],
      repeatDays: 0,
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof reminderSchema>) => {
    try {
      await createReminder.mutateAsync({ data: values });
      queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
      toast({ title: "Reminder created", description: "Your reminder has been scheduled." });
      setIsAddOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ title: "Failed to create", description: e.message, variant: "destructive" });
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeReminder.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
      toast({ title: "Task completed", description: "Great job taking care of your plants!" });
    } catch (e: any) {
      toast({ title: "Failed to complete", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteReminder.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
      toast({ title: "Reminder deleted" });
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };

  const todayReminders = reminders?.filter(r => !r.completed && isToday(new Date(r.scheduledAt)) || (isPast(new Date(r.scheduledAt)) && !r.completed)) || [];
  const upcomingReminders = reminders?.filter(r => !r.completed && isFuture(new Date(r.scheduledAt)) && !isToday(new Date(r.scheduledAt))) || [];
  const completedReminders = reminders?.filter(r => r.completed) || [];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Reminders</h1>
            <p className="text-muted-foreground mt-1">Keep track of what your garden needs.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                Add Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule a Task</DialogTitle>
                <DialogDescription>Set a reminder for watering, fertilizing, or other care.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="gardenPlantId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plant</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select plant..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {garden?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.nickname}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Task Title</FormLabel><FormControl><Input placeholder="e.g. Water thoroughly" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="water">Water</SelectItem>
                            <SelectItem value="fertilize">Fertilize</SelectItem>
                            <SelectItem value="prune">Prune</SelectItem>
                            <SelectItem value="inspect">Inspect</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="repeatDays" render={({ field }) => (
                    <FormItem><FormLabel>Repeat every (days, 0 for once)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Input placeholder="Optional details..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createReminder.isPending}>
                      {createReminder.isPending ? "Saving..." : "Save Reminder"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="today">Today & Overdue</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="space-y-4">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : todayReminders.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-card-border border-dashed">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-serif font-bold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">You have no pending tasks for today.</p>
              </div>
            ) : (
              todayReminders.map(reminder => (
                <ReminderCard 
                  key={reminder.id} 
                  reminder={reminder} 
                  onComplete={() => handleComplete(reminder.id)}
                  onDelete={() => handleDelete(reminder.id)}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : upcomingReminders.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-card-border border-dashed">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-serif font-bold mb-2">No upcoming tasks</h3>
                <p className="text-muted-foreground">Your schedule is clear.</p>
              </div>
            ) : (
              upcomingReminders.map(reminder => (
                <ReminderCard 
                  key={reminder.id} 
                  reminder={reminder} 
                  onComplete={() => handleComplete(reminder.id)}
                  onDelete={() => handleDelete(reminder.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : completedReminders.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-card-border border-dashed">
                <p className="text-muted-foreground">No completed tasks yet.</p>
              </div>
            ) : (
              completedReminders.map(reminder => (
                <ReminderCard 
                  key={reminder.id} 
                  reminder={reminder} 
                  onComplete={() => handleComplete(reminder.id)}
                  onDelete={() => handleDelete(reminder.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function ReminderCard({ reminder, onComplete, onDelete }: { reminder: any, onComplete: () => void, onDelete: () => void }) {
  const getIcon = () => {
    switch (reminder.type) {
      case 'water': return <Droplets className="h-5 w-5 text-blue-500" />;
      case 'fertilize': return <Leaf className="h-5 w-5 text-green-500" />;
      case 'inspect': return <Search className="h-5 w-5 text-orange-500" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const overdue = isPast(new Date(reminder.scheduledAt)) && !isToday(new Date(reminder.scheduledAt)) && !reminder.completed;

  return (
    <Card className={`overflow-hidden transition-all ${reminder.completed ? 'opacity-60 bg-muted/50' : 'hover-elevate'}`}>
      <div className="flex items-center p-4 gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          className={`rounded-full flex-shrink-0 ${reminder.completed ? 'bg-green-500 text-white border-green-500 hover:bg-green-600 hover:text-white' : ''}`}
          onClick={onComplete}
          disabled={reminder.completed}
        >
          <CheckCircle2 className={`h-5 w-5 ${reminder.completed ? '' : 'text-muted-foreground hover:text-green-500'}`} />
        </Button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getIcon()}
            <p className={`font-medium truncate ${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
              {reminder.title}
            </p>
            {overdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase tracking-wider">Overdue</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {reminder.gardenPlantNickname && (
              <span className="font-medium text-primary">
                {reminder.gardenPlantNickname}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(reminder.scheduledAt), "MMM d, yyyy")}
            </span>
            {reminder.repeatDays > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Repeats ({reminder.repeatDays}d)
              </span>
            )}
          </div>
          {reminder.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">{reminder.notes}</p>
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete this reminder.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
