import { api } from '../api/client';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  category: 'higiene' | 'cabelo' | 'barba' | 'acessorios' | 'outros';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  stock: number;
  category?: string;
}

export const productService = {
  async getAll(): Promise<Product[]> {
    const response = await api.get('/products');
    return response.data;
  },

  async getById(id: string): Promise<Product> {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  async create(data: CreateProductData): Promise<Product> {
    const response = await api.post('/products', data);
    return response.data;
  },

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};