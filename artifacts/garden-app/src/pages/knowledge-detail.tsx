import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetCatalogPlant,
  getGetCatalogPlantQueryKey,
  useAddGardenPlant,
  getListGardenQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Leaf, ArrowLeft, Plus, Droplet, Sun, Thermometer, Box, PlayCircle, BookOpen } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const addPlantSchema = z.object({
  nickname: z.string().min(1, "Nickname is required"),
  location: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
});

export default function KnowledgeDetail() {
  const [, params] = useRoute("/knowledge/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: plant, isLoading } = useGetCatalogPlant(id, {
    query: { enabled: !!id, queryKey: getGetCatalogPlantQueryKey(id) }
  });

  const addPlant = useAddGardenPlant();

  const form = useForm<z.infer<typeof addPlantSchema>>({
    resolver: zodResolver(addPlantSchema),
    values: {
      nickname: plant?.commonName || "",
      location: "",
      notes: "",
    },
  });

  const onAddPlant = async (values: z.infer<typeof addPlantSchema>) => {
    if (!plant) return;
    try {
      await addPlant.mutateAsync({
        data: {
          catalogPlantId: plant.id,
          ...values
        }
      });
      queryClient.invalidateQueries({ queryKey: getListGardenQueryKey() });
      toast({ title: "Plant added", description: `${values.nickname} has been added to your garden.` });
      setIsAddOpen(false);
      setLocation("/garden");
    } catch (e: any) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
            <Skeleton className="h-96 rounded-xl" />
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
          <Button onClick={() => setLocation("/knowledge")} className="mt-4" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Knowledge
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-8">
        <Button variant="ghost" onClick={() => setLocation("/knowledge")} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Knowledge
        </Button>

        <div className="relative rounded-2xl overflow-hidden bg-card border border-card-border shadow-sm">
          <div className="h-64 md:h-80 w-full relative">
            <img src={plant.imageUrl} alt={plant.commonName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white w-full">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary hover:bg-primary/90">{plant.category}</Badge>
                    <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0">
                      {plant.difficulty} to grow
                    </Badge>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-serif font-bold mb-1">{plant.commonName}</h1>
                  <p className="text-white/80 italic text-lg">{plant.scientificName}</p>
                </div>
                
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="shrink-0 bg-white text-primary hover:bg-white/90">
                      <Plus className="h-5 w-5 mr-2" /> Add to Garden
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add {plant.commonName} to Garden</DialogTitle>
                      <DialogDescription>Give it a nickname and location to start tracking it.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onAddPlant)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="nickname" render={({ field }) => (
                          <FormItem><FormLabel>Nickname</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="location" render={({ field }) => (
                          <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g. Living Room, Patio" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
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
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section className="bg-card p-6 md:p-8 rounded-2xl border border-card-border">
              <h2 className="text-2xl font-serif font-bold mb-4">About</h2>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground">
                <p>{plant.description || plant.summary}</p>
              </div>
            </section>

            {plant.articles && plant.articles.length > 0 && (
              <section>
                <h3 className="text-xl font-serif font-bold mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-500" /> Further Reading</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {plant.articles.map((article, i) => (
                    <a key={i} href={article.url} target="_blank" rel="noreferrer">
                      <Card className="hover-elevate cursor-pointer h-full">
                        <CardHeader>
                          <CardTitle className="text-base leading-tight">{article.title}</CardTitle>
                          <CardDescription>{article.source}</CardDescription>
                        </CardHeader>
                      </Card>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {plant.videos && plant.videos.length > 0 && (
              <section>
                <h3 className="text-xl font-serif font-bold mb-4 flex items-center gap-2"><PlayCircle className="h-5 w-5 text-red-500" /> Video Guides</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {plant.videos.map((video, i) => (
                    <a key={i} href={video.url} target="_blank" rel="noreferrer" className="group block">
                      <div className="aspect-video bg-muted rounded-xl overflow-hidden relative mb-2 border border-border">
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                          <PlayCircle className="h-12 w-12 text-white drop-shadow-md" />
                        </div>
                        {video.durationSeconds && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, '0')}
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{video.title}</p>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Care Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-blue-500/10 p-3 rounded-xl shrink-0"><Droplet className="h-6 w-6 text-blue-500" /></div>
                  <div>
                    <h4 className="font-medium text-sm">Watering</h4>
                    <p className="text-muted-foreground text-sm mt-1">Every {plant.waterFrequencyDays} days</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="bg-orange-500/10 p-3 rounded-xl shrink-0"><Sun className="h-6 w-6 text-orange-500" /></div>
                  <div>
                    <h4 className="font-medium text-sm">Sunlight</h4>
                    <p className="text-muted-foreground text-sm mt-1">{plant.sunlight || 'Moderate indirect light'}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-red-500/10 p-3 rounded-xl shrink-0"><Thermometer className="h-6 w-6 text-red-500" /></div>
                  <div>
                    <h4 className="font-medium text-sm">Ideal Temperature</h4>
                    <p className="text-muted-foreground text-sm mt-1">{plant.idealTemperatureC || '18-24'} °C</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-stone-500/10 p-3 rounded-xl shrink-0"><Box className="h-6 w-6 text-stone-500" /></div>
                  <div>
                    <h4 className="font-medium text-sm">Soil Type</h4>
                    <p className="text-muted-foreground text-sm mt-1">{plant.soilType || 'Well-draining potting mix'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
