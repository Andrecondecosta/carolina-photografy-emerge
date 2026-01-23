from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Response, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
import httpx
import aiofiles
from io import BytesIO
from PIL import Image
import json
import time
import cloudinary
import cloudinary.uploader
import cloudinary.utils

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'lumina_secret_key')
JWT_ALGORITHM = "HS256"

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

# Check if Cloudinary is configured
CLOUDINARY_ENABLED = all([
    os.environ.get("CLOUDINARY_CLOUD_NAME"),
    os.environ.get("CLOUDINARY_API_KEY"),
    os.environ.get("CLOUDINARY_API_SECRET"),
    os.environ.get("CLOUDINARY_CLOUD_NAME") != "your_cloud_name"
])

# Create uploads directory (fallback for backgrounds and local storage)
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / 'photos').mkdir(exist_ok=True)
(UPLOADS_DIR / 'watermarked').mkdir(exist_ok=True)
(UPLOADS_DIR / 'thumbnails').mkdir(exist_ok=True)
(UPLOADS_DIR / 'backgrounds').mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "client"
    created_at: Optional[str] = None

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    date: str
    is_public: bool = False

class EventResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    name: str
    description: str
    date: str
    is_public: bool
    photo_count: int = 0
    cover_photo: Optional[str] = None
    created_at: str

class PhotoResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    photo_id: str
    event_id: str
    filename: str
    thumbnail_url: str
    watermarked_url: str
    original_url: str
    price: float = 10.0
    is_purchased: bool = False
    created_at: str

class CartItem(BaseModel):
    photo_id: str

class PurchaseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    purchase_id: str
    photo_id: str
    user_id: str
    resolution: str
    purchased_at: str

class FaceSearchRequest(BaseModel):
    image_base64: str
    event_id: Optional[str] = None

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a Google OAuth session
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if user:
            return user
    
    # Try JWT decode
    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user:
            return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        pass
    
    raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "role": "client",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, "client")
    return {"token": token, "user": UserResponse(**user_doc).model_dump()}

@api_router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["user_id"], user["email"], user.get("role", "client"))
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    user_response = {k: v for k, v in user.items() if k != "password"}
    return {"token": token, "user": user_response}

@api_router.get("/auth/session")
async def get_session(request: Request):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Fetch from Emergent Auth
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        oauth_data = resp.json()
    
    # Check if user exists
    user = await db.users.find_one({"email": oauth_data["email"]}, {"_id": 0})
    
    if not user:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": oauth_data["email"],
            "name": oauth_data["name"],
            "picture": oauth_data.get("picture"),
            "role": "client",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        # Update picture if changed
        if oauth_data.get("picture") != user.get("picture"):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": oauth_data.get("picture")}}
            )
            user["picture"] = oauth_data.get("picture")
    
    # Store session
    session_token = oauth_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return Response(
        content=json.dumps({"user": {k: v for k, v in user.items() if k != "password"}}),
        media_type="application/json",
        headers={
            "Set-Cookie": f"session_token={session_token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800"
        }
    )

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password"}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ============== EVENTS ENDPOINTS ==============

@api_router.post("/events")
async def create_event(event_data: EventCreate, user: dict = Depends(get_admin_user)):
    event_id = f"event_{uuid.uuid4().hex[:12]}"
    event_doc = {
        "event_id": event_id,
        "name": event_data.name,
        "description": event_data.description or "",
        "date": event_data.date,
        "is_public": event_data.is_public,
        "photo_count": 0,
        "cover_photo": None,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.events.insert_one(event_doc)
    return EventResponse(**event_doc)

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(public_only: bool = False):
    query = {"is_public": True} if public_only else {}
    events = await db.events.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventCreate, user: dict = Depends(get_admin_user)):
    result = await db.events.update_one(
        {"event_id": event_id},
        {"$set": {
            "name": event_data.name,
            "description": event_data.description,
            "date": event_data.date,
            "is_public": event_data.is_public
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event updated"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_admin_user)):
    # Delete photos
    await db.photos.delete_many({"event_id": event_id})
    result = await db.events.delete_one({"event_id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ============== PHOTOS ENDPOINTS ==============

def add_watermark(image: Image.Image) -> Image.Image:
    """Add watermark to image (local fallback)"""
    from PIL import ImageDraw, ImageFont
    
    watermarked = image.copy()
    draw = ImageDraw.Draw(watermarked)
    
    width, height = watermarked.size
    text = "CAROLINA DUARTE © PREVIEW"
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", max(30, width // 20))
    except:
        font = ImageFont.load_default()
    
    for y in range(0, height, height // 4):
        for x in range(0, width, width // 3):
            draw.text((x, y), text, fill=(255, 255, 255, 80), font=font)
    
    return watermarked

def create_thumbnail(image: Image.Image, size: tuple = (400, 400)) -> Image.Image:
    """Create thumbnail maintaining aspect ratio (local fallback)"""
    thumb = image.copy()
    thumb.thumbnail(size, Image.Resampling.LANCZOS)
    return thumb

def get_cloudinary_url(public_id: str, transformation: str = None) -> str:
    """Generate Cloudinary URL with optional transformation"""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    base_url = f"https://res.cloudinary.com/{cloud_name}/image/upload"
    if transformation:
        return f"{base_url}/{transformation}/{public_id}"
    return f"{base_url}/{public_id}"

@api_router.post("/photos/upload")
async def upload_photo(
    request: Request,
    event_id: str = Form(...),
    price: float = Form(10.0),
    file: UploadFile = File(...),
    user: dict = Depends(get_admin_user)
):
    # Verify event exists
    event = await db.events.find_one({"event_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Read file content
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    photo_id = f"photo_{uuid.uuid4().hex[:12]}"
    
    if CLOUDINARY_ENABLED:
        # Upload to Cloudinary
        try:
            # Upload original image to Cloudinary
            upload_result = cloudinary.uploader.upload(
                content,
                folder=f"carolina_duarte/events/{event_id}",
                public_id=photo_id,
                resource_type="image",
                overwrite=True,
                quality="auto:best"
            )
            
            cloudinary_public_id = upload_result["public_id"]
            cloudinary_url = upload_result["secure_url"]
            width = upload_result.get("width", 0)
            height = upload_result.get("height", 0)
            
            # Save to database with Cloudinary info
            photo_doc = {
                "photo_id": photo_id,
                "event_id": event_id,
                "filename": file.filename,
                "storage_type": "cloudinary",
                "cloudinary_public_id": cloudinary_public_id,
                "cloudinary_url": cloudinary_url,
                "price": price,
                "width": width,
                "height": height,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Cloudinary upload error: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    else:
        # Fallback to local storage
        try:
            image = Image.open(BytesIO(content))
            if image.mode == 'RGBA':
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[3])
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")
        
        # Save original
        original_filename = f"{photo_id}_original.jpg"
        original_path = UPLOADS_DIR / 'photos' / original_filename
        image.save(str(original_path), 'JPEG', quality=95)
        
        # Create and save watermarked
        watermarked = add_watermark(image)
        watermarked_filename = f"{photo_id}_watermarked.jpg"
        watermarked_path = UPLOADS_DIR / 'watermarked' / watermarked_filename
        watermarked.save(str(watermarked_path), 'JPEG', quality=85)
        
        # Create and save thumbnail
        thumbnail = create_thumbnail(image)
        thumbnail = add_watermark(thumbnail)
        thumbnail_filename = f"{photo_id}_thumb.jpg"
        thumbnail_path = UPLOADS_DIR / 'thumbnails' / thumbnail_filename
        thumbnail.save(str(thumbnail_path), 'JPEG', quality=80)
        
        photo_doc = {
            "photo_id": photo_id,
            "event_id": event_id,
            "filename": file.filename,
            "storage_type": "local",
            "original_path": str(original_path),
            "watermarked_path": str(watermarked_path),
            "thumbnail_path": str(thumbnail_path),
            "price": price,
            "width": image.width,
            "height": image.height,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    await db.photos.insert_one(photo_doc)
    
    # Update event photo count and cover
    update_data = {"$inc": {"photo_count": 1}}
    if not event.get("cover_photo"):
        update_data["$set"] = {"cover_photo": photo_id}
    await db.events.update_one({"event_id": event_id}, update_data)
    
    return {"photo_id": photo_id, "message": "Photo uploaded successfully"}

@api_router.get("/photos/event/{event_id}")
async def get_event_photos(event_id: str, user: dict = Depends(get_current_user)):
    photos = await db.photos.find({"event_id": event_id}, {"_id": 0}).to_list(500)
    
    # Check which photos user has purchased
    purchases = await db.purchases.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    purchased_ids = {p["photo_id"] for p in purchases}
    
    result = []
    for photo in photos:
        is_purchased = photo["photo_id"] in purchased_ids
        
        if photo.get("storage_type") == "cloudinary":
            public_id = photo["cloudinary_public_id"]
            # Cloudinary transformations for watermark and sizes
            # Watermark: overlay text
            watermark_transform = "c_fill,w_800,q_auto/l_text:Arial_40_bold:CAROLINA%20DUARTE%20©%20PREVIEW,o_30,co_white,g_center/fl_layer_apply,fl_tiled"
            thumbnail_transform = "c_fill,w_400,h_400,q_auto/l_text:Arial_20_bold:©,o_40,co_white,g_center"
            
            result.append({
                "photo_id": photo["photo_id"],
                "event_id": photo["event_id"],
                "filename": photo["filename"],
                "thumbnail_url": get_cloudinary_url(public_id, thumbnail_transform),
                "watermarked_url": get_cloudinary_url(public_id, watermark_transform),
                "original_url": get_cloudinary_url(public_id, "q_auto:best") if is_purchased else None,
                "price": photo["price"],
                "is_purchased": is_purchased,
                "width": photo.get("width"),
                "height": photo.get("height"),
                "created_at": photo["created_at"]
            })
        else:
            # Local storage fallback
            result.append({
                "photo_id": photo["photo_id"],
                "event_id": photo["event_id"],
                "filename": photo["filename"],
                "thumbnail_url": f"/api/photos/file/{photo['photo_id']}/thumbnail",
                "watermarked_url": f"/api/photos/file/{photo['photo_id']}/watermarked",
                "original_url": f"/api/photos/file/{photo['photo_id']}/original" if is_purchased else None,
                "price": photo["price"],
                "is_purchased": is_purchased,
                "width": photo.get("width"),
                "height": photo.get("height"),
                "created_at": photo["created_at"]
            })
    
    return result

@api_router.get("/photos/file/{photo_id}/{resolution}")
async def get_photo_file(photo_id: str, resolution: str, request: Request):
    photo = await db.photos.find_one({"photo_id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Handle Cloudinary storage
    if photo.get("storage_type") == "cloudinary":
        public_id = photo["cloudinary_public_id"]
        
        if resolution == "original":
            # Check if user has purchased
            try:
                user = await get_current_user(request)
                purchase = await db.purchases.find_one({
                    "photo_id": photo_id,
                    "user_id": user["user_id"]
                })
                if not purchase:
                    raise HTTPException(status_code=403, detail="Photo not purchased")
                url = get_cloudinary_url(public_id, "q_auto:best")
            except HTTPException as e:
                if e.status_code == 401:
                    raise HTTPException(status_code=403, detail="Login required to download")
                raise
        elif resolution == "watermarked":
            watermark_transform = "c_fill,w_1200,q_auto/l_text:Arial_50_bold:CAROLINA%20DUARTE%20©%20PREVIEW,o_30,co_white,g_center/fl_layer_apply,fl_tiled"
            url = get_cloudinary_url(public_id, watermark_transform)
        elif resolution == "thumbnail":
            thumbnail_transform = "c_fill,w_400,h_400,q_auto/l_text:Arial_20_bold:©,o_40,co_white,g_center"
            url = get_cloudinary_url(public_id, thumbnail_transform)
        else:
            raise HTTPException(status_code=400, detail="Invalid resolution")
        
        return RedirectResponse(url=url, status_code=302)
    
    # Handle local storage
    if resolution == "original":
        try:
            user = await get_current_user(request)
            purchase = await db.purchases.find_one({
                "photo_id": photo_id,
                "user_id": user["user_id"]
            })
            if not purchase:
                raise HTTPException(status_code=403, detail="Photo not purchased")
            path = photo["original_path"]
        except HTTPException as e:
            if e.status_code == 401:
                raise HTTPException(status_code=403, detail="Login required to download")
            raise
    elif resolution == "watermarked":
        path = photo["watermarked_path"]
    elif resolution == "thumbnail":
        path = photo["thumbnail_path"]
    else:
        raise HTTPException(status_code=400, detail="Invalid resolution")
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(path, media_type="image/jpeg")

@api_router.get("/photos/{photo_id}")
async def get_photo(photo_id: str, request: Request):
    photo = await db.photos.find_one({"photo_id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    is_purchased = False
    try:
        user = await get_current_user(request)
        purchase = await db.purchases.find_one({
            "photo_id": photo_id,
            "user_id": user["user_id"]
        })
        is_purchased = purchase is not None
    except:
        pass
    
    if photo.get("storage_type") == "cloudinary":
        public_id = photo["cloudinary_public_id"]
        watermark_transform = "c_fill,w_800,q_auto/l_text:Arial_40_bold:CAROLINA%20DUARTE%20©%20PREVIEW,o_30,co_white,g_center/fl_layer_apply,fl_tiled"
        thumbnail_transform = "c_fill,w_400,h_400,q_auto/l_text:Arial_20_bold:©,o_40,co_white,g_center"
        
        return {
            "photo_id": photo["photo_id"],
            "event_id": photo["event_id"],
            "filename": photo["filename"],
            "thumbnail_url": get_cloudinary_url(public_id, thumbnail_transform),
            "watermarked_url": get_cloudinary_url(public_id, watermark_transform),
            "original_url": get_cloudinary_url(public_id, "q_auto:best") if is_purchased else None,
            "price": photo["price"],
            "is_purchased": is_purchased,
            "width": photo.get("width"),
            "height": photo.get("height"),
            "created_at": photo["created_at"]
        }
    
    return {
        "photo_id": photo["photo_id"],
        "event_id": photo["event_id"],
        "filename": photo["filename"],
        "thumbnail_url": f"/api/photos/file/{photo['photo_id']}/thumbnail",
        "watermarked_url": f"/api/photos/file/{photo['photo_id']}/watermarked",
        "original_url": f"/api/photos/file/{photo['photo_id']}/original" if is_purchased else None,
        "price": photo["price"],
        "is_purchased": is_purchased,
        "width": photo.get("width"),
        "height": photo.get("height"),
        "created_at": photo["created_at"]
    }

# ============== CLOUDINARY SIGNATURE ENDPOINT ==============

@api_router.get("/cloudinary/signature")
async def get_cloudinary_signature(
    resource_type: str = Query("image", enum=["image", "video"]),
    folder: str = Query("carolina_duarte/uploads"),
    user: dict = Depends(get_admin_user)
):
    """Generate signed upload params for direct frontend upload to Cloudinary"""
    if not CLOUDINARY_ENABLED:
        raise HTTPException(status_code=400, detail="Cloudinary not configured")
    
    ALLOWED_FOLDERS = ("carolina_duarte/", "events/", "uploads/", "backgrounds/")
    if not any(folder.startswith(f) for f in ALLOWED_FOLDERS):
        raise HTTPException(status_code=400, detail="Invalid folder path")
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
        "resource_type": resource_type
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        os.environ.get("CLOUDINARY_API_SECRET")
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.environ.get("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

@api_router.get("/cloudinary/status")
async def get_cloudinary_status():
    """Check if Cloudinary is configured"""
    return {
        "enabled": CLOUDINARY_ENABLED,
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME") if CLOUDINARY_ENABLED else None
    }

# ============== FACE SEARCH ==============

@api_router.post("/photos/face-search")
async def search_by_face(search_data: FaceSearchRequest, user: dict = Depends(get_current_user)):
    """Search photos by face using Gemini Vision"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Get user's face description first
    chat = LlmChat(
        api_key=api_key,
        session_id=f"face_desc_{user['user_id']}_{uuid.uuid4().hex[:8]}",
        system_message="You are a face analysis assistant. Describe the person's face in the image in detail including: hair color, hair style, eye color, skin tone, facial structure, any distinctive features like glasses, beard, etc. Be very specific and detailed."
    ).with_model("gemini", "gemini-3-flash-preview")
    
    try:
        image_content = ImageContent(image_base64=search_data.image_base64)
        user_message = UserMessage(
            text="Describe this person's face in detail for identification purposes.",
            image_contents=[image_content]
        )
        face_description = await chat.send_message(user_message)
    except Exception as e:
        logger.error(f"Face analysis error: {e}")
        raise HTTPException(status_code=500, detail="Face analysis failed")
    
    # Now search through event photos
    query = {}
    if search_data.event_id:
        query["event_id"] = search_data.event_id
    
    photos = await db.photos.find(query, {"_id": 0}).to_list(200)
    matching_photos = []
    
    for photo in photos:
        # Analyze each photo for the face
        try:
            # Read watermarked image
            async with aiofiles.open(photo["watermarked_path"], "rb") as f:
                photo_content = await f.read()
            
            photo_base64 = base64.b64encode(photo_content).decode()
            
            match_chat = LlmChat(
                api_key=api_key,
                session_id=f"face_match_{photo['photo_id']}_{uuid.uuid4().hex[:8]}",
                system_message=f"You are a face matching assistant. The target person has these features: {face_description}\n\nLook at the provided image and determine if this person appears in it. Respond with only 'YES' or 'NO' followed by confidence percentage (e.g., 'YES 85%' or 'NO 10%')."
            ).with_model("gemini", "gemini-3-flash-preview")
            
            photo_image = ImageContent(image_base64=photo_base64)
            match_message = UserMessage(
                text="Does the target person appear in this image?",
                image_contents=[photo_image]
            )
            
            match_result = await match_chat.send_message(match_message)
            
            if "YES" in match_result.upper():
                # Extract confidence
                confidence = 50
                try:
                    import re
                    conf_match = re.search(r'(\d+)%', match_result)
                    if conf_match:
                        confidence = int(conf_match.group(1))
                except:
                    pass
                
                if confidence >= 50:
                    matching_photos.append({
                        "photo_id": photo["photo_id"],
                        "event_id": photo["event_id"],
                        "thumbnail_url": f"/api/photos/file/{photo['photo_id']}/thumbnail",
                        "watermarked_url": f"/api/photos/file/{photo['photo_id']}/watermarked",
                        "price": photo["price"],
                        "confidence": confidence,
                        "created_at": photo["created_at"]
                    })
        except Exception as e:
            logger.error(f"Error matching photo {photo['photo_id']}: {e}")
            continue
    
    # Sort by confidence
    matching_photos.sort(key=lambda x: x["confidence"], reverse=True)
    
    return {
        "face_description": face_description,
        "matching_photos": matching_photos[:50],
        "total_searched": len(photos)
    }

# ============== CART & CHECKOUT ==============

@api_router.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        return {"items": [], "total": 0}
    
    items = []
    total = 0
    for item in cart["items"]:
        photo = await db.photos.find_one({"photo_id": item["photo_id"]}, {"_id": 0})
        if photo:
            items.append({
                "photo_id": photo["photo_id"],
                "event_id": photo["event_id"],
                "thumbnail_url": f"/api/photos/file/{photo['photo_id']}/thumbnail",
                "price": photo["price"]
            })
            total += photo["price"]
    
    return {"items": items, "total": total}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user: dict = Depends(get_current_user)):
    # Check if already purchased
    purchase = await db.purchases.find_one({
        "photo_id": item.photo_id,
        "user_id": user["user_id"]
    })
    if purchase:
        raise HTTPException(status_code=400, detail="Photo already purchased")
    
    # Add to cart
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {
            "$addToSet": {"items": {"photo_id": item.photo_id}},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    return {"message": "Added to cart"}

@api_router.delete("/cart/remove/{photo_id}")
async def remove_from_cart(photo_id: str, user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"items": {"photo_id": photo_id}}}
    )
    return {"message": "Removed from cart"}

@api_router.post("/checkout/create-session")
async def create_checkout_session(request: Request, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    body = await request.json()
    origin_url = body.get("origin_url", "")
    
    # Get cart
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate total from server-side prices
    total = 0.0
    photo_ids = []
    for item in cart["items"]:
        photo = await db.photos.find_one({"photo_id": item["photo_id"]}, {"_id": 0})
        if photo:
            total += float(photo["price"])
            photo_ids.append(item["photo_id"])
    
    if total <= 0:
        raise HTTPException(status_code=400, detail="Invalid cart")
    
    # Create Stripe session
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/cart"
    
    checkout_request = CheckoutSessionRequest(
        amount=total,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "photo_ids": ",".join(photo_ids)
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "amount": total,
        "currency": "eur",
        "photo_ids": photo_ids,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    
    if status.payment_status == "paid" and transaction and transaction.get("payment_status") != "completed":
        # Mark as completed and create purchases
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Create purchase records
        for photo_id in transaction.get("photo_ids", []):
            existing = await db.purchases.find_one({
                "photo_id": photo_id,
                "user_id": user["user_id"]
            })
            if not existing:
                await db.purchases.insert_one({
                    "purchase_id": f"purch_{uuid.uuid4().hex[:12]}",
                    "photo_id": photo_id,
                    "user_id": user["user_id"],
                    "session_id": session_id,
                    "purchased_at": datetime.now(timezone.utc).isoformat()
                })
        
        # Clear cart
        await db.carts.delete_one({"user_id": user["user_id"]})
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Process payment
            session_id = webhook_response.session_id
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            
            if transaction and transaction.get("payment_status") != "completed":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "completed"}}
                )
                
                # Create purchases
                for photo_id in transaction.get("photo_ids", []):
                    existing = await db.purchases.find_one({
                        "photo_id": photo_id,
                        "user_id": transaction["user_id"]
                    })
                    if not existing:
                        await db.purchases.insert_one({
                            "purchase_id": f"purch_{uuid.uuid4().hex[:12]}",
                            "photo_id": photo_id,
                            "user_id": transaction["user_id"],
                            "session_id": session_id,
                            "purchased_at": datetime.now(timezone.utc).isoformat()
                        })
                
                # Clear cart
                await db.carts.delete_one({"user_id": transaction["user_id"]})
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ============== PURCHASES ==============

@api_router.get("/purchases")
async def get_purchases(user: dict = Depends(get_current_user)):
    purchases = await db.purchases.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    
    result = []
    for purchase in purchases:
        photo = await db.photos.find_one({"photo_id": purchase["photo_id"]}, {"_id": 0})
        if photo:
            result.append({
                "purchase_id": purchase["purchase_id"],
                "photo_id": photo["photo_id"],
                "event_id": photo["event_id"],
                "thumbnail_url": f"/api/photos/file/{photo['photo_id']}/thumbnail",
                "original_url": f"/api/photos/file/{photo['photo_id']}/original",
                "filename": photo["filename"],
                "purchased_at": purchase["purchased_at"]
            })
    
    return result

# ============== ADMIN ENDPOINTS ==============

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_events = await db.events.count_documents({})
    total_photos = await db.photos.count_documents({})
    total_users = await db.users.count_documents({})
    total_purchases = await db.purchases.count_documents({})
    
    # Calculate revenue
    transactions = await db.payment_transactions.find(
        {"payment_status": "completed"}, {"_id": 0, "amount": 1}
    ).to_list(1000)
    total_revenue = sum(t.get("amount", 0) for t in transactions)
    
    return {
        "total_events": total_events,
        "total_photos": total_photos,
        "total_users": total_users,
        "total_purchases": total_purchases,
        "total_revenue": total_revenue
    }

@api_router.get("/admin/clients")
async def get_clients(user: dict = Depends(get_admin_user)):
    clients = await db.users.find({"role": "client"}, {"_id": 0, "password": 0}).to_list(500)
    return clients

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, admin: dict = Depends(get_admin_user)):
    if role not in ["client", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Role updated"}

# ============== SITE SETTINGS ==============

# Default background images - Fine art wedding photography style
DEFAULT_BACKGROUNDS = {
    "hero": "https://images.unsplash.com/photo-1768611264978-92918fa8e8c3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwyfHxmaW5lJTIwYXJ0JTIwd2VkZGluZyUyMHBob3RvZ3JhcGh5JTIwZ29sZGVuJTIwaG91ciUyMHJvbWFudGljJTIwY291cGxlfGVufDB8fHx8MTc2OTE3NzI1OHww&ixlib=rb-4.1.0&q=85",
    "login": "https://images.unsplash.com/photo-1763539818420-165e69b7489b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODF8MHwxfHNlYXJjaHwxfHxyb21hbnRpYyUyMHBvcnRyYWl0JTIwd29tYW4lMjBzb2Z0JTIwbGlnaHQlMjBlZGl0b3JpYWx8ZW58MHx8fHwxNzY5MTc3MjY3fDA&ixlib=rb-4.1.0&q=85",
    "register": "https://images.unsplash.com/photo-1769050351773-925862f14c38?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwzfHxmaW5lJTIwYXJ0JTIwd2VkZGluZyUyMHBob3RvZ3JhcGh5JTIwZ29sZGVuJTIwaG91ciUyMHJvbWFudGljJTIwY291cGxlfGVufDB8fHx8MTc2OTE3NzI1OHww&ixlib=rb-4.1.0&q=85",
    "gallery1": "https://images.unsplash.com/photo-1589144044802-567f743dd649?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwxfHxmaW5lJTIwYXJ0JTIwd2VkZGluZyUyMHBob3RvZ3JhcGh5JTIwZ29sZGVuJTIwaG91ciUyMHJvbWFudGljJTIwY291cGxlfGVufDB8fHx8MTc2OTE3NzI1OHww&ixlib=rb-4.1.0&q=85",
    "gallery2": "https://images.unsplash.com/photo-1763539818703-309e93c5e394?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODF8MHwxfHNlYXJjaHwyfHxyb21hbnRpYyUyMHBvcnRyYWl0JTIwd29tYW4lMjBzb2Z0JTIwbGlnaHQlMjBlZGl0b3JpYWx8ZW58MHx8fHwxNzY5MTc3MjY3fDA&ixlib=rb-4.1.0&q=85",
    "gallery3": "https://images.unsplash.com/photo-1768611261082-3aa003bd4d29?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHw0fHxmaW5lJTIwYXJ0JTIwd2VkZGluZyUyMHBob3RvZ3JhcGh5JTIwZ29sZGVuJTIwaG91ciUyMHJvbWFudGljJTIwY291cGxlfGVufDB8fHx8MTc2OTE3NzI1OHww&ixlib=rb-4.1.0&q=85",
    "gallery4": "https://images.pexels.com/photos/20743407/pexels-photo-20743407.jpeg"
}

@api_router.get("/settings/backgrounds")
async def get_backgrounds():
    """Get all background images (public endpoint)"""
    settings = await db.site_settings.find_one({"setting_type": "backgrounds"}, {"_id": 0})
    if not settings:
        return DEFAULT_BACKGROUNDS
    
    # Merge with defaults for any missing keys
    backgrounds = {**DEFAULT_BACKGROUNDS, **settings.get("images", {})}
    return backgrounds

@api_router.put("/admin/settings/backgrounds")
async def update_backgrounds(request: Request, user: dict = Depends(get_admin_user)):
    """Update background image URLs"""
    data = await request.json()
    
    # Get current settings
    settings = await db.site_settings.find_one({"setting_type": "backgrounds"}, {"_id": 0})
    current_images = settings.get("images", {}) if settings else {}
    
    # Update with new values
    updated_images = {**current_images, **data}
    
    await db.site_settings.update_one(
        {"setting_type": "backgrounds"},
        {
            "$set": {
                "images": updated_images,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Backgrounds updated", "images": updated_images}

@api_router.post("/admin/settings/backgrounds/upload")
async def upload_background(
    image_key: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_admin_user)
):
    """Upload a custom background image"""
    valid_keys = ["hero", "login", "register", "gallery1", "gallery2", "gallery3", "gallery4"]
    if image_key not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid image key. Must be one of: {valid_keys}")
    
    # Read and process image
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        
        image = Image.open(BytesIO(content))
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too large (max 2000px width)
        max_width = 2000
        if image.width > max_width:
            ratio = max_width / image.width
            new_height = int(image.height * ratio)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
    except Exception as e:
        logger.error(f"Error processing background image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")
    
    # Save image
    bg_id = f"bg_{uuid.uuid4().hex[:12]}"
    filename = f"{bg_id}_{image_key}.jpg"
    filepath = UPLOADS_DIR / 'backgrounds' / filename
    image.save(str(filepath), 'JPEG', quality=90)
    
    # Update settings with new image URL
    image_url = f"/api/backgrounds/{filename}"
    
    settings = await db.site_settings.find_one({"setting_type": "backgrounds"}, {"_id": 0})
    current_images = settings.get("images", {}) if settings else {}
    current_images[image_key] = image_url
    
    await db.site_settings.update_one(
        {"setting_type": "backgrounds"},
        {
            "$set": {
                "images": current_images,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "message": "Background uploaded",
        "image_key": image_key,
        "url": image_url
    }

@api_router.get("/backgrounds/{filename}")
async def get_background_file(filename: str):
    """Serve background image files"""
    filepath = UPLOADS_DIR / 'backgrounds' / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Background not found")
    return FileResponse(str(filepath), media_type="image/jpeg")

@api_router.delete("/admin/settings/backgrounds/{image_key}")
async def reset_background(image_key: str, user: dict = Depends(get_admin_user)):
    """Reset a background to default"""
    if image_key not in DEFAULT_BACKGROUNDS:
        raise HTTPException(status_code=400, detail="Invalid image key")
    
    settings = await db.site_settings.find_one({"setting_type": "backgrounds"}, {"_id": 0})
    if settings and "images" in settings:
        current_images = settings["images"]
        if image_key in current_images:
            del current_images[image_key]
            await db.site_settings.update_one(
                {"setting_type": "backgrounds"},
                {"$set": {"images": current_images}}
            )
    
    return {"message": f"Background '{image_key}' reset to default", "default_url": DEFAULT_BACKGROUNDS[image_key]}

# ============== HEALTH CHECK ==============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Create initial admin user on startup
@app.on_event("startup")
async def create_initial_admin():
    admin = await db.users.find_one({"role": "admin"})
    if not admin:
        admin_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "admin@lumina.com",
            "name": "Admin",
            "password": hash_password("admin123"),
            "role": "admin",
            "picture": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Created initial admin user: admin@lumina.com / admin123")
