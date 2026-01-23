import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { 
  Calendar as CalendarIcon, 
  Camera, LayoutDashboard, Image, Users, 
  Plus, Upload, Trash2, Edit, ChevronRight,
  TrendingUp, DollarSign, Eye, Loader2, X, Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin Layout with Sidebar
export const AdminLayout = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/admin/events', label: 'Eventos', icon: CalendarIcon },
    { path: '/admin/clients', label: 'Clientes', icon: Users },
    { path: '/admin/customize', label: 'Personalização', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-obsidian flex">
      {/* Sidebar */}
      <aside className="w-64 bg-obsidian-paper border-r border-white/5 fixed left-0 top-0 bottom-0 z-40">
        <div className="p-6 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-gold" />
            <span className="font-serif text-xl">LUMINA</span>
          </Link>
          <p className="text-white/40 text-sm mt-1">Painel Admin</p>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-gold/10 text-gold' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold font-semibold">{user?.name?.[0]}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};

// Dashboard
export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/admin/stats`, {
          withCredentials: true
        });
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Eventos', value: stats?.total_events || 0, icon: CalendarIcon, color: 'text-blue-400' },
    { label: 'Fotos', value: stats?.total_photos || 0, icon: Image, color: 'text-green-400' },
    { label: 'Clientes', value: stats?.total_users || 0, icon: Users, color: 'text-purple-400' },
    { label: 'Vendas', value: stats?.total_purchases || 0, icon: TrendingUp, color: 'text-gold' },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-obsidian-paper border border-white/5 p-6"
          >
            {loading ? (
              <Skeleton className="h-20 bg-white/5" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="text-white/60 text-sm">{stat.label}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Revenue Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-obsidian-paper border border-white/5 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-6 h-6 text-gold" />
          <h2 className="font-serif text-xl">Receita Total</h2>
        </div>
        {loading ? (
          <Skeleton className="h-12 w-32 bg-white/5" />
        ) : (
          <p className="text-4xl font-semibold text-gold">
            €{(stats?.total_revenue || 0).toFixed(2)}
          </p>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/admin/events">
          <Button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Criar evento
          </Button>
        </Link>
        <Link to="/admin/clients">
          <Button className="btn-secondary flex items-center gap-2">
            <Users className="w-4 h-4" />
            Ver clientes
          </Button>
        </Link>
      </div>
    </div>
  );
};

// Events Management
export const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [uploading, setUploading] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: new Date(),
    is_public: false
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`, {
        withCredentials: true
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      await axios.post(`${API}/events`, {
        ...formData,
        date: formData.date.toISOString().split('T')[0]
      }, {
        withCredentials: true
      });
      toast.success('Evento criado com sucesso');
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', date: new Date(), is_public: false });
      fetchEvents();
    } catch (error) {
      toast.error('Erro ao criar evento');
    }
  };

  const handleUpdateEvent = async () => {
    try {
      await axios.put(`${API}/events/${editingEvent.event_id}`, {
        ...formData,
        date: formData.date.toISOString().split('T')[0]
      }, {
        withCredentials: true
      });
      toast.success('Evento atualizado');
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      toast.error('Erro ao atualizar evento');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Tem certeza? Todas as fotos serão apagadas.')) return;
    
    try {
      await axios.delete(`${API}/events/${eventId}`, {
        withCredentials: true
      });
      toast.success('Evento apagado');
      fetchEvents();
    } catch (error) {
      toast.error('Erro ao apagar evento');
    }
  };

  const handlePhotoUpload = async (eventId, files) => {
    setUploading(prev => ({ ...prev, [eventId]: true }));
    
    const formData = new FormData();
    for (const file of files) {
      formData.append('file', file);
      formData.append('event_id', eventId);
      formData.append('price', '10.0');
      
      try {
        await axios.post(`${API}/photos/upload`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (error) {
        toast.error(`Erro ao carregar ${file.name}`);
      }
      formData.delete('file');
    }
    
    toast.success('Fotos carregadas com sucesso');
    setUploading(prev => ({ ...prev, [eventId]: false }));
    fetchEvents();
  };

  const openEditDialog = (event) => {
    setFormData({
      name: event.name,
      description: event.description,
      date: new Date(event.date),
      is_public: event.is_public
    });
    setEditingEvent(event);
  };

  const formatDate = (dateStr) => {
    return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: pt });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-semibold">Eventos</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="btn-primary flex items-center gap-2" data-testid="create-event-btn">
              <Plus className="w-4 h-4" />
              Criar evento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-obsidian-paper border-white/10">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo Evento</DialogTitle>
            </DialogHeader>
            <EventForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleCreateEvent}
              submitLabel="Criar evento"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 bg-white/5" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <CalendarIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">Sem eventos</h3>
          <p className="text-white/60">Crie o seu primeiro evento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <motion.div
              key={event.event_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-obsidian-paper border border-white/5 p-6"
              data-testid={`admin-event-${event.event_id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-serif text-xl font-semibold">{event.name}</h3>
                    {event.is_public ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs uppercase tracking-wider">
                        Público
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-white/10 text-white/60 text-xs uppercase tracking-wider">
                        Privado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-white/60 text-sm">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {formatDate(event.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      {event.photo_count} fotos
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-white/50 mt-2 line-clamp-1">{event.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Upload Photos */}
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(event.event_id, Array.from(e.target.files || []))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading[event.event_id]}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      disabled={uploading[event.event_id]}
                      className="text-white/60 hover:text-gold"
                    >
                      {uploading[event.event_id] ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </Button>
                  </div>

                  {/* Edit */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openEditDialog(event)}
                    className="text-white/60 hover:text-white"
                  >
                    <Edit className="w-5 h-5" />
                  </Button>

                  {/* Delete */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteEvent(event.event_id)}
                    className="text-white/60 hover:text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>

                  {/* View */}
                  <Link to={`/events/${event.event_id}`}>
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-gold">
                      <Eye className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="bg-obsidian-paper border-white/10">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar Evento</DialogTitle>
          </DialogHeader>
          <EventForm 
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={handleUpdateEvent}
            submitLabel="Guardar alterações"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Event Form Component
const EventForm = ({ formData, setFormData, onSubmit, submitLabel }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit();
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do evento</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Casamento João e Maria"
          className="bg-obsidian border-white/10 focus:border-gold"
          required
          data-testid="event-name-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Uma breve descrição do evento..."
          className="bg-obsidian border-white/10 focus:border-gold min-h-[100px]"
          data-testid="event-description-input"
        />
      </div>

      <div className="space-y-2">
        <Label>Data do evento</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left bg-obsidian border-white/10 hover:bg-white/5"
              data-testid="event-date-btn"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(formData.date, "d 'de' MMMM, yyyy", { locale: pt })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-obsidian-paper border-white/10">
            <Calendar
              mode="single"
              selected={formData.date}
              onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
              locale={pt}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="public">Evento público</Label>
          <p className="text-white/40 text-sm">Visível na página de eventos</p>
        </div>
        <Switch
          id="public"
          checked={formData.is_public}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
          data-testid="event-public-switch"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full btn-primary"
        disabled={submitting || !formData.name}
        data-testid="event-submit-btn"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A processar...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
};

// Clients Management
export const AdminClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get(`${API}/admin/clients`, {
          withCredentials: true
        });
        setClients(response.data);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const formatDate = (dateStr) => {
    return format(new Date(dateStr), "d MMM yyyy", { locale: pt });
  };

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold mb-8">Clientes</h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 bg-white/5" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">Sem clientes</h3>
          <p className="text-white/60">Os clientes aparecerão aqui quando se registarem</p>
        </div>
      ) : (
        <div className="bg-obsidian-paper border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-4 text-white/60 text-sm font-medium uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-4 text-white/60 text-sm font-medium uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 text-white/60 text-sm font-medium uppercase tracking-wider">Registado</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <motion.tr
                  key={client.user_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {client.picture ? (
                        <img src={client.picture} alt={client.name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                          <span className="text-gold font-semibold">{client.name?.[0]}</span>
                        </div>
                      )}
                      <span className="font-medium">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/60">{client.email}</td>
                  <td className="px-6 py-4 text-white/60">
                    {client.created_at ? formatDate(client.created_at) : '-'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
