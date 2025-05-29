import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  ArrowLeft,
  Save,
  Calendar,
  UserCircle
} from "lucide-react";
import { insertCharacterSchema } from "../../../shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";

const characterEditSchema = insertCharacterSchema.pick({
  firstName: true,
  middleName: true,
  lastName: true,
  birthDate: true,
});

type CharacterEditForm = z.infer<typeof characterEditSchema>;

export default function CharacterEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const primaryCharacter = user?.characters?.[0];

  const form = useForm<CharacterEditForm>({
    resolver: zodResolver(characterEditSchema),
    defaultValues: {
      firstName: primaryCharacter?.firstName || "",
      middleName: primaryCharacter?.middleName || "",
      lastName: primaryCharacter?.lastName || "",
      birthDate: primaryCharacter?.birthDate || "",
    },
  });

  const updateCharacterMutation = useMutation({
    mutationFn: async (data: CharacterEditForm) => {
      if (!primaryCharacter?.id) {
        throw new Error("Žádná postava k úpravě");
      }
      return apiRequest("PATCH", `/api/characters/${primaryCharacter.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Úspěch",
        description: "Postava byla úspěšně aktualizována",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aktualizovat postavu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CharacterEditForm) => {
    updateCharacterMutation.mutate(data);
  };

  const characterAge = primaryCharacter ? 
    new Date().getFullYear() - new Date(primaryCharacter.birthDate).getFullYear() : 0;

  return (
    <div className="min-h-screen bg-background dark">
      {/* Navigation Header */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/")}
                className="mr-4 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zpět na dashboard
              </Button>
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mr-3">
                  <UserCircle className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-xl fantasy-font font-bold text-accent">Úprava postavy</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">{user?.username}</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Character Preview */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                  <User className="text-accent mr-3 h-5 w-5" />
                  Náhled postavy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl">
                  {form.watch("firstName")?.[0] || "?"}{form.watch("lastName")?.[0] || "?"}
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {form.watch("firstName") || "Jméno"} {form.watch("middleName") && `${form.watch("middleName")} `}{form.watch("lastName") || "Příjmení"}
                </h3>
                <p className="text-muted-foreground text-sm mb-3">
                  {form.watch("birthDate") ? 
                    `${new Date().getFullYear() - new Date(form.watch("birthDate")).getFullYear()} let` : 
                    "Věk nezadán"
                  }
                </p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Aktivní
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center">
                  <Save className="text-accent mr-3 h-5 w-5" />
                  Upravit informace o postavě
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-foreground">Jméno *</Label>
                      <Input
                        id="firstName"
                        {...form.register("firstName")}
                        placeholder="Zadejte jméno"
                        className="bg-muted border-border text-foreground"
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-foreground">Příjmení *</Label>
                      <Input
                        id="lastName"
                        {...form.register("lastName")}
                        placeholder="Zadejte příjmení"
                        className="bg-muted border-border text-foreground"
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="middleName" className="text-foreground">Prostřední jméno</Label>
                    <Input
                      id="middleName"
                      {...form.register("middleName")}
                      placeholder="Zadejte prostřední jméno (volitelné)"
                      className="bg-muted border-border text-foreground"
                    />
                    {form.formState.errors.middleName && (
                      <p className="text-sm text-destructive">{form.formState.errors.middleName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="text-foreground flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-accent" />
                      Datum narození *
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      {...form.register("birthDate")}
                      className="bg-muted border-border text-foreground"
                    />
                    {form.formState.errors.birthDate && (
                      <p className="text-sm text-destructive">{form.formState.errors.birthDate.message}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-border">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setLocation("/")}
                      className="border-border text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Zrušit
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateCharacterMutation.isPending}
                      className="bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-primary-foreground"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateCharacterMutation.isPending ? "Ukládám..." : "Uložit změny"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}