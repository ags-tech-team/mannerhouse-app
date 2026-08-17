import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';

interface Client {
  id: string;
  name: string;
  phone: string;
  isMonthly: boolean;
  monthlyFee: number;
  isActive: boolean;
}

export const useClientSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchClients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const response = await api.get('/clients/search', { params: { q: query } });
      setSearchResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchClients(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchClients]);

  const selectClient = (client: Client) => {
    setSearchQuery(client.name);
    setShowResults(false);
    return client;
  };

  const resetSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    showResults,
    setShowResults,
    searching,
    selectClient,
    resetSearch,
  };
};