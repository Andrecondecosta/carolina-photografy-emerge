import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Download, Image, Calendar, ArrowLeft, ExternalLink } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Purchases = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchPurchases();
  }, [isAuthenticated, navigate]);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get(`${API}/purchases`, {
        withCredentials: true
      });
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="pt-24 pb-12 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/events" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Ver mais eventos
          </Link>

          <h1 className="font-serif text-4xl font-semibold mb-2">Minhas Compras</h1>
          <p className="text-white/60 mb-8">
            Todas as suas fotos compradas disponíveis para download
          </p>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square bg-white/5" />
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-20">
              <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-serif text-2xl mb-2">Ainda não comprou fotos</h3>
              <p className="text-white/60 mb-6">
                Explore os eventos e encontre as suas fotos favoritas
              </p>
              <Link to="/events">
                <Button className="btn-primary">Ver eventos</Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchases.map((purchase, index) => (
                <motion.div
                  key={purchase.purchase_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-obsidian-paper border border-white/5 overflow-hidden"
                  data-testid={`purchase-${purchase.purchase_id}`}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={`${API}/photos/file/${purchase.photo_id}/thumbnail`}
                      alt={purchase.filename}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a 
                        href={`${API}/photos/file/${purchase.photo_id}/original`}
                        download
                        className="btn-primary px-6 py-3 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download HD
                      </a>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(purchase.purchased_at)}
                        </p>
                      </div>
                      <Link 
                        to={`/events/${purchase.event_id}`}
                        className="text-gold text-sm hover:underline flex items-center gap-1"
                      >
                        Ver evento
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Purchases;
