import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load/sync cart on authentication state change (login, logout, or initial load)
  useEffect(() => {
    if (authLoading) return;

    const syncOrFetchCart = async () => {
      const token = localStorage.getItem('token');
      if (user && user.id && token) {
        try {
          // Fetch guest items from localStorage if any exist
          const guestCartStr = localStorage.getItem('cart_guest');
          const guestItems = guestCartStr ? JSON.parse(guestCartStr) : [];

          if (guestItems.length > 0) {
            // Sync guest items with the user's DB cart
            const res = await fetch(`${API_URL}/api/cart/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ items: guestItems })
            });

            if (res.ok) {
              const mergedCart = await res.json();
              setCartItems(mergedCart);
              // Successfully merged, clear guest cart
              localStorage.removeItem('cart_guest');
            } else {
              // If sync endpoint fails, fallback to normal GET /api/cart
              const getRes = await fetch(`${API_URL}/api/cart`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (getRes.ok) {
                const dbCart = await getRes.json();
                setCartItems(dbCart);
              }
            }
          } else {
            // No guest items, just fetch the user's database cart
            const res = await fetch(`${API_URL}/api/cart`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (res.ok) {
              const dbCart = await res.json();
              setCartItems(dbCart);
            }
          }
        } catch (error) {
          console.error('Failed to sync or fetch cart:', error);
        }
      } else {
        // Guest user: load from localStorage
        const savedCart = localStorage.getItem('cart_guest');
        const parsed = savedCart ? JSON.parse(savedCart) : [];
        setCartItems(parsed);
      }
    };

    syncOrFetchCart();
  }, [user, authLoading]);

  // Persist guest cart to localStorage only when user is guest (logged out)
  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.id) {
      localStorage.setItem('cart_guest', JSON.stringify(cartItems));
    }
  }, [cartItems, user, authLoading]);

  const addToCart = (product, weight = '100g', customPrice = null) => {
    const priceToUse = customPrice !== null ? customPrice : product.price;
    const cartItemId = `${product.id}-${weight}`;
    
    // Find what the target quantity will be
    const existingItem = cartItems.find((item) => item.cartItemId === cartItemId || (!item.cartItemId && item.id === product.id));
    const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId || (!item.cartItemId && item.id === product.id));
      if (existing) {
        return prev.map((item) =>
          (item.cartItemId === cartItemId || item.id === product.id) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, cartItemId, weight, price: priceToUse, quantity: 1 }];
    });

    setIsCartOpen(true); // Open drawer when item added

    // Background DB sync if logged in
    const token = localStorage.getItem('token');
    if (user && user.id && token) {
      fetch(`${API_URL}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: product.id,
          weight,
          quantity: newQuantity
        })
      }).catch(err => console.error('Error adding to database cart:', err));
    }
  };

  const removeFromCart = (cartItemId) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId && item.id !== cartItemId));

    // Background DB sync if logged in
    const token = localStorage.getItem('token');
    if (user && user.id && token) {
      const idToSend = cartItemId.includes('-') ? cartItemId : `${cartItemId}-100g`;
      fetch(`${API_URL}/api/cart/${idToSend}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.error('Error removing from database cart:', err));
    }
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

    // Background DB sync if logged in
    const token = localStorage.getItem('token');
    if (user && user.id && token) {
      const dashIndex = cartItemId.indexOf('-');
      let productId = cartItemId;
      let weight = '100g';
      if (dashIndex !== -1) {
        productId = cartItemId.substring(0, dashIndex);
        weight = cartItemId.substring(dashIndex + 1);
      }

      fetch(`${API_URL}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: parseInt(productId, 10),
          weight,
          quantity
        })
      }).catch(err => console.error('Error updating database cart quantity:', err));
    }
  };

  const clearCart = () => {
    setCartItems([]);

    // Background DB sync if logged in
    const token = localStorage.getItem('token');
    if (user && user.id && token) {
      fetch(`${API_URL}/api/cart`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.error('Error clearing database cart:', err));
    }
  };

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
