
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { GavelIcon, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AuctionItem {
  id: string;
  name: string;
  starting_bid: number;
  current_bid?: number;
  bidder_id?: string;
  end_time?: string;
}

interface Product {
  id: string | number;
  name: string;
  price: number;
}

interface AuctionManagerProps {
  sessionId: string | null;
  products: Product[];
  isStreaming: boolean;
}

const AuctionManager = ({ sessionId, products, isStreaming }: AuctionManagerProps) => {
  const { toast } = useToast();
  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [startingBid, setStartingBid] = useState<number>(0);
  const [addingItem, setAddingItem] = useState<boolean>(false);

  useEffect(() => {
    // Reset auction items when session changes
    if (!sessionId) {
      setAuctionItems([]);
    }
  }, [sessionId]);

  // Set default starting bid when product is selected
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id.toString() === selectedProductId);
      if (product) {
        setStartingBid(product.price);
      }
    }
  }, [selectedProductId, products]);

  const handleAddAuctionItem = () => {
    if (!selectedProductId || startingBid <= 0) {
      toast({
        title: "Invalid auction item",
        description: "Please select a product and set a valid starting bid",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id.toString() === selectedProductId);
    if (!product) return;

    const newItem: AuctionItem = {
      id: `auction-${Date.now()}`,
      name: product.name,
      starting_bid: startingBid,
      end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Default 30 min auction
    };

    setAuctionItems(prev => [...prev, newItem]);
    setSelectedProductId("");
    setStartingBid(0);
    setAddingItem(false);
    
    toast({
      title: "Auction item added",
      description: `${product.name} has been added to the auction`,
    });
  };

  const handleRemoveAuctionItem = (id: string) => {
    setAuctionItems(prev => prev.filter(item => item.id !== id));
  };

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!sessionId) {
    return (
      <div className="text-center text-muted-foreground py-4">
        Start streaming to manage auctions
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
          <GavelIcon className="h-4 w-4" />
          Auction Items
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setAddingItem(!addingItem)}
          disabled={!isStreaming}
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>
      
      {addingItem && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <Select 
              value={selectedProductId} 
              onValueChange={setSelectedProductId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} (${product.price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Starting bid: $</span>
              <Input 
                type="number"
                value={startingBid}
                onChange={(e) => setStartingBid(Number(e.target.value))}
                className="flex-1"
                min={0}
              />
            </div>
            
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAddAuctionItem}>
                Add to Auction
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {auctionItems.length === 0 ? (
        <div className="text-center text-muted-foreground py-4">
          No auction items yet
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {auctionItems.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <div className="flex items-center mt-1">
                        <Badge variant="outline" className="mr-2">
                          ${item.starting_bid.toFixed(2)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Ends: {formatTime(item.end_time)}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => handleRemoveAuctionItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {item.current_bid && (
                    <div className="bg-muted rounded p-2 text-sm">
                      <span className="font-medium">Current bid: </span>
                      <span className="text-primary">${item.current_bid.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default AuctionManager;
