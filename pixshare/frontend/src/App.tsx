import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";

// Auth pages
import Dashboard from "./pages/authuserarea/Dashboard";
import Albums from "./pages/authuserarea/Albums";
import AlbumView from "./pages/authuserarea/AlbumView";
import PhotoView from "./pages/authuserarea/PhotoView";
import Events from "./pages/authuserarea/Events";
import Settings from "./pages/authuserarea/Settings";
import Editor from "./pages/authuserarea/Editor";
import SharedPhoto from "./pages/Shared/SharedPhoto";


function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-light)] text-[var(--primary)]">
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/*Shared*/}
        <Route path="/shared/photo/:token" element={<SharedPhoto />} />

        {/* Authenticated */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/albums" element={<Albums />} />
        <Route path="/albums/:albumId" element={<AlbumView />} />
        <Route path="/albums/:albumId/photo/:photoId" element={<PhotoView />} />
        <Route path="/events" element={<Events />} />
        <Route path="/account/settings" element={<Settings />} />
        <Route path="/future/editor" element={<Editor />} />
      </Routes>
    </div>
  );
}

export default App;