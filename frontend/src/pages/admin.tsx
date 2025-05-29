import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  Crown, 
  Users, 
  UsersRound, 
  Circle, 
  MessageCircle,
  Gauge,
  Settings,
  User,
  LogOut,
  Shield,
  Plus,
  Edit,
  ArrowUp,
  Book,
  UserPlus
} from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  characters: any[];
}

export default function Admin() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newInviteCode, setNewInviteCode] = useState("");

  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/users"],
    staleTime: 30000,
  });

  const createInviteCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/admin/invite-codes", { code });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Úspěch",
        description: "Zvací kód byl vytvořen",
      });
      setNewInviteCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vytvořit zvací kód",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Úspěch",
        description: "Role byla aktualizována",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aktualizovat roli",
        variant: "destructive",
      });
    },
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

  const handleCreateInviteCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteCode || newInviteCode.length < 6) {
      toast({
        title: "Chyba",
        description: "Zvací kód musí mít alespoň 6 znaků",
        variant: "destructive",
      });
      return;
    }
    createInviteCodeMutation.mutate(newInviteCode);
  };

  const toggleUserRole = (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const stats = {
    totalUsers: users.length,
    activeCharacters: users.reduce((sum, user) => sum + user.characters.length, 0),
    onlineNow: Math.floor(users.length * 0.3), // Mock online count
    activeChats: 5,
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Admin Navigation */}
      <nav className="bg-card border-b border-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-gradient-to-br from-accent to-orange-600 rounded-full flex items-center justify-center mr-3">
                  <Crown className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl fantasy-font font-bold text-accent">RPG Realm Admin</span>
              </div>
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Button variant="ghost" className="text-accent hover:text-orange-400">
                  <Gauge className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
                <Button variant="ghost" className="text-foreground hover:text-accent">
                  <Users className="mr-2 h-4 w-4" />
                  Uživatelé
                </Button>
                <Button variant="ghost" className="text-foreground hover:text-accent">
                  <UsersRound className="mr-2 h-4 w-4" />
                  Postavy
                </Button>
                <Button variant="ghost" className="text-foreground hover:text-accent">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chaty
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Badge className="bg-accent/20 text-accent">
                  <Shield className="mr-1 h-3 w-3" />
                  ADMIN
                </Badge>
                <div className="text-sm text-muted-foreground">{user?.username}</div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-accent"
                title="Přepnout na uživatelské rozhraní"
              >
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
        {/* Admin Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl fantasy-font font-bold text-accent mb-2">
            Administrátorský panel
          </h1>
          <p className="text-muted-foreground">Správa uživatelů, postav a herního prostředí RPG Realm.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary/20 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Celkem uživatelů</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-500/20 text-green-400">
                  <UsersRound className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Aktivní postavy</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeCharacters}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-accent/20 text-accent">
                  <Circle className="h-6 w-6 fill-current" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Online nyní</p>
                  <p className="text-2xl font-bold text-foreground">{stats.onlineNow}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Aktivní chaty</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeChats}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Management */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground flex items-center">
                  <Settings className="text-accent mr-3 h-5 w-5" />
                  Správa uživatelů
                </h2>
                <form onSubmit={handleCreateInviteCode} className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Nový zvací kód"
                    value={newInviteCode}
                    onChange={(e) => setNewInviteCode(e.target.value)}
                    className="w-32"
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={createInviteCodeMutation.isPending}
                    className="bg-primary hover:bg-secondary text-primary-foreground"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Vytvořit
                  </Button>
                </form>
              </div>

              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.role === "admin" 
                          ? "bg-gradient-to-br from-accent to-orange-600" 
                          : "bg-gradient-to-br from-primary to-secondary"
                      }`}>
                        {user.role === "admin" ? (
                          <Crown className="text-white h-5 w-5" />
                        ) : (
                          <User className="text-white h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        user.role === "admin" 
                          ? "bg-accent/20 text-accent" 
                          : "bg-blue-500/20 text-blue-400"
                      }>
                        {user.role.toUpperCase()}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserRole(user.id, user.role)}
                        disabled={updateRoleMutation.isPending}
                        className="text-accent hover:text-secondary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role & Permission Management */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                <Shield className="text-accent mr-3 h-5 w-5" />
                Správa rolí a oprávnění
              </h2>

              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="font-medium text-foreground mb-3">Dostupné role</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-foreground">User</span>
                        <p className="text-xs text-muted-foreground">Základní hráčské oprávnění</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400">
                        Výchozí
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-foreground">Admin</span>
                        <p className="text-xs text-muted-foreground">Plná správa systému</p>
                      </div>
                      <Badge className="bg-accent/20 text-accent">
                        Privilegovaná
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between opacity-60">
                      <div>
                        <span className="text-sm font-medium text-foreground">Vypravěč</span>
                        <p className="text-xs text-muted-foreground">Správa příběhů a NPC</p>
                      </div>
                      <Badge variant="secondary">
                        Připravuje se
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="font-medium text-foreground mb-3">Rychlé akce</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="ghost"
                      className="w-full justify-start p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all duration-200 text-sm"
                    >
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Povýšit na admin
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-full justify-start p-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-all duration-200 text-sm"
                    >
                      <Book className="mr-2 h-4 w-4" />
                      Udělit právo vypravěče
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-full justify-start p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all duration-200 text-sm"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Povolit více postav
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
