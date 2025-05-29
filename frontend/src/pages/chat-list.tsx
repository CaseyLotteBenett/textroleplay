import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, ArrowRight } from "lucide-react";

interface ChatRoom {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
}

export default function ChatList() {
  const { user } = useAuth();

  // Fetch chat rooms
  const { data: rooms = [], isLoading, error } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: !!user,
  });

  console.log("Chat rooms data:", rooms);
  console.log("Loading:", isLoading);
  console.log("Error:", error);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Pro přístup k chatům se musíte přihlásit.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRoomClick = (roomId: number) => {
    window.location.href = `/chat/${roomId}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Herní chaty</h1>
        <p className="text-muted-foreground">
          Vyberte chatovací místnost pro interakci s ostatními hráči
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {rooms.map((room) => (
          <Card 
            key={room.id}
            className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20"
            onClick={() => handleRoomClick(room.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xl">{room.name}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {room.description || "Herní chatovací místnost"}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Veřejná místnost</span>
                </div>
                
                <Button variant="outline" size="sm">
                  Vstoupit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {rooms.length === 0 && (
          <div className="col-span-full text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Žádné chatovací místnosti
            </h3>
            <p className="text-muted-foreground">
              Momentálně nejsou k dispozici žádné chatovací místnosti.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}