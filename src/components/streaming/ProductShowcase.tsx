
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Pencil, Eye, EyeOff, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string | number;
  name: string;
  price: number;
  image_url?: string;
  description?: string;
  inventory_count?: number;
}

interface ProductShowcaseProps {
  products: Product[];
  onSelect: (productId: string) => void;
  selectedProductId: string | null;
}

const ProductShowcase = ({ products, onSelect, selectedProductId }: ProductShowcaseProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No products found
            </p>
          ) : (
            filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className={`overflow-hidden transition-colors ${
                  selectedProductId === product.id.toString() 
                    ? 'ring-2 ring-primary' 
                    : ''
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingCart className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm truncate">{product.name}</h4>
                        <span className="text-sm font-medium">${product.price}</span>
                      </div>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline" className="text-xs">
                          Stock: {product.inventory_count || 'N/A'}
                        </Badge>
                        <Button 
                          variant={selectedProductId === product.id.toString() ? "secondary" : "outline"} 
                          size="sm"
                          onClick={() => onSelect(product.id.toString())}
                          className="h-8 text-xs"
                        >
                          {selectedProductId === product.id.toString() ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Show
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProductShowcase;
