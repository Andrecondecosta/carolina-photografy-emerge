import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  Image, Search, Upload, Loader2, Camera, X, Check, ShoppingCart, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MyPhotos = () => {
  const { user, isAuthenticated, refreshCart } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  
  // Face search
  const [showFaceSearch, setShowFaceSearch] = useState(false);
  const [faceSearchLoading, setFaceSearchLoading] = useState(false);
  const [matchedPhotos, setMatchedPhotos] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [addingToCart, setAddingToCart] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchEvents();
  }, [isAuthenticated, navigate]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events?public_only=true`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async (eventId) => {
    setPhotosLoading(true);
    try {
      const response = await axios.get(`${API}/photos/event/${eventId}`, {
        withCredentials: true
      });
      setPhotos(response.data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setMatchedPhotos(null);
    fetchPhotos(event.event_id);
  };

  const handleFaceSearch = async () => {
    if (!faceImage) {
      toast.error('Selecione uma foto sua');
      return;
    }

    setFaceSearchLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      
      try {
        const response = await axios.post(`${API}/photos/face-search`, {
          image_base64: base64,
          event_id: selectedEvent?.event_id || null
        }, {
          withCredentials: true
        });
        
        setMatchedPhotos(response.data);
        setShowFaceSearch(false);
        toast.success(`Encontradas ${response.data.matching_photos.length} fotos!`);
      } catch (error) {
        toast.error('Erro no reconhecimento facial');
      } finally {
        setFaceSearchLoading(false);
      }
    };
    reader.readAsDataURL(faceImage);
  };

  const clearFaceSearch = () => {
    setMatchedPhotos(null);
    setFaceImage(null);
  };

  const addToCart = async (photoId) => {
    setAddingToCart(prev => ({ ...prev, [photoId]: true }));
    try {
      await axios.post(`${API}/cart/add`, { photo_id: photoId }, {
        withCredentials: true
      });
      toast.success('Adicionado ao carrinho');
      refreshCart();
    } catch (error) {
      if (error.response?.data?.detail === 'Photo already purchased') {
        toast.info('Esta foto já foi comprada');
      } else {
        toast.error('Erro ao adicionar ao carrinho');
      }
    } finally {
      setAddingToCart(prev => ({ ...prev, [photoId]: false }));
    }
  };

  const displayPhotos = matchedPhotos ? matchedPhotos.matching_photos : photos;

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="pt-24 pb-12 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-semibold mb-2">Minhas Fotos</h1>
            <p className="text-white/60">
              Encontre as suas fotos usando reconhecimento facial
            </p>
          </div>

          {/* Face Search Button */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Button 
              onClick={() => setShowFaceSearch(true)}
              className="btn-primary flex items-center gap-2"
              data-testid="my-photos-face-search-btn"
            >
              <Search className="w-4 h-4" />
              Encontrar-me nas fotos
            </Button>
            
            {matchedPhotos && (
              <Button 
                onClick={clearFaceSearch}
                variant="ghost"
                className="text-white/60 hover:text-white flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Limpar pesquisa ({matchedPhotos.matching_photos.length} encontradas)
              </Button>
            )}
          </div>

          {/* Events Filter */}
          {!matchedPhotos && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Selecionar evento</h2>
              {loading ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="w-48 h-24 flex-shrink-0 bg-white/5" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {events.map((event) => (
                    <button
                      key={event.event_id}
                      onClick={() => handleEventSelect(event)}
                      className={`flex-shrink-0 p-4 border transition-colors text-left ${
                        selectedEvent?.event_id === event.event_id
                          ? 'border-gold bg-gold/10'
                          : 'border-white/10 bg-obsidian-paper hover:border-white/20'
                      }`}
                    >
                      <p className="font-semibold mb-1">{event.name}</p>
                      <p className="text-white/60 text-sm">{event.photo_count} fotos</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results Description */}
          {matchedPhotos && (
            <div className="mb-8 p-4 bg-obsidian-paper border border-gold/30">
              <p className="text-sm text-white/60 mb-2">
                Descrição da face pesquisada:
              </p>
              <p className="text-sm">{matchedPhotos.face_description}</p>
            </div>
          )}

          {/* Photos Grid */}
          {selectedEvent || matchedPhotos ? (
            photosLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="aspect-square bg-white/5" />
                ))}
              </div>
            ) : displayPhotos.length === 0 ? (
              <div className="text-center py-20">
                <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="font-serif text-2xl mb-2">
                  {matchedPhotos ? 'Nenhuma foto encontrada' : 'Sem fotos neste evento'}
                </h3>
                <p className="text-white/60">
                  {matchedPhotos 
                    ? 'Tente com outra fotografia sua'
                    : 'Selecione outro evento ou use a pesquisa facial'
                  }
                </p>
              </div>
            ) : (
              <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 768: 3, 1024: 4 }}>
                <Masonry gutter="16px">
                  {displayPhotos.map((photo, index) => (
                    <motion.div
                      key={photo.photo_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="group relative"
                    >
                      <img
                        src={`${API}/photos/file/${photo.photo_id}/watermarked`}
                        alt="Photo"
                        className="w-full object-cover"
                        loading="lazy"
                      />
                      
                      {/* Confidence badge */}
                      {photo.confidence && (
                        <div className="absolute top-2 right-2 bg-gold text-black px-2 py-1 text-xs font-bold">
                          {photo.confidence}%
                        </div>
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        {photo.is_purchased ? (
                          <>
                            <div className="flex items-center gap-2 text-green-400">
                              <Check className="w-5 h-5" />
                              <span>Comprada</span>
                            </div>
                            <a 
                              href={`${API}/photos/file/${photo.photo_id}/original`}
                              download
                            >
                              <Button size="sm" className="btn-primary">
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </a>
                          </>
                        ) : (
                          <>
                            <span className="text-gold font-semibold">€{photo.price?.toFixed(2) || '10.00'}</span>
                            <Button 
                              size="sm"
                              className="btn-primary"
                              onClick={() => addToCart(photo.photo_id)}
                              disabled={addingToCart[photo.photo_id]}
                            >
                              {addingToCart[photo.photo_id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Comprar
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </Masonry>
              </ResponsiveMasonry>
            )
          ) : (
            <div className="text-center py-20">
              <Camera className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-serif text-2xl mb-2">Selecione um evento</h3>
              <p className="text-white/60">
                Ou use a pesquisa facial para encontrar as suas fotos em todos os eventos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Face Search Modal */}
      <Dialog open={showFaceSearch} onOpenChange={setShowFaceSearch}>
        <DialogContent className="bg-obsidian-paper border-white/10">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Encontrar-me nas fotos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <p className="text-white/60">
              Carregue uma foto sua e a nossa tecnologia de reconhecimento facial encontrará automaticamente todas as suas fotos.
            </p>

            {/* Upload area */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFaceImage(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`border-2 border-dashed ${faceImage ? 'border-gold' : 'border-white/20'} p-8 text-center transition-colors`}>
                {faceImage ? (
                  <div className="space-y-3">
                    <img 
                      src={URL.createObjectURL(faceImage)} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover mx-auto"
                    />
                    <p className="text-white/60 text-sm">{faceImage.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-white/40 mx-auto mb-3" />
                    <p className="text-white/60">Clique ou arraste uma foto sua</p>
                    <p className="text-white/40 text-sm mt-1">JPG, PNG até 10MB</p>
                  </>
                )}
              </div>
            </div>

            <Button 
              onClick={handleFaceSearch}
              className="w-full btn-primary"
              disabled={!faceImage || faceSearchLoading}
            >
              {faceSearchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A procurar...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Procurar em {selectedEvent ? 'este evento' : 'todos os eventos'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default MyPhotos;
