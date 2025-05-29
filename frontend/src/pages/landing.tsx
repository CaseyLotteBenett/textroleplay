import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Crown, LogIn } from "lucide-react";

export default function Landing() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoginPending } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Chyba",
        description: "Vyplňte všechna pole",
        variant: "destructive",
      });
      return;
    }

    try {
      await login({ username, password });
      toast({
        title: "Úspěch",
        description: "Přihlášení bylo úspěšné",
      });
    } catch (error: any) {
      toast({
        title: "Chyba přihlášení",
        description: error.message || "Neplatné přihlašovací údaje",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center rpg-gradient-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 rpg-bg-pattern opacity-30"></div>
      
      <Card className="max-w-md w-full mx-4 rpg-card">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-4">
              <Crown className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl fantasy-font font-bold text-accent tracking-wide">RPG Realm</h2>
            <p className="mt-2 text-sm text-muted-foreground">Vstupte do světa nekonečných příběhů</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                Uživatelské jméno
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Zadejte uživatelské jméno"
                className="rpg-input"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Heslo
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Zadejte heslo"
                className="rpg-input"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoginPending}
              className="rpg-button-primary"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {isLoginPending ? "Přihlašování..." : "Přihlásit se"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link href="/registration">
              <Button variant="link" className="text-accent hover:text-secondary transition-colors duration-200">
                Nemáte účet? Zaregistrujte se
              </Button>
            </Link>
          </div>


        </CardContent>
      </Card>
    </div>
  );
}
