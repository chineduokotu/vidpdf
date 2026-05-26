import { Routes, Route, NavLink } from "react-router-dom";
import VideoDownloader from "./pages/VideoDownloader";
import WatermarkRemover from "./pages/WatermarkRemover";
import PdfEditor from "./pages/PdfEditor";
import FileConverter from "./pages/FileConverter";
import PdfSummarizer from "./pages/PdfSummarizer";

const nav = [
  { to: "/", label: "Video", end: true },
  { to: "/watermark", label: "Watermark", end: false },
  { to: "/pdf", label: "PDF Editor", end: false },
  { to: "/summarize", label: "Summarizer", end: false },
  { to: "/convert", label: "Converter", end: false },
];

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="app-icon">◈</div>
          <h1>Omini Tools</h1>
        </div>
        <p className="app-subtitle">
          Download videos · Remove watermarks · Edit & summarize PDFs · Convert
          files
        </p>
      </header>
      <nav className="tabs">
        {nav.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<VideoDownloader />} />
          <Route path="/watermark" element={<WatermarkRemover />} />
          <Route path="/pdf" element={<PdfEditor />} />
          <Route path="/summarize" element={<PdfSummarizer />} />
          <Route path="/convert" element={<FileConverter />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>
          by <span className="brand">CoMagTech</span>
        </p>
        <a
          href="https://www.tiktok.com/@script.guru6"
          target="_blank"
          rel="noopener noreferrer"
          className="tiktok-link"
        >
          @comagtech
        </a>
      </footer>
    </div>
  );
}

export default App;
