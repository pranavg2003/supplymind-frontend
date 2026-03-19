const API_BASE = "https://supplymind-backend.onrender.com";

export async function fetchDemoData(country, horizon = 12) {
  const url = `${API_BASE}/api/demo/${country}?horizon=${horizon}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const response = await fetch(url, { method: "GET", headers: { "Accept": "application/json" }, signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const raw = await response.json();
      return normalizeResponse(raw, country);
    } catch (err) {
      console.warn(`Attempt ${attempt} failed:`, err.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 5000));
      else { console.warn("All attempts failed. Using fallback."); return getFallbackData(country); }
    }
  }
}

function normalizeResponse(raw) {
  const ov = raw.overview || {};
  const wc = raw.working_capital || {};
  const rawSkus = raw.skus || [];

  const skus = rawSkus.map(s => {
    const opt = s.optimization || {};
    const status = opt.risk === "critical" ? "REORDER NOW" : opt.risk === "stockout" && opt.is_dead_stock ? "STOCKOUT" : opt.reorder_qty > 0 ? "ORDER SOON" : "HEALTHY";
    return {
      sku_id: s.id, product_name: s.name, category: s.category, price: s.price,
      current_stock: s.current_stock, lead_time_days: s.lead_time_days,
      abc_class: opt.abc_class || s.abc_class || "C",
      stock_value: opt.inventory_value || 0, turnover: opt.turnover || 0,
      days_on_hand: opt.days_on_hand || 0, safety_stock: opt.safety_stock || 0,
      reorder_point: opt.reorder_point || 0, eoq: opt.eoq || 0,
      reorder_qty: opt.reorder_qty || 0, is_dead_stock: opt.is_dead_stock || false,
      days_silent: opt.days_silent || 0, cost_per_month: opt.cost_per_month || 0,
      avg_weekly_demand: opt.avg_weekly_demand || 0, demand_decline_pct: opt.demand_decline_pct || 0,
      forecasted_revenue: s.forecasted_revenue || 0, status,
      forecast: s.forecast || [], best_algorithm: s.best_algorithm || "SMA",
      best_mape: s.best_mape || 0, algorithm_comparison: s.algorithm_comparison || [],
      shap_features: s.shap_features || [], patterns: s.patterns || [],
      weekly_history: s.weekly_history || [],
    };
  });

  const alerts = [];
  skus.forEach(s => {
    if (s.status === "REORDER NOW" || s.status === "STOCKOUT") {
      alerts.push({ sku_id: s.sku_id, product_name: s.product_name, severity: "critical",
        message: s.is_dead_stock ? `No sales in ${s.days_silent}+ days. Capital trapped: $${s.stock_value.toFixed(0)}.` : `Stock (${s.current_stock}) below safety stock (${s.safety_stock}). Order ${s.reorder_qty} units.` });
    } else if (s.status === "ORDER SOON") {
      alerts.push({ sku_id: s.sku_id, product_name: s.product_name, severity: "warning",
        message: `Stock (${s.current_stock}) near reorder point (${s.reorder_point}). Plan reorder.` });
    }
  });

  const algoWins = ov.algorithm_wins || {};
  const bestOverall = Object.entries(algoWins).sort((a, b) => b[1] - a[1])[0]?.[0] || "LightGBM";
  const algoMapes = {};
  skus.forEach(s => (s.algorithm_comparison || []).forEach(a => {
    const k = a.name?.toLowerCase(); if (!algoMapes[k]) algoMapes[k] = { t: 0, c: 0 };
    algoMapes[k].t += a.metrics?.mape || 0; algoMapes[k].c += 1;
  }));
  const comparison = {}; Object.entries(algoMapes).forEach(([k, v]) => { comparison[k] = { avg_mape: v.t / v.c }; });

  const shapAgg = {};
  skus.forEach(s => (s.shap_features || []).forEach(f => {
    if (!shapAgg[f.feature]) shapAgg[f.feature] = { t: 0, c: 0 };
    shapAgg[f.feature].t += f.importance; shapAgg[f.feature].c += 1;
  }));
  const shapFeatures = Object.entries(shapAgg).map(([feature, v]) => ({ feature, importance: v.t / v.c })).sort((a, b) => b.importance - a.importance).slice(0, 10);

  const forecasts = {};
  skus.forEach(s => { forecasts[s.sku_id] = { best_algorithm: s.best_algorithm, mape: s.best_mape, values: s.forecast.map(f => ({ forecast: f.demand, upper: f.upper, lower: f.lower })) }; });

  return {
    skus, forecasts, alerts, meta: raw.meta || {},
    summary: { total_skus: skus.length, total_value: ov.total_inventory_value || 0, carrying_cost: ov.carrying_cost || 0, avg_turnover: ov.avg_turnover || 0, avg_doh: ov.avg_doh || 0, forecast_accuracy: ov.forecast_accuracy || 0, stockout_count: ov.stockout_count || 0, dead_stock_count: ov.dead_stock_count || 0 },
    optimization: { potential_savings: wc.freeable_capital || 0, dead_stock_capital: wc.dead_stock_capital || 0, dead_stock_monthly_waste: wc.dead_stock_monthly_waste || 0, recovery_at_40_off: wc.recovery_at_40_off || 0, carrying_cost: wc.carrying_cost || 0, capital_by_abc: wc.capital_by_abc || {} },
    algorithms: { best_overall: bestOverall, wins: algoWins, comparison, shap_features: shapFeatures },
    holidays: raw.holidays || [], revenue_by_week: ov.revenue_by_week || [], revenue_by_category: ov.revenue_by_category || [],
    _fallback: false,
  };
}

export function getFallbackData(country) {
  const cats = country === "uae" ? ["Beverages","Dairy","Dry Goods","Snacks","Personal Care","Cleaning","Frozen","Canned Goods"] : ["Beverages","Dairy","Grains","Snacks","Personal Care","Cleaning","Frozen","Spices"];
  const names = ["Red Bull 24pk","Almarai Milk 1L","Tang Orange 1kg","Kitkat 4F","Lurpak Butter","Basmati Rice 5kg","Puck Cream","Goody Spaghetti","McCain Nuggets","Del Monte Corn","Head Shoulders","Colgate Wash","Nido Powder","Oreo Original","Dove Soap 4pk","Heinz Ketchup","Al Ain Water","Clorox Wipes","Vimto 1L","Al Alali Beans","Baskin Robbins","Indomie Pack","Dettol Cleaner","Lays Classic","Ariel Powder"];
  const skus = names.map((name, i) => {
    const abc = i < 9 ? "A" : i < 14 ? "B" : "C";
    const price = 1 + Math.random() * 20; const wk = abc === "A" ? 150 + Math.random() * 400 : abc === "B" ? 80 + Math.random() * 150 : 10 + Math.random() * 80;
    const stock = Math.round(wk * (1 + Math.random() * 3)); const ss = Math.round(wk * 0.3); const rop = Math.round(wk * 1.5 + ss);
    const isDead = i >= 22; const status = isDead ? "STOCKOUT" : stock < ss ? "REORDER NOW" : stock < rop ? "ORDER SOON" : "HEALTHY";
    return { sku_id: `SKU-${String(i+1).padStart(3,"0")}`, product_name: name, category: cats[i%cats.length], price, current_stock: stock, abc_class: abc, stock_value: Math.round(stock*price), turnover: Math.round((wk*52/stock)*10)/10, days_on_hand: Math.round(stock/(wk/7)), safety_stock: ss, reorder_point: rop, eoq: Math.round(wk*4), reorder_qty: status!=="HEALTHY"?Math.round(wk*8):0, is_dead_stock: isDead, days_silent: isDead?70:0, cost_per_month: isDead?Math.round(stock*price*0.02):0, avg_weekly_demand: Math.round(wk), status, forecast: Array.from({length:24},(_,j)=>{const d=Math.round(wk*(1+0.1*Math.sin(j/6*Math.PI)));return{demand:d,upper:Math.round(d*1.2),lower:Math.round(d*0.8)};}), best_algorithm:"LightGBM", best_mape:3+Math.random()*10, algorithm_comparison:[{name:"LightGBM",metrics:{mae:5,rmse:8,mape:4}},{name:"SMA",metrics:{mae:15,rmse:20,mape:12}}], shap_features:[{feature:"Seasonal Pattern",importance:0.2},{feature:"Last Week Sales",importance:0.1}], patterns:[], weekly_history:[] };
  });
  const alerts = skus.filter(s=>s.status!=="HEALTHY").map(s=>({sku_id:s.sku_id,product_name:s.product_name,severity:s.status==="REORDER NOW"||s.status==="STOCKOUT"?"critical":"warning",message:s.is_dead_stock?`No sales in ${s.days_silent}+ days.`:"Stock below threshold."}));
  const forecasts = {}; skus.forEach(s=>{forecasts[s.sku_id]={best_algorithm:s.best_algorithm,mape:s.best_mape,values:s.forecast.map(f=>({forecast:f.demand,upper:f.upper,lower:f.lower}))};});
  const tv = skus.reduce((s,d)=>s+d.stock_value,0); const dv = skus.filter(d=>d.is_dead_stock).reduce((s,d)=>s+d.stock_value,0);
  return { skus, forecasts, alerts, summary:{total_skus:25,total_value:tv,forecast_accuracy:90}, optimization:{potential_savings:Math.round(dv*0.4),dead_stock_capital:dv,recovery_at_40_off:Math.round(dv*0.6)}, algorithms:{best_overall:"LightGBM",comparison:{sma:{avg_mape:10},lightgbm:{avg_mape:4}},shap_features:[{feature:"Seasonal Pattern",importance:0.19},{feature:"Last Week Sales",importance:0.09},{feature:"Monthly Change",importance:0.08}]}, holidays:[],revenue_by_week:[],revenue_by_category:[],meta:{country:country.toUpperCase()}, _fallback:true };
}
