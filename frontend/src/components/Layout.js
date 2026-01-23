import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Camera, ShoppingCart, User, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export const Navbar = () => {
  const { user, logout, cartCount, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <Camera className="w-6 h-6 text-gold transition-transform group-hover:scale-110" />
            <span className="font-serif text-xl font-semibold tracking-wide">LUMINA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/events" 
              className={`text-sm uppercase tracking-widest transition-colors ${
                isActive('/events') ? 'text-gold' : 'text-white/60 hover:text-white'
              }`}
            >
              Eventos
            </Link>
            {user && (
              <Link 
                to="/my-photos" 
                className={`text-sm uppercase tracking-widest transition-colors ${
                  isActive('/my-photos') ? 'text-gold' : 'text-white/60 hover:text-white'
                }`}
              >
                Minhas Fotos
              </Link>
            )}
            {isAdmin && (
              <Link 
                to="/admin" 
                className={`text-sm uppercase tracking-widest transition-colors ${
                  location.pathname.startsWith('/admin') ? 'text-gold' : 'text-white/60 hover:text-white'
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Cart */}
                <Link to="/cart" className="relative p-2 text-white/60 hover:text-white transition-colors">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-black text-xs font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 text-white/60 hover:text-white">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                      <span className="hidden sm:inline text-sm">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-obsidian-paper border-white/10">
                    <DropdownMenuItem asChild>
                      <Link to="/my-photos" className="flex items-center gap-2 cursor-pointer">
                        <Camera className="w-4 h-4" />
                        Minhas Fotos
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/purchases" className="flex items-center gap-2 cursor-pointer">
                        <ShoppingCart className="w-4 h-4" />
                        Compras
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                            <LayoutDashboard className="w-4 h-4" />
                            Painel Admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-red-400">
                      <LogOut className="w-4 h-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" className="text-white/60 hover:text-white text-sm uppercase tracking-widest">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="btn-primary text-xs">
                    Registar
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-white/60 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/5">
            <div className="flex flex-col gap-4">
              <Link 
                to="/events" 
                className="text-sm uppercase tracking-widest text-white/60 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Eventos
              </Link>
              {user && (
                <Link 
                  to="/my-photos" 
                  className="text-sm uppercase tracking-widest text-white/60 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Minhas Fotos
                </Link>
              )}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="text-sm uppercase tracking-widest text-white/60 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export const Footer = () => {
  return (
    <footer className="bg-obsidian border-t border-white/5 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gold" />
            <span className="font-serif text-lg">LUMINA</span>
          </div>
          <div className="flex items-center gap-8">
            <Link to="/events" className="text-sm text-white/40 hover:text-white transition-colors">
              Eventos
            </Link>
            <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">
              Contacto
            </a>
            <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">
              Termos
            </a>
          </div>
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Lumina Photography
          </p>
        </div>
      </div>
    </footer>
  );
};

export const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-obsidian">
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};
