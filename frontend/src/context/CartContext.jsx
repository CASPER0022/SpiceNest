import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loadedKey, setLoadedKey] = useState(null);

  // Determine the localStorage key based on logged-in user profile
  const cartKey = useMemo(() => {
    return user && user.id ? `cart_${user.id}` : 'cart_guest';
  }, [user]);

  // Load cart from localStorage when the key changes (e.g. user logs in or out)
  useEffect(() => {
    if (authLoading) return;
    const savedCart = localStorage.getItem(cartKey);
    const parsed = savedCart ? JSON.parse(savedCart) : [];
    setCartItems(parsed);
    setLoadedKey(cartKey);
  }, [cartKey, authLoading]);

  // Persist cart to localStorage whenever it changes, but only if the key is loaded
  useEffect(() => {
    if (authLoading || !loadedKey || loadedKey !== cartKey) return;
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
  }, [cartItems, cartKey, loadedKey, authLoading]);

  const addToCart = (product, weight = '100g', customPrice = null) => {
    setCartItems((prev) => {
      const priceToUse = customPrice !== null ? customPrice : product.price;
      const cartItemId = `${product.id}-${weight}`;
      const existingItem = prev.find((item) => item.cartItemId === cartItemId || (!item.cartItemId && item.id === product.id));
      if (existingItem) {
        return prev.map((item) =>
          (item.cartItemId === cartItemId || item.id === product.id) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, cartItemId, weight, price: priceToUse, quantity: 1 }];
    });
    setIsCartOpen(true); // Open drawer when item added
  };

  const removeFromCart = (cartItemId) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId && item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId, quantity) => {
    if (quantity < 1) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        (item.cartItemId === cartItemId || item.id === cartItemId) ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCartItems([]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
