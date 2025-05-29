import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Download, Archive, ArrowLeft, User } from "lucide-react";
import { format } from "date-fns";

interface ChatRoom {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
}

interface ChatMessage {
  id: number;
  roomId: number;
  characterId: number;
  content: string;
  messageType: string;
  createdAt: string;
  character: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
  };
}

const MAX_MESSAGE_LENGTH = 5000;
const MIN_MESSAGE_LENGTH = 1;

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentRoomId = roomId ? parseInt(roomId) : null;
  
  // Debug user data
  console.log("User data:", user);
  console.log("User characters:", user?.characters);

  // Fetch current room info
  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: !!user,
  });
  
  const currentRoom = rooms.find(r => r.id === currentRoomId);

  // Fetch messages for current room
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", currentRoomId, "messages"],
    enabled: !!currentRoomId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { content: string; messageType?: string }) => {
      return new Promise<void>((resolve, reject) => {
        if (!ws || !isConnected) {
          reject(new Error("WebSocket není připojen"));
          return;
        }

        if (messageData.content.length < MIN_MESSAGE_LENGTH || messageData.content.length > MAX_MESSAGE_LENGTH) {
          reject(new Error(`Zpráva musí mít ${MIN_MESSAGE_LENGTH}-${MAX_MESSAGE_LENGTH} znaků`));
          return;
        }

        ws.send(JSON.stringify({
          type: 'chat_message',
          roomId: currentRoomId,
          content: messageData.content,
          messageType: messageData.messageType || 'message',
        }));

        resolve();
      });
    },
    onSuccess: () => {
      setMessageInput("");
    },
    onError: (error) => {
      toast({
        title: "Chyba při odesílání zprávy",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Archive messages mutation
  const archiveMessagesMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await fetch(`/api/chat/rooms/${roomId}/archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error("Archivace se nezdařila");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Zprávy archivovány",
        description: "Chat byl úspěšně archivován a vymazán.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", currentRoomId, "messages"] });
    },
    onError: () => {
      toast({
        title: "Chyba při archivaci",
        description: "Nepodařilo se archivovat zprávy.",
        variant: "destructive",
      });
    },
  });

  // Export chat function
  const exportChat = async () => {
    if (!currentRoomId) return;
    
    try {
      const response = await fetch(`/api/chat/rooms/${currentRoomId}/export`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Export se nezdařil');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `chat-export-${currentRoomId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Chat exportován",
        description: "Soubor byl stažen do vašeho počítače.",
      });
    } catch (error) {
      toast({
        title: "Chyba při exportu",
        description: "Nepodařilo se exportovat chat.",
        variant: "destructive",
      });
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !user.characters?.[0] || !user.characters[0].firstName) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const wsUrl = apiUrl.replace('http', 'ws').replace('https', 'wss') + '/ws';
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket připojen");
      setIsConnected(true);
      
      // Authenticate with the server
      websocket.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id,
        characterId: user.characters[0].id,
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'authenticated':
          console.log("WebSocket autentifikován");
          break;
        case 'new_message':
          // Add new message to the cache
          queryClient.setQueryData<ChatMessage[]>(
            ["/api/chat/rooms", data.message.roomId, "messages"],
            (oldData) => oldData ? [...oldData, data.message] : [data.message]
          );
          break;
        case 'error':
          toast({
            title: "WebSocket chyba",
            description: data.message,
            variant: "destructive",
          });
          break;
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket odpojen");
      setIsConnected(false);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket chyba:", error);
      setIsConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [user, queryClient, toast]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentRoomId) return;
    
    sendMessageMutation.mutate({
      content: messageInput.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy HH:mm");
  };

  const getCharacterFullName = (character: ChatMessage['character']) => {
    return `${character.firstName}${character.middleName ? ` ${character.middleName}` : ''} ${character.lastName}`;
  };

  const getCharacterInitials = (character: ChatMessage['character']) => {
    const firstInitial = character.firstName.charAt(0);
    const lastInitial = character.lastName.charAt(0);
    return `${firstInitial}${lastInitial}`;
  };

  const getCurrentUserInitials = () => {
    try {
      if (!user?.characters?.[0]) return "U";
      const character = user.characters[0];
      if (!character?.firstName || !character?.lastName) return "U";
      return `${character.firstName.charAt(0)}${character.lastName.charAt(0)}`;
    } catch (error) {
      console.error("Error getting user initials:", error);
      return "U";
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Pro přístup k chatu se musíte přihlásit.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user.characters || user.characters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Nemáte žádnou postavu. Vytvořte si postavu pro přístup k chatu.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Chatová místnost nebyla nalezena.</p>
            <Button 
              className="mt-4" 
              onClick={() => setLocation('/chat')}
            >
              Zpět na seznam chatů
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const messageInputLength = messageInput.length;
  const isMessageValid = messageInputLength >= MIN_MESSAGE_LENGTH && messageInputLength <= MAX_MESSAGE_LENGTH;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/chat')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zpět
              </Button>
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{currentRoom.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {currentRoom.description}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Připojeno' : 'Odpojeno'}
              </span>
              
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportChat}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentRoomId && archiveMessagesMutation.mutate(currentRoomId)}
                  disabled={archiveMessagesMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archivovat
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                {/* Avatar */}
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getCharacterInitials(message.character)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-foreground">
                      {getCharacterFullName(message.character)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-3 items-end">
            {/* User Avatar */}
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src="" />
              <AvatarFallback className="bg-secondary/50 text-secondary-foreground font-semibold">
                {getCurrentUserInitials()}
              </AvatarFallback>
            </Avatar>
            
            {/* Input Area */}
            <div className="flex-1">
              <Textarea
                placeholder="Napište zprávu..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={!isConnected}
                maxLength={MAX_MESSAGE_LENGTH}
              />
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs ${isMessageValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                  {messageInputLength}/{MAX_MESSAGE_LENGTH} znaků
                </span>
                {!isMessageValid && messageInputLength > 0 && (
                  <span className="text-xs text-destructive">
                    {messageInputLength < MIN_MESSAGE_LENGTH 
                      ? `Minimum ${MIN_MESSAGE_LENGTH} znak` 
                      : `Maximum ${MAX_MESSAGE_LENGTH} znaků`}
                  </span>
                )}
              </div>
            </div>
            
            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={!isMessageValid || !isConnected || sendMessageMutation.isPending}
              className="h-[60px] px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}