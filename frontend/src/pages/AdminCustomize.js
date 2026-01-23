import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { 
  Image, Upload, Loader2, RotateCcw, Check, 
  Camera, Home, LogIn, UserPlus, Grid
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BACKGROUND_LABELS = {
  hero: { label: 'Página Inicial - Hero', icon: Home, description: 'Imagem de fundo principal da landing page' },
  login: { label: 'Página de Login', icon: LogIn, description: 'Imagem lateral na página de login' },
  register: { label: 'Página de Registo', icon: UserPlus, description: 'Imagem lateral na página de registo' },
  gallery1: { label: 'Galeria - Imagem 1', icon: Grid, description: 'Primeira imagem da galeria na landing page' },
  gallery2: { label: 'Galeria - Imagem 2', icon: Grid, description: 'Segunda imagem da galeria na landing page' },
  gallery3: { label: 'Galeria - Imagem 3', icon: Grid, description: 'Terceira imagem da galeria na landing page' },
  gallery4: { label: 'Galeria - Imagem 4', icon: Grid, description: 'Quarta imagem da galeria na landing page' },
};

const AdminCustomize = () => {
  const { isAdmin } = useAuth();
  const { backgrounds, refreshBackgrounds } = useSiteSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [resetting, setResetting] = useState({});

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    setLoading(false);
  }, [isAdmin, navigate]);

  const handleUpload = async (imageKey, file) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [imageKey]: true }));

    const formData = new FormData();
    formData.append('image_key', imageKey);
    formData.append('file', file);

    try {
      await axios.post(`${API}/admin/settings/backgrounds/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Imagem atualizada com sucesso!');
      refreshBackgrounds();
    } catch (error) {
      toast.error('Erro ao carregar imagem');
      console.error('Upload error:', error);
    } finally {
      setUploading(prev => ({ ...prev, [imageKey]: false }));
    }
  };

  const handleReset = async (imageKey) => {
    setResetting(prev => ({ ...prev, [imageKey]: true }));

    try {
      await axios.delete(`${API}/admin/settings/backgrounds/${imageKey}`, {
        withCredentials: true
      });
      toast.success('Imagem restaurada para o padrão');
      refreshBackgrounds();
    } catch (error) {
      toast.error('Erro ao restaurar imagem');
    } finally {
      setResetting(prev => ({ ...prev, [imageKey]: false }));
    }
  };

  if (!isAdmin) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold mb-2">Personalização</h1>
        <p className="text-white/60">
          Altere as imagens de fundo do site para personalizar a experiência dos seus clientes
        </p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(BACKGROUND_LABELS).map(([key, config], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-obsidian-paper border border-white/5 overflow-hidden"
              data-testid={`bg-card-${key}`}
            >
              {/* Preview Image */}
              <div className="relative h-48 bg-obsidian-subtle">
                {backgrounds[key] ? (
                  <img
                    src={backgrounds[key]}
                    alt={config.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-12 h-12 text-white/20" />
                  </div>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  {/* Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUpload(key, e.target.files?.[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={uploading[key]}
                    />
                    <Button 
                      className="btn-primary flex items-center gap-2"
                      disabled={uploading[key]}
                    >
                      {uploading[key] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Alterar
                    </Button>
                  </div>

                  {/* Reset Button */}
                  <Button
                    variant="ghost"
                    onClick={() => handleReset(key)}
                    disabled={resetting[key]}
                    className="text-white hover:text-gold"
                  >
                    {resetting[key] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <config.icon className="w-5 h-5 text-gold" />
                  <h3 className="font-semibold">{config.label}</h3>
                </div>
                <p className="text-white/50 text-sm">{config.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 p-6 bg-obsidian-paper border border-gold/20">
        <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
          <Camera className="w-5 h-5 text-gold" />
          Dicas para melhores resultados
        </h3>
        <ul className="space-y-2 text-white/60 text-sm">
          <li>• Use imagens de alta qualidade (mínimo 1920x1080 pixels)</li>
          <li>• Prefira imagens com tons escuros para melhor contraste com o texto</li>
          <li>• Formatos aceites: JPG, PNG, WebP</li>
          <li>• Tamanho máximo recomendado: 5MB por imagem</li>
          <li>• As imagens da galeria ficam melhor com orientação vertical (portrait)</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminCustomize;
