
# PixShare API Documentation (v1.1) — With Test Cases

PixShare is a photo management platform allowing users to manage albums, upload and share photos, organize events, and interact through comments. Authentication is based on JSON Web Tokens (JWT).

---

## 🔐 Authentication

### 1. POST `/api/auth/register`

Register a new user.

**Request Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "full_name": "Alice Smith",
  "email": "alice@example.com",
  "password": "securepassword"
}
```

**Expected Response**
```json
{
  "msg": "User registered successfully"
}
```

**Test Case**
| Item           | Value                                                  |
|----------------|--------------------------------------------------------|
| Test Name      | Register New User                                      |
| Method         | POST                                                   |
| URL            | /api/auth/register                                     |
| Headers        | Content-Type: application/json                         |
| Body           | `{ "full_name": "Alice Smith", "email": "alice@example.com", "password": "securepassword" }` |
| Expected       | Status 200, msg includes "registered successfully"     |
| Assertion      | status == 200; body.msg contains "registered"          |
| Result         | Pass or Fail                                           |

---

### 2. POST `/api/auth/login`

**Request Body**
```json
{
  "email": "alice@example.com",
  "password": "securepassword"
}
```

**Expected Response**
```json
{
  "token": "<JWT_TOKEN>"
}
```

**Test Case**
| Item           | Value                                                  |
|----------------|--------------------------------------------------------|
| Test Name      | Login with valid credentials                           |
| Method         | POST                                                   |
| URL            | /api/auth/login                                        |
| Headers        | Content-Type: application/json                         |
| Body           | `{ "email": "alice@example.com", "password": "securepassword" }` |
| Expected       | Status 200, contains a token                           |
| Assertion      | status == 200; body.token is defined                   |
| Result         | Pass or Fail                                           |

---

## 📁 Albums

### 3. GET `/api/albums`

**Headers**: `Authorization: Bearer <token>`

**Expected Response**
```json
{
  "albums": [
    {
      "id": 1,
      "title": "Summer Vacation",
      "created_at": "2025-07-01T..."
    }
  ]
}
```

**Test Case**
| Test Name | Get User Albums |
|-----------|-----------------|
| Method | GET |
| URL | /api/albums |
| Headers | Authorization: Bearer <token> |
| Expected | Status 200, albums array present |
| Assertion | status == 200; typeof body.albums == "object" |
| Result | Pass or Fail |

---

### 4. POST `/api/albums`

**Request Body**
```json
{
  "title": "My Album"
}
```

**Expected Response**
```json
{
  "album": {
    "id": 2,
    "title": "My Album",
    "created_at": "2025-07-20T..."
  }
}
```

**Test Case**
| Test Name | Create Album |
|-----------|--------------|
| Method | POST |
| URL | /api/albums |
| Headers | Authorization: Bearer <token>, Content-Type: application/json |
| Body | `{ "title": "My Album" }` |
| Expected | Status 201, album created |
| Assertion | status == 201; body.album.title == "My Album" |
| Result | Pass or Fail |

---

## 📷 Photos

### 5. POST `/api/albums/<album_id>/photos`

**Form Data**
- photos[] (multiple files)

**Headers**: Authorization, multipart/form-data

**Test Case**
| Test Name | Upload Photos |
|-----------|---------------|
| Method | POST |
| URL | /api/albums/1/photos |
| Headers | Authorization: Bearer <token> |
| Body | Form-data with image files |
| Expected | Status 201, array of photos |
| Assertion | status == 201; photos[].id exists |
| Result | Pass or Fail |

---

### 6. GET `/api/albums/<album_id>/photos`

**Headers**: Authorization

**Response**
```json
{
  "photos": [
    {
      "id": 101,
      "filename": "pic1.jpg",
      "filepath": "photos/1/101.jpg"
    }
  ]
}
```

**Test Case**
| Test Name | Fetch Photos in Album |
|-----------|------------------------|
| Method | GET |
| URL | /api/albums/1/photos |
| Headers | Authorization: Bearer <token> |
| Expected | Status 200; photos returned |
| Assertion | status == 200; photos[].filename exists |
| Result | Pass or Fail |

---

## 💬 Comments

### 7. POST `/api/photos/<photo_id>/comments`

**Request Body**
```json
{
  "content": "Great shot!"
}
```

**Test Case**
| Test Name | Add Comment |
|-----------|-------------|
| Method | POST |
| URL | /api/photos/1/comments |
| Headers | Authorization, Content-Type: application/json |
| Body | `{ "content": "Great shot!" }` |
| Expected | Status 201; comment object |
| Assertion | status == 201; comment.content == "Great shot!" |
| Result | Pass or Fail |

---

### 8. GET `/api/photos/<photo_id>/comments`

**Test Case**
| Test Name | Get Comments |
|-----------|--------------|
| Method | GET |
| URL | /api/photos/1/comments |
| Headers | Authorization |
| Expected | Status 200; array of comments |
| Assertion | status == 200; comments.length >= 0 |
| Result | Pass or Fail |

---

## 📤 Sharing

### 9. POST `/api/share/photo/<photo_id>`

**Request Body**
```json
{
  "target_email": "bob@example.com"
}
```

**Test Case**
| Test Name | Share Photo |
|-----------|-------------|
| Method | POST |
| URL | /api/share/photo/1 |
| Headers | Authorization, Content-Type: application/json |
| Body | `{ "target_email": "bob@example.com" }` |
| Expected | Status 200; msg includes shared |
| Assertion | status == 200; msg exists |
| Result | Pass or Fail |

---

## ✅ Example Real Case

### Test Case: Uploading and Commenting on Photo

1. **Register** → POST `/api/auth/register`
2. **Login** → get token
3. **Create Album** → POST `/api/albums`
4. **Upload Photo** → POST `/api/albums/1/photos`
5. **Add Comment** → POST `/api/photos/1/comments`
6. **Verify Comment** → GET `/api/photos/1/comments`

Each step above should return expected values (200/201 + valid response body) with appropriate token.

---

## Notes

- Use Postman or curl with proper headers.
- File uploads use `multipart/form-data`
- JWT tokens are required for all user-authenticated actions.

