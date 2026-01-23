import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { Button } from '../components/ui/button';
import { Camera, Search, ShoppingBag, Download, ArrowRight } from 'lucide-react';

const Landing = () => {
  const { getBackground } = useSiteSettings();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={getBackground('hero')}
            alt="Fine art photography"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-obsidian/50 via-obsidian/30 to-obsidian" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <p className="text-gold text-sm uppercase tracking-[0.4em] mb-6">Fine Art Photography</p>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-normal leading-tight mb-6">
              Histórias contadas
              <br />
              <span className="italic">através da luz</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 font-light">
              Capturo momentos autênticos e emoções genuínas. 
              Cada imagem é uma memória eternizada com um toque artístico e cinematográfico.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/events">
                <Button className="btn-primary flex items-center gap-2">
                  Ver Galerias
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button className="btn-secondary">
                  Área de Cliente
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border border-white/20 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-gold rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-obsidian-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold mb-4">
              Como funciona
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              A sua experiência personalizada em três passos simples
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: 'Encontre-se',
                description: 'Use a nossa tecnologia de reconhecimento facial para encontrar automaticamente todas as suas fotos no evento.'
              },
              {
                icon: ShoppingBag,
                title: 'Escolha',
                description: 'Navegue pela galeria, selecione as suas fotos favoritas e adicione ao carrinho com um clique.'
              },
              {
                icon: Download,
                title: 'Descarregue',
                description: 'Após a compra, descarregue as suas fotos em alta resolução, sem marca de água.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="group p-8 bg-obsidian border border-white/5 hover:border-gold/30 transition-colors"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 mb-6 flex items-center justify-center border border-gold/30 group-hover:bg-gold group-hover:border-gold transition-colors">
                  <feature.icon className="w-6 h-6 text-gold group-hover:text-black transition-colors" />
                </div>
                <h3 className="font-serif text-2xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-white/50">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div>
              <h2 className="font-serif text-4xl sm:text-5xl font-semibold mb-2">
                Galeria de eventos
              </h2>
              <p className="text-white/60">Os momentos mais recentes capturados</p>
            </div>
            <Link to="/events">
              <Button className="btn-secondary">
                Ver todos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          {/* Tetris Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div 
              className="col-span-2 row-span-2 img-zoom"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative h-full min-h-[400px]">
                <img 
                  src={getBackground('login')}
                  alt="Photographer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 image-overlay" />
                <div className="absolute bottom-6 left-6">
                  <span className="text-gold text-sm uppercase tracking-widest">Em destaque</span>
                  <h3 className="font-serif text-2xl mt-1">Sessão Profissional</h3>
                </div>
              </div>
            </motion.div>
            
            {['gallery1', 'gallery2', 'gallery3', 'gallery4'].map((key, index) => (
              <motion.div
                key={key}
                className="img-zoom"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
              >
                <div className="relative h-48">
                  <img 
                    src={getBackground(key)}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gold" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-obsidian-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold mb-6">
              Pronto para encontrar as suas fotos?
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto">
              Registe-se gratuitamente e comece a explorar os eventos. 
              Use a nossa tecnologia de reconhecimento facial para encontrar todas as suas fotos.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button className="btn-primary animate-pulse-gold">
                  Criar conta gratuita
                </Button>
              </Link>
              <Link to="/events">
                <Button className="btn-secondary">
                  Explorar eventos
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Landing;
