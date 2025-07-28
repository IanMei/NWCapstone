# PixShare API Documentation (v1.1)

## Overview

PixShare is a photo management platform allowing users to manage albums, upload and share photos, organize events, and interact through comments. Authentication is based on JSON Web Tokens (JWT).

---

## API Sections

- Authentication
- Albums
- Photos
- Comments
- Events
- Sharing
- Dashboard

---

## Authentication

### POST `/api/auth/register`

Registers a new user.

**Request Body**
```json
{
  "full_name": "Alice Smith",
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

### POST `/api/auth/login`

Logs in an existing user.

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

**Test Cases**
- ✅ Register with valid data
- ❌ Register with duplicate email
- ✅ Login with correct credentials
- ❌ Login with incorrect password

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

### DELETE `/api/albums/<album_id>`

Delete an album by ID.

**Response**
```json
{
  "msg": "Album deleted"
}
```

**Test Cases**
- ✅ Create album with valid title
- ❌ Create album without title
- ✅ Fetch albums after creation
- ✅ Delete an album

---

## Photos

### GET `/api/albums/<album_id>/photos`

Retrieve photos from a given album.

**Response**
```json
{
  "photos": [
    {
      "id": 1,
      "filename": "beach.jpg",
      "filepath": "photos/2/1/beach.jpg",
      "uploaded_at": "2025-07-25T14:01:03"
    }
  ]
}
```

### POST `/api/albums/<album_id>/photos`

Upload photo(s) to an album.

**Request (multipart/form-data)**
- photos[]: multiple image files

**Response**
```json
{
  "photos": [
    {
      "id": 10,
      "filename": "beach.jpg",
      "filepath": "photos/2/1/beach.jpg",
      "uploaded_at": "2025-07-25T14:01:03"
    }
  ]
}
```

### DELETE `/api/photos/<photo_id>`

Deletes a photo.

**Response**
```json
{
  "msg": "Photo deleted"
}
```

**Test Cases**
- ✅ Upload a valid image file
- ❌ Upload without file
- ✅ Delete an uploaded photo

---

## Comments

### GET `/api/photos/<photo_id>/comments`

Retrieve comments for a photo.

**Response**
```json
{
  "comments": [
    {
      "id": 1,
      "content": "Nice shot!",
      "author": "Alice Smith",
      "created_at": "2025-07-25T15:00:00"
    }
  ]
}
```

### POST `/api/photos/<photo_id>/comments`

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
    "author": "Alice Smith"
  }
}
```

**Test Cases**
- ✅ Post a valid comment
- ❌ Post with empty content
- ✅ View comment under a photo

---

## Events

### GET `/api/events`

Retrieve events for the user.

**Response**
```json
{
  "events": [
    {
      "id": 5,
      "title": "Wedding",
      "description": "John and Jane's wedding",
      "date": "2025-08-01"
    }
  ]
}
```

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

**Test Cases**
- ✅ Create a valid event
- ❌ Missing title or date

---

## Sharing

### GET `/api/shared`

Retrieve content shared with the user.

**Response**
```json
{
  "shared_albums": [],
  "shared_photos": []
}
```

### POST `/api/share/album/<album_id>`

Share an album.

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

### POST `/api/share/photo/<photo_id>`

Share a photo.

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

**Test Cases**
- ✅ Share photo with valid user
- ❌ Share to unregistered email

---

## Dashboard

### GET `/api/dashboard`

Get user statistics.

**Response**
```json
{
  "total_albums": 5,
  "total_photos": 53,
  "shared_items": 12
}
```

**Test Cases**
- ✅ Fetch dashboard after login