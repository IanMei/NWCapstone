# PixShare API Documentation (v1)

## Overview

PixShare is a photo management platform allowing users to manage albums, upload and share photos, organize events, and interact through comments. Authentication is based on JSON Web Tokens (JWT).

---

## API Sections

- Authentication
- User
- Albums
- Photos
- Events
- Comments
- Sharing
- Dashboard

---

## Authentication

### POST `/api/auth/register`
Register a new user.

**Request Body**
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "securepassword"
}
```

**Response**
```json
{
  "msg": "User registered successfully"
}
```

---

### POST `/api/auth/login`
Log in an existing user.

**Request Body**
```json
{
  "email": "alice@example.com",
  "password": "securepassword"
}
```

**Response**
```json
{
  "token": "<JWT_TOKEN>"
}
```

---

## Albums

### GET `/api/albums`
Retrieve all albums for the authenticated user.

**Response**
```json
{
  "albums": [
    {
      "id": 1,
      "title": "Summer Vacation",
      "created_at": "2025-07-01"
    }
  ]
}
```

---

### POST `/api/albums`
Create a new album.

**Request Body**
```json
{
  "title": "My Album"
}
```

**Response**
```json
{
  "album": {
    "id": 2,
    "title": "My Album",
    "created_at": "2025-07-20"
  }
}
```

---

### DELETE `/api/albums/<album_id>`
Delete an album by ID.

**Response**
```json
{
  "msg": "Album deleted"
}
```

---

## Photos

### POST `/api/photos`
Upload a photo.

**Request (multipart/form-data)**
- `album_id`: number
- `image`: file

**Response**
```json
{
  "photo": {
    "id": 10,
    "filename": "beach.jpg",
    "url": "/uploads/photos/10.jpg"
  }
}
```

---

### DELETE `/api/photos/<photo_id>`
Delete a photo.

**Response**
```json
{
  "msg": "Photo deleted"
}
```

---

## Events

### POST `/api/events`
Create an event.

**Request Body**
```json
{
  "title": "Wedding",
  "description": "John and Jane's wedding",
  "date": "2025-08-01"
}
```

**Response**
```json
{
  "event": {
    "id": 5,
    "title": "Wedding",
    "date": "2025-08-01"
  }
}
```

---

### GET `/api/events`
List all events for the user.

**Response**
```json
{
  "events": [
    {
      "id": 5,
      "title": "Wedding",
      "date": "2025-08-01"
    }
  ]
}
```

---

## Comments

### POST `/api/comments/photo/<photo_id>`
Add a comment to a photo.

**Request Body**
```json
{
  "content": "Beautiful shot!"
}
```

**Response**
```json
{
  "comment": {
    "id": 12,
    "content": "Beautiful shot!",
    "author": "alice@example.com"
  }
}
```

---

### POST `/api/comments/album/<album_id>`
Add a comment to an album.

**Request Body**
```json
{
  "content": "Amazing memories."
}
```

**Response**
```json
{
  "comment": {
    "id": 15,
    "content": "Amazing memories.",
    "author": "bob@example.com"
  }
}
```

---

## Sharing

### POST `/api/share/album/<album_id>`
Share an entire album with another user.

**Request Body**
```json
{
  "target_email": "bob@example.com"
}
```

**Response**
```json
{
  "msg": "Album shared with bob@example.com"
}
```

---

### POST `/api/share/photo/<photo_id>`
Share a single photo with another user.

**Request Body**
```json
{
  "target_email": "bob@example.com"
}
```

**Response**
```json
{
  "msg": "Photo shared with bob@example.com"
}
```

---

### POST `/api/share/album/<album_id>/photos`
Share multiple photos from an album.

**Request Body**
```json
{
  "target_email": "bob@example.com",
  "photo_ids": [3, 5, 7]
}
```

**Response**
```json
{
  "msg": "Selected photos shared with bob@example.com"
}
```

---

### GET `/api/shared`
Get content shared with the authenticated user.

**Response**
```json
{
  "shared_albums": [
    {
      "id": 21,
      "title": "Trip to Japan",
      "owner": "alice@example.com"
    }
  ],
  "shared_photos": [
    {
      "id": 45,
      "filename": "tokyo.jpg",
      "url": "/uploads/shared/45.jpg",
      "owner": "alice@example.com"
    }
  ]
}
```

---

### DELETE `/api/share/<share_id>`
Revoke a sharing link.

**Response**
```json
{
  "msg": "Share removed"
}
```

---

## Dashboard

### GET `/api/dashboard`
Retrieve user statistics.

**Response**
```json
{
  "total_albums": 6,
  "total_photos": 105,
  "shared_items": 17
}
```