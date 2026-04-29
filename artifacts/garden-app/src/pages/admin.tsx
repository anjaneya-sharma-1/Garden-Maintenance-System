import { useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useAdminStats,
  useAdminListUsers,
  useAdminDeleteUser,
  useAdminListCatalog,
  useAdminCreateCatalogPlant,
  useAdminUpdateCatalogPlant,
  useAdminDeleteCatalogPlant,
  getAdminStatsQueryKey,
  getAdminListUsersQueryKey,
  getAdminListCatalogQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { Users, Sprout, Leaf, Bell, Droplet, Plus, Trash2, Edit2, ShieldAlert } from "lucide-react";
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

const catalogSchema = z.object({
  commonName: z.string().min(1, "Common name is required"),
  scientificName: z.string().min(1, "Scientific name is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["easy", "medium", "hard"] as const),
  imageUrl: z.string().url("Must be a valid URL"),
  summary: z.string().min(1, "Summary is required"),
  description: z.string().min(1, "Description is required"),
  sunlight: z.string().min(1, "Sunlight is required"),
  waterFrequencyDays: z.coerce.number().min(1, "Water frequency is required"),
  idealTemperatureC: z.string().min(1, "Temperature is required"),
  soilType: z.string().min(1, "Soil type is required"),
});

export default function Admin() {
  const [activeTab, setActiveTab] = useState("stats");

  return (
    <Layout>
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage system settings, users, and catalog data.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="stats">System Stats</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="catalog">Plant Catalog</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats">
            <AdminStatsTab />
          </TabsContent>
          
          <TabsContent value="users">
            <AdminUsersTab />
          </TabsContent>
          
          <TabsContent value="catalog">
            <AdminCatalogTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function AdminStatsTab() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-full"><Users className="h-6 w-6 text-primary" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold font-serif">{stats?.totalUsers || 0}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-green-500/10 p-4 rounded-full"><Sprout className="h-6 w-6 text-green-500" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Catalog Plants</p>
            <p className="text-3xl font-bold font-serif">{stats?.totalCatalogPlants || 0}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-full"><Leaf className="h-6 w-6 text-emerald-500" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">User Garden Plants</p>
            <p className="text-3xl font-bold font-serif">{stats?.totalGardenPlants || 0}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-orange-500/10 p-4 rounded-full"><Bell className="h-6 w-6 text-orange-500" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Reminders</p>
            <p className="text-3xl font-bold font-serif">{stats?.totalReminders || 0}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-blue-500/10 p-4 rounded-full"><Droplet className="h-6 w-6 text-blue-500" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Watering Logs</p>
            <p className="text-3xl font-bold font-serif">{stats?.totalWateringLogs || 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminUsersTab() {
  const { data: users, isLoading } = useAdminListUsers();
  const deleteUser = useAdminDeleteUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number) => {
    try {
      await deleteUser.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminStatsQueryKey() });
      toast({ title: "User deleted" });
    } catch (e: any) {
      toast({ title: "Failed to delete user", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">User Management</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plants</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-xs">{user.id}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{user.plantCount}</TableCell>
                  <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    {user.role !== 'admin' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the user ({user.email}) and all their data.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AdminCatalogTab() {
  const { data: catalog, isLoading } = useAdminListCatalog();
  const createPlant = useAdminCreateCatalogPlant();
  const updatePlant = useAdminUpdateCatalogPlant();
  const deletePlant = useAdminDeleteCatalogPlant();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<any>(null);

  const form = useForm<z.infer<typeof catalogSchema>>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      commonName: "",
      scientificName: "",
      category: "",
      difficulty: "medium",
      imageUrl: "",
      summary: "",
      description: "",
      sunlight: "Moderate indirect light",
      waterFrequencyDays: 7,
      idealTemperatureC: "18-24",
      soilType: "Well-draining potting mix",
    },
  });

  const onSubmit = async (values: z.infer<typeof catalogSchema>) => {
    try {
      if (editingPlant) {
        await updatePlant.mutateAsync({ id: editingPlant.id, data: values });
        toast({ title: "Plant updated" });
      } else {
        await createPlant.mutateAsync({ data: values });
        toast({ title: "Plant added to catalog" });
      }
      queryClient.invalidateQueries({ queryKey: getAdminListCatalogQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminStatsQueryKey() });
      setIsAddOpen(false);
      setEditingPlant(null);
      form.reset();
    } catch (e: any) {
      toast({ title: "Operation failed", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (plant: any) => {
    setEditingPlant(plant);
    form.reset({
      commonName: plant.commonName,
      scientificName: plant.scientificName,
      category: plant.category,
      difficulty: plant.difficulty,
      imageUrl: plant.imageUrl,
      summary: plant.summary,
      description: plant.description,
      sunlight: plant.sunlight,
      waterFrequencyDays: plant.waterFrequencyDays,
      idealTemperatureC: plant.idealTemperatureC,
      soilType: plant.soilType,
    });
    setIsAddOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePlant.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getAdminListCatalogQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminStatsQueryKey() });
      toast({ title: "Plant deleted from catalog" });
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-serif">Catalog Management</CardTitle>
          <CardDescription>Add, update, or remove plants from the global database.</CardDescription>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setEditingPlant(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Plant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlant ? 'Edit Catalog Plant' : 'Add New Catalog Plant'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="commonName" render={({ field }) => (
                    <FormItem><FormLabel>Common Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="scientificName" render={({ field }) => (
                    <FormItem><FormLabel>Scientific Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g. Houseplant" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="difficulty" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="summary" render={({ field }) => (
                  <FormItem><FormLabel>Short Summary</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Full Description</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="sunlight" render={({ field }) => (
                    <FormItem><FormLabel>Sunlight</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="waterFrequencyDays" render={({ field }) => (
                    <FormItem><FormLabel>Water Frequency (Days)</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="idealTemperatureC" render={({ field }) => (
                    <FormItem><FormLabel>Ideal Temp (°C)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="soilType" render={({ field }) => (
                    <FormItem><FormLabel>Soil Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createPlant.isPending || updatePlant.isPending}>
                    {createPlant.isPending || updatePlant.isPending ? "Saving..." : "Save Plant"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog?.map((plant: any) => (
                <TableRow key={plant.id}>
                  <TableCell className="font-mono text-xs">{plant.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md overflow-hidden bg-muted">
                        <img src={plant.imageUrl} alt={plant.commonName} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium">{plant.commonName}</p>
                        <p className="text-xs text-muted-foreground italic">{plant.scientificName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{plant.category}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase
                      ${plant.difficulty === 'easy' ? 'bg-green-500/20 text-green-900' :
                        plant.difficulty === 'medium' ? 'bg-orange-500/20 text-orange-900' :
                        'bg-red-500/20 text-red-900'}`}
                    >
                      {plant.difficulty}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plant)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {plant.commonName}?</AlertDialogTitle>
                          <AlertDialogDescription>This will remove the plant from the global catalog.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(plant.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
