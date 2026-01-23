import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { Calendar, Image, ChevronRight, Search } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
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
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-12 bg-obsidian-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold mb-4">
              Eventos
            </h1>
            <p className="text-white/60 text-lg mb-8 max-w-2xl">
              Explore os nossos eventos e encontre as suas fotografias
            </p>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder="Pesquisar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 bg-obsidian border-white/10 focus:border-gold h-12"
                data-testid="events-search-input"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-obsidian-paper border border-white/5 overflow-hidden">
                  <Skeleton className="h-64 w-full bg-white/5" />
                  <div className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-3 bg-white/5" />
                    <Skeleton className="h-4 w-1/2 bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-serif text-2xl mb-2">Nenhum evento encontrado</h3>
              <p className="text-white/60">
                {searchTerm ? 'Tente uma pesquisa diferente' : 'Ainda não há eventos públicos'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.event_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link to={`/events/${event.event_id}`} data-testid={`event-card-${event.event_id}`}>
                    <div className="group bg-obsidian-paper border border-white/5 hover:border-gold/30 overflow-hidden card-hover">
                      {/* Cover Image */}
                      <div className="relative h-64 overflow-hidden">
                        {event.cover_photo ? (
                          <img
                            src={`${API}/photos/file/${event.cover_photo}/watermarked`}
                            alt={event.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-obsidian-subtle flex items-center justify-center">
                            <Image className="w-16 h-16 text-white/10" />
                          </div>
                        )}
                        <div className="absolute inset-0 image-overlay opacity-60" />
                        
                        {/* Photo count badge */}
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 flex items-center gap-2">
                          <Image className="w-4 h-4 text-gold" />
                          <span className="text-sm">{event.photo_count} fotos</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="font-serif text-2xl font-semibold mb-2 group-hover:text-gold transition-colors">
                          {event.name}
                        </h3>
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-3">
                          <Calendar className="w-4 h-4" />
                          {formatDate(event.date)}
                        </div>
                        {event.description && (
                          <p className="text-white/60 line-clamp-2 mb-4">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center text-gold text-sm uppercase tracking-widest">
                          Ver galeria
                          <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Events;
