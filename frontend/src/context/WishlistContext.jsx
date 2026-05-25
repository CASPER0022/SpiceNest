import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const WishlistContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load/sync wishlist on authentication state change (login, logout, or initial load)
  useEffect(() => {
    if (authLoading) return;

    const syncOrFetchWishlist = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (user && user.id && token) {
        try {
          // Fetch guest items from localStorage if any exist
          const guestWishlistStr = localStorage.getItem('wishlist');
          const guestItems = guestWishlistStr ? JSON.parse(guestWishlistStr) : [];

          if (guestItems.length > 0) {
            // Sync guest items with the user's DB wishlist
            const res = await fetch(`${API_URL}/api/wishlist/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ items: guestItems })
            });

            if (res.ok) {
              const mergedWishlist = await res.json();
              setWishlistItems(mergedWishlist);
              // Successfully merged, clear guest wishlist
              localStorage.removeItem('wishlist');
              window.dispatchEvent(new Event('wishlist-update'));
            } else {
              // If sync endpoint fails, fallback to normal GET /api/wishlist
              const getRes = await fetch(`${API_URL}/api/wishlist`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (getRes.ok) {
                const dbWishlist = await getRes.json();
                setWishlistItems(dbWishlist);
              }
            }
          } else {
            // No guest items, just fetch the user's database wishlist
            const res = await fetch(`${API_URL}/api/wishlist`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (res.ok) {
              const dbWishlist = await res.json();
              setWishlistItems(dbWishlist);
            }
          }
        } catch (error) {
          console.error('Failed to sync or fetch wishlist:', error);
        }
      } else {
        // Guest user: load from localStorage
        const savedWishlist = localStorage.getItem('wishlist');
        const parsed = savedWishlist ? JSON.parse(savedWishlist) : [];
        setWishlistItems(parsed);
      }
      setLoading(false);
    };

    syncOrFetchWishlist();
  }, [user, authLoading]);

  // Persist guest wishlist to localStorage only when user is guest (logged out)
  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.id) {
      localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, user, authLoading]);

  const addToWishlist = async (product) => {
    if (wishlistItems.some((item) => item.id === product.id)) return;

    setWishlistItems((prev) => [...prev, product]);
    window.dispatchEvent(new Event('wishlist-update'));

    toast.success('Added to Wishlist! 💖', {
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      }
    });

    // Background DB sync if logged in
    const token = localStorage.getItem('token');
    if (user && user.id && token) {
      try {
        await fetch(`${API_URL}/api/wishlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId: product.id
          })
        });
      } catch (err) {
        console.error('Error adding to database wishlist:', err);
      }
    }
  };

  const removeFromWishlist = async (productId) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== productId));
    window.dispatchEvent(new Event('wishlist-update'));

    toast.success('Removed from Wishlist!', { icon: '💔' });

    // Background DB sync if logged in
    const token = localStorage.getItem('token');
    if (user && user.id && token) {
      try {
        await fetch(`${API_URL}/api/wishlist/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Error removing from database wishlist:', err);
      }
    }
  };

  const toggleWishlist = (product) => {
    if (wishlistItems.some((item) => item.id === product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item.id === productId);
  };

  const clearWishlist = async () => {
    setWishlistItems([]);
    window.dispatchEvent(new Event('wishlist-update'));

    toast.success('Wishlist cleared!');

    // Background DB sync if logged in
    const token = localStorage.getItem('token');
    if (user && user.id && token) {
      try {
        await fetch(`${API_URL}/api/wishlist`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Error clearing database wishlist:', err);
      }
    }
  };

  const wishlistCount = useMemo(() => wishlistItems.length, [wishlistItems]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        loading,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
