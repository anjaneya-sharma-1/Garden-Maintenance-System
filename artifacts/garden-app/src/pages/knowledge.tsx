import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListCatalogPlants, 
  useKnowledgeSearch, 
  useAddGardenPlant,
  getListGardenQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, Leaf, PlayCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

export default function Knowledge() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const { toast } = useToast();
  const addPlant = useAddGardenPlant();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const isSearching = debouncedSearch.trim().length > 0;

  const { data: catalog, isLoading: isCatalogLoading } = useListCatalogPlants(undefined, {
    query: { enabled: !isSearching }
  });

  const { data: searchResults, isLoading: isSearchLoading } = useKnowledgeSearch(
    { q: debouncedSearch },
    { query: { enabled: isSearching } }
  );

  const handleAddPlant = async (catalogPlantId: number, nickname: string) => {
    try {
      await addPlant.mutateAsync({
        data: {
          catalogPlantId,
          nickname,
          location: "Indoor",
        }
      });
      queryClient.invalidateQueries({ queryKey: getListGardenQueryKey() });
      toast({ title: "Plant added", description: `${nickname} has been added to your garden.` });
      setLocation("/garden");
    } catch (e: any) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-8">
        <div className="bg-card rounded-2xl p-8 border border-card-border shadow-sm text-center">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Know Any Plant</h1>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Search our extensive database of plants, care guides, and expert articles.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              className="pl-12 h-12 text-lg rounded-xl"
              placeholder="Search for a plant, e.g. Monstera..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isSearching ? (
          <div className="space-y-8">
            <h2 className="text-xl font-serif font-bold">Search Results</h2>
            {isSearchLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : searchResults ? (
              <div className="space-y-10">
                {searchResults.plants.length > 0 && (
                  <section>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Leaf className="h-5 w-5 text-primary" /> Plants</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {searchResults.plants.map(plant => (
                        <PlantCard key={plant.id} plant={plant} onAdd={() => handleAddPlant(plant.id, plant.commonName)} />
                      ))}
                    </div>
                  </section>
                )}

                {searchResults.articles.length > 0 && (
                  <section>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-500" /> Articles</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {searchResults.articles.map((article, i) => (
                        <a key={i} href={article.url} target="_blank" rel="noreferrer">
                          <Card className="hover-elevate cursor-pointer h-full">
                            <CardHeader>
                              <CardTitle className="text-base">{article.title}</CardTitle>
                              <CardDescription>{article.source}</CardDescription>
                            </CardHeader>
                          </Card>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                {searchResults.videos.length > 0 && (
                  <section>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><PlayCircle className="h-5 w-5 text-red-500" /> Videos</h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {searchResults.videos.map((video, i) => (
                        <a key={i} href={video.url} target="_blank" rel="noreferrer" className="group">
                          <div className="aspect-video bg-muted rounded-xl overflow-hidden relative mb-2">
                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <PlayCircle className="h-10 w-10 text-white drop-shadow-md" />
                            </div>
                          </div>
                          <p className="font-medium text-sm line-clamp-2">{video.title}</p>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                {searchResults.plants.length === 0 && searchResults.articles.length === 0 && searchResults.videos.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No results found for "{debouncedSearch}".
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-serif font-bold">Browse Catalog</h2>
            {isCatalogLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : catalog?.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalog.map(plant => (
                  <PlantCard key={plant.id} plant={plant} onAdd={() => handleAddPlant(plant.id, plant.commonName)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No plants available in catalog.</div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function PlantCard({ plant, onAdd }: { plant: any, onAdd: () => void }) {
  return (
    <Card className="overflow-hidden flex flex-col hover-elevate transition-all">
      <Link href={`/knowledge/${plant.id}`}>
        <div className="aspect-[4/3] bg-muted relative cursor-pointer group">
          <img src={plant.imageUrl} alt={plant.commonName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          <div className="absolute top-2 right-2 flex gap-1">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm shadow-sm">{plant.difficulty}</Badge>
          </div>
        </div>
      </Link>
      <CardContent className="p-4 flex-1">
        <Link href={`/knowledge/${plant.id}`}>
          <h3 className="font-bold font-serif text-lg hover:text-primary cursor-pointer">{plant.commonName}</h3>
        </Link>
        <p className="text-sm text-muted-foreground italic mb-2">{plant.scientificName}</p>
        <p className="text-sm line-clamp-2">{plant.summary}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 border-t border-border mt-auto flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{plant.category}</span>
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-8 text-primary hover:text-primary hover:bg-primary/10">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </CardFooter>
    </Card>
  );
}
