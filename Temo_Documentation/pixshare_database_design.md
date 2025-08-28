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

**Relationships**:
- `albums`: One-to-many
- `events`: One-to-many
- `comments`: One-to-many

---

## 2. Albums Table

Each album belongs to one user and contains multiple photos and possibly comments.

| Field         | Type         | Description                          |
|--------------|--------------|--------------------------------------|
| `id`         | Integer (PK) | Unique album ID                      |
| `user_id`    | Integer (FK) | References `users.id`                |
| `title`      | String       | Album title                          |
| `created_at` | DateTime     | When the album was created           |

**Relationships**:
- `photos`: One-to-many
- `comments`: One-to-many (optional)

---

## 3. Photos Table

Stores image metadata and links them to albums and users.

| Field         | Type         | Description                            |
|--------------|--------------|----------------------------------------|
| `id`         | Integer (PK) | Unique photo ID                        |
| `album_id`   | Integer (FK) | References `albums.id`                 |
| `user_id`    | Integer (FK) | Owner of the photo                     |
| `filename`   | String       | Name of the uploaded file              |
| `filepath`   | String       | Relative path to stored file           |
| `uploaded_at`| DateTime     | Upload timestamp                       |

**Relationships**:
- `comments`: One-to-many
- `user`: Photo owner

**Storage Directory**: `/uploads/photos/<user_id>/<album_id>/`

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

**Relationships**:
- `photos`: via `photo_event` (many-to-many)

---

## 5. Comments Table

Comments can be attached to either a photo or an album.

| Field         | Type         | Description                              |
|--------------|--------------|------------------------------------------|
| `id`         | Integer (PK) | Unique comment ID                        |
| `user_id`    | Integer (FK) | Comment author (references `users.id`)   |
| `photo_id`   | Integer (FK) | Nullable, reference to `photos.id`       |
| `album_id`   | Integer (FK) | Nullable, reference to `albums.id`       |
| `content`    | Text         | The comment content                      |
| `created_at` | DateTime     | Timestamp of the comment                 |

**Relationships**:
- Belongs to a `user`
- Optional link to either a `photo` or an `album`
- Should have **either** `photo_id` or `album_id`, **not both**

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

## ✅ Relationships Summary (per model)

| Model   | Relationships |
|---------|---------------|
| `User`  | albums, events, comments |
| `Album` | photos, comments         |
| `Photo` | user (owner), comments   |
| `Comment` | user, album?, photo?  |

---

## 🔐 Security Considerations

- Passwords are hashed with `bcrypt`.
- Authentication via JWT; token holds `sub` (user ID).
- All protected routes require `@jwt_required()`.
- File access should be restricted to users who own or were shared the album/photo.
