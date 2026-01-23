import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  Calendar, Image, ArrowLeft, ShoppingCart, Check, 
  Download, X, Camera, Search, Upload, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EventGallery = () => {
  const { eventId } = useParams();
  const { user, isAuthenticated, refreshCart } = useAuth();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [addingToCart, setAddingToCart] = useState({});
  
  // Face search
  const [showFaceSearch, setShowFaceSearch] = useState(false);
  const [faceSearchLoading, setFaceSearchLoading] = useState(false);
  const [matchedPhotos, setMatchedPhotos] = useState(null);
  const [faceImage, setFaceImage] = useState(null);

  const fetchEvent = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/events/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  }, [eventId]);

  const fetchPhotos = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/photos/event/${eventId}`, {
        withCredentials: true
      });
      setPhotos(response.data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, isAuthenticated]);

  useEffect(() => {
    fetchEvent();
    fetchPhotos();
  }, [fetchEvent, fetchPhotos]);

  const addToCart = async (photoId) => {
    if (!isAuthenticated) {
      toast.error('Faça login para adicionar ao carrinho');
      return;
    }
    setAddingToCart(prev => ({ ...prev, [photoId]: true }));
    try {
      await axios.post(`${API}/cart/add`, { photo_id: photoId }, {
        withCredentials: true
      });
      toast.success('Adicionado ao carrinho');
      refreshCart();
      // Update photo state
      setPhotos(prev => prev.map(p => 
        p.photo_id === photoId ? { ...p, in_cart: true } : p
      ));
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

  const handleFaceSearch = async () => {
    if (!faceImage) {
      toast.error('Selecione uma foto sua');
      return;
    }

    setFaceSearchLoading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        
        try {
          const response = await axios.post(`${API}/photos/face-search`, {
            image_base64: base64,
            event_id: eventId
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
    } catch (error) {
      setFaceSearchLoading(false);
      toast.error('Erro ao processar imagem');
    }
  };

  const clearFaceSearch = () => {
    setMatchedPhotos(null);
    setFaceImage(null);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const displayPhotos = matchedPhotos ? matchedPhotos.matching_photos : photos;

  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-8 bg-obsidian-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/events" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos eventos
          </Link>

          {event ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold mb-4">
                {event.name}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-white/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {formatDate(event.date)}
                </div>
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  {event.photo_count} fotos
                </div>
              </div>
              {event.description && (
                <p className="text-white/60 mt-4 max-w-2xl">{event.description}</p>
              )}
            </motion.div>
          ) : (
            <div>
              <Skeleton className="h-12 w-1/2 mb-4 bg-white/5" />
              <Skeleton className="h-6 w-1/4 bg-white/5" />
            </div>
          )}
        </div>
      </section>

      {/* Actions bar */}
      {isAuthenticated && (
        <section className="py-4 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setShowFaceSearch(true)}
                className="btn-secondary flex items-center gap-2"
                data-testid="face-search-btn"
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
                  Limpar pesquisa
                </Button>
              )}
            </div>

            {matchedPhotos && (
              <p className="text-white/60">
                <span className="text-gold">{matchedPhotos.matching_photos.length}</span> fotos encontradas
              </p>
            )}
          </div>
        </section>
      )}

      {/* Gallery */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!isAuthenticated ? (
            <div className="text-center py-20">
              <Camera className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-serif text-2xl mb-2">Faça login para ver as fotos</h3>
              <p className="text-white/60 mb-6">
                Entre na sua conta para ver e comprar as fotos deste evento
              </p>
              <Link to="/login">
                <Button className="btn-primary">Entrar</Button>
              </Link>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="aspect-square bg-white/5" />
              ))}
            </div>
          ) : displayPhotos.length === 0 ? (
            <div className="text-center py-20">
              <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-serif text-2xl mb-2">
                {matchedPhotos ? 'Nenhuma foto encontrada' : 'Ainda não há fotos'}
              </h3>
              <p className="text-white/60">
                {matchedPhotos 
                  ? 'Tente com outra fotografia sua'
                  : 'As fotos deste evento ainda estão a ser carregadas'
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
                    className="group relative cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                    data-testid={`photo-${photo.photo_id}`}
                  >
                    <img
                      src={`${API}/photos/file/${photo.photo_id}/watermarked`}
                      alt={photo.filename}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      {photo.is_purchased ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <Check className="w-5 h-5" />
                          <span>Comprada</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-gold font-semibold">€{photo.price.toFixed(2)}</span>
                          <Button 
                            size="sm"
                            className="btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(photo.photo_id);
                            }}
                            disabled={addingToCart[photo.photo_id]}
                          >
                            {addingToCart[photo.photo_id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Adicionar
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Confidence badge for face search results */}
                    {matchedPhotos && photo.confidence && (
                      <div className="absolute top-2 right-2 bg-gold text-black px-2 py-1 text-xs font-bold">
                        {photo.confidence}% match
                      </div>
                    )}
                  </motion.div>
                ))}
              </Masonry>
            </ResponsiveMasonry>
          )}
        </div>
      </section>

      {/* Photo Detail Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
            <DialogContent className="max-w-4xl bg-obsidian-paper border-white/10 p-0 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="flex-1 bg-black">
                  <img
                    src={selectedPhoto.is_purchased 
                      ? `${API}/photos/file/${selectedPhoto.photo_id}/original`
                      : `${API}/photos/file/${selectedPhoto.photo_id}/watermarked`
                    }
                    alt={selectedPhoto.filename}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>

                {/* Details */}
                <div className="w-full md:w-80 p-6 flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-2xl">
                      {selectedPhoto.is_purchased ? 'Foto comprada' : 'Detalhes da foto'}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex-1 mt-4">
                    {selectedPhoto.is_purchased ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-400">
                          <Check className="w-5 h-5" />
                          <span>Esta foto foi comprada</span>
                        </div>
                        <p className="text-white/60 text-sm">
                          Pode descarregar a versão em alta resolução sem marca de água.
                        </p>
                        <a 
                          href={`${API}/photos/file/${selectedPhoto.photo_id}/original`}
                          download
                          className="block"
                        >
                          <Button className="w-full btn-primary flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Descarregar HD
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-3xl font-semibold text-gold">
                          €{selectedPhoto.price.toFixed(2)}
                        </div>
                        <p className="text-white/60 text-sm">
                          Após a compra, terá acesso à versão em alta resolução sem marca de água.
                        </p>
                        <Button 
                          className="w-full btn-primary flex items-center gap-2"
                          onClick={() => {
                            addToCart(selectedPhoto.photo_id);
                            setSelectedPhoto(null);
                          }}
                          disabled={addingToCart[selectedPhoto.photo_id]}
                        >
                          {addingToCart[selectedPhoto.photo_id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4" />
                              Adicionar ao carrinho
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Face Search Modal */}
      <Dialog open={showFaceSearch} onOpenChange={setShowFaceSearch}>
        <DialogContent className="bg-obsidian-paper border-white/10">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Encontrar-me nas fotos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <p className="text-white/60">
              Carregue uma foto sua e a nossa tecnologia de reconhecimento facial encontrará automaticamente todas as suas fotos neste evento.
            </p>

            {/* Upload area */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFaceImage(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                data-testid="face-search-input"
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
                  Procurar nas fotos
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default EventGallery;
