import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { 
  ArrowLeft, Upload, Trash2, Loader2, Image, 
  Calendar, Check, X, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminEventPhotos = () => {
  const { eventId } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [deleting, setDeleting] = useState({});
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchEvent();
    fetchPhotos();
  }, [isAdmin, eventId, navigate]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/events/${eventId}`, {
        withCredentials: true
      });
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Erro ao carregar evento');
    }
  };

  const fetchPhotos = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/events/${eventId}/photos`, {
        withCredentials: true
      });
      setPhotos(response.data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('event_id', eventId);
      formData.append('price', '10.0');

      try {
        await axios.post(`${API}/photos/upload`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        errorCount++;
      }
      
      setUploadProgress({ current: i + 1, total: files.length });
    }

    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });

    if (successCount > 0) {
      toast.success(`${successCount} foto(s) carregada(s) com sucesso`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} foto(s) falharam`);
    }

    fetchPhotos();
    fetchEvent();
  };

  const handleDeletePhoto = async (photoId) => {
    setDeleting(prev => ({ ...prev, [photoId]: true }));
    
    try {
      await axios.delete(`${API}/photos/${photoId}`, {
        withCredentials: true
      });
      
      setPhotos(prev => prev.filter(p => p.photo_id !== photoId));
      setSelectedPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
      
      toast.success('Foto eliminada');
      fetchEvent(); // Update photo count
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erro ao eliminar foto');
    } finally {
      setDeleting(prev => ({ ...prev, [photoId]: false }));
      setShowDeleteDialog(false);
      setPhotoToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    const photoIds = Array.from(selectedPhotos);
    
    for (const photoId of photoIds) {
      setDeleting(prev => ({ ...prev, [photoId]: true }));
      
      try {
        await axios.delete(`${API}/photos/${photoId}`, {
          withCredentials: true
        });
        
        setPhotos(prev => prev.filter(p => p.photo_id !== photoId));
      } catch (error) {
        console.error(`Error deleting photo ${photoId}:`, error);
      } finally {
        setDeleting(prev => ({ ...prev, [photoId]: false }));
      }
    }
    
    setSelectedPhotos(new Set());
    setShowBulkDeleteDialog(false);
    toast.success(`${photoIds.length} foto(s) eliminada(s)`);
    fetchEvent();
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const selectAllPhotos = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.photo_id)));
    }
  };

  const confirmDelete = (photoId) => {
    setPhotoToDelete(photoId);
    setShowDeleteDialog(true);
  };

  if (!isAdmin) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link 
          to="/admin/events" 
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos eventos
        </Link>
        
        {event ? (
          <>
            <h1 className="font-serif text-3xl font-semibold mb-2">{event.name}</h1>
            <div className="flex items-center gap-4 text-white/60">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleDateString('pt-PT')}
              </span>
              <span className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                {photos.length} fotos
              </span>
            </div>
          </>
        ) : (
          <Skeleton className="h-10 w-1/2 bg-white/5" />
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-obsidian-paper border border-white/5">
        <div className="flex items-center gap-4">
          {/* Upload */}
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleUpload(Array.from(e.target.files || []))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <Button 
              className="btn-primary flex items-center gap-2"
              disabled={uploading}
              data-testid="upload-photos-btn"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress.current}/{uploadProgress.total}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Carregar fotos
                </>
              )}
            </Button>
          </div>

          {/* Select All */}
          {photos.length > 0 && (
            <Button
              variant="ghost"
              onClick={selectAllPhotos}
              className="text-white/60 hover:text-white"
            >
              {selectedPhotos.size === photos.length ? 'Desselecionar tudo' : 'Selecionar tudo'}
            </Button>
          )}
        </div>

        {/* Bulk Delete */}
        {selectedPhotos.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setShowBulkDeleteDialog(true)}
            className="flex items-center gap-2"
            data-testid="bulk-delete-btn"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar {selectedPhotos.size} selecionada(s)
          </Button>
        )}
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square bg-white/5" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20">
          <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">Sem fotos</h3>
          <p className="text-white/60 mb-6">
            Carregue fotos para este evento
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {photos.map((photo, index) => (
              <motion.div
                key={photo.photo_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
                className={`group relative aspect-square border-2 transition-colors ${
                  selectedPhotos.has(photo.photo_id) 
                    ? 'border-gold' 
                    : 'border-transparent hover:border-white/20'
                }`}
                data-testid={`photo-item-${photo.photo_id}`}
              >
                <img
                  src={photo.thumbnail_url.startsWith('/api') 
                    ? `${BACKEND_URL}${photo.thumbnail_url}` 
                    : photo.thumbnail_url
                  }
                  alt={photo.filename}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => togglePhotoSelection(photo.photo_id)}
                />

                {/* Selection Checkbox */}
                <div 
                  className={`absolute top-2 left-2 w-6 h-6 border-2 flex items-center justify-center cursor-pointer transition-colors ${
                    selectedPhotos.has(photo.photo_id)
                      ? 'bg-gold border-gold'
                      : 'bg-black/50 border-white/50 group-hover:border-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePhotoSelection(photo.photo_id);
                  }}
                >
                  {selectedPhotos.has(photo.photo_id) && (
                    <Check className="w-4 h-4 text-black" />
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(photo.photo_id);
                  }}
                  disabled={deleting[photo.photo_id]}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`delete-photo-${photo.photo_id}`}
                >
                  {deleting[photo.photo_id] ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-white" />
                  )}
                </button>

                {/* Storage Type Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-[10px] uppercase tracking-wider">
                  {photo.storage_type === 'cloudinary' ? 'Cloud' : 'Local'}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-obsidian-paper border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Eliminar foto
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem a certeza que deseja eliminar esta foto? Esta ação não pode ser revertida.
              A foto será eliminada permanentemente do servidor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => photoToDelete && handleDeletePhoto(photoToDelete)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent className="bg-obsidian-paper border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Eliminar {selectedPhotos.size} fotos
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem a certeza que deseja eliminar {selectedPhotos.size} foto(s) selecionada(s)? 
              Esta ação não pode ser revertida. As fotos serão eliminadas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Eliminar {selectedPhotos.size} foto(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEventPhotos;
