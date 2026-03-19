import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchDemoData, uploadFile, wakeServer } from "./api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import {
  TrendingUp, AlertTriangle, Package, BarChart2, Brain, Layers, Activity,
  ArrowRight, CheckCircle, Zap, Shield, Globe, ChevronDown, RefreshCw,
  AlertCircle, Clock, DollarSign, Box, Search, Download, ExternalLink,
  Upload, FileUp
} from "lucide-react";

/* ═══════════════════════════════════════════
   CONFIG & CONSTANTS
   ═══════════════════════════════════════════ */
const COLORS = {
  primary: "#E8443A",
  primaryDark: "#C93A32",
  primaryLight: "#FDECEB",
  navy: "#1B2559",
  navyLight: "#2B3674",
  blue: "#3B82F6",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
  cyan: "#06B6D4",
  white: "#FFFFFF",
  bg: "#F4F7FE",
  card: "#FFFFFF",
  text: "#1B2559",
  textMuted: "#68769F",
  border: "#E9EDF7",
  borderLight: "#F0F3FA",
};

const ALGO_COLORS = {
  sma: "#3B82F6",
  sarima: "#8B5CF6",
  lightgbm: "#10B981",
  prophet: "#F59E0B",
  best: "#E8443A",
};

const ABC_COLORS = { A: "#3B82F6", B: "#F59E0B", C: "#94A3B8" };
const ABC_BG = { A: "#EFF6FF", B: "#FFFBEB", C: "#F8FAFC" };

const CURRENCIES = { usd: "$", aed: "AED ", inr: "Rs." };

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:${COLORS.bg};color:${COLORS.text};-webkit-font-smoothing:antialiased}
::selection{background:${COLORS.primary};color:#fff}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#94A3B8}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
.fade-up{animation:fadeUp .5s ease both}
.fade-up.d1{animation-delay:.1s}.fade-up.d2{animation-delay:.2s}.fade-up.d3{animation-delay:.3s}.fade-up.d4{animation-delay:.4s}
.fade-in{animation:fadeIn .4s ease both}
`;

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════ */
const Card = ({ children, style, className = "", ...rest }) => (
  <div className={className} {...rest} style={{
    background: COLORS.card, borderRadius: 16, padding: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
    border: `1px solid ${COLORS.borderLight}`, ...style
  }}>{children}</div>
);

const KPI = ({ label, value, sub, accent, icon }) => (
  <Card style={{ flex: "1 1 220px", minWidth: 200 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted, marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 26, fontWeight: 800, color: COLORS.text }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
      </div>
      {icon && <div style={{ width: 42, height: 42, borderRadius: 12, background: accent + "14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>}
    </div>
  </Card>
);

const Badge = ({ text, color, bg }) => (
  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, color, background: bg, letterSpacing: ".3px" }}>{text}</span>
);

const Spinner = ({ size = 24, color = COLORS.primary }) => (
  <div style={{ width: size, height: size, border: `3px solid ${color}22`, borderTopColor: color, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
);

/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */
const fmt = (n, currency = "usd") => {
  if (n == null || isNaN(n)) return "--";
  const prefix = CURRENCIES[currency] || "$";
  if (Math.abs(n) >= 1e6) return prefix + (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return prefix + (n / 1e3).toFixed(1) + "K";
  return prefix + Number(n).toLocaleString("en", { maximumFractionDigits: 0 });
};

const fmtPct = (n) => n != null ? (n * 100).toFixed(1) + "%" : "--";
const fmtNum = (n) => n != null ? Number(n).toLocaleString("en", { maximumFractionDigits: 1 }) : "--";

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
function Landing({ onStart, onUpload }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.white }}>
      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 20, fontWeight: 800, color: COLORS.navy }}>SupplyMind</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onUpload} style={{ padding: "10px 24px", borderRadius: 10, border: `2px solid ${COLORS.primary}`, background: "transparent", color: COLORS.primary, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Upload Data
          </button>
          <button onClick={onStart} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: COLORS.primary, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Try Demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="fade-up" style={{ textAlign: "center", padding: "80px 48px 60px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          <Zap size={14} /> ML-Powered Demand Forecasting
        </div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 52, fontWeight: 800, lineHeight: 1.1, color: COLORS.navy, marginBottom: 20 }}>
          Turn sales data into<br />
          <span style={{ color: COLORS.primary }}>accurate predictions</span>
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: COLORS.textMuted, marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>
          Upload your sales history and get demand forecasts, safety stock calculations, reorder alerts, and inventory optimization recommendations powered by real ML algorithms.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button onClick={onUpload} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, border: "none", background: COLORS.primary, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(232,68,58,.3)" }}>
            <Upload size={18} /> Upload Your Data
          </button>
          <button onClick={onStart} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, border: `2px solid ${COLORS.border}`, background: "transparent", color: COLORS.navy, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Try Demo Data <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="fade-up d2" style={{ display: "flex", gap: 20, padding: "40px 48px", maxWidth: 1200, margin: "0 auto", flexWrap: "wrap" }}>
        {[
          { icon: <Brain size={24} color={COLORS.primary} />, title: "5 ML Algorithms", desc: "SMA, SARIMA, Prophet, LightGBM, and SHAP feature analysis. Auto-selects the best model per SKU." },
          { icon: <TrendingUp size={24} color={COLORS.green} />, title: "Demand Forecasting", desc: "Predict demand 3 to 24 months ahead with confidence intervals and seasonal decomposition." },
          { icon: <AlertTriangle size={24} color={COLORS.amber} />, title: "Risk Alerts", desc: "Stockout risk, dead stock detection, and overstock warnings with actionable recommendations." },
          { icon: <DollarSign size={24} color={COLORS.blue} />, title: "Working Capital", desc: "Safety stock, reorder points, EOQ calculations, and capital optimization opportunities." },
        ].map((f, i) => (
          <Card key={i} style={{ flex: "1 1 240px" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{f.icon}</div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 }}>{f.desc}</p>
          </Card>
        ))}
      </div>

      {/* How it Works */}
      <div className="fade-up d3" style={{ padding: "60px 48px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 40, color: COLORS.navy }}>How it works</h2>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { step: "01", title: "Upload or try demo", desc: "Upload your own CSV/XLSX sales data, or try the demo with GulfFresh (UAE) or FreshBasket (India) sample data." },
            { step: "02", title: "ML analyzes patterns", desc: "Five algorithms analyze your sales patterns. The best-performing model is auto-selected for each SKU." },
            { step: "03", title: "Get actionable insights", desc: "Interactive dashboard with forecasts, risk alerts, optimization recommendations, and exportable reports." },
          ].map((s, i) => (
            <div key={i} style={{ flex: "1 1 200px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 44, fontWeight: 800, color: COLORS.primary + "22", lineHeight: 1 }}>{s.step}</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: "8px 0", color: COLORS.navy }}>{s.title}</h4>
              <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "40px 48px", borderTop: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontSize: 13 }}>
        Built by Pranav &middot; pranavganeriwal2003@outlook.com
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COUNTRY SETUP
   ═══════════════════════════════════════════ */
function CountrySetup({ onSelect }) {
  const [currency, setCurrency] = useState("usd");
  const [hoveredCard, setHoveredCard] = useState(null);

  const countries = [
    { id: "uae", label: "UAE", company: "GulfFresh Distribution", city: "Dubai", flagColors: ["#00732F", "#FFFFFF", "#000000", "#FF0000"], desc: "FMCG distributor serving UAE retailers. Seasonality includes Ramadan, Eid, and summer peaks." },
    { id: "india", label: "India", company: "FreshBasket Distribution", city: "Mumbai", flagColors: ["#FF9933", "#FFFFFF", "#138808"], desc: "FMCG distributor serving Indian retailers. Seasonality includes Diwali, Holi, monsoon, and wedding season." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="fade-up" style={{ maxWidth: 600, width: "100%", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 20, fontWeight: 800, color: COLORS.navy }}>SupplyMind</span>
          </div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 24, fontWeight: 800, color: COLORS.navy }}>Select your market</h2>
          <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8 }}>Choose a simulation company. This adjusts seasonality, holidays, and sample data.</p>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {countries.map(c => {
            const isHovered = hoveredCard === c.id;
            return (
              <div key={c.id} className="fade-up d1"
                onClick={() => onSelect(c.id, currency)}
                onMouseEnter={() => setHoveredCard(c.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  flex: 1, cursor: "pointer", padding: 24, borderRadius: 16,
                  background: COLORS.card,
                  border: `2px solid ${isHovered ? COLORS.primary : COLORS.border}`,
                  boxShadow: isHovered ? `0 8px 24px ${COLORS.primary}20` : "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all .25s ease",
                  transform: isHovered ? "translateY(-4px)" : "none",
                }}>
                {/* Flag bar */}
                <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", marginBottom: 16, width: 48 }}>
                  {c.id === "uae" ? (
                    <>
                      <div style={{ width: 12, background: "#FF0000" }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ flex: 1, background: "#00732F" }} />
                        <div style={{ flex: 1, background: "#FFFFFF" }} />
                        <div style={{ flex: 1, background: "#000000" }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
                        <div style={{ flex: 1, background: "#FF9933" }} />
                        <div style={{ flex: 1, background: "#FFFFFF" }} />
                        <div style={{ flex: 1, background: "#138808" }} />
                      </div>
                    </>
                  )}
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 18, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>{c.company}</h3>
                <div style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600, marginBottom: 12 }}>{c.city}, {c.label}</div>
                <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{c.desc}</p>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: COLORS.primary, fontSize: 13, fontWeight: 700 }}>
                  Launch demo <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>

        <Card className="fade-up d2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Display currency</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[["usd", "USD ($)"], ["aed", "AED"], ["inr", "INR (Rs.)"]].map(([id, label]) => (
              <button key={id} onClick={() => setCurrency(id)} style={{
                padding: "6px 14px", borderRadius: 8, border: `1px solid ${currency === id ? COLORS.primary : COLORS.border}`,
                background: currency === id ? COLORS.primaryLight : "transparent",
                color: currency === id ? COLORS.primary : COLORS.textMuted,
                fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}>{label}</button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   UPLOAD PAGE
   ═══════════════════════════════════════════ */
function UploadPage({ onSubmit, onBack }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [country, setCountry] = useState("UAE");
  const [horizon, setHorizon] = useState(12);
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState(null);

  const accept = ".csv,.xlsx,.xls";
  const maxSize = 10 * 1024 * 1024;

  const handleFile = (f) => {
    setError(null);
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) { setError("Please upload a CSV or Excel (.xlsx) file."); return; }
    if (f.size > maxSize) { setError("File too large. Maximum size is 10MB."); return; }
    setFile(f);
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", background: COLORS.white, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 17, fontWeight: 800, color: COLORS.navy }}>SupplyMind</span>
        </div>
        <button onClick={onBack} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Back to Home
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 28, fontWeight: 800, color: COLORS.navy, marginBottom: 8 }}>Upload your sales data</h2>
          <p style={{ fontSize: 15, color: COLORS.textMuted, lineHeight: 1.6 }}>
            Upload a CSV or Excel file with your sales history. Required columns: <strong>date</strong>, <strong>sku/product_id</strong>, <strong>quantity</strong>. Optional: price, category.
          </p>
        </div>

        {/* Drop Zone */}
        <div className="fade-up d1"
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          style={{
            background: dragging ? COLORS.primaryLight : COLORS.white,
            border: `2px dashed ${dragging ? COLORS.primary : file ? COLORS.green : COLORS.border}`,
            borderRadius: 16, padding: "48px 24px", textAlign: "center", cursor: "pointer",
            transition: "all .2s", marginBottom: 24,
          }}
          onClick={() => document.getElementById("fileInput").click()}>
          <input id="fileInput" type="file" accept={accept} style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])} />
          
          {file ? (
            <div>
              <CheckCircle size={36} color={COLORS.green} style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{file.name}</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted }}>{(file.size / 1024).toFixed(1)} KB &middot; Click to change file</div>
            </div>
          ) : (
            <div>
              <FileUp size={36} color={dragging ? COLORS.primary : COLORS.textMuted} style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Drag and drop your file here</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted }}>or click to browse &middot; CSV, XLSX up to 10MB</div>
            </div>
          )}
        </div>

        {error && (
          <div className="fade-in" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={16} color={COLORS.red} />
            <span style={{ fontSize: 13, color: "#991B1B" }}>{error}</span>
          </div>
        )}

        {/* Configuration */}
        <Card className="fade-up d2" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Analysis settings</h3>
          
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {/* Country */}
            <div style={{ flex: "1 1 160px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Market</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[["UAE", "UAE"], ["India", "India"]].map(([val, label]) => (
                  <button key={val} onClick={() => setCountry(val)} style={{
                    flex: 1, padding: "8px 14px", borderRadius: 8,
                    border: `1px solid ${country === val ? COLORS.primary : COLORS.border}`,
                    background: country === val ? COLORS.primaryLight : "transparent",
                    color: country === val ? COLORS.primary : COLORS.textMuted,
                    fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Horizon */}
            <div style={{ flex: "1 1 160px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Forecast horizon</label>
              <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text, background: COLORS.white, outline: "none" }}>
                {[4, 8, 12, 24, 52].map(h => <option key={h} value={h}>{h} weeks</option>)}
              </select>
            </div>

            {/* Currency */}
            <div style={{ flex: "1 1 160px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Currency</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[["USD", "$"], ["AED", "AED"], ["INR", "Rs."]].map(([val, label]) => (
                  <button key={val} onClick={() => setCurrency(val)} style={{
                    flex: 1, padding: "8px 10px", borderRadius: 8,
                    border: `1px solid ${currency === val ? COLORS.primary : COLORS.border}`,
                    background: currency === val ? COLORS.primaryLight : "transparent",
                    color: currency === val ? COLORS.primary : COLORS.textMuted,
                    fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Data Format Help */}
        <Card className="fade-up d3" style={{ marginBottom: 24, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>Expected data format</h4>
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.8, fontFamily: "monospace" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, background: COLORS.white, borderRadius: 8, padding: 10, border: `1px solid ${COLORS.border}` }}>
              <span style={{ fontWeight: 700, color: COLORS.text }}>date</span>
              <span style={{ fontWeight: 700, color: COLORS.text }}>sku</span>
              <span style={{ fontWeight: 700, color: COLORS.text }}>quantity</span>
              <span style={{ fontWeight: 700, color: COLORS.textMuted }}>price</span>
              <span style={{ fontWeight: 700, color: COLORS.textMuted }}>category</span>
              <span>2024-01-01</span><span>SKU-001</span><span>150</span><span>22.99</span><span>Beverages</span>
              <span>2024-01-01</span><span>SKU-002</span><span>340</span><span>1.79</span><span>Dairy</span>
              <span>2024-01-02</span><span>SKU-001</span><span>180</span><span>22.99</span><span>Beverages</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 11 }}>
              <strong style={{ color: COLORS.text }}>Required:</strong> date, sku/product_id, quantity &middot; <strong style={{ color: COLORS.textMuted }}>Optional:</strong> price, category
            </div>
          </div>
        </Card>

        {/* Submit */}
        <button className="fade-up d4" disabled={!file}
          onClick={() => file && onSubmit(file, country, horizon, currency)}
          style={{
            width: "100%", padding: "16px", borderRadius: 12, border: "none",
            background: file ? COLORS.primary : COLORS.border,
            color: file ? "#fff" : COLORS.textMuted,
            fontSize: 16, fontWeight: 700, cursor: file ? "pointer" : "not-allowed",
            fontFamily: "'Plus Jakarta Sans'",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            boxShadow: file ? "0 4px 14px rgba(232,68,58,.3)" : "none",
            transition: "all .2s",
          }}>
          <Brain size={18} /> Run ML Analysis
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOADING SCREEN (Cold Start Aware)
   ═══════════════════════════════════════════ */
function LoadingScreen({ country, elapsed, isUpload }) {
  const company = country === "uae" ? "GulfFresh Distribution" : country === "india" ? "FreshBasket Distribution" : "your data";
  const steps = isUpload ? [
    { label: "Uploading file to ML engine", done: elapsed > 2 },
    { label: "Validating data format and columns", done: elapsed > 5 },
    { label: "Running SMA baseline forecasts", done: elapsed > 10 },
    { label: "Training SARIMA seasonal models", done: elapsed > 20 },
    { label: "Training LightGBM gradient boosting", done: elapsed > 35 },
    { label: "Computing SHAP feature importance", done: elapsed > 50 },
    { label: "Calculating safety stock and reorder points", done: elapsed > 60 },
    { label: "Generating risk alerts and recommendations", done: elapsed > 70 },
  ] : [
    { label: "Connecting to ML engine", done: elapsed > 2 },
    { label: "Generating sales history (25 SKUs, 52 weeks)", done: elapsed > 5 },
    { label: "Running SMA baseline forecasts", done: elapsed > 8 },
    { label: "Training SARIMA seasonal models", done: elapsed > 12 },
    { label: "Training LightGBM gradient boosting", done: elapsed > 16 },
    { label: "Computing SHAP feature importance", done: elapsed > 20 },
    { label: "Calculating safety stock and reorder points", done: elapsed > 24 },
    { label: "Generating risk alerts", done: elapsed > 28 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 480, width: "100%", padding: "0 24px", textAlign: "center" }}>
        <div style={{ marginBottom: 32 }}>
          <Spinner size={48} />
        </div>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 22, fontWeight: 800, color: COLORS.navy, marginBottom: 8 }}>
          Analyzing {company}
        </h2>
        <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 8 }}>
          {isUpload ? "Processing your file through the ML pipeline. This may take 60-90 seconds." : "Running ML models on demo data. This typically takes 15-30 seconds."}
        </p>
        {elapsed > (isUpload ? 30 : 15) && (
          <p style={{ fontSize: 13, color: COLORS.amber, fontWeight: 500, marginBottom: 8, animation: "fadeIn .3s ease" }}>
            The server is waking up from sleep mode (free tier). Hang tight, this is a one-time wait.
          </p>
        )}
        <div style={{ textAlign: "left", marginTop: 32 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", animation: s.done ? "slideIn .3s ease" : "none", opacity: s.done ? 1 : elapsed > (i * 3) ? 0.4 : 0.15, transition: "opacity .3s" }}>
              {s.done ? (
                <CheckCircle size={16} color={COLORS.green} />
              ) : (
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${COLORS.border}`, animation: elapsed > (i * 3) ? "pulse 1.5s infinite" : "none" }} />
              )}
              <span style={{ fontSize: 13, color: s.done ? COLORS.text : COLORS.textMuted, fontWeight: s.done ? 600 : 400 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
function Dashboard({ data, country, currency, onReset }) {
  const [tab, setTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSku, setSelectedSku] = useState(null);
  const [forecastHorizon, setForecastHorizon] = useState(12);

  const company = country === "uae" ? "GulfFresh Distribution" : "FreshBasket Distribution";
  const city = country === "uae" ? "Dubai, UAE" : "Mumbai, India";

  // Safely extract data from API response
  const skus = data?.skus || [];
  const summary = data?.summary || {};
  const forecasts = data?.forecasts || {};
  const alerts = data?.alerts || [];
  const optimization = data?.optimization || {};
  const algorithms = data?.algorithms || {};
  const categories = data?.categories || [];

  // Computed values
  const totalSkus = skus.length;
  const totalValue = skus.reduce((s, d) => s + (d.stock_value || 0), 0);
  const avgTurnover = skus.reduce((s, d) => s + (d.turnover || 0), 0) / (totalSkus || 1);
  const reorderCount = skus.filter(d => d.status === "REORDER NOW" || d.status === "ORDER SOON").length;
  const deadItems = skus.filter(d => d.is_dead_stock);
  const deadValue = deadItems.reduce((s, d) => s + (d.stock_value || 0), 0);
  const stockoutRisk = skus.filter(d => d.status === "STOCKOUT" || d.status === "REORDER NOW").length;

  // ABC breakdown
  const abcData = ["A", "B", "C"].map(c => {
    const items = skus.filter(d => d.abc_class === c);
    return { name: `Class ${c}`, value: items.reduce((s, d) => s + (d.stock_value || 0), 0), count: items.length, fill: ABC_COLORS[c] };
  });

  // Category breakdown
  const catData = [...new Set(skus.map(d => d.category))].map(cat => {
    const items = skus.filter(d => d.category === cat);
    return { name: cat, value: items.reduce((s, d) => s + (d.stock_value || 0), 0), count: items.length };
  }).sort((a, b) => b.value - a.value);

  // Filtered SKUs for search
  const filteredSkus = skus.filter(d =>
    !searchTerm || d.sku_id?.toLowerCase().includes(searchTerm.toLowerCase()) || d.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Status counts
  const statusCounts = {};
  skus.forEach(d => { statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });

  const statusStyle = {
    "HEALTHY": { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
    "ORDER SOON": { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
    "REORDER NOW": { bg: "#FFF1F2", text: "#9F1239", dot: "#F43F5E" },
    "STOCKOUT": { bg: "#FEF2F2", text: "#991B1B", dot: "#DC2626" },
  };

  const TABS = [
    { id: "overview", label: "Overview", icon: <Activity size={16} /> },
    { id: "abc", label: "ABC Analysis", icon: <Layers size={16} /> },
    { id: "alerts", label: "Risk Alerts", icon: <AlertTriangle size={16} /> },
    { id: "dead", label: "Dead Stock", icon: <Box size={16} /> },
    { id: "forecasts", label: "Forecasts", icon: <TrendingUp size={16} /> },
    { id: "capital", label: "Working Capital", icon: <DollarSign size={16} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Dashboard Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyLight} 100%)`, padding: "20px 40px 14px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14, maxWidth: 1400, margin: "0 auto 14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 18, fontWeight: 800 }}>SupplyMind</span>
              <span style={{ fontSize: 11, color: "#94A3B8", background: "rgba(255,255,255,.1)", padding: "2px 8px", borderRadius: 4 }}>{company} &middot; {city}</span>
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
              {totalSkus} SKUs analyzed &middot; 5 ML algorithms &middot; {forecastHorizon}-month forecast horizon
            </div>
          </div>
          <button onClick={onReset} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "#94A3B8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={14} /> New Analysis
          </button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", maxWidth: 1400, margin: "0 auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 20px",
              borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              background: tab === t.id ? COLORS.bg : "transparent",
              color: tab === t.id ? COLORS.navy : "#94A3B8",
              transition: "all .15s"
            }}>
              {t.icon}{t.label}
              {t.id === "alerts" && alerts.length > 0 && <span style={{ background: COLORS.red, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{alerts.length}</span>}
              {t.id === "dead" && deadItems.length > 0 && <span style={{ background: COLORS.red, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{deadItems.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: "24px 40px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <KPI label="Total Inventory Value" value={fmt(totalValue, currency)} sub={`${totalSkus} SKUs`} accent={COLORS.blue} icon={<Package size={20} color={COLORS.blue} />} />
              <KPI label="Avg. Inventory Turnover" value={`${avgTurnover.toFixed(1)}x`} sub={`~${Math.round(365 / (avgTurnover || 1))} days avg`} accent={COLORS.green} icon={<TrendingUp size={20} color={COLORS.green} />} />
              <KPI label="Active Alerts" value={reorderCount + deadItems.length} sub={`${reorderCount} reorder + ${deadItems.length} dead`} accent={COLORS.red} icon={<AlertTriangle size={20} color={COLORS.red} />} />
              <KPI label="Best Algorithm" value={algorithms.best_overall || "LightGBM"} sub={`${summary.forecast_accuracy || 95}% avg accuracy`} accent={COLORS.purple} icon={<Brain size={20} color={COLORS.purple} />} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <Card>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>ABC Value Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart><Pie data={abcData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} strokeWidth={2} stroke="#fff">
                    {abcData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie><Tooltip formatter={v => fmt(v, currency)} /><Legend /></PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  {abcData.map(d => (
                    <div key={d.name} style={{ flex: 1, textAlign: "center", padding: 10, borderRadius: 8, background: COLORS.bg }}>
                      <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 15, fontWeight: 800, color: d.fill }}>{fmt(d.value, currency)}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{d.name} ({d.count} SKUs)</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Stock Value by Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={catData.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis type="number" tickFormatter={v => fmt(v, currency)} style={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={100} style={{ fontSize: 11 }} />
                    <Tooltip formatter={v => fmt(v, currency)} />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Status Distribution */}
            <Card>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Inventory Status Distribution</h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const st = statusStyle[status] || statusStyle["HEALTHY"];
                  return (
                    <div key={status} style={{ flex: "1 1 160px", padding: 16, borderRadius: 12, background: st.bg, textAlign: "center" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.dot, margin: "0 auto 8px" }} />
                      <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 24, fontWeight: 800, color: st.text }}>{count}</div>
                      <div style={{ fontSize: 12, color: st.text, fontWeight: 600, opacity: .8 }}>{status}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ ABC ANALYSIS TAB ═══ */}
        {tab === "abc" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              {["A", "B", "C"].map(cls => {
                const items = skus.filter(d => d.abc_class === cls);
                const val = items.reduce((s, d) => s + (d.stock_value || 0), 0);
                return (
                  <Card key={cls} style={{ flex: "1 1 280px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <Badge text={`Class ${cls}`} color={ABC_COLORS[cls]} bg={ABC_BG[cls]} />
                      <span style={{ fontSize: 13, color: COLORS.textMuted }}>{items.length} SKUs</span>
                    </div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 22, fontWeight: 800 }}>{fmt(val, currency)}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                      {totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : 0}% of total inventory value
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* SKU Table */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700 }}>All SKUs by ABC Classification</h3>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search SKUs..."
                    style={{ padding: "8px 12px 8px 32px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, width: 200, outline: "none" }} />
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                      {["SKU", "Product", "Category", "ABC", "Stock Value", "Turnover", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkus.slice(0, 50).map((d, i) => {
                      const st = statusStyle[d.status] || statusStyle["HEALTHY"];
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderLight}`, cursor: "pointer" }}
                          onClick={() => setSelectedSku(d)} onMouseOver={e => e.currentTarget.style.background = COLORS.bg}
                          onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{d.sku_id}</td>
                          <td style={{ padding: "10px 12px" }}>{d.product_name}</td>
                          <td style={{ padding: "10px 12px", color: COLORS.textMuted }}>{d.category}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <Badge text={d.abc_class} color={ABC_COLORS[d.abc_class]} bg={ABC_BG[d.abc_class]} />
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{fmt(d.stock_value, currency)}</td>
                          <td style={{ padding: "10px 12px" }}>{d.turnover?.toFixed(1)}x</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: st.bg, color: st.text }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ═══ RISK ALERTS TAB ═══ */}
        {tab === "alerts" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <KPI label="Stockout Risk" value={stockoutRisk} sub="SKUs at high risk" accent={COLORS.red} icon={<AlertCircle size={20} color={COLORS.red} />} />
              <KPI label="Reorder Needed" value={reorderCount} sub="SKUs need restocking" accent={COLORS.amber} icon={<AlertTriangle size={20} color={COLORS.amber} />} />
              <KPI label="Dead Stock" value={deadItems.length} sub={`${fmt(deadValue, currency)} tied up`} accent={COLORS.textMuted} icon={<Box size={20} color={COLORS.textMuted} />} />
            </div>

            {alerts.length > 0 ? (
              <Card>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Active Alerts</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alerts.map((a, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 10,
                      background: a.severity === "critical" ? "#FEF2F2" : a.severity === "warning" ? "#FFFBEB" : COLORS.bg,
                      border: `1px solid ${a.severity === "critical" ? "#FECACA" : a.severity === "warning" ? "#FDE68A" : COLORS.border}`
                    }}>
                      <AlertTriangle size={18} color={a.severity === "critical" ? COLORS.red : COLORS.amber} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{a.sku_id} - {a.product_name}</div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{a.message}</div>
                      </div>
                      <Badge text={a.severity?.toUpperCase()} color={a.severity === "critical" ? COLORS.red : COLORS.amber} bg={a.severity === "critical" ? "#FEE2E2" : "#FEF3C7"} />
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card style={{ textAlign: "center", padding: 48 }}>
                <CheckCircle size={36} color={COLORS.green} style={{ marginBottom: 12 }} />
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>All clear</h3>
                <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No active risk alerts. All SKUs are within acceptable thresholds.</p>
              </Card>
            )}

            {/* Reorder SKUs Table */}
            {reorderCount > 0 && (
              <Card style={{ marginTop: 20 }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>SKUs Needing Reorder</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                        {["SKU", "Product", "Current Stock", "Reorder Point", "Safety Stock", "Status"].map(h => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {skus.filter(d => d.status === "REORDER NOW" || d.status === "ORDER SOON").map((d, i) => {
                        const st = statusStyle[d.status] || {};
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>{d.sku_id}</td>
                            <td style={{ padding: "10px 12px" }}>{d.product_name}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: d.current_stock < d.safety_stock ? COLORS.red : COLORS.text }}>{fmtNum(d.current_stock)}</td>
                            <td style={{ padding: "10px 12px" }}>{fmtNum(d.reorder_point)}</td>
                            <td style={{ padding: "10px 12px" }}>{fmtNum(d.safety_stock)}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: st.bg, color: st.text }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} /> {d.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══ DEAD STOCK TAB ═══ */}
        {tab === "dead" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <KPI label="Dead Stock Items" value={deadItems.length} sub={`Out of ${totalSkus} total SKUs`} accent={COLORS.textMuted} icon={<Box size={20} color={COLORS.textMuted} />} />
              <KPI label="Capital Trapped" value={fmt(deadValue, currency)} sub="Could be freed with clearance" accent={COLORS.red} icon={<DollarSign size={20} color={COLORS.red} />} />
              <KPI label="Recovery at 40% Off" value={fmt((data?.optimization?.recovery_at_40_off || deadValue * 0.6), currency)} sub="Estimated clearance revenue" accent={COLORS.green} icon={<TrendingUp size={20} color={COLORS.green} />} />
            </div>

            {deadItems.length > 0 ? (
              <Card>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Dead Stock Inventory</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                        {["SKU", "Product", "Category", "Stock Value", "Days Silent", "Recommendation"].map(h => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deadItems.map((d, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{d.sku_id}</td>
                          <td style={{ padding: "10px 12px" }}>{d.product_name}</td>
                          <td style={{ padding: "10px 12px", color: COLORS.textMuted }}>{d.category}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: COLORS.red }}>{fmt(d.stock_value, currency)}</td>
                          <td style={{ padding: "10px 12px" }}>{d.days_silent || "60+"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#FEF2F2", color: COLORS.red }}>
                              Clearance 40-50% off
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card style={{ textAlign: "center", padding: 48 }}>
                <CheckCircle size={36} color={COLORS.green} style={{ marginBottom: 12 }} />
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No dead stock detected</h3>
                <p style={{ color: COLORS.textMuted, fontSize: 14 }}>All SKUs have had sales activity within the threshold period.</p>
              </Card>
            )}
          </div>
        )}

        {/* ═══ FORECASTS TAB ═══ */}
        {tab === "forecasts" && (
          <div className="fade-in">
            {/* Algorithm Comparison */}
            <Card style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Algorithm Performance Comparison</h3>
              <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>Average MAPE (Mean Absolute Percentage Error) across all SKUs. Lower is better.</p>
              {algorithms.comparison ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(algorithms.comparison).map(([k, v]) => ({ name: k.toUpperCase(), mape: v.avg_mape || v, fill: ALGO_COLORS[k] || COLORS.blue }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" style={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis tickFormatter={v => v + "%"} style={{ fontSize: 11 }} />
                    <Tooltip formatter={v => (typeof v === "number" ? v.toFixed(1) + "%" : v)} />
                    <Bar dataKey="mape" radius={[6, 6, 0, 0]} barSize={50}>
                      {Object.entries(algorithms.comparison).map(([k], i) => (
                        <Cell key={i} fill={ALGO_COLORS[k] || COLORS.blue} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>
                  Algorithm comparison data will appear here when available.
                </div>
              )}
            </Card>

            {/* Forecast per SKU */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700 }}>SKU Forecasts</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>Horizon:</span>
                  <select value={forecastHorizon} onChange={e => setForecastHorizon(Number(e.target.value))}
                    style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13 }}>
                    {[3, 6, 12, 18, 24].map(h => <option key={h} value={h}>{h} months</option>)}
                  </select>
                </div>
              </div>

              {skus.slice(0, 6).map((sku, i) => {
                const fc = forecasts[sku.sku_id];
                if (!fc || !fc.values) return null;
                const chartData = fc.values.slice(0, forecastHorizon).map((v, j) => ({
                  month: `M${j + 1}`,
                  forecast: Math.round(v.forecast || v),
                  upper: Math.round(v.upper || v * 1.15),
                  lower: Math.round(v.lower || v * 0.85),
                }));
                return (
                  <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < 5 ? `1px solid ${COLORS.borderLight}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, marginRight: 8 }}>{sku.sku_id}</span>
                        <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{sku.product_name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Badge text={`Best: ${(fc.best_algorithm || "LightGBM").toUpperCase()}`} color={COLORS.green} bg="#ECFDF5" />
                        {fc.mape != null && <Badge text={`MAPE: ${fc.mape.toFixed(1)}%`} color={COLORS.blue} bg="#EFF6FF" />}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={chartData} margin={{ left: 0, right: 0 }}>
                        <defs>
                          <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                        <XAxis dataKey="month" style={{ fontSize: 10 }} />
                        <YAxis style={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="upper" stroke="transparent" fill={COLORS.blue + "15"} />
                        <Area type="monotone" dataKey="lower" stroke="transparent" fill="transparent" />
                        <Line type="monotone" dataKey="forecast" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </Card>

            {/* SHAP Feature Importance */}
            {algorithms.shap_features && (
              <Card style={{ marginTop: 20 }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>SHAP Feature Importance</h3>
                <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>Which factors drive the LightGBM demand predictions the most.</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={algorithms.shap_features.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis type="number" style={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="feature" width={120} style={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="importance" fill={COLORS.primary} radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}

        {/* ═══ WORKING CAPITAL TAB ═══ */}
        {tab === "capital" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <KPI label="Total Capital in Stock" value={fmt(totalValue, currency)} sub={`Across ${totalSkus} SKUs`} accent={COLORS.blue} icon={<DollarSign size={20} color={COLORS.blue} />} />
              <KPI label="Dead Stock Capital" value={fmt(deadValue, currency)} sub="Trapped in unsold items" accent={COLORS.red} icon={<AlertCircle size={20} color={COLORS.red} />} />
              <KPI label="Potential Savings" value={fmt((optimization.potential_savings || deadValue * 0.4), currency)} sub="Freeable capital through optimization" accent={COLORS.green} icon={<TrendingUp size={20} color={COLORS.green} />} />
            </div>

            {/* Optimization Opportunities */}
            <Card style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Optimization Opportunities</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  {
                    title: "Clear Dead Stock",
                    impact: fmt(deadValue, currency),
                    desc: `Liquidating ${deadItems.length} dead stock items frees this capital immediately. Run clearance at 40-50% off.`,
                    color: COLORS.red, bg: "#FEF2F2"
                  },
                  {
                    title: "Reduce C-Item Stock",
                    impact: fmt(Math.round(skus.filter(d => d.abc_class === "C").reduce((s, d) => s + (d.stock_value || 0), 0) * 0.3), currency),
                    desc: "Cut C-category inventory by 30% through smaller orders and longer reorder cycles.",
                    color: COLORS.amber, bg: "#FFFBEB"
                  },
                  {
                    title: "Invest in A-Items",
                    impact: "~15% more revenue",
                    desc: "Redirect freed capital into A-items. More bestseller stock means fewer stockouts and more sales.",
                    color: COLORS.green, bg: "#ECFDF5"
                  },
                ].map(o => (
                  <div key={o.title} style={{ background: o.bg, borderRadius: 12, padding: 20, border: `1px solid ${o.color}22` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: o.color, marginBottom: 8 }}>{o.title}</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>{o.impact}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{o.desc}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* EOQ Table */}
            <Card>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Safety Stock & Reorder Points</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                      {["SKU", "Product", "Safety Stock", "Reorder Point", "EOQ", "Current Stock", "Action"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {skus.filter(d => d.abc_class === "A").slice(0, 10).map((d, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{d.sku_id}</td>
                        <td style={{ padding: "10px 12px" }}>{d.product_name}</td>
                        <td style={{ padding: "10px 12px" }}>{fmtNum(d.safety_stock)}</td>
                        <td style={{ padding: "10px 12px" }}>{fmtNum(d.reorder_point)}</td>
                        <td style={{ padding: "10px 12px" }}>{fmtNum(d.eoq)}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: d.current_stock < d.reorder_point ? COLORS.red : COLORS.green }}>
                          {fmtNum(d.current_stock)}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {d.current_stock < d.reorder_point ? (
                            <Badge text="Order Now" color={COLORS.red} bg="#FEE2E2" />
                          ) : (
                            <Badge text="OK" color={COLORS.green} bg="#ECFDF5" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "24px 40px", color: COLORS.textMuted, fontSize: 12 }}>
        Built by Pranav &middot; pranavganeriwal2003@outlook.com &middot; SupplyMind &middot; ML-Powered Demand Forecasting
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP (State Machine + API)
   ═══════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("landing");
  const [country, setCountry] = useState(null);
  const [currency, setCurrency] = useState("usd");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isFallback, setIsFallback] = useState(false);
  const [isUpload, setIsUpload] = useState(false);

  // Wake server on page load (so cold start happens while user reads landing page)
  useEffect(() => { wakeServer(); }, []);

  // Fetch demo data from live API (with fallback to local demo)
  const fetchDemo = useCallback(async (selectedCountry, selectedCurrency) => {
    setCountry(selectedCountry);
    setCurrency(selectedCurrency);
    setIsUpload(false);
    setPage("loading");
    setElapsed(0);
    setError(null);
    setIsFallback(false);

    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);

    try {
      const result = await fetchDemoData(selectedCountry, 12);
      clearInterval(timer);
      if (result._fallback) setIsFallback(true);
      setData(result);
      setPage("dashboard");
    } catch (err) {
      clearInterval(timer);
      console.error("API Error:", err);
      setError(err.message);
    }
  }, []);

  // Handle file upload -> send to /api/analyze
  const handleUpload = useCallback(async (file, selectedCountry, horizon, selectedCurrency) => {
    setCountry(selectedCountry.toLowerCase());
    setCurrency(selectedCurrency.toLowerCase());
    setIsUpload(true);
    setPage("loading");
    setElapsed(0);
    setError(null);
    setIsFallback(false);

    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);

    try {
      const result = await uploadFile(file, selectedCountry, horizon, selectedCurrency);
      clearInterval(timer);
      setData(result);
      setPage("dashboard");
    } catch (err) {
      clearInterval(timer);
      console.error("Upload Error:", err);
      setError(err.message);
      // Show error on loading page, don't navigate away
    }
  }, []);

  const handleReset = () => {
    setPage("landing");
    setData(null);
    setCountry(null);
    setError(null);
    setElapsed(0);
    setIsFallback(false);
    setIsUpload(false);
  };

  return (
    <>
      <style>{css}</style>
      {page === "landing" && <Landing onStart={() => setPage("setup")} onUpload={() => setPage("upload")} />}
      {page === "setup" && <CountrySetup onSelect={fetchDemo} />}
      {page === "upload" && <UploadPage onSubmit={handleUpload} onBack={() => setPage("landing")} />}
      {page === "loading" && (
        <div>
          <LoadingScreen country={country} elapsed={elapsed} isUpload={isUpload} />
          {error && (
            <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 24px", maxWidth: 540, boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlertCircle size={18} color={COLORS.red} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#991B1B" }}>{isUpload ? "Upload failed" : "Connection issue"}</div>
                  <div style={{ fontSize: 12, color: "#B91C1C", marginTop: 2 }}>{error}</div>
                  <button onClick={handleReset} style={{ marginTop: 8, padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.white, color: COLORS.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Go back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {page === "dashboard" && data && (
        <div>
          {isFallback && (
            <div style={{ background: "#FFFBEB", borderBottom: "1px solid #FDE68A", padding: "10px 40px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "#92400E" }}>
              <AlertCircle size={14} />
              <span>Showing local demo data. The ML backend may be starting up. <button onClick={() => fetchDemo(country, currency)} style={{ background: "none", border: "none", color: COLORS.primary, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Retry live API</button></span>
            </div>
          )}
          <Dashboard data={data} country={country} currency={currency} onReset={handleReset} />
        </div>
      )}
    </>
  );
}
