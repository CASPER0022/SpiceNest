import { createContext, useContext, useState, useEffect } from 'react';

const ViewedContext = createContext();

export function ViewedProvider({ children }) {
  const [viewedProducts, setViewedProducts] = useState([]);

  useEffect(() => {
    const storedViewed = localStorage.getItem('viewedProducts');
    if (storedViewed) {
      setViewedProducts(JSON.parse(storedViewed));
    }
  }, []);

  const addToViewed = (product) => {
    const productId = product?._id || product?.id;
    if (!productId) return;
    
    setViewedProducts((prev) => {
      // Remove the product if it's already in the list to move it to the front
      const filtered = prev.filter((p) => (p._id || p.id) !== productId);
      const updated = [product, ...filtered].slice(0, 20); // Keep last 20
      localStorage.setItem('viewedProducts', JSON.stringify(updated));
      return updated;
    });
  };

  const clearViewed = () => {
    setViewedProducts([]);
    localStorage.removeItem('viewedProducts');
  };

  return (
    <ViewedContext.Provider value={{ viewedProducts, addToViewed, clearViewed }}>
      {children}
    </ViewedContext.Provider>
  );
}

export function useViewed() {
  const context = useContext(ViewedContext);
  if (!context) {
    throw new Error('useViewed must be used within a ViewedProvider');
  }
  return context;
}
