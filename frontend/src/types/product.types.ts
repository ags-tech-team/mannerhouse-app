export interface Product {
  id: string;
  name: string;
  category: 'drink' | 'pomade' | 'other';
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  createdAt: string;
}
