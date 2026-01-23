# Lumina Photography Platform - PRD

## Original Problem Statement
Criar um site para um fotógrafo onde cada cliente tenha a sua página particular e a fotografa tenha onde colocar as fotos de cada evento. Na página do cliente pode-se usar reconhecimento facial para encontrar as fotos do cliente e dar-lhe a possibilidade de comprar as fotografias.

## Architecture
- **Frontend**: React 19 with Tailwind CSS, Shadcn UI components, Framer Motion
- **Backend**: FastAPI with Python
- **Database**: MongoDB (Motor async driver)
- **AI**: Gemini 3 Flash via emergentintegrations for facial recognition
- **Payments**: Stripe via emergentintegrations
- **Authentication**: JWT + Google OAuth (Emergent Auth)

## User Personas
1. **Photographer (Admin)**
   - Creates and manages events
   - Uploads photos with automatic watermarking
   - Views sales statistics and revenue
   - Manages client list

2. **Client**
   - Registers via email/password or Google OAuth
   - Browses public event galleries
   - Uses facial recognition to find their photos
   - Purchases photos and downloads in high resolution

## Core Requirements (Static)
- [x] Dark luxury theme with gold accents
- [x] Event management (CRUD)
- [x] Photo upload with automatic watermarking
- [x] Photo thumbnails generation
- [x] AI facial recognition to find client in photos
- [x] Shopping cart functionality
- [x] Stripe payment integration
- [x] High-resolution download after purchase
- [x] Admin dashboard with statistics
- [x] Client management

## What's Been Implemented (January 2026)

### Backend (server.py)
- User authentication (JWT + Google OAuth)
- Event CRUD operations
- Photo upload with watermark generation
- Photo serving (thumbnail, watermarked, original)
- Face search using Gemini 3 Flash
- Cart management
- Stripe checkout integration
- Admin statistics and client management

### Frontend Pages
- Landing page with hero section
- Login/Register pages (Email + Google OAuth)
- Events listing page
- Event gallery with masonry layout
- Face search modal
- Cart page with checkout
- Checkout success page
- Purchases/downloads page
- My Photos page with face search
- Admin dashboard
- Admin events management
- Admin clients list

### Key Features
1. **Watermarking**: All uploaded photos get automatic "LUMINA © PREVIEW" watermark
2. **Facial Recognition**: Clients can upload their photo and AI finds them in event photos
3. **Stripe Checkout**: Secure payment with automatic purchase recording
4. **Multiple Resolutions**: Thumbnails for grid, watermarked for preview, original HD for purchasers

## Prioritized Backlog

### P0 (Critical) - Done
- [x] Basic auth flow
- [x] Event/photo management
- [x] Cart and checkout
- [x] Download purchased photos

### P1 (Important) - Future
- [ ] Email notifications on purchase
- [ ] Bulk photo upload with progress
- [ ] Photo cropping/rotation in admin
- [ ] Event access codes (private events)
- [ ] Multiple download resolutions (low, medium, high)

### P2 (Nice to Have) - Future
- [ ] Photo slideshow view
- [ ] Social sharing of purchased photos
- [ ] Photographer profile page
- [ ] Client favorites/wishlist
- [ ] Package pricing (buy X get Y discount)

## Technical Notes
- Admin credentials: admin@lumina.com / admin123
- EMERGENT_LLM_KEY is configured for Gemini facial recognition
- STRIPE_API_KEY is configured for payments
- Photos stored locally in /app/backend/uploads/

## Next Tasks
1. Test facial recognition with real event photos
2. Add email notifications for purchases
3. Implement bulk photo upload
4. Add private event access codes
