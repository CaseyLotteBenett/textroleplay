import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Check, User } from "lucide-react";

export default function Registration() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
    inviteCode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    birthDate: "",
  });

  const { register, isRegisterPending } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    const { username, email, password, passwordConfirm, inviteCode } = formData;
    
    if (!username || !email || !password || !passwordConfirm || !inviteCode) {
      toast({
        title: "Chyba",
        description: "Vyplňte všechna pole",
        variant: "destructive",
      });
      return false;
    }

    if (password !== passwordConfirm) {
      toast({
        title: "Chyba",
        description: "Hesla se neshodují",
        variant: "destructive",
      });
      return false;
    }

    if (password.length < 6) {
      toast({
        title: "Chyba",
        description: "Heslo musí mít alespoň 6 znaků",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { firstName, lastName, birthDate } = formData;
    
    if (!firstName || !lastName || !birthDate) {
      toast({
        title: "Chyba",
        description: "Vyplňte všechna povinná pole",
        variant: "destructive",
      });
      return;
    }

    try {
      await register(formData);
      toast({
        title: "Úspěch",
        description: "Registrace byla úspěšně dokončena!",
      });
    } catch (error: any) {
      toast({
        title: "Chyba registrace",
        description: error.message || "Registrace selhala",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen rpg-gradient-bg py-8">
      <div className="container mx-auto px-4">
        {/* Progress indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                step >= 1 ? 'bg-primary' : 'bg-muted-foreground'
              }`}>
                {step > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Uživatelský účet
              </span>
            </div>
            <div className="w-16 h-0.5 bg-border"></div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Herní postava
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: User Account */}
        {step === 1 && (
          <Card className="max-w-md mx-auto rpg-card">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl fantasy-font font-bold text-accent">Vytvoření účtu</h2>
                <p className="text-sm text-muted-foreground mt-1">Krok 1 ze 2</p>
              </div>

              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">Uživatelské jméno</Label>
                  <Input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Jedinečné uživatelské jméno"
                    className="rpg-input"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Musí být jedinečné v celém systému</p>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="vas@email.cz"
                    className="rpg-input"
                    required
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">Heslo</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Zadejte silné heslo"
                    className="rpg-input"
                    required
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">Potvrzení hesla</Label>
                  <Input
                    type="password"
                    value={formData.passwordConfirm}
                    onChange={(e) => handleInputChange('passwordConfirm', e.target.value)}
                    placeholder="Zopakujte heslo"
                    className="rpg-input"
                    required
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">Zvací kód</Label>
                  <Input
                    type="text"
                    value={formData.inviteCode}
                    onChange={(e) => handleInputChange('inviteCode', e.target.value)}
                    placeholder="Zadejte zvací kód"
                    className="rpg-input"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Nutný pro dokončení registrace</p>
                </div>

                <Button type="submit" className="rpg-button-primary">
                  Pokračovat k postavě
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="text-center mt-6">
                <Link href="/">
                  <Button variant="link" className="text-accent hover:text-secondary transition-colors duration-200">
                    Zpět na přihlášení
                  </Button>
                </Link>
              </div>

              {/* Test invite codes info */}
              <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border/50">
                <h4 className="text-sm font-medium text-accent mb-2">Testovací zvací kódy:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>WELCOME2024</p>
                  <p>ADMIN_INVITE</p>
                  <p>USER_INVITE</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Character Creation */}
        {step === 2 && (
          <Card className="max-w-md mx-auto rpg-card">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl fantasy-font font-bold text-accent">Vytvoření postavy</h2>
                <p className="text-sm text-muted-foreground mt-1">Krok 2 ze 2</p>
              </div>

              <form onSubmit={handleRegistration} className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">
                    Křestní jméno <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Křestní jméno postavy"
                    className="rpg-input"
                    required
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">Druhé jméno (volitelné)</Label>
                  <Input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    placeholder="Druhé jméno (nepovinné)"
                    className="rpg-input"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">
                    Příjmení <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Příjmení postavy"
                    className="rpg-input"
                    required
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">Datum narození</Label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    className="rpg-input"
                    required
                  />
                </div>

                <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
                  <h4 className="text-sm font-medium text-accent mb-2">
                    <User className="inline h-4 w-4 mr-2" />
                    Budoucí rozšíření
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Profilový obrázek a další vlastnosti postavy budou přidány v budoucích verzích.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rpg-button-secondary"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zpět
                  </Button>
                  <Button
                    type="submit"
                    disabled={isRegisterPending}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-emerald-600 hover:to-green-600 text-white py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {isRegisterPending ? "Vytváření..." : "Dokončit"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
