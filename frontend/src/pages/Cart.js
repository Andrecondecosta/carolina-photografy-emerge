import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { 
  ShoppingCart, Trash2, ArrowLeft, CreditCard, 
  Loader2, CheckCircle, XCircle, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Cart = () => {
  const { isAuthenticated, refreshCart } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState({});
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [isAuthenticated, navigate]);

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`, {
        withCredentials: true
      });
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (photoId) => {
    setRemoving(prev => ({ ...prev, [photoId]: true }));
    try {
      await axios.delete(`${API}/cart/remove/${photoId}`, {
        withCredentials: true
      });
      setCart(prev => ({
        items: prev.items.filter(item => item.photo_id !== photoId),
        total: prev.total - (prev.items.find(i => i.photo_id === photoId)?.price || 0)
      }));
      refreshCart();
      toast.success('Removido do carrinho');
    } catch (error) {
      toast.error('Erro ao remover');
    } finally {
      setRemoving(prev => ({ ...prev, [photoId]: false }));
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const response = await axios.post(`${API}/checkout/create-session`, {
        origin_url: window.location.origin
      }, {
        withCredentials: true
      });
      
      // Redirect to Stripe
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Erro ao iniciar pagamento');
      setCheckingOut(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="pt-24 pb-12 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/events" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Continuar a ver
          </Link>

          <h1 className="font-serif text-4xl font-semibold mb-8">Carrinho</h1>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 bg-white/5" />
              ))}
            </div>
          ) : cart.items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingCart className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-serif text-2xl mb-2">Carrinho vazio</h3>
              <p className="text-white/60 mb-6">Adicione algumas fotos para continuar</p>
              <Link to="/events">
                <Button className="btn-primary">Ver eventos</Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.items.map((item, index) => (
                  <motion.div
                    key={item.photo_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 p-4 bg-obsidian-paper border border-white/5"
                    data-testid={`cart-item-${item.photo_id}`}
                  >
                    <img
                      src={`${API}/photos/file/${item.photo_id}/thumbnail`}
                      alt="Photo"
                      className="w-24 h-24 object-cover"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Foto #{item.photo_id.slice(-6)}</p>
                        <Link to={`/events/${item.event_id}`} className="text-gold text-sm hover:underline">
                          Ver evento
                        </Link>
                      </div>
                      <p className="text-lg font-semibold">€{item.price.toFixed(2)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.photo_id)}
                      disabled={removing[item.photo_id]}
                      className="text-white/40 hover:text-red-400"
                    >
                      {removing[item.photo_id] ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 bg-obsidian-paper border border-white/5 p-6">
                  <h3 className="font-serif text-xl mb-4">Resumo</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">{cart.items.length} foto(s)</span>
                      <span>€{cart.total.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-3 flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-gold">€{cart.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCheckout}
                    className="w-full btn-primary mt-6 flex items-center justify-center gap-2"
                    disabled={checkingOut}
                    data-testid="checkout-btn"
                  >
                    {checkingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        A processar...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pagar com cartão
                      </>
                    )}
                  </Button>

                  <p className="text-white/40 text-xs text-center mt-4">
                    Pagamento seguro via Stripe
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const { refreshCart } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [retries, setRetries] = useState(0);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API}/checkout/status/${sessionId}`, {
          withCredentials: true
        });
        
        if (response.data.payment_status === 'paid') {
          setStatus('success');
          refreshCart();
        } else if (response.data.status === 'expired') {
          setStatus('expired');
        } else if (retries < 5) {
          // Keep polling
          setTimeout(() => setRetries(r => r + 1), 2000);
        } else {
          setStatus('pending');
        }
      } catch (error) {
        console.error('Error checking status:', error);
        setStatus('error');
      }
    };

    checkStatus();
  }, [sessionId, retries, refreshCart]);

  return (
    <Layout>
      <div className="pt-24 pb-12 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full text-center p-8">
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="w-16 h-16 text-gold mx-auto mb-6 animate-spin" />
              <h2 className="font-serif text-2xl mb-2">A verificar pagamento...</h2>
              <p className="text-white/60">Por favor aguarde</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h2 className="font-serif text-3xl mb-2">Pagamento concluído!</h2>
              <p className="text-white/60 mb-8">
                As suas fotos estão disponíveis para download
              </p>
              <div className="flex flex-col gap-3">
                <Link to="/purchases">
                  <Button className="w-full btn-primary">Ver minhas compras</Button>
                </Link>
                <Link to="/events">
                  <Button className="w-full btn-secondary">Continuar a explorar</Button>
                </Link>
              </div>
            </motion.div>
          )}

          {status === 'pending' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
              <h2 className="font-serif text-2xl mb-2">Pagamento a processar</h2>
              <p className="text-white/60 mb-8">
                O seu pagamento está a ser processado. Receberá um email de confirmação.
              </p>
              <Link to="/events">
                <Button className="btn-secondary">Voltar aos eventos</Button>
              </Link>
            </motion.div>
          )}

          {(status === 'error' || status === 'expired') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h2 className="font-serif text-2xl mb-2">
                {status === 'expired' ? 'Sessão expirada' : 'Erro no pagamento'}
              </h2>
              <p className="text-white/60 mb-8">
                {status === 'expired' 
                  ? 'A sessão de pagamento expirou. Tente novamente.'
                  : 'Ocorreu um erro. Por favor tente novamente.'
                }
              </p>
              <Link to="/cart">
                <Button className="btn-primary">Voltar ao carrinho</Button>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
};
