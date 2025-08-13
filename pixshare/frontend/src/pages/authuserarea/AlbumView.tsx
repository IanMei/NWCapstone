import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type Photo = {
  id: number;
  filename: string;
  filepath: string;
  uploaded_at: string;
};

export default function AlbumView() {
  const { albumId } = useParams();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [albumName, setAlbumName] = useState<string>("");

  // sharing UI state
  const [shareToken, setShareToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  // hidden inputs for split-button uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem("token") || "";

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${BASE_URL}/albums/${albumId}/photos`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load photos");
      const data = await res.json();
      setPhotos(data.photos);
    } catch (err) {
      console.error("Failed to load photos:", err);
    }
  };

  const fetchAlbumName = async () => {
    try {
      const res = await fetch(`${BASE_URL}/albums/${albumId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load album name");
      const data = await res.json();
      setAlbumName(data.name);
    } catch (err) {
      console.error("Failed to load album name:", err);
    }
  };

  // Handles both files and folder uploads
  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));

    try {
      setUploading(true);
      const res = await fetch(`${BASE_URL}/albums/${albumId}/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setPhotos((prev) => [...prev, ...data.photos]);
      } else {
        console.error("Upload failed:", data);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      // reset inputs so same files can be selected again later
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
  };

  const onPickFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
  };

  const supportsDirectoryUpload = () => {
    const input = document.createElement("input");
    return "webkitdirectory" in input;
  };

  const openFolderPicker = () => {
    if (supportsDirectoryUpload()) {
      folderInputRef.current?.click();
    } else {
      // Firefox (and some others) don’t support folder selection
      alert(
        "Folder upload isn’t supported by your browser. Please use Chrome/Edge or select multiple files instead."
      );
      fileInputRef.current?.click();
    }
  };

  const deletePhoto = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/photos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      } else {
        console.error("Delete failed");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Generate album share token
  const generateAlbumShare = async () => {
    try {
      const res = await fetch(`${BASE_URL}/share/album/${albumId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ can_comment: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.msg || "Failed to create album share link");
      setShareToken(data.share.token);
      setCopied(false);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Share failed");
    }
  };

  // Build public share URL that matches current host & protocol
  const currentHost = window.location.host;
  const currentProtocol = window.location.protocol;
  const shareUrl = shareToken
    ? `${currentProtocol}//${currentHost}/shared/album/${shareToken}`
    : "";

  // Robust copy (Clipboard API + fallback)
  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        if (shareInputRef.current) {
          shareInputRef.current.focus();
          shareInputRef.current.select();
          document.execCommand("copy");
          window.getSelection()?.removeAllRanges();
        } else {
          const el = document.createElement("textarea");
          el.value = shareUrl;
          el.style.position = "fixed";
          el.style.top = "0";
          el.style.left = "0";
          el.style.opacity = "0";
          document.body.appendChild(el);
          el.focus();
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Could not copy. Please copy manually.");
    }
  };

  useEffect(() => {
    fetchAlbumName();
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  const countLabel = `(${photos.length} ${photos.length === 1 ? "photo" : "photos"})`;

  return (
    <main className="p-6">
      {/* Line 1: Back button only */}
      <div className="mb-2">
        <button
          onClick={() => navigate("/albums")}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded shadow text-sm"
          title="Back to all albums"
        >
          ← All Albums
        </button>
      </div>

      {/* Line 2: Title + count */}
      <h1 className="text-3xl font-bold text-[var(--primary)] mb-2">
        {albumName ? `Album: ${albumName} ` : `Album #${albumId} `}
        <span className="text-base text-gray-600 align-middle">{countLabel}</span>
      </h1>

      {/* Line 3: Share section under title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          onClick={generateAlbumShare}
          className="self-start bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 py-2 rounded"
        >
          {shareToken ? "Regenerate Share Link" : "Share Album"}
        </button>

        {shareUrl && (
          <div className="flex items-stretch">
            <input
              ref={shareInputRef}
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="px-2 py-2 border rounded-l text-sm w-[280px]"
            />
            <button
              onClick={copyShareUrl}
              className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 rounded-r text-sm"
              title="Copy share link"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Upload Section — split button */}
      <div className="mb-6">
        <div className="inline-flex rounded shadow overflow-hidden">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-60 text-white px-4 py-2"
            title="Select photo files"
          >
            {uploading ? "Uploading..." : "Add Photos"}
          </button>
          <button
            onClick={openFolderPicker}
            disabled={uploading}
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-60 text-white px-3 border-l border-white/20"
            title="Upload a whole folder"
          >
            {uploading ? "Uploading..." : "Add Folders"}
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore — Chromium-only attribute, guarded by runtime check
          webkitdirectory=""
          directory=""
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFolder}
        />
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group border rounded overflow-hidden shadow bg-white"
          >
            <Link to={`/albums/${albumId}/photo/${photo.id}`}>
              <img
                src={`${PHOTO_BASE_URL}/uploads/${photo.filepath}`}
                alt={photo.filename}
                className="w-full h-48 object-cover"
              />
            </Link>
            <button
              onClick={() => deletePhoto(photo.id)}
              className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-80 hover:opacity-100"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
