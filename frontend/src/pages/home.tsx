import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Crown, 
  Home as HomeIcon, 
  MessageCircle, 
  User, 
  LogOut, 
  Zap, 
  History, 
  Users, 
  Circle,
  DoorOpen
} from "lucide-react";

interface OnlineCharacter {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  location: string;
}

export default function Home() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const { data: onlineCharacters = [] } = useQuery<OnlineCharacter[]>({
    queryKey: ["/api/characters/online"],
    staleTime: 30000, // 30 seconds
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Odhlášení",
        description: "Byli jste úspěšně odhlášeni",
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se odhlásit",
        variant: "destructive",
      });
    }
  };

  const primaryCharacter = user?.characters?.[0];
  const characterAge = primaryCharacter ? 
    new Date().getFullYear() - new Date(primaryCharacter.birthDate).getFullYear() : 0;

  const chatRooms = [
    { name: "Hlavní chat", onlineCount: 3 },
    { name: "Taverna U Zlatého draka", onlineCount: 1 },
    { name: "Kouzelná knihovna", onlineCount: 1 },
  ];

  const recentActivity = [
    { text: `Vstoupili jste do Hlavního chatu`, time: "před 2 hodinami", type: "success" },
    { text: "Aktualizována postava", time: "včera", type: "info" },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      {/* Navigation Header */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mr-3">
                  <Crown className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-xl fantasy-font font-bold text-accent">RPG Realm</span>
              </div>
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Button variant="ghost" className="text-accent hover:text-secondary">
                  <HomeIcon className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
                <Button variant="ghost" className="text-foreground hover:text-accent">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Herní chaty
                </Button>
                <Button variant="ghost" className="text-foreground hover:text-accent">
                  <User className="mr-2 h-4 w-4" />
                  Moje postava
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">{user?.username}</div>
              <Button variant="ghost" size="sm" className="bg-muted hover:bg-primary text-foreground hover:text-primary-foreground">
                <User className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl fantasy-font font-bold text-accent mb-2">
            Vítejte zpět, {user?.username}!
          </h1>
          <p className="text-muted-foreground">Připravte se na další dobrodružství ve světě RPG Realm.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Zap className="text-accent mr-3 h-5 w-5" />
                  Rychlé akce
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    variant="secondary" 
                    className="bg-muted hover:bg-primary text-foreground hover:text-primary-foreground p-4 h-auto rounded-lg transition-all duration-200 transform hover:scale-105 text-left justify-start"
                    onClick={() => window.location.href = '/character/edit'}
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg mr-4">
                        {primaryCharacter ? 
                          `${primaryCharacter.firstName[0]}${primaryCharacter.lastName[0]}` : 
                          'FB'
                        }
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {primaryCharacter ? 
                            `${primaryCharacter.firstName} ${primaryCharacter.lastName}` : 
                            'Upravit postavu'
                          }
                        </div>
                        <div className="text-sm opacity-80">Aktualizujte profil</div>
                      </div>
                    </div>
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-primary-foreground p-4 h-auto rounded-lg transition-all duration-200 transform hover:scale-105 text-left justify-start"
                    onClick={() => window.location.href = '/chat'}
                  >
                    <div>
                      <MessageCircle className="h-6 w-6 mb-2" />
                      <div className="font-medium">Vstoupit do chatu</div>
                      <div className="text-sm opacity-80">Pokračujte v příběhu</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <History className="text-accent mr-3 h-5 w-5" />
                  Nedávná aktivita
                </h2>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === "success" ? "bg-green-500" : "bg-accent"
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{activity.text}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-2">
                    <Button variant="link" className="text-accent hover:text-secondary text-sm">
                      Zobrazit vše
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* My Character */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <User className="text-accent mr-3 h-5 w-5" />
                  Moje postava
                </h3>
                {primaryCharacter && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-3 flex items-center justify-center">
                      <User className="text-primary-foreground h-8 w-8" />
                    </div>
                    <h4 className="font-medium text-foreground">
                      {primaryCharacter.firstName}
                      {primaryCharacter.middleName && ` ${primaryCharacter.middleName}`}
                      {` ${primaryCharacter.lastName}`}
                    </h4>
                    <p className="text-sm text-muted-foreground">{characterAge} let</p>
                    <div className="mt-3">
                      <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                        <Circle className="h-3 w-3 mr-1 fill-current" />
                        Online
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Online Characters */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Users className="text-accent mr-3 h-5 w-5" />
                  Postavy online
                  <Badge variant="secondary" className="ml-auto bg-primary/20 text-primary">
                    {onlineCharacters.length}
                  </Badge>
                </h3>
                <div className="space-y-3">
                  {onlineCharacters.map((character) => (
                    <div key={character.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                        <User className="text-white h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{character.fullName}</p>
                        <p className="text-xs text-muted-foreground">v {character.location}</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </div>
    </div>
  );
}
