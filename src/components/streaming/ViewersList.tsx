
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ViewersListProps {
  sessionId: string | null;
  viewers: number;
}

const ViewersList = ({ sessionId, viewers }: ViewersListProps) => {
  const [viewersList, setViewersList] = useState<Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    joined_at: string;
  }>>([]);

  // In a real app, we would fetch the actual viewers from the backend
  // For now, let's generate some dummy data based on the viewer count
  useEffect(() => {
    if (!sessionId) {
      setViewersList([]);
      return;
    }

    // Generate some fake viewers for demonstration
    const fakeViewers = Array.from({ length: viewers }, (_, i) => ({
      id: `viewer-${i + 1}`,
      username: `user${i + 1}`,
      avatar_url: null,
      joined_at: new Date(Date.now() - Math.random() * 1000 * 60 * 10).toISOString(),
    }));

    setViewersList(fakeViewers);
  }, [sessionId, viewers]);

  if (!sessionId) {
    return (
      <div className="text-center text-muted-foreground py-4">
        Start streaming to see viewers
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
          <Users className="h-4 w-4" />
          Viewers
        </h3>
        <Badge variant="secondary" className="px-2">
          <Eye className="h-3 w-3 mr-1" />
          {viewers}
        </Badge>
      </div>
      
      {viewers === 0 ? (
        <div className="text-center text-muted-foreground py-4">
          No viewers yet
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {viewersList.map((viewer) => (
              <Card key={viewer.id} className="p-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={viewer.avatar_url || ''} alt={viewer.username} />
                    <AvatarFallback>{viewer.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{viewer.username}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(viewer.joined_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default ViewersList;
