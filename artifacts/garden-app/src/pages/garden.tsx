import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListGarden, 
  useListCatalogPlants,
  useAddGardenPlant,
  getListGardenQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Leaf, Search, MapPin, Droplet, ThermometerSun } from "lucide-react";
import Layout from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

const addPlantSchema = z.object({
  catalogPlantId: z.coerce.number().min(1, "Please select a plant"),
  nickname: z.string().min(1, "Nickname is required"),
  location: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
});

export default function Garden() {
  const { data: garden, isLoading } = useListGarden();
  const { data: catalog } = useListCatalogPlants();
  const addPlant = useAddGardenPlant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof addPlantSchema>>({
    resolver: zodResolver(addPlantSchema),
    defaultValues: {
      catalogPlantId: 0,
      nickname: "",
      location: "",
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof addPlantSchema>) => {
    try {
      await addPlant.mutateAsync({ data: values });
      queryClient.invalidateQueries({ queryKey: getListGardenQueryKey() });
      toast({
        title: "Plant added",
        description: `${values.nickname} is now in your garden!`,
      });
      setIsAddOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed to add plant",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredGarden = garden?.filter(p => 
    p.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.catalogPlant.commonName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">My Garden</h1>
            <p className="text-muted-foreground mt-1">Manage and track your growing collection.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                Add Plant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add a New Plant</DialogTitle>
                <DialogDescription>
                  Choose a plant from our catalog and give it a home in your garden.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="catalogPlantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plant Species</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a plant..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {catalog?.map(cp => (
                              <SelectItem key={cp.id} value={cp.id.toString()}>
                                {cp.commonName} <span className="text-muted-foreground">({cp.scientificName})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nickname</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Fernie" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Living Room Window" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Any special instructions?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={addPlant.isPending}>
                      {addPlant.isPending ? "Adding..." : "Add to Garden"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search your garden..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full rounded-none" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGarden?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-card-border border-dashed">
            <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-2">Your garden is empty</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm 
                ? "No plants match your search. Try a different term." 
                : "Start building your green oasis by adding your first plant."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsAddOpen(true)}>Add Your First Plant</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGarden?.map((plant) => (
              <Link key={plant.id} href={`/garden/${plant.id}`}>
                <Card className="overflow-hidden hover-elevate cursor-pointer transition-all hover:border-primary/50 group h-full flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img 
                      src={plant.catalogPlant.imageUrl} 
                      alt={plant.nickname}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {plant.healthStatus && (
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md shadow-sm border border-white/20
                          ${plant.healthStatus === 'thriving' ? 'bg-green-500/20 text-green-900 dark:text-green-100' :
                            plant.healthStatus === 'healthy' ? 'bg-blue-500/20 text-blue-900 dark:text-blue-100' :
                            plant.healthStatus === 'watch' ? 'bg-orange-500/20 text-orange-900 dark:text-orange-100' :
                            'bg-red-500/20 text-red-900 dark:text-red-100'
                          }`}
                        >
                          {plant.healthStatus.charAt(0).toUpperCase() + plant.healthStatus.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5 flex flex-col flex-1">
                    <h3 className="text-xl font-bold font-serif mb-1 group-hover:text-primary transition-colors">{plant.nickname}</h3>
                    <p className="text-sm text-muted-foreground italic mb-4">{plant.catalogPlant.commonName}</p>
                    
                    <div className="mt-auto space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{plant.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplet className="h-4 w-4 shrink-0" />
                        <span>Water every {plant.catalogPlant.waterFrequencyDays} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
