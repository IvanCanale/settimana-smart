"use client";
import React from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { CATEGORY_ORDER, DAYS } from "@/lib/planEngine";
import type { PlanResult } from "@/types";

interface ShoppingTabProps {
  generated: PlanResult;
  checkedShoppingItems: Set<string>;
  setCheckedShoppingItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  extraShoppingItems: string[];
  setExtraShoppingItems: React.Dispatch<React.SetStateAction<string[]>>;
  tourAdvance: (action: string) => void;
}

const categoryEmoji: Record<string, string> = {
  Verdure: "🥦",
  Proteine: "🥩",
  Latticini: "🧀",
  Cereali: "🌾",
  Dispensa: "🫙",
};

export function ShoppingTab({
  generated,
  checkedShoppingItems,
  setCheckedShoppingItems,
  extraShoppingItems,
  setExtraShoppingItems,
  tourAdvance,
}: ShoppingTabProps) {
  const [extraShoppingInput, setExtraShoppingInput] = React.useState("");

  return (
    <div className="animate-in delay-2">
      <SectionHeader icon="🛒" title="Lista della spesa" subtitle="Consolidata e già depurata da ciò che hai in dispensa" />
      {generated.shopping.length === 0 ? (
        <div className="card-warm" style={{ padding: 28, textAlign: "center", color: "var(--sepia-light)" }}>Nessun ingrediente da acquistare con questi parametri.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 12 }}>
          {CATEGORY_ORDER.map((cat) => {
            const items = generated.shopping.filter((i) => i.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat} className="shopping-category">
                <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--sepia)", display: "flex", alignItems: "center", gap: 8 }}>{categoryEmoji[cat] || "📦"} {cat}</h4>
                <div style={{ display: "grid", gap: 6 }}>
                  {items.map((item) => {
                    const itemKey = `shop-${item.name}`;
                    const isChecked = checkedShoppingItems.has(itemKey);
                    return (
                      <div key={item.name} className="shopping-item" style={{ opacity: isChecked ? 0.45 : 1, transition: "opacity 0.2s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                          <input type="checkbox" checked={isChecked} onChange={() => {
                            setCheckedShoppingItems((p) => {
                              const n = new Set(p);
                              n.has(itemKey) ? n.delete(itemKey) : n.add(itemKey);
                              return n;
                            });
                            tourAdvance("item_checked");
                          }} className="checkbox-warm" />
                          <span style={{ fontSize: 14, color: "var(--sepia)", fontWeight: 500, textDecoration: isChecked ? "line-through" : "none" }}>{item.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)" }}>{Number.isInteger(item.qty) ? item.qty : item.qty.toFixed(1)} {item.unit}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BANNER CONGELATORE ── */}
      {generated.freezeItems.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, rgba(92,107,58,0.1), rgba(92,107,58,0.05))", border: "1.5px solid rgba(92,107,58,0.3)", borderRadius: 18, padding: "18px 20px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>🧊</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--sepia)" }}>Da congelare subito</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--sepia-light)" }}>Questi ingredienti servono in giorni diversi — congela la parte indicata e riceverai un alert la sera prima di scongelarla.</p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {generated.freezeItems.map((item, i) => (
              <div key={i} style={{ background: "var(--warm-white)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>❄️</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--sepia)" }}>{item.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--sepia-light)" }}>Congela <strong style={{ color: "var(--olive)" }}>{item.qtyToFreeze} {item.unit}</strong> · scongela {item.useOnDayIndex > 0 ? `la sera di ${DAYS[item.useOnDayIndex - 1]}` : "domenica sera"} per {item.useOnDay}</p>
                    <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--sepia-light)", fontStyle: "italic" }}>Serve per: {item.recipe}</p>
                  </div>
                </div>
                <span style={{ background: "rgba(92,107,58,0.12)", color: "var(--olive)", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Alert sera prima ✓</span>
              </div>
            ))}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--olive)", fontWeight: 500 }}>💡 Premi &quot;Conferma settimana&quot; nel Planner per attivare i promemoria scongelo automatici.</p>
        </div>
      )}

      {/* Extra items manuali */}
      <div className="card-warm" style={{ padding: 20, marginTop: 16 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--sepia)", display: "flex", alignItems: "center", gap: 8 }}>✏️ Aggiunte manuali</h4>
        <div style={{ display: "flex", gap: 8, marginBottom: extraShoppingItems.length > 0 ? 12 : 0 }}>
          <input value={extraShoppingInput} onChange={(e) => setExtraShoppingInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && extraShoppingInput.trim()) { setExtraShoppingItems((p) => [...p, extraShoppingInput.trim()]); setExtraShoppingInput(""); } }} placeholder="es. detersivo, pane, acqua..." className="input-warm" />
          <button className="btn-terra" style={{ padding: "9px 14px", whiteSpace: "nowrap" }} onClick={() => { if (extraShoppingInput.trim()) { setExtraShoppingItems((p) => [...p, extraShoppingInput.trim()]); setExtraShoppingInput(""); } }}>+</button>
        </div>
        {extraShoppingItems.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            {extraShoppingItems.map((item, i) => {
              const key = `extra-${i}`;
              const isChecked = checkedShoppingItems.has(key);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--cream)", borderRadius: 10, padding: "8px 12px", opacity: isChecked ? 0.45 : 1, transition: "opacity 0.2s" }}>
                  <input type="checkbox" checked={isChecked} onChange={() => setCheckedShoppingItems((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; })} className="checkbox-warm" />
                  <span style={{ fontSize: 14, flex: 1, textDecoration: isChecked ? "line-through" : "none", color: "var(--sepia)" }}>{item}</span>
                  <button onClick={() => setExtraShoppingItems((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra-light)", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pulisci spuntati */}
      {checkedShoppingItems.size > 0 && (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={() => setCheckedShoppingItems(new Set())} style={{ fontSize: 13 }}>↺ Rimuovi spunte ({checkedShoppingItems.size})</button>
        </div>
      )}
    </div>
  );
}
