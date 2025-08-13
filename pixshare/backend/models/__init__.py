# backend/models/__init__.py
from .user import User
from .album import Album
from .photo import Photo
from .comment import Comment
from .event import Event
from .share import Share
from .guest import Guest            # NEW
from .photo_reaction import PhotoReaction  # NEW
# from .event_albums import EventAlbum   # if you keep a mapped class for the association
