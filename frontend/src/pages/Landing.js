import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Camera, Search, ShoppingBag, Download, ArrowRight } from 'lucide-react';

const Landing = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1673195577797-d86fd842ade8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY291cGxlJTIwYXJ0aXN0aWMlMjBkYXJrJTIwbW9vZHl8ZW58MHx8fHwxNzY5MTczNjU0fDA&ixlib=rb-4.1.0&q=85"
            alt="Wedding photography"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-obsidian/60 via-obsidian/40 to-obsidian" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-semibold leading-tight mb-6">
              Momentos eternos,
              <br />
              <span className="gold-text">memórias suas</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-xl mb-10 font-light">
              Encontre-se nas fotografias do seu evento especial. 
              A nossa tecnologia de reconhecimento facial encontra automaticamente as suas melhores fotos.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/events">
                <Button className="btn-primary flex items-center gap-2">
                  Ver Eventos
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
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
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
                  src="https://images.unsplash.com/photo-1607076490946-26ada294e017?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwzfHxwaG90b2dyYXBoZXIlMjBob2xkaW5nJTIwY2FtZXJhJTIwc2lsaG91ZXR0ZXxlbnwwfHx8fDE3NjkxNzM2NTl8MA&ixlib=rb-4.1.0&q=85"
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
            
            {[
              "https://images.pexels.com/photos/13446936/pexels-photo-13446936.jpeg",
              "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=1000",
              "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800"
            ].map((img, index) => (
              <motion.div
                key={index}
                className="img-zoom"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
              >
                <div className="relative h-48">
                  <img 
                    src={img}
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
