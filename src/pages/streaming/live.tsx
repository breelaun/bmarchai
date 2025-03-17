
import { useState, useEffect, useRef } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser, IMicrophoneAudioTrack, ICameraVideoTrack } from "agora-rtc-sdk-ng";
import { useCamera } from "@/hooks/useCamera";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StreamControls from "@/components/chat/components/stream/StreamControls";
import SessionDetails from "@/components/streaming/SessionDetails";
import ProductShowcase from "@/components/streaming/ProductShowcase";
import ViewersList from "@/components/streaming/ViewersList";
import AuctionManager from "@/components/streaming/AuctionManager";
import { useToast } from "@/components/ui/use-toast";

// Initialize Agora SDK
AgoraRTC.setLogLevel(4); // Set log level to ERROR

const LiveStreamPage = () => {
  const session = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("stream");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTracksRef = useRef<{
    videoTrack: ICameraVideoTrack | null;
    audioTrack: IMicrophoneAudioTrack | null;
    screenTrack: any | null;
  }>({
    videoTrack: null,
    audioTrack: null,
    screenTrack: null,
  });
  
  const {
    stream,
    error: cameraError,
    isLoading: cameraLoading,
    switchCamera,
    startCamera,
    stopCamera,
    currentFacingMode
  } = useCamera({ initialConfig: { front: true, rear: false, enabled: false } });

  // Fetch available session if vendor
  const { data: activeSession, isLoading: loadingSession } = useQuery({
    queryKey: ['active-session', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          name,
          description,
          start_time,
          duration,
          max_participants,
          status,
          stream_key,
          stream_url,
          orientation,
          privacy,
          moderators
        `)
        .eq('vendor_id', session.user.id)
        .eq('status', 'active')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  // Fetch products for showcase
  const { data: products } = useQuery({
    queryKey: ['vendor-products', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', session.user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id
  });

  const startStreamMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      
      // Create a new session or update existing one
      let sessionIdToUse = sessionId;
      
      if (!sessionIdToUse) {
        const { data, error } = await supabase
          .from('sessions')
          .insert({
            vendor_id: session.user.id,
            name: `Stream by ${session.user.email}`,
            description: "Live streaming session",
            start_time: new Date().toISOString(),
            duration: "01:00:00",
            max_participants: 100,
            status: 'active',
            stream_key: `${session.user.id}-${Date.now()}`,
            stream_url: `https://streaming.bmarchai.com/live/${session.user.id}`,
            orientation: 'landscape',
            privacy: 'public'
          })
          .select('id')
          .single();
        
        if (error) throw error;
        sessionIdToUse = data.id;
        setSessionId(data.id);
      }
      
      // Get the Agora token from our edge function
      const response = await supabase.functions.invoke('generate-agora-token', {
        body: {
          channelName: sessionIdToUse,
          role: 'publisher',
          uid: session.user.id,
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      return {
        token: response.data.token,
        channelName: sessionIdToUse
      };
    },
    onSuccess: async (data) => {
      if (!data) return;
      
      try {
        // Initialize Agora client
        clientRef.current = AgoraRTC.createClient({ mode: "live", codec: "h264" });
        
        // Set as host
        await clientRef.current.setClientRole("host");
        
        // Join the channel
        await clientRef.current.join(
          import.meta.env.VITE_AGORA_APP_ID || "",
          data.channelName,
          data.token,
          session?.user?.id || null
        );
        
        // Create and publish audio/video tracks
        if (stream) {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            microphoneId: stream.getAudioTracks()[0].id
          });
          const videoTrack = await AgoraRTC.createCameraVideoTrack({
            cameraId: stream.getVideoTracks()[0].id,
            encoderConfig: { 
              width: { ideal: 1280 }, 
              height: { ideal: 720 },
              frameRate: 30
            }
          });
          
          localTracksRef.current.audioTrack = audioTrack;
          localTracksRef.current.videoTrack = videoTrack;
          
          // Publish tracks
          await clientRef.current.publish([audioTrack, videoTrack]);
          
          setIsStreaming(true);
          
          // Subscribe to client events
          clientRef.current.on("user-joined", (user) => {
            console.log("User joined:", user);
            setViewerCount(prev => prev + 1);
          });
          
          clientRef.current.on("user-left", (user) => {
            console.log("User left:", user);
            setViewerCount(prev => Math.max(0, prev - 1));
          });
          
          toast({
            title: "Live stream started",
            description: "You are now live!"
          });
        } else {
          throw new Error("Camera stream not available");
        }
      } catch (error) {
        console.error("Error starting stream:", error);
        toast({
          title: "Error starting stream",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive"
        });
        // Clean up
        cleanupAgoraClient();
      }
    }
  });
  
  const stopStreamMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;
      
      // Update session status
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      return;
    },
    onSuccess: () => {
      // Clean up Agora client and local tracks
      cleanupAgoraClient();
      
      setIsStreaming(false);
      toast({
        title: "Stream ended",
        description: "Your live stream has ended"
      });
    }
  });

  // Function to start recording
  const startRecording = async () => {
    if (!clientRef.current || !sessionId) return;
    
    try {
      // Call the edge function to start cloud recording
      const response = await supabase.functions.invoke('agora-recording', {
        body: {
          action: 'start',
          channelName: sessionId,
          uid: session?.user?.id
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      setIsRecording(true);
      setRecordingStartTime(new Date().toISOString());
      
      toast({
        title: "Recording started",
        description: "Your session is now being recorded"
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error starting recording",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };
  
  // Function to stop recording
  const stopRecording = async () => {
    if (!clientRef.current || !sessionId) return;
    
    try {
      // Call the edge function to stop cloud recording
      const response = await supabase.functions.invoke('agora-recording', {
        body: {
          action: 'stop',
          channelName: sessionId,
          uid: session?.user?.id
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      setIsRecording(false);
      setRecordingStartTime(null);
      
      toast({
        title: "Recording stopped",
        description: "Your recording has been saved"
      });
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Error stopping recording",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };
  
  // Handle recording toggle
  const handleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Handle stream toggle
  const handleStreamToggle = () => {
    if (isStreaming) {
      stopStreamMutation.mutate();
    } else {
      startStreamMutation.mutate();
    }
  };
  
  // Handle screen sharing
  const toggleScreenSharing = async () => {
    if (!clientRef.current) return;
    
    if (isScreenSharing) {
      // Stop screen sharing
      if (localTracksRef.current.screenTrack) {
        await clientRef.current.unpublish(localTracksRef.current.screenTrack);
        localTracksRef.current.screenTrack.close();
        localTracksRef.current.screenTrack = null;
      }
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: "1080p"
        });
        localTracksRef.current.screenTrack = screenTrack;
        
        // Unpublish camera track if exists
        if (localTracksRef.current.videoTrack) {
          await clientRef.current.unpublish(localTracksRef.current.videoTrack);
        }
        
        // Publish screen track
        await clientRef.current.publish(screenTrack);
        setIsScreenSharing(true);
      } catch (error) {
        console.error("Error sharing screen:", error);
        toast({
          title: "Error sharing screen",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive"
        });
      }
    }
  };

  // Clean up Agora client
  const cleanupAgoraClient = async () => {
    // Unpublish and close local tracks
    if (localTracksRef.current.audioTrack) {
      localTracksRef.current.audioTrack.close();
      localTracksRef.current.audioTrack = null;
    }
    if (localTracksRef.current.videoTrack) {
      localTracksRef.current.videoTrack.close();
      localTracksRef.current.videoTrack = null;
    }
    if (localTracksRef.current.screenTrack) {
      localTracksRef.current.screenTrack.close();
      localTracksRef.current.screenTrack = null;
    }
    
    // Leave the channel
    if (clientRef.current) {
      await clientRef.current.leave();
      clientRef.current = null;
    }
  };

  // Handle product selection for showcase
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    toast({
      title: "Product showcased",
      description: "The selected product is now being showcased in your stream",
    });
  };

  // Initialize camera when component mounts
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      cleanupAgoraClient();
    };
  }, []);

  // Handle mic toggle
  useEffect(() => {
    if (localTracksRef.current.audioTrack) {
      if (isMicOn) {
        localTracksRef.current.audioTrack.setEnabled(true);
      } else {
        localTracksRef.current.audioTrack.setEnabled(false);
      }
    }
  }, [isMicOn]);

  // Set session ID if active session exists
  useEffect(() => {
    if (activeSession?.id) {
      setSessionId(activeSession.id);
    }
  }, [activeSession]);

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">You need to be logged in to start a live stream.</p>
            <Button asChild>
              <a href="/login">Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main stream view */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div>Live Stream Studio</div>
                {isStreaming && (
                  <div className="bg-red-500 text-white px-2 py-1 text-xs rounded-full flex items-center">
                    <span className="animate-pulse mr-1">●</span> LIVE
                    <span className="ml-2">{viewerCount} watching</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {stream ? (
                  <video
                    ref={(videoElement) => {
                      if (videoElement) {
                        videoElement.srcObject = stream;
                        videoElement.play();
                      }
                    }}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                    {cameraLoading ? "Loading camera..." : "Camera not available"}
                  </div>
                )}
                
                {/* Overlay for selected product */}
                {selectedProductId && (
                  <div className="absolute bottom-4 right-4 bg-black/70 p-2 rounded-lg max-w-[200px]">
                    {products?.find(p => p.id === selectedProductId) && (
                      <div className="text-white text-sm">
                        <div className="font-medium">{products.find(p => p.id.toString() === selectedProductId)?.name}</div>
                        <div>${products.find(p => p.id.toString() === selectedProductId)?.price}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <StreamControls
                  isMicOn={isMicOn}
                  setIsMicOn={setIsMicOn}
                  isScreenSharing={isScreenSharing}
                  setIsScreenSharing={toggleScreenSharing}
                  isStreaming={isStreaming}
                  isRecording={isRecording}
                  stream={stream}
                  switchCamera={switchCamera}
                  handleRecording={handleRecording}
                  handleStreamToggle={handleStreamToggle}
                  startStreamMutation={startStreamMutation}
                  stopStreamMutation={stopStreamMutation}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid grid-cols-4 mb-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="auction">Auction</TabsTrigger>
              <TabsTrigger value="viewers">Viewers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="m-0">
              <Card>
                <CardContent className="pt-4">
                  {activeSession ? (
                    <SessionDetails 
                      session={activeSession} 
                      isRecording={isRecording} 
                      recordingStartTime={recordingStartTime || undefined} 
                    />
                  ) : (
                    <div className="text-muted-foreground">
                      Start streaming to see session details
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="products" className="m-0">
              <Card>
                <CardContent className="pt-4">
                  <ProductShowcase 
                    products={products || []} 
                    onSelect={handleProductSelect}
                    selectedProductId={selectedProductId}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="auction" className="m-0">
              <Card>
                <CardContent className="pt-4">
                  <AuctionManager 
                    sessionId={sessionId}
                    products={products || []}
                    isStreaming={isStreaming}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="viewers" className="m-0">
              <Card>
                <CardContent className="pt-4">
                  <ViewersList
                    sessionId={sessionId}
                    viewers={viewerCount}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamPage;
