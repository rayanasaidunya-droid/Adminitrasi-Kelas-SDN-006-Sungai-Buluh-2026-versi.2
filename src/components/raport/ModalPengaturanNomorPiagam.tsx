import React, { useState } from 'react';
import {
  PiagamNumberingConfig,
  PRESET_FORMATS,
  ROMAN_MONTHS,
  generatePiagamNumber,
  extractSchoolCode,
  getDefaultPiagamNumberingConfig
} from '../../utils/piagamNumberingHelper';
import { SchoolInfo, Student } from '../../types';
import {
  Hash,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  FileText,
  Building,
  Calendar,
  Layers,
  HelpCircle,
  X
} from 'lucide-react';

interface ModalPengaturanNomorPiagamProps {
  isOpen: boolean;
  onClose: () => void;
  config: PiagamNumberingConfig;
  onSaveConfig: (newConfig: PiagamNumberingConfig, applyToAll: boolean) => void;
  schoolInfo: SchoolInfo;
  sampleStudents: Student[];
  rankingsMap: Map<string, number>;
  tanggalPiagam?: string;
}

export const ModalPengaturanNomorPiagam: React.FC<ModalPengaturanNomorPiagamProps> = ({
  isOpen,
  onClose,
  config: initialConfig,
  onSaveConfig,
  schoolInfo,
  sampleStudents,
  rankingsMap,
  tanggalPiagam
}) => {
  const [tempConfig, setTempConfig] = useState<PiagamNumberingConfig>({
    ...initialConfig,
    schoolCode: initialConfig.schoolCode || extractSchoolCode(schoolInfo.schoolName) || 'SDN006'
  });

  if (!isOpen) return null;

  // Generate live sample numbers for top 3 students
  const samplePreviews = sampleStudents.slice(0, 3).map((st, idx) => {
    const rank = rankingsMap.get(st.id) ?? idx + 1;
    const generatedNo = generatePiagamNumber({
      student: st,
      rank,
      sequenceIndex: idx,
      config: tempConfig,
      schoolInfo,
      tanggalPiagam
    });
    return {
      student: st,
      rank,
      number: generatedNo
    };
  });

  const handleResetToStandard = () => {
    const defaultConf = getDefaultPiagamNumberingConfig(schoolInfo.schoolName);
    setTempConfig(defaultConf);
  };

  const handleSave = (applyToAll: boolean) => {
    onSaveConfig(tempConfig, applyToAll);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Hash className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  Format Standar Sekolah
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Otomatis Tanpa Ketik Manual
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                Pengaturan Penomoran Otomatis Piagam
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* 1. Live Preview Banner Box */}
          <div className="rounded-xl border-2 border-amber-400/80 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Hasil Simulasi Penomoran Otomatis:
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-400">
                Pola Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {samplePreviews.map((p, i) => (
                <div
                  key={p.student.id || i}
                  className="rounded-lg bg-white dark:bg-slate-800 p-2.5 border border-amber-200 dark:border-amber-800/60 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    <span>{p.rank === 1 ? '🥇 Juara 1' : p.rank === 2 ? '🥈 Juara 2' : '🥉 Juara 3'}</span>
                    <span className="truncate max-w-[80px]">{p.student.nama}</span>
                  </div>
                  <div className="font-mono text-xs font-black text-amber-700 dark:text-amber-300 break-all bg-amber-50/60 dark:bg-slate-900 px-2 py-1 rounded border border-amber-200/50 dark:border-amber-900/50">
                    {p.number}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
              💡 Guru tidak perlu mengetik nomor piagam secara manual. Nomor langsung digenerate berurutan dengan format baku standar sekolah.
            </p>
          </div>

          {/* 2. Pilihan Format Preset */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Pilihan Format Pola Penomoran:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_FORMATS.map(f => {
                const isSelected = tempConfig.formatPreset === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTempConfig(prev => ({ ...prev, formatPreset: f.id as any }))}
                    className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/90 dark:bg-amber-950/40 ring-2 ring-amber-500/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {f.label}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400">
                          <Check className="h-4 w-4" />
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs font-black text-amber-700 dark:text-amber-400">
                      {f.example}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {f.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Input Format Kustom jika memilih 'custom' */}
          {tempConfig.formatPreset === 'custom' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pola Template Format Kustom:
              </label>
              <input
                type="text"
                value={tempConfig.customTemplate || ''}
                onChange={e => setTempConfig(prev => ({ ...prev, customTemplate: e.target.value }))}
                placeholder="Contoh: {no}/{sekolah}/{kode}/{bulan}/{tahun}"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-500">
                <span>Tag yang tersedia:</span>
                {['{no}', '{sekolah}', '{kode}', '{bulan}', '{tahun}', '{smt}', '{kelas}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const cur = tempConfig.customTemplate || '';
                      setTempConfig(prev => ({ ...prev, customTemplate: cur + tag }));
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-slate-800 dark:text-slate-200 hover:bg-amber-200"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Rincian Parameter Konfigurasi */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-amber-600" />
              Rincian Komponen Nomor Surat:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Kode Singkatan Sekolah */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-amber-600" />
                  <span>Kode Singkatan Sekolah:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempConfig.schoolCode}
                    onChange={e => setTempConfig(prev => ({ ...prev, schoolCode: e.target.value.toUpperCase() }))}
                    placeholder="Contoh: SDN006"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setTempConfig(prev => ({ ...prev, schoolCode: extractSchoolCode(schoolInfo.schoolName) }))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    title="Deteksi otomatis dari nama sekolah"
                  >
                    Auto
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Nama Sekolah: {schoolInfo.schoolName || 'SDN 006 SUNGAI BULUH'}
                </span>
              </div>

              {/* Kode Klasifikasi / Surat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  <span>Kode Berkas / Surat:</span>
                </label>
                <input
                  type="text"
                  value={tempConfig.docCode}
                  onChange={e => setTempConfig(prev => ({ ...prev, docCode: e.target.value.toUpperCase() }))}
                  placeholder="Contoh: PP"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-900 dark:text-white"
                />
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {['PP', 'PP-KMPM', 'PP-ASTS', 'PP-ASAS', 'PP-PRESTASI'].map(cd => (
                    <button
                      key={cd}
                      type="button"
                      onClick={() => setTempConfig(prev => ({ ...prev, docCode: cd }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                        tempConfig.docCode === cd
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100'
                      }`}
                    >
                      {cd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nomor Urut Awal & Jumlah Digit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-amber-600" />
                  <span>Nomor Urut Awal & Padding Digit:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Mulai dari:</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={tempConfig.startNumber}
                      onChange={e => setTempConfig(prev => ({ ...prev, startNumber: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Digit Padding:</span>
                    <select
                      value={tempConfig.digitCount}
                      onChange={e => setTempConfig(prev => ({ ...prev, digitCount: parseInt(e.target.value, 10) as any }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value={3}>3 Digit (001, 002...)</option>
                      <option value={2}>2 Digit (01, 02...)</option>
                      <option value={1}>1 Digit (1, 2...)</option>
                      <option value={4}>4 Digit (0001...)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Metode Urutan Penomoran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                  <span>Urutan Penomoran Otomatis:</span>
                </label>
                <select
                  value={tempConfig.numberingOrder}
                  onChange={e => setTempConfig(prev => ({ ...prev, numberingOrder: e.target.value as any }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="rank">Urutan Juara / Ranking Leger (Juara 1 = 001)</option>
                  <option value="absen">Urutan Nomor Absen Siswa (No Absen 1 = 001)</option>
                  <option value="alpha">Urutan Abjad Nama Siswa (A - Z)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Cocok untuk piagam penghargaan agar Juara 1 mendapatkan nomor pertama 001.
                </span>
              </div>

              {/* Bulan Romawi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                  <span>Bulan Romawi:</span>
                </label>
                <select
                  value={tempConfig.romanMonth}
                  onChange={e => setTempConfig(prev => ({ ...prev, romanMonth: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold font-mono"
                >
                  {ROMAN_MONTHS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tahun Kalender */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Kalender Piagam:
                </label>
                <input
                  type="text"
                  value={tempConfig.year === 'auto' ? '' : tempConfig.year}
                  onChange={e => setTempConfig(prev => ({ ...prev, year: e.target.value || 'auto' }))}
                  placeholder="Otomatis (atau isi e.g. 2024)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold font-mono"
                />
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setTempConfig(prev => ({ ...prev, year: 'auto' }))}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      tempConfig.year === 'auto'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempConfig(prev => ({ ...prev, year: '2024' }))}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                      tempConfig.year === '2024'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    2024
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempConfig(prev => ({ ...prev, year: new Date().getFullYear().toString() }))}
                    className="text-[10px] px-2 py-0.5 rounded font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    {new Date().getFullYear()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={handleResetToStandard}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Kembalikan Default Standar (001/SDN006/PP/XI/2024)</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Terapkan Otomatis ke Seluruh Siswa</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
