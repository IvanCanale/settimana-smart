"use client";
import React from "react";
import { SectionHeader } from "@/components/SectionHeader";
import type { Recipe, VoiceOption } from "@/types";

interface CucinaTabProps {
  prepTime: string;
  setPrepTime: React.Dispatch<React.SetStateAction<string>>;
  prepReminderMessage: string;
  setPrepReminderMessage: React.Dispatch<React.SetStateAction<string>>;
  scheduledReminderText: string;
  availableVoices: VoiceOption[];
  selectedVoiceName: string;
  setSelectedVoiceName: React.Dispatch<React.SetStateAction<string>>;
  onPlayReminderPreview: () => void;
  onScheduleReminder: () => void;
}

export function CucinaTab({
  prepTime,
  setPrepTime,
  prepReminderMessage,
  setPrepReminderMessage,
  scheduledReminderText,
  availableVoices,
  selectedVoiceName,
  setSelectedVoiceName,
  onPlayReminderPreview,
  onScheduleReminder,
}: CucinaTabProps) {
  return (
    <div className="animate-in delay-2" style={{ maxWidth: 560 }}>
      <div className="card-warm" style={{ padding: 28 }}>
        <SectionHeader icon="🔔" title="Promemoria preparazione" subtitle="Imposta un orario, un messaggio e una voce audio" />
        <div style={{ display: "grid", gap: 18 }}>
          <div>
            <label>⏰ Orario inizio preparazione</label>
            <input type="time" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="input-warm" style={{ marginTop: 6 }} />
          </div>
          <div>
            <label>💬 Messaggio personalizzato</label>
            <textarea value={prepReminderMessage} onChange={(e) => setPrepReminderMessage(e.target.value)} placeholder="Es. È ora di iniziare a cucinare la cena" className="input-warm" style={{ marginTop: 6, resize: "vertical", minHeight: 70 }} />
          </div>
          <div>
            <label>🎙️ Voce audio</label>
            <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)} className="select-warm" style={{ marginTop: 6 }}>
              {availableVoices.length ? availableVoices.map((v) => <option key={v.name} value={v.name}>{v.name} · {v.lang}</option>) : <option value="">Voce di default</option>}
            </select>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button className="btn-outline-terra" onClick={onPlayReminderPreview}>🔊 Anteprima audio</button>
            <button className="btn-terra" onClick={onScheduleReminder}>🔔 Imposta promemoria</button>
            {scheduledReminderText && <span style={{ fontSize: 13, color: "var(--olive)", fontWeight: 500 }}>✓ {scheduledReminderText}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
