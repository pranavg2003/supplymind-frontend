# SupplyMind - ML-Powered Demand Forecasting

Turn messy sales spreadsheets into accurate demand predictions with machine learning.

## What It Does

SupplyMind analyzes sales history using 5 ML algorithms (SMA, SARIMA, Prophet, LightGBM, SHAP) and delivers:

- **Demand forecasts** 3-24 months ahead with confidence intervals
- **ABC classification** of inventory by revenue contribution
- **Risk alerts** for stockout risk, dead stock, and overstock
- **Safety stock & reorder points** calculated from forecast data
- **Working capital optimization** with actionable recommendations

## Simulation Companies

- **GulfFresh Distribution** (Dubai, UAE) - FMCG distributor with Ramadan/Eid/summer seasonality
- **FreshBasket Distribution** (Mumbai, India) - FMCG distributor with Diwali/Holi/monsoon seasonality

25 SKUs per market, 8 product categories, 52 weeks of simulated sales data.

## Tech Stack

- **Frontend:** React, Vite, Recharts, Lucide React
- **Backend:** Python, FastAPI, scikit-learn, statsmodels, LightGBM
- **Hosting:** Vercel (frontend), Render (backend)
- **CI/CD:** GitHub auto-deploy on both platforms

## Architecture

```
Browser (React on Vercel)
    |
    | GET /api/demo/{country}?horizon=12
    |
FastAPI Backend (Render)
    |
    | Generates data -> Runs SMA + SARIMA + LightGBM
    | Computes SHAP -> Calculates safety stock, EOQ
    |
    v
JSON response -> Dashboard renders
```

## Local Development

```bash
npm install
npm run dev
```

## Deployment

Push to GitHub and connect to Vercel. It auto-detects the Vite configuration.

## Built By

Pranav - pranavganeriwal2003@outlook.com
