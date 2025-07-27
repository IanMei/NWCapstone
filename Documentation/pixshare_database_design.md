# PixShare Database Design Outline

## 1. Users Table

Stores registered user information.

| Field           | Type         | Description                        |
|----------------|--------------|------------------------------------|
| `id`           | Integer (PK) | Unique user ID                     |
| `full_name`    | String       | Full name of the user              |
| `email`        | String (UNQ) | Email address (used for login)     |
| `password_hash`| String       | Hashed password                    |
| `created_at`   | DateTime     | When the user account was created  |

---

## 2. Albums Table

Each album belongs to one user and contains multiple photos.

| Field         | Type         | Description                          |
|--------------|--------------|--------------------------------------|
| `id`         | Integer (PK) | Unique album ID                      |
| `user_id`    | Integer (FK) | References `users.id`                |
| `title`      | String       | Album title                          |
| `created_at` | DateTime     | When the album was created           |

---

## 3. Photos Table

Stores image metadata and links them to albums.

| Field         | Type         | Description                            |
|--------------|--------------|----------------------------------------|
| `id`         | Integer (PK) | Unique photo ID                        |
| `album_id`   | Integer (FK) | References `albums.id`                 |
| `user_id`    | Integer (FK) | Owner of the photo (optional fallback) |
| `filename`   | String       | Name of the uploaded file              |
| `file_path`  | String       | Path to the stored file on server      |
| `uploaded_at`| DateTime     | Upload timestamp                       |

**Storage Directory**: `/uploads/photos/`

---

## 4. Events Table

Events link users to a set of photos (possibly cross-album).

| Field         | Type         | Description                         |
|--------------|--------------|-------------------------------------|
| `id`         | Integer (PK) | Unique event ID                     |
| `user_id`    | Integer (FK) | Owner/creator of the event          |
| `title`      | String       | Title of the event                  |
| `description`| Text         | Event description                   |
| `date`       | Date         | Event date                          |

---

## 5. Comments Table

Comments can be attached to either a photo or an album.

| Field         | Type         | Description                              |
|--------------|--------------|------------------------------------------|
| `id`         | Integer (PK) | Unique comment ID                        |
| `user_id`    | Integer (FK) | Comment author                           |
| `photo_id`   | Integer (FK) | Nullable, reference to `photos.id`       |
| `album_id`   | Integer (FK) | Nullable, reference to `albums.id`       |
| `content`    | Text         | The comment content                      |
| `created_at` | DateTime     | Timestamp of the comment                 |

**Note**: Only one of `photo_id` or `album_id` should be non-null per row.

---

## 6. Sharing Table

Tracks what has been shared and with whom.

| Field           | Type         | Description                             |
|----------------|--------------|-----------------------------------------|
| `id`           | Integer (PK) | Unique share ID                         |
| `owner_id`     | Integer (FK) | The user who shared the content         |
| `target_email` | String       | The recipient of the shared item        |
| `album_id`     | Integer (FK) | Nullable, ID of shared album            |
| `photo_id`     | Integer (FK) | Nullable, ID of shared photo            |
| `created_at`   | DateTime     | When the share was made                 |

**Note**: For multiple photo sharing, insert one row per photo.

---

## 7. PhotoEvent Table (Optional)

Links photos to events (many-to-many).

| Field       | Type         | Description               |
|------------|--------------|---------------------------|
| `id`       | Integer (PK) | Unique ID                 |
| `event_id` | Integer (FK) | References `events.id`    |
| `photo_id` | Integer (FK) | References `photos.id`    |

---

## Security Considerations

- Store `password_hash` using bcrypt.
- Use JWT for auth; store user identity in the token.
- Only allow access to photos/albums shared with or owned by the user.