import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, SchoolInfo } from '../../types';
import { SchoolLogoRenderer } from '../common/SchoolLogoRenderer';
import { HeaderKopSekolah } from '../common/HeaderKopSekolah';
import {
  PiagamBorderStyle,
  PiagamColorTheme,
  PiagamSealType,
  FRAME_STYLE_OPTIONS,
  COLOR_THEME_OPTIONS,
  getColorTheme,
  getFrameStyleOption,
  FrameStyleThumbnail,
  PiagamFrameDecorator,
  PiagamSealDecorator
} from './PiagamFrameDecorations';
import {
  Trophy,
  Medal,
  Star,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  Crown,
  Edit3,
  RotateCcw,
  Check,
  Palette,
  ShieldCheck,
  Layers,
  FileSpreadsheet,
  Award,
  Download,
  Hash,
  Sliders,
  Settings,
  UserCheck,
  Users,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  PiagamNumberingConfig,
  generatePiagamNumber,
  loadPiagamNumberingConfig,
  savePiagamNumberingConfig,
  extractSchoolCode,
  getDefaultPiagamNumberingConfig
} from '../../utils/piagamNumberingHelper';
import { ModalPengaturanNomorPiagam } from './ModalPengaturanNomorPiagam';

export type { PiagamBorderStyle, PiagamColorTheme, PiagamSealType };
export type PiagamPaperSize = 'A4' | 'F4';

export interface PiagamCustomData {
  namaSiswa?: string;
  nis?: string;
  nisn?: string;
  nomorPiagam?: string;
  kategoriPrestasi?: string;
  catatanApresiasi?: string;
  tanggalPiagam?: string;
}

interface PiagamPenghargaanTabProps {
  initialStudentId?: string;
  initialPeriod?: 'semester' | 'mid_semester';
  onSelectStudentId?: (id: string) => void;
}

// Konversi angka peringkat ke angka Romawi
export const toRomanRank = (num: number): string => {
  const romans: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
    11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV',
    16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX',
    21: 'XXI', 22: 'XXII', 23: 'XXIII', 24: 'XXIV', 25: 'XXV',
    26: 'XXVI', 27: 'XXVII', 28: 'XXVIII', 29: 'XXIX', 30: 'XXX'
  };
  return romans[num] || String(num);
};

// Format otomatis tulisan juara & predikat berdasarkan urutan ranking rekap leger se-kelas
export const formatGelarJuara = (
  rank: number,
  className: string
): { title: string; badge: string; subtitle: string; icon: 'crown' | 'silver_medal' | 'bronze_medal' | 'harapan' | 'top10' | 'star' } => {
  const cleanClass = className ? `KELAS ${className.toUpperCase()}` : 'KELAS';
  
  if (rank === 1) {
    return {
      title: `JUARA I (PERTAMA) ${cleanClass}`,
      badge: '🥇 JUARA 1 UMUM',
      subtitle: 'PERINGKAT I TERBAIK SE-KELAS',
      icon: 'crown'
    };
  }
  if (rank === 2) {
    return {
      title: `JUARA II (KEDUA) ${cleanClass}`,
      badge: '🥈 JUARA 2',
      subtitle: 'PERINGKAT II SE-KELAS',
      icon: 'silver_medal'
    };
  }
  if (rank === 3) {
    return {
      title: `JUARA III (KETIGA) ${cleanClass}`,
      badge: '🥉 JUARA 3',
      subtitle: 'PERINGKAT III SE-KELAS',
      icon: 'bronze_medal'
    };
  }
  if (rank === 4) {
    return {
      title: `JUARA HARAPAN I (PERINGKAT 4) ${cleanClass}`,
      badge: '🎖️ HARAPAN 1',
      subtitle: 'EMPAT BESAR SE-KELAS',
      icon: 'harapan'
    };
  }
  if (rank === 5) {
    return {
      title: `JUARA HARAPAN II (PERINGKAT 5) ${cleanClass}`,
      badge: '🎖️ HARAPAN 2',
      subtitle: 'LIMA BESAR SE-KELAS',
      icon: 'harapan'
    };
  }
  if (rank === 6) {
    return {
      title: `JUARA HARAPAN III (PERINGKAT 6) ${cleanClass}`,
      badge: '🎖️ HARAPAN 3',
      subtitle: 'ENAM BESAR SE-KELAS',
      icon: 'harapan'
    };
  }
  if (rank <= 10) {
    const rom = toRomanRank(rank);
    return {
      title: `PERINGKAT ${rom} (SEPULUH BESAR) ${cleanClass}`,
      badge: `⭐ TOP ${rank}`,
      subtitle: `SEPULUH BESAR SE-KELAS`,
      icon: 'top10'
    };
  }
  return {
    title: `PERINGKAT KE-${rank} (PRESTASI AKADEMIK) ${cleanClass}`,
    badge: `🏅 PERINGKAT ${rank}`,
    subtitle: `PRESTASI AKADEMIK SE-KELAS`,
    icon: 'star'
  };
};

export const PiagamPenghargaanTab: React.FC<PiagamPenghargaanTabProps> = ({
  initialStudentId,
  initialPeriod = 'semester',
  onSelectStudentId
}) => {
  const {
    schoolInfo,
    students,
    subjects,
    getAllGradesForStudent,
    getAllMidSemesterGradesForStudent,
    getStudentReport,
    addToast
  } = useApp();

  // Periode Leger: Akhir Semester atau Tengah Semester (ASTS)
  const [activePeriod, setActivePeriod] = useState<'semester' | 'mid_semester'>(initialPeriod);
  const isMid = activePeriod === 'mid_semester';

  // Sinkronisasi data nilai per siswa persis dengan Rekap Leger & Rangking se-kelas
  const studentDataList = useMemo(() => {
    return students.map(student => {
      const report = getStudentReport(student.id);
      const studentGrades = isMid
        ? getAllMidSemesterGradesForStudent(student.id)
        : getAllGradesForStudent(student.id);

      let totalScore = 0;
      studentGrades.forEach(g => {
        const score = isMid
          ? ('nilaiAkhirMid' in g ? (g as any).nilaiAkhirMid : ('sumatifSts' in g ? (g as any).sumatifSts : 0))
          : ('nilaiAkhir' in g ? (g as any).nilaiAkhir : 0);
        totalScore += score;
      });

      const avgScore = studentGrades.length > 0 ? +(totalScore / studentGrades.length).toFixed(1) : 0;

      // Cek apakah ada peringkat tersimpan di rapor/leger
      const savedRankRaw = isMid ? report.rankingMid : report.ranking;
      const savedNumericRank = savedRankRaw && !isNaN(Number(savedRankRaw)) && Number(savedRankRaw) > 0
        ? Number(savedRankRaw)
        : null;

      return {
        student,
        report,
        totalScore,
        avgScore,
        savedNumericRank
      };
    });
  }, [students, isMid, getStudentReport, getAllGradesForStudent, getAllMidSemesterGradesForStudent]);

  // Urutan definitif seluruh siswa se-kelas (Juara 1 s/d N) mengikuti matriks rekap leger
  const rankedStudents = useMemo(() => {
    const list = [...studentDataList];
    list.sort((a, b) => {
      const rankA = a.savedNumericRank !== null ? a.savedNumericRank : 9999;
      const rankB = b.savedNumericRank !== null ? b.savedNumericRank : 9999;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return b.totalScore - a.totalScore || b.avgScore - a.avgScore;
    });

    return list.map((item, index) => {
      const rank = item.savedNumericRank !== null ? item.savedNumericRank : index + 1;
      return {
        ...item,
        rank
      };
    });
  }, [studentDataList]);

  // Lookup cepat: student.id -> nomor peringkat resmi leger
  const rankingsMap = useMemo(() => {
    const map = new Map<string, number>();
    rankedStudents.forEach(item => map.set(item.student.id, item.rank));
    return map;
  }, [rankedStudents]);

  // Lookup cepat: student.id -> total skor & rerata nilai
  const studentScoresMap = useMemo(() => {
    const map = new Map<string, { total: number; avg: number }>();
    rankedStudents.forEach(item => map.set(item.student.id, { total: item.totalScore, avg: item.avgScore }));
    return map;
  }, [rankedStudents]);

  // Daftar siswa yang telah diurutkan berdasarkan urutan juara / ranking resmi leger
  const sortedStudentsByRank = useMemo(() => {
    return rankedStudents.map(item => item.student);
  }, [rankedStudents]);

  // Siswa terpilih (secara otomatis memilih Juara 1 dari rekap leger jika belum ada yang dipilih)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || sortedStudentsByRank[0]?.id || students[0]?.id || ''
  );

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  // Frame & Appearance State
  const [borderStyle, setBorderStyle] = useState<PiagamBorderStyle>('royal_baroque');
  const [colorTheme, setColorTheme] = useState<PiagamColorTheme>('gold');
  const [sealType, setSealType] = useState<PiagamSealType>('ribbon_medal');
  const [paperSize, setPaperSize] = useState<PiagamPaperSize>('A4');
  const [filterMode, setFilterMode] = useState<'all' | 'top3' | 'top5' | 'top10'>('top3');
  const [frameCategoryFilter, setFrameCategoryFilter] = useState<string>('all');
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  // Batch Print & Custom Data State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchPrintStudents, setBatchPrintStudents] = useState<Student[] | null>(null);
  const [customDataMap, setCustomDataMap] = useState<Record<string, PiagamCustomData>>({});
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [isFrameModalOpen, setIsFrameModalOpen] = useState(false);

  // Mode Pengurutan & Pencarian Siswa dari Modul Data Siswa
  const [studentSortOrder, setStudentSortOrder] = useState<'rank' | 'absen' | 'nama'>('rank');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Konfigurasi Penomoran Otomatis Piagam Standar Sekolah (e.g. '001/SDN006/PP/XI/2024')
  const [numberingConfig, setNumberingConfig] = useState<PiagamNumberingConfig>(() =>
    loadPiagamNumberingConfig(schoolInfo.schoolName)
  );
  const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);

  // Active student object
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || sortedStudentsByRank[0] || students[0];
  }, [students, selectedStudentId, sortedStudentsByRank]);

  const activeStudentRank = rankingsMap.get(selectedStudent?.id || '') ?? 1;
  const activeStudentScore = studentScoresMap.get(selectedStudent?.id || '') ?? { total: 0, avg: 0 };
  
  // Gelar Juara otomatis sesuai ranking leger
  const gelarInfo = useMemo(() => {
    return formatGelarJuara(activeStudentRank, schoolInfo.className || '');
  }, [activeStudentRank, schoolInfo.className]);

  // Default tanggal piagam (disamakan persis dengan tanggal rapor siswa)
  const defaultTanggalPiagam = useMemo(() => {
    if (isMid && schoolInfo.tanggalRaporMid) return schoolInfo.tanggalRaporMid;
    if (schoolInfo.tanggalRapor) return schoolInfo.tanggalRapor;
    const rep = selectedStudent ? getStudentReport(selectedStudent.id) : null;
    if (isMid && rep?.tempatTanggalRaporMid) return rep.tempatTanggalRaporMid;
    if (rep?.tempatTanggalRapor) return rep.tempatTanggalRapor;
    const isGenap = schoolInfo.semester?.includes('2');
    return isGenap
      ? `${schoolInfo.city || 'Kota Jakarta Selatan'}, 20 Juni 2027`
      : `${schoolInfo.city || 'Kota Jakarta Selatan'}, 19 Desember 2026`;
  }, [isMid, schoolInfo.tanggalRaporMid, schoolInfo.tanggalRapor, schoolInfo.city, schoolInfo.semester, selectedStudent, getStudentReport]);

  // Student Navigations Index
  const currentRankIndex = sortedStudentsByRank.findIndex(s => s.id === selectedStudentId);

  // Generate default Piagam Number secara otomatis mengikuti format standar sekolah (misal: '001/SDN006/PP/XI/2024')
  const defaultNomorPiagam = useMemo(() => {
    if (!selectedStudent) return '001/SDN006/PP/XI/2024';
    return generatePiagamNumber({
      student: selectedStudent,
      rank: activeStudentRank,
      sequenceIndex: currentRankIndex >= 0 ? currentRankIndex : 0,
      config: numberingConfig,
      schoolInfo,
      tanggalPiagam: defaultTanggalPiagam
    });
  }, [selectedStudent, activeStudentRank, currentRankIndex, numberingConfig, schoolInfo, defaultTanggalPiagam]);

  // Generate default Achievement category strictly from Leger ranking sequence
  const defaultKategoriPrestasi = useMemo(() => {
    return gelarInfo.title;
  }, [gelarInfo]);

  const defaultCatatanApresiasi = useMemo(() => {
    const periodLabel = isMid ? 'Asesmen Sumatif Tengah Semester (ASTS)' : `Semester ${schoolInfo.semester}`;
    return `Atas dedikasi, kedisiplinan, serta prestasi akademik luar biasa sebagai ${gelarInfo.subtitle} dengan perolehan Rata-Rata Nilai ${activeStudentScore.avg} (Total Skor: ${activeStudentScore.total}) pada ${periodLabel} Tahun Pelajaran ${schoolInfo.academicYear}.`;
  }, [gelarInfo, activeStudentScore, isMid, schoolInfo.semester, schoolInfo.academicYear]);

  // Current active student custom or default data (auto-synced with Data Siswa module)
  const currentCustom = customDataMap[selectedStudent?.id || ''] || {};
  const currentNamaSiswa = currentCustom.namaSiswa !== undefined ? currentCustom.namaSiswa : (selectedStudent?.nama || '');
  const currentNis = currentCustom.nis !== undefined ? currentCustom.nis : (selectedStudent?.nis || '');
  const currentNisn = currentCustom.nisn !== undefined ? currentCustom.nisn : (selectedStudent?.nisn || '');
  const currentNomor = currentCustom.nomorPiagam || defaultNomorPiagam;
  const currentKategori = currentCustom.kategoriPrestasi || defaultKategoriPrestasi;
  const currentTanggal = currentCustom.tanggalPiagam || defaultTanggalPiagam;
  const currentCatatan = currentCustom.catatanApresiasi || defaultCatatanApresiasi;

  // Handler memilih nama siswa dari dropdown untuk mengisi field nama & template piagam secara otomatis
  const handleSelectStudentFromDataSiswa = (studentId: string) => {
    const st = students.find(s => s.id === studentId);
    if (!st) return;

    setSelectedStudentId(studentId);
    if (onSelectStudentId) onSelectStudentId(studentId);

    // Otomatis tarik data siswa dari Data Siswa ke template piagam
    setCustomDataMap(prev => {
      const existing = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: {
          ...existing,
          namaSiswa: existing.namaSiswa || st.nama,
          nis: existing.nis !== undefined ? existing.nis : (st.nis || ''),
          nisn: existing.nisn !== undefined ? existing.nisn : (st.nisn || '')
        }
      };
    });

    addToast(
      'info',
      'Data Siswa Berhasil Ditarik',
      `Data ananda ${st.nama} (NISN: ${st.nisn || '-'}) berhasil dimuat dari Modul Data Siswa ke template piagam.`
    );
  };

  // Handler tarik ulang / sinkronisasi data langsung dari Modul Data Siswa
  const handleSyncStudentFromDataSiswa = (targetStudentId?: string) => {
    const targetId = targetStudentId || selectedStudent?.id;
    if (!targetId) return;
    const st = students.find(s => s.id === targetId);
    if (!st) return;

    setCustomDataMap(prev => ({
      ...prev,
      [targetId]: {
        ...(prev[targetId] || {}),
        namaSiswa: st.nama,
        nis: st.nis || '',
        nisn: st.nisn || ''
      }
    }));

    addToast(
      'success',
      'Sinkronisasi Data Siswa Selesai',
      `Field Nama (${st.nama}), NIS (${st.nis || '-'}), dan NISN (${st.nisn || '-'}) telah disinkronkan kembali dari Modul Data Siswa.`
    );
  };

  const handleUpdateCurrentStudentCustom = (fields: Partial<PiagamCustomData>) => {
    if (!selectedStudent) return;
    setCustomDataMap(prev => ({
      ...prev,
      [selectedStudent.id]: {
        ...(prev[selectedStudent.id] || {}),
        ...fields
      }
    }));
  };

  const handleResetCurrentStudentCustom = () => {
    if (!selectedStudent) return;
    setCustomDataMap(prev => {
      const copy = { ...prev };
      delete copy[selectedStudent.id];
      return copy;
    });
  };

  // Handler simpan konfigurasi penomoran & terapkan ke semua siswa
  const handleSaveNumberingConfig = (newConfig: PiagamNumberingConfig, applyToAll: boolean) => {
    setNumberingConfig(newConfig);
    savePiagamNumberingConfig(newConfig);
    if (applyToAll) {
      handleApplyAutoNumberingToAll(newConfig);
    } else {
      addToast('info', 'Format Nomor Disimpan', 'Konfigurasi format penomoran piagam berhasil diperbarui.');
    }
  };

  // Terapkan penomoran otomatis berurutan secara serentak ke seluruh siswa se-kelas
  const handleApplyAutoNumberingToAll = (customConfig?: PiagamNumberingConfig) => {
    const activeCfg = customConfig || numberingConfig;
    const newMap: Record<string, PiagamCustomData> = { ...customDataMap };

    let orderedList = [...sortedStudentsByRank];
    if (activeCfg.numberingOrder === 'absen') {
      orderedList.sort((a, b) => (a.nomorAbsen || 0) - (b.nomorAbsen || 0));
    } else if (activeCfg.numberingOrder === 'alpha') {
      orderedList.sort((a, b) => a.nama.localeCompare(b.nama));
    }

    orderedList.forEach((st, idx) => {
      const r = rankingsMap.get(st.id) ?? idx + 1;
      const tgl = defaultTanggalPiagam;
      const autoNum = generatePiagamNumber({
        student: st,
        rank: r,
        sequenceIndex: idx,
        config: activeCfg,
        schoolInfo,
        tanggalPiagam: tgl
      });

      newMap[st.id] = {
        ...(newMap[st.id] || {}),
        nomorPiagam: autoNum
      };
    });

    setCustomDataMap(newMap);
    const sampleFirst = newMap[sortedStudentsByRank[0]?.id || '']?.nomorPiagam || '001/SDN006/PP/XI/2024';
    addToast(
      'success',
      'Penomoran Otomatis Diterapkan',
      `Berhasil membuat nomor urut otomatis berurutan (Mulai: ${sampleFirst}) untuk seluruh ${students.length} siswa.`
    );
  };

  // Kembalikan semua nomor siswa ke nomor dinamis otomatis
  const handleResetAllToAutoNumber = () => {
    setCustomDataMap(prev => {
      const updated: Record<string, PiagamCustomData> = {};
      Object.entries(prev).forEach(([id, val]) => {
        const data = val as PiagamCustomData;
        const { nomorPiagam, ...rest } = data;
        if (Object.keys(rest).length > 0) {
          updated[id] = rest;
        }
      });
      return updated;
    });
    addToast('info', 'Reset Penomoran', 'Semua nomor piagam siswa berhasil dikembalikan ke penomoran dinamis otomatis.');
  };

  // Student Navigations
  const handlePrevStudent = () => {
    if (currentRankIndex > 0) {
      const nextId = sortedStudentsByRank[currentRankIndex - 1].id;
      setSelectedStudentId(nextId);
      if (onSelectStudentId) onSelectStudentId(nextId);
    }
  };

  const handleNextStudent = () => {
    if (currentRankIndex < sortedStudentsByRank.length - 1) {
      const nextId = sortedStudentsByRank[currentRankIndex + 1].id;
      setSelectedStudentId(nextId);
      if (onSelectStudentId) onSelectStudentId(nextId);
    }
  };

  // Daftar seluruh siswa dari Modul Data Siswa (dengan pengurutan fleksibel dan pencarian nama/NISN)
  const availableStudentsFromModule = useMemo(() => {
    let list = [...students];

    // Pengurutan
    if (studentSortOrder === 'rank') {
      list.sort((a, b) => {
        const rA = rankingsMap.get(a.id) ?? 999;
        const rB = rankingsMap.get(b.id) ?? 999;
        return rA - rB;
      });
    } else if (studentSortOrder === 'absen') {
      list.sort((a, b) => (a.nomorAbsen || 0) - (b.nomorAbsen || 0));
    } else if (studentSortOrder === 'nama') {
      list.sort((a, b) => a.nama.localeCompare(b.nama));
    }

    // Filter Cepat (Podium / Top) hanya jika tidak sedang mencari teks spesifik
    if (!studentSearchQuery.trim()) {
      if (filterMode === 'top3') {
        const top3Ids = new Set(sortedStudentsByRank.slice(0, 3).map(s => s.id));
        list = list.filter(s => top3Ids.has(s.id));
      } else if (filterMode === 'top5') {
        const top5Ids = new Set(sortedStudentsByRank.slice(0, 5).map(s => s.id));
        list = list.filter(s => top5Ids.has(s.id));
      } else if (filterMode === 'top10') {
        const top10Ids = new Set(sortedStudentsByRank.slice(0, 10).map(s => s.id));
        list = list.filter(s => top10Ids.has(s.id));
      }
    }

    // Pencarian realtime jika guru mengetikkan kata kunci
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase();
      list = list.filter(
        s =>
          s.nama.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.includes(q)) ||
          (s.nis && s.nis.includes(q)) ||
          String(s.nomorAbsen).includes(q)
      );
    }

    return list;
  }, [students, studentSortOrder, studentSearchQuery, filterMode, rankingsMap, sortedStudentsByRank]);

  // Filtered students for dropdown
  const displayedStudents = useMemo(() => {
    if (filterMode === 'top3') return sortedStudentsByRank.slice(0, 3);
    if (filterMode === 'top5') return sortedStudentsByRank.slice(0, 5);
    if (filterMode === 'top10') return sortedStudentsByRank.slice(0, 10);
    return sortedStudentsByRank;
  }, [sortedStudentsByRank, filterMode]);

  // Filtered Frame Options
  const displayedFrameOptions = useMemo(() => {
    if (frameCategoryFilter === 'all') return FRAME_STYLE_OPTIONS;
    return FRAME_STYLE_OPTIONS.filter(f => f.category === frameCategoryFilter);
  }, [frameCategoryFilter]);

  // Active Theme Config
  const activeThemeConfig = useMemo(() => getColorTheme(colorTheme), [colorTheme]);

  // Single Print handler
  const handlePrintSingle = () => {
    setBatchPrintStudents(null);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Single PDF Download handler (Direct PDF export without printer dialog)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    const cardEl = document.getElementById('piagam-preview-card-inner') || (document.querySelector('.piagam-single-card') as HTMLElement);
    if (!cardEl) return;

    try {
      setIsGeneratingPdf(true);

      // Brief wait to ensure styles & images are ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardEl, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const isF4Paper = paperSize === 'F4';
      const pdfWidth = isF4Paper ? 330 : 297;
      const pdfHeight = isF4Paper ? 215 : 210;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: isF4Paper ? [330, 215] : 'a4'
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      const safeStudentName = (currentNamaSiswa || selectedStudent?.nama || 'Siswa').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const safeRank = activeStudentRank === 1 ? 'Juara1' : activeStudentRank === 2 ? 'Juara2' : activeStudentRank === 3 ? 'Juara3' : `Peringkat${activeStudentRank}`;
      const safeClass = (schoolInfo.className || 'Kelas').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const fileName = `Piagam_${safeRank}_${safeStudentName}_${safeClass}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Gagal membuat PDF piagam:', error);
      alert('Maaf, terjadi kendala saat membuat file PDF. Silakan coba kembali.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Batch Print handler
  const handleStartBatchPrint = (studentsList: Student[]) => {
    setBatchPrintStudents(studentsList);
    setIsBatchModalOpen(false);
    window.addEventListener(
      'afterprint',
      () => {
        setBatchPrintStudents(null);
      },
      { once: true }
    );
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const isF4 = paperSize === 'F4';

  return (
    <div className="space-y-6">
      {/* Dynamic Print CSS for Piagam (Strict Automatic Landscape Orientation) */}
      <style>{`
        @media print {
          @page {
            size: ${isF4 ? '330mm 215mm' : 'a4 landscape'};
            margin: 4mm 5mm;
          }
          html, body {
            width: ${isF4 ? '330mm' : '297mm'} !important;
            height: ${isF4 ? '215mm' : '210mm'} !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden-piagam {
            display: none !important;
          }
          .piagam-single-card {
            width: ${isF4 ? '320mm' : '287mm'} !important;
            height: ${isF4 ? '205mm' : '200mm'} !important;
            max-width: ${isF4 ? '320mm' : '287mm'} !important;
            max-height: ${isF4 ? '205mm' : '200mm'} !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
          .piagam-batch-container .piagam-single-card:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. BILAH KONTROL PIAGAM PENGHARGAAN (INTERAKTIF & RESPONSIF)              */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4 print-hidden-piagam">
        
        {/* Banner Utama Piagam */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner shrink-0 ring-2 ring-white/30">
              <Trophy className="h-6 w-6 text-yellow-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/25 text-white border border-white/30 shadow-xs">
                  Apresiasi & Prestasi Siswa
                </span>
                <span className="text-xs font-bold text-amber-100 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
                  Kelas {schoolInfo.className} • TP {schoolInfo.academicYear}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1">
                Format Piagam Penghargaan Siswa Berprestasi
              </h1>
              <p className="text-xs text-amber-100/90 leading-relaxed mt-0.5">
                Pilih dari 9 koleksi bingkai mewah, 6 tema warna, dan 4 model lencana resmi untuk mencetak piagam penghargaan berstandar nasional.
              </p>
            </div>
          </div>

          {/* Quick Print & Download Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Tombol Pemilih Gaya Bingkai */}
            <button
              type="button"
              onClick={() => setIsFrameModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-900/60 hover:bg-amber-900/80 text-white font-black text-xs shadow-md active:scale-95 transition-all border border-amber-300/40 cursor-pointer"
              title="Buka katalog lengkap dan pemilih variasi desain gaya bingkai piagam"
            >
              <Sparkles className="h-4 w-4 text-yellow-300 shrink-0" />
              <div className="text-left">
                <span className="block text-[9px] text-amber-200 font-bold uppercase leading-none">Pilih Gaya Bingkai:</span>
                <span className="block text-xs font-black truncate max-w-[130px] leading-tight">
                  {getFrameStyleOption(borderStyle).name.split('(')[0].trim()}
                </span>
              </div>
            </button>

            {/* Tombol Unduh sebagai PDF Langsung Tanpa Dialog Printer */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-red-400/40"
              title="Unduh piagam siswa ini langsung sebagai file PDF digital beresolusi tinggi tanpa dialog print"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-white" />
                  <span>Unduh sebagai PDF</span>
                </>
              )}
            </button>

            {/* Tombol Cetak Piagam */}
            <button
              type="button"
              onClick={handlePrintSingle}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-amber-950 font-black text-xs shadow-md hover:bg-amber-50 active:scale-95 transition-all cursor-pointer border border-amber-200"
              title="Cetak piagam siswa aktif saat ini melalui printer"
            >
              <Printer className="h-4 w-4 text-amber-700" />
              <span>Cetak Piagam Siswa Ini</span>
            </button>

            {/* Tombol Cetak Massal */}
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md active:scale-95 transition-all border border-amber-300/40 cursor-pointer"
              title="Cetak massal piagam untuk Top 3, Top 10, atau seluruh siswa"
            >
              <Medal className="h-4 w-4 text-yellow-400" />
              <span>Cetak Massal Piagam</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BILAH FITUR PENOMORAN OTOMATIS PIAGAM STANDAR SEKOLAH                     */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-100/40 dark:from-slate-800/90 dark:via-amber-950/30 dark:to-slate-800/90 border-2 border-amber-300/90 dark:border-amber-700/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  ⚡ Penomoran Otomatis Aktif
                </span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Format Standar Sekolah:
                </span>
                <span className="text-xs font-mono font-black text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 shadow-2xs">
                  {defaultNomorPiagam}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Guru tidak perlu mengetik nomor piagam secara manual. Nomor langsung otomatis berurutan sesuai juara/peringkat leger &amp; identitas sekolah.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsNumberingModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              title="Atur pola nomor, kode sekolah, kode surat, digit padding, dan bulan romawi"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Atur Format Penomoran</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyAutoNumberingToAll()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 active:scale-95 text-amber-950 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-700 shadow-2xs transition-all cursor-pointer"
              title="Terapkan nomor urut piagam standar ke semua siswa se-kelas sekaligus"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Terapkan ke Semua Siswa</span>
            </button>

            {Object.keys(customDataMap).length > 0 && (
              <button
                type="button"
                onClick={handleResetAllToAutoNumber}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-slate-500 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                title="Kembalikan semua nomor piagam ke penomoran dinamis otomatis"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Otomatis</span>
              </button>
            )}
          </div>
        </div>

        {/* Baris Sumber Periode Leger & Filter Cepat */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          {/* Sumber Rekap Leger: Akhir Semester vs Tengah Semester */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <FileSpreadsheet className="h-3.5 w-3.5 text-amber-600" />
              Sumber Leger:
            </span>
            <button
              type="button"
              onClick={() => setActivePeriod('semester')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePeriod === 'semester'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-amber-600'
              }`}
            >
              Leger Akhir Semester
            </button>
            <button
              type="button"
              onClick={() => setActivePeriod('mid_semester')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePeriod === 'mid_semester'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-amber-600'
              }`}
            >
              Leger Tengah Semester (ASTS)
            </button>
          </div>

          {/* Filter Cepat Juara */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              Filter Cepat:
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('top3')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'top3'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-amber-600'
              }`}
            >
              Juara 1-3 (Podium)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('top5')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'top5'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-amber-600'
              }`}
            >
              5 Besar
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('top10')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'top10'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-amber-600'
              }`}
            >
              10 Besar
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-amber-600'
              }`}
            >
              Semua ({students.length})
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FITUR TARIK DATA SISWA OTOMATIS DARI MODUL 'DATA SISWA'                   */}
        {/* ========================================================================= */}
        <div className="pt-2 pb-1 space-y-2.5">
          {/* Header Bar Kontrol Tarik Data Siswa */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Tarik Data Siswa (Modul 'Data Siswa'):
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    {students.length} Siswa Terdaftar
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cukup pilih nama siswa dari dropdown untuk mengisi field nama, NIS/NISN, predikat, dan template piagam secara otomatis.
                </p>
              </div>
            </div>

            {/* Kontrol Pengurutan & Pencarian Cepat */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Selector Pengurutan */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-500 font-semibold hidden md:inline">Urutan:</span>
                <select
                  value={studentSortOrder}
                  onChange={e => setStudentSortOrder(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer shadow-2xs"
                >
                  <option value="rank">🏆 Sesuai Peringkat Leger</option>
                  <option value="absen">📋 Sesuai No. Absen Siswa</option>
                  <option value="nama">🔤 Sesuai Abjad Nama (A-Z)</option>
                </select>
              </div>

              {/* Pencarian Realtime Siswa */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={e => setStudentSearchQuery(e.target.value)}
                  placeholder="Cari siswa / NISN..."
                  className="pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-800 dark:text-white placeholder:text-slate-400 outline-none w-36 sm:w-44 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStudentSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Baris Dropdown Utama Pemilih Siswa */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevStudent}
              disabled={currentRankIndex <= 0}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              title="Pilih Siswa Sebelumnya"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex-1 relative">
              <select
                value={selectedStudentId}
                onChange={e => handleSelectStudentFromDataSiswa(e.target.value)}
                className="w-full rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-black text-slate-900 dark:text-white shadow-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
              >
                {availableStudentsFromModule.map((s, idx) => {
                  const r = rankingsMap.get(s.id) ?? idx + 1;
                  const sc = studentScoresMap.get(s.id) ?? { avg: 0, total: 0 };
                  const gInfo = formatGelarJuara(r, schoolInfo.className || '');
                  const absenLabel = s.nomorAbsen ? `[Absen #${s.nomorAbsen}] ` : `[#${idx + 1}] `;
                  return (
                    <option key={s.id} value={s.id}>
                      {absenLabel}{s.nama} • NISN: {s.nisn || '-'} • {gInfo.badge} (Peringkat #{r} • Rata-rata: {sc.avg})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextStudent}
              disabled={currentRankIndex >= sortedStudentsByRank.length - 1}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              title="Pilih Siswa Selanjutnya"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Banner Status Siswa Aktif yang Ditarik dari Modul Data Siswa */}
          {selectedStudent && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-slate-800 dark:via-emerald-950/20 dark:to-slate-800 border border-emerald-300 dark:border-emerald-700/60 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs shadow-2xs">
                  <UserCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Data Siswa Aktif: </span>
                  <strong className="text-emerald-950 dark:text-emerald-200 text-xs font-black">
                    {currentNamaSiswa}
                  </strong>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 ml-1.5">
                    • NIS: <strong className="font-mono">{currentNis || '-'}</strong>
                    • NISN: <strong className="font-mono">{currentNisn || '-'}</strong>
                    • Kelas: <strong>{schoolInfo.className}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleSyncStudentFromDataSiswa()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Sinkronkan kembali data nama dan NISN dari Modul Data Siswa"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Tarik Ulang Data Siswa</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PANEL PILIHAN BINGKAI PIAGAM MENARIK (9 MODEL BINGKAI EKSKLUSIF)          */}
        {/* ========================================================================= */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Pemilih Gaya Bingkai Piagam ({FRAME_STYLE_OPTIONS.length} Desain Menarik):
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Tombol Buka Katalog Dialog */}
              <button
                type="button"
                onClick={() => setIsFrameModalOpen(true)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-1 transition-colors cursor-pointer border border-amber-300 dark:border-amber-700"
              >
                <Layers className="h-3 w-3" />
                <span>Katalog Besar</span>
              </button>

              {/* Filter Kategori Bingkai */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {['all', 'Klasik & Kerajaan', 'Tradisi Nusantara', 'Resmi & Kedinasan', 'Modern & Prestisius'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFrameCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      frameCategoryFilter === cat
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'Semua Model' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Banner Gaya Bingkai Terpilih Saat Ini */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-slate-800 dark:via-amber-950/30 dark:to-slate-800 border border-amber-300 dark:border-amber-700/60 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-black text-[10px]">
                ✓
              </span>
              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Gaya Bingkai Aktif: </span>
                <strong className="text-amber-950 dark:text-amber-200 text-xs">
                  {getFrameStyleOption(borderStyle).name}
                </strong>
                <span className="text-[11px] text-slate-500 ml-1.5">
                  • Kategori: <strong>{getFrameStyleOption(borderStyle).category}</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-extrabold text-amber-800 dark:text-amber-300">
                Landscape Otomatis
              </span>
              <span className="hidden sm:inline">• Presisi proporsional tanpa terpotong</span>
            </div>
          </div>

          {/* Grid 9 Model Bingkai Eksklusif dengan Visual Thumbnail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedFrameOptions.map(frame => {
              const isSelected = borderStyle === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => {
                    setBorderStyle(frame.id);
                    if (frame.recommendedColor) {
                      setColorTheme(frame.recommendedColor);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/90 dark:bg-amber-950/50 shadow-md ring-2 ring-amber-500/40 scale-[1.01]'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-amber-400 hover:shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {/* Thumbnail Miniatur Preview Bingkai */}
                  <div className="mb-2.5 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900">
                    <FrameStyleThumbnail
                      style={frame.id}
                      colorTheme={colorTheme}
                      isSelected={isSelected}
                      className="w-full h-24"
                    />
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                      {frame.category}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-md">
                        <Check className="h-3.5 w-3.5 text-amber-600" />
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-bold text-slate-400 group-hover:text-amber-600 transition-colors">
                        Pilih Bingkai →
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                      {frame.name}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {frame.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Baris Pilihan: Warna Tema, Model Lencana Stempel, Ukuran Kertas & Watermark */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            {/* Pilihan Warna & Aksen */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Palette className="h-3.5 w-3.5 text-amber-600" />
                Warna & Aksen:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_THEME_OPTIONS.map(c => {
                  const isSelected = colorTheme === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColorTheme(c.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-amber-600 bg-white dark:bg-slate-800 shadow-xs ring-1 ring-amber-500 font-bold text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                      title={c.name}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.primary }} />
                      <span className="text-[11px]">{c.name.split('(')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Model Lencana Stempel Bawah */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                Model Lencana / Seal:
              </span>
              <select
                value={sealType}
                onChange={e => setSealType(e.target.value as PiagamSealType)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="ribbon_medal">🥇 Medali Emas Pita Menjuntai</option>
                <option value="wax_seal">★ Stempel Emboss Emas Klasik</option>
                <option value="star_excellence">⭐ Bintang Kehormatan 3D</option>
                <option value="tutwuri_crest">📖 Lambang Tut Wuri Kemendikbud</option>
                <option value="none">Tanpa Lencana Stempel</option>
              </select>
            </div>

            {/* Ukuran Kertas Selector & Watermark Toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Paper Size selector (A4 vs F4) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 px-1.5 flex items-center gap-1">
                  <FileText className="h-3 w-3 text-amber-600" />
                  Kertas:
                </span>
                <button
                  type="button"
                  onClick={() => setPaperSize('A4')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    paperSize === 'A4'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-amber-600'
                  }`}
                  title="A4 Landscape: 29.7 x 21.0 cm"
                >
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('F4')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    paperSize === 'F4'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-amber-600'
                  }`}
                  title="F4 / Folio Landscape: 33.0 x 21.5 cm"
                >
                  F4 (Folio)
                </button>
              </div>

              {/* Watermark Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={e => setShowWatermark(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Watermark Lambang</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tombol Kustomisasi Isi Piagam (Nomor, Kategori Juara, Catatan) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kategori Terpilih: <strong className="text-amber-700 dark:text-amber-400">{currentKategori}</strong>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">No: {currentNomor}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingCustom(!isEditingCustom)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{isEditingCustom ? 'Tutup Pengaturan Teks' : 'Kustomisasi Teks & Kategori'}</span>
            </button>

            {Boolean(customDataMap[selectedStudent?.id || '']) && (
              <button
                type="button"
                onClick={handleResetCurrentStudentCustom}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 text-xs font-bold transition-colors"
                title="Kembalikan nomor & teks piagam ke format otomatis"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Default</span>
              </button>
            )}
          </div>
        </div>

        {/* Panel Form Edit Kustomisasi Piagam */}
        {isEditingCustom && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-600" />
                Kustomisasi Format Piagam: {currentNamaSiswa}
              </h3>
              <span className="text-[11px] text-slate-500">
                Peringkat #{activeStudentRank} di Leger Nilai • Kelas {schoolInfo.className}
              </span>
            </div>

            {/* Field Data Siswa dari Modul Data Siswa */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/50 pb-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Field Data Siswa (Terkoneksi Modul Data Siswa):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {currentCustom.namaSiswa && currentCustom.namaSiswa !== selectedStudent?.nama ? (
                    <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200">
                      Nama Dimodifikasi (Kustom)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Tersinkron Modul Siswa
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSyncStudentFromDataSiswa()}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Tarik ulang nama lengkap, NIS, dan NISN dari Modul Data Siswa"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Tarik Ulang Data Siswa</span>
                  </button>
                </div>
              </div>

              {/* Selector Cepat Siswa dari Modul di Dalam Form */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  Ganti / Tarik Siswa Lain:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => handleSelectStudentFromDataSiswa(e.target.value)}
                  className="flex-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  {students.map((s, idx) => {
                    const r = rankingsMap.get(s.id) ?? idx + 1;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nomorAbsen ? `[Absen #${s.nomorAbsen}] ` : `[#${idx + 1}] `}{s.nama} • NISN: {s.nisn || '-'} • Peringkat #{r}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Field Nama Lengkap Siswa */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Nama Lengkap Peserta Didik (Field Piagam):
                    </label>
                    {currentCustom.namaSiswa && currentCustom.namaSiswa !== selectedStudent?.nama && (
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentStudentCustom({ namaSiswa: selectedStudent?.nama })}
                        className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold"
                      >
                        Kembalikan ke: {selectedStudent?.nama}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={currentNamaSiswa}
                    onChange={e => handleUpdateCurrentStudentCustom({ namaSiswa: e.target.value })}
                    placeholder="Nama lengkap siswa penerima piagam..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Field nama ini otomatis terisi saat memilih siswa dari dropdown dan dapat disesuaikan jika membutuhkan ejaan/gelar khusus.
                  </p>
                </div>

                {/* Field NIS & NISN */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      NIS:
                    </label>
                    <input
                      type="text"
                      value={currentNis}
                      onChange={e => handleUpdateCurrentStudentCustom({ nis: e.target.value })}
                      placeholder="NIS Siswa..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      NISN:
                    </label>
                    <input
                      type="text"
                      value={currentNisn}
                      onChange={e => handleUpdateCurrentStudentCustom({ nisn: e.target.value })}
                      placeholder="NISN Siswa..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Prestasi / Gelar Juara:
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={currentKategori}
                    onChange={e => handleUpdateCurrentStudentCustom({ kategoriPrestasi: e.target.value })}
                    placeholder="Contoh: JUARA I (PERTAMA) KELAS IV"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  {/* Preset Kategori Cepat */}
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      `JUARA I (PERTAMA) KELAS ${schoolInfo.className.toUpperCase()}`,
                      `JUARA II (KEDUA) KELAS ${schoolInfo.className.toUpperCase()}`,
                      `JUARA III (KETIGA) KELAS ${schoolInfo.className.toUpperCase()}`,
                      `PERINGKAT ${activeStudentRank} KELAS ${schoolInfo.className.toUpperCase()}`,
                      'TERBAIK MATA PELAJARAN MATEMATIKA',
                      'TERBAIK MATA PELAJARAN IPAS',
                      'SISWA TELADAN & BERAKHLAK MULIA',
                      'KEHADIRAN DISIPLIN 100% (TERAJIN)'
                    ].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleUpdateCurrentStudentCustom({ kategoriPrestasi: p })}
                        className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-amber-200 hover:text-amber-900 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-amber-600" />
                    <span>Nomor Surat Piagam:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentStudentCustom({ nomorPiagam: defaultNomorPiagam })}
                    className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer bg-amber-100/60 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300/50"
                    title="Gunakan format nomor standar sekolah otomatis untuk siswa ini"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>Pakai Format Otomatis</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentNomor}
                  onChange={e => handleUpdateCurrentStudentCustom({ nomorPiagam: e.target.value })}
                  placeholder="Nomor Piagam Resmi..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
                <div className="flex items-center justify-between mt-1 text-[10.5px]">
                  <span className="text-slate-500">
                    Standar Otomatis: <strong className="font-mono text-amber-700 dark:text-amber-400">{defaultNomorPiagam}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNumberingModalOpen(true)}
                    className="text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                  >
                    <Settings className="h-2.5 w-2.5" />
                    <span>Ubah Format</span>
                  </button>
                </div>

                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-2 mb-1">
                  Titimangsa Pengesahan (Tempat & Tanggal):
                </label>
                <input
                  type="text"
                  value={currentTanggal}
                  onChange={e => handleUpdateCurrentStudentCustom({ tanggalPiagam: e.target.value })}
                  placeholder="Contoh: Kota Banjarbaru, 20 Juni 2027"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kalimat Apresiasi & Catatan Prestasi:
                </label>
                <textarea
                  rows={2}
                  value={currentCatatan}
                  onChange={e => handleUpdateCurrentStudentCustom({ catatanApresiasi: e.target.value })}
                  placeholder="Tuliskan catatan apresiasi atas prestasi yang diraih..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="space-y-3">
          {/* Quick Action Bar Tepat di Atas Preview Piagam */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 print:hidden max-w-[1120px] mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>Piagam Aktif: <strong className="text-amber-700 dark:text-amber-400">{selectedStudent.nama}</strong> ({gelarInfo.badge})</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Tombol Unduh sebagai PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                title="Unduh langsung sebagai file PDF tanpa dialog printer"
              >
                {isGeneratingPdf ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Menyimpan PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-white" />
                    <span>Unduh sebagai PDF</span>
                  </>
                )}
              </button>

              {/* Tombol Cetak Printer */}
              <button
                type="button"
                onClick={handlePrintSingle}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer border border-slate-200 dark:border-slate-600"
                title="Buka dialog printer untuk mencetak ke kertas"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Cetak Printer</span>
              </button>
            </div>
          </div>

          {/* Lembar Preview Card */}
          <div className={`flex justify-center overflow-x-auto pb-8 print:p-0 ${batchPrintStudents && batchPrintStudents.length > 0 ? 'print:hidden' : ''}`}>
            <div id="piagam-preview-card-inner" className="w-fit">
              <PiagamCertificateCard
                student={selectedStudent}
                rank={activeStudentRank}
                score={activeStudentScore}
                borderStyle={borderStyle}
                colorTheme={colorTheme}
                themeConfig={activeThemeConfig}
                sealType={sealType}
                paperSize={paperSize}
                showWatermark={showWatermark}
                nomorPiagam={currentNomor}
                namaSiswa={currentNamaSiswa}
                nis={currentNis}
                nisn={currentNisn}
                kategoriPrestasi={currentKategori}
                catatanApresiasi={currentCatatan}
                tanggalPiagam={currentTanggal}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL CETAK MASSAL PIAGAM PENGHARGAAN                                  */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <ModalCetakMassalPiagam
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          students={sortedStudentsByRank}
          rankingsMap={rankingsMap}
          scoresMap={studentScoresMap}
          paperSize={paperSize}
          borderStyle={borderStyle}
          colorTheme={colorTheme}
          config={numberingConfig}
          customDataMap={customDataMap}
          schoolInfo={schoolInfo}
          defaultTanggalPiagam={defaultTanggalPiagam}
          onSelectBorderStyle={setBorderStyle}
          onOpenNumberingSettings={() => setIsNumberingModalOpen(true)}
          onConfirmBatchPrint={handleStartBatchPrint}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL PEMILIH & KATALOG GAYA BINGKAI PIAGAM PENGHARGAAN                   */}
      {/* ========================================================================= */}
      {isFrameModalOpen && (
        <ModalPemilihGayaBingkai
          isOpen={isFrameModalOpen}
          onClose={() => setIsFrameModalOpen(false)}
          currentStyle={borderStyle}
          currentColorTheme={colorTheme}
          onSelectStyle={(style, recommendedColor) => {
            setBorderStyle(style);
            if (recommendedColor) {
              setColorTheme(recommendedColor);
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL PENGATURAN PENOMORAN OTOMATIS PIAGAM STANDAR SEKOLAH                */}
      {/* ========================================================================= */}
      {isNumberingModalOpen && (
        <ModalPengaturanNomorPiagam
          isOpen={isNumberingModalOpen}
          onClose={() => setIsNumberingModalOpen(false)}
          config={numberingConfig}
          onSaveConfig={handleSaveNumberingConfig}
          schoolInfo={schoolInfo}
          sampleStudents={sortedStudentsByRank}
          rankingsMap={rankingsMap}
          tanggalPiagam={defaultTanggalPiagam}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. WADAH RENDER CETAK MASSAL (HANYA MUNCUL SAAT PRINT MASSAL AKTIF)       */}
      {/* ========================================================================= */}
      {batchPrintStudents && batchPrintStudents.length > 0 && (
        <div className="hidden print:block piagam-batch-container">
          {batchPrintStudents.map((st, bIdx) => {
            const r = rankingsMap.get(st.id) ?? 1;
            const sc = studentScoresMap.get(st.id) ?? { total: 0, avg: 0 };
            const cust = customDataMap[st.id] || {};
            
            const gInfo = formatGelarJuara(r, schoolInfo.className || '');
            const tgl = cust.tanggalPiagam || defaultTanggalPiagam;
            const autoNom = generatePiagamNumber({
              student: st,
              rank: r,
              sequenceIndex: bIdx,
              config: numberingConfig,
              schoolInfo,
              tanggalPiagam: tgl
            });
            const nom = cust.nomorPiagam || autoNom;
            
            const kat = cust.kategoriPrestasi || gInfo.title;
            const periodLabel = isMid ? 'Asesmen Sumatif Tengah Semester (ASTS)' : `Semester ${schoolInfo.semester}`;
            const cat = cust.catatanApresiasi || `Atas dedikasi, kedisiplinan, serta prestasi akademik luar biasa sebagai ${gInfo.subtitle} dengan perolehan Rata-Rata Nilai ${sc.avg} (Total Skor: ${sc.total}) pada ${periodLabel} Tahun Pelajaran ${schoolInfo.academicYear}.`;
            const stNama = cust.namaSiswa || st.nama;
            const stNis = cust.nis !== undefined ? cust.nis : st.nis;
            const stNisn = cust.nisn !== undefined ? cust.nisn : st.nisn;

            return (
              <PiagamCertificateCard
                key={st.id}
                student={st}
                rank={r}
                score={sc}
                borderStyle={borderStyle}
                colorTheme={colorTheme}
                themeConfig={activeThemeConfig}
                sealType={sealType}
                paperSize={paperSize}
                showWatermark={showWatermark}
                nomorPiagam={nom}
                namaSiswa={stNama}
                nis={stNis}
                nisn={stNisn}
                kategoriPrestasi={kat}
                catatanApresiasi={cat}
                tanggalPiagam={tgl}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ===============================================================================
// KOMPONEN LEMBAR PIAGAM RESMI (LANDSCAPE DESIGN STANDAR NASIONAL)
// ===============================================================================

interface PiagamCertificateCardProps {
  student: Student;
  rank: number;
  score: { total: number; avg: number };
  borderStyle: PiagamBorderStyle;
  colorTheme: PiagamColorTheme;
  themeConfig: any;
  sealType: PiagamSealType;
  paperSize: PiagamPaperSize;
  showWatermark: boolean;
  nomorPiagam: string;
  namaSiswa?: string;
  nis?: string;
  nisn?: string;
  kategoriPrestasi: string;
  catatanApresiasi: string;
  tanggalPiagam: string;
}

const PiagamCertificateCard: React.FC<PiagamCertificateCardProps> = ({
  student,
  rank,
  score,
  borderStyle,
  colorTheme,
  themeConfig,
  sealType,
  paperSize,
  showWatermark,
  nomorPiagam,
  namaSiswa,
  nis,
  nisn,
  kategoriPrestasi,
  catatanApresiasi,
  tanggalPiagam
}) => {
  const { schoolInfo, currentUser } = useApp();

  const isF4 = paperSize === 'F4';
  const widthStyle = isF4 ? 'w-[1120px]' : 'w-[1040px]';
  const heightStyle = isF4 ? 'min-h-[730px]' : 'min-h-[700px]';

  // Wali Kelas data
  const waliKelasName = schoolInfo.homeroomTeacherName || schoolInfo.teacherName || currentUser.name || 'Wali Kelas';
  const waliKelasNip = schoolInfo.homeroomTeacherNip || schoolInfo.teacherNip || currentUser.nipOrNisn || '-';

  // Display student info (pulled automatically from Data Siswa or customized)
  const displayNama = namaSiswa || student.nama;
  const displayNis = nis !== undefined && nis !== '' ? nis : (student.nis || '-');
  const displayNisn = nisn !== undefined && nisn !== '' ? nisn : (student.nisn || '-');

  return (
    <div
      className={`piagam-single-card bg-white relative text-slate-900 ${widthStyle} ${heightStyle} px-7 py-5 sm:px-10 sm:py-6 print:px-6 print:py-4 shadow-xl rounded-sm print:rounded-none overflow-hidden flex flex-col justify-between border-[5px] sm:border-[6px] ${themeConfig.borderOuter}`}
      style={{
        boxSizing: 'border-box',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Dekorasi Bingkai Vektor Eksklusif Sesuai Model Terpilih */}
      <PiagamFrameDecorator style={borderStyle} colorTheme={colorTheme} />

      {/* Watermark Logo Tut Wuri Handayani di Tengah Piagam (Transparan) */}
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.045] pointer-events-none select-none z-0">
          <SchoolLogoRenderer
            preset={schoolInfo.logoLeftPreset || 'tutwuri'}
            customUrl={schoolInfo.logoLeft}
            width={360}
            alt="Watermark Tut Wuri Handayani"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. KOP RESMI PIAGAM PENGHARGAAN (SESUAI LEMBAR RAPOR SISWA)               */}
      {/* ========================================================================= */}
      <HeaderKopSekolah
        equalizeLogos={true}
        logoSize={50}
        borderColor={themeConfig.gold}
        schoolNameColor={themeConfig.primary}
        className="relative z-10 w-full mb-1 sm:mb-1.5 print:mb-0.5 pb-1 sm:pb-1.5 print:pb-0.5"
      />

      {/* ========================================================================= */}
      {/* 2. JUDUL PIAGAM PENGHARGAAN & NOMOR RESMI                                 */}
      {/* ========================================================================= */}
      <div className="relative z-10 text-center my-1 sm:my-1.5 print:my-0.5">
        <h1
          className="text-xl sm:text-2xl lg:text-3xl font-serif font-black tracking-widest uppercase"
          style={{ color: themeConfig.titleColor }}
        >
          PIAGAM PENGHARGAAN
        </h1>

        {/* Garis Pembatas Ornamen */}
        <div className="flex items-center justify-center gap-2 mt-0.5">
          <div className="h-[2px] w-16 sm:w-28" style={{ backgroundColor: themeConfig.gold }} />
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          <div className="h-[2px] w-16 sm:w-28" style={{ backgroundColor: themeConfig.gold }} />
        </div>

        <p className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 tracking-wide mt-0.5">
          NOMOR: {nomorPiagam}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. PERNYATAAN PENERIMA & PRESTASI SISWA (TENGAH)                          */}
      {/* ========================================================================= */}
      <div className="relative z-10 text-center space-y-1 sm:space-y-1.5 print:space-y-0.5">
        <p className="text-xs sm:text-[13px] font-serif italic text-slate-700">
          Diberikan dengan penuh rasa bangga dan apresiasi setinggi-tingginya kepada:
        </p>

        {/* Nama Siswa Besar & Elegan */}
        <div className="my-0.5 sm:my-1">
          <h2
            className="text-xl sm:text-2xl lg:text-[28px] font-black tracking-wider uppercase font-serif leading-tight"
            style={{ color: themeConfig.titleColor }}
          >
            {displayNama}
          </h2>
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold text-slate-700 mt-0.5">
            <span>NIS: <strong className="font-mono">{displayNis}</strong></span>
            <span>•</span>
            <span>NISN: <strong className="font-mono">{displayNisn}</strong></span>
            <span>•</span>
            <span>Kelas: <strong>{schoolInfo.className} ({schoolInfo.phase})</strong></span>
          </div>
        </div>

        {/* Box Gelar Prestasi: Persegi Panjang Elegan Melebar Sesuai Halaman Landscape & Tidak Melewati Bingkai */}
        <div className="w-full max-w-3xl lg:max-w-4xl print:max-w-none mx-auto my-1 sm:my-1.5 print:my-0.5">
          <div
            className="py-2 sm:py-2.5 px-5 sm:px-8 rounded-xl border-2 shadow-xs flex items-center justify-between gap-4 relative overflow-hidden"
            style={{
              borderColor: themeConfig.gold,
              backgroundColor: `${themeConfig.primary}08`
            }}
          >
            {/* Left Rank Icon / Crown */}
            <div className="shrink-0 flex items-center justify-center">
              {rank === 1 ? (
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-xs ring-2 ring-amber-300">
                  <Crown className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-white" />
                </div>
              ) : rank === 2 ? (
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr from-slate-400 to-slate-300 text-white flex items-center justify-center shadow-xs ring-2 ring-slate-200">
                  <Medal className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-white" />
                </div>
              ) : rank === 3 ? (
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 text-white flex items-center justify-center shadow-xs ring-2 ring-amber-400">
                  <Medal className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-white" />
                </div>
              ) : (
                <div className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xs border border-amber-300 shadow-xs">
                  #{rank}
                </div>
              )}
            </div>

            {/* Juara Title & Subtitle */}
            <div className="text-center flex-1 min-w-0 px-2">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                Atas Prestasi Membanggakan Sebagai:
              </span>
              <span
                className="text-sm sm:text-base lg:text-lg font-black uppercase tracking-wider block leading-tight mt-0.5"
                style={{ color: themeConfig.primary }}
              >
                {kategoriPrestasi}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-0.5 inline-block">
                {rank <= 3 ? `Peringkat ${rank} Se-Kelas • Rata-Rata ${score.avg}` : `Urutan Rekap Leger Kelas • Rata-Rata ${score.avg}`}
              </span>
            </div>

            {/* Right Rank Trophy / Medal */}
            <div className="shrink-0 flex items-center justify-center">
              {rank === 1 ? (
                <Trophy className="h-6.5 w-6.5 sm:h-7 sm:w-7 text-amber-500 drop-shadow-xs" />
              ) : rank === 2 ? (
                <Medal className="h-6.5 w-6.5 sm:h-7 sm:w-7 text-slate-400 drop-shadow-xs" />
              ) : rank === 3 ? (
                <Medal className="h-6.5 w-6.5 sm:h-7 sm:w-7 text-amber-700 drop-shadow-xs" />
              ) : (
                <Star className="h-6 w-6 text-amber-500 drop-shadow-xs fill-amber-500/30" />
              )}
            </div>
          </div>
        </div>

        {/* Catatan Apresiasi & Motivasi Belajar */}
        <p className="text-[11px] sm:text-xs text-slate-700 max-w-3xl mx-auto leading-relaxed italic px-4 font-serif">
          "{catatanApresiasi}"
        </p>
        <p className="text-[9px] sm:text-[10px] text-slate-500 max-w-3xl mx-auto leading-normal">
          Semoga keberhasilan ini senantiasa menjadi inspirasi, pemacu semangat belajar tanpa henti, serta bekal luhur dalam menggapai cita-cita mulia di masa depan.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 4. PENGESAHAN & TANDA TANGAN (BAWAH)                                       */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full pt-1.5 sm:pt-2 mt-1 border-t" style={{ borderColor: `${themeConfig.gold}40` }}>
        <div className="flex items-end justify-between px-4 sm:px-6 text-center text-[11px] sm:text-xs">
          {/* Tanda Tangan Wali Kelas (Kiri) */}
          <div className="w-52 sm:w-56">
            <p className="text-slate-700 font-medium leading-tight">Mengetahui,</p>
            <p className="font-bold text-slate-900 leading-tight">Wali Kelas {schoolInfo.className}</p>

            {/* Ruang TTD */}
            <div className="h-10 sm:h-12 print:h-8 flex items-center justify-center">
              <span className="text-[9px] text-slate-300 italic select-none">Tanda Tangan</span>
            </div>

            <p className="font-black text-slate-900 uppercase underline tracking-wide leading-tight">
              {waliKelasName}
            </p>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-0.5">
              NIP. <span className="font-mono">{waliKelasNip}</span>
            </p>
          </div>

          {/* Lencana Stempel Piagam di Tengah (Dynamic Seal Decorator) */}
          <div className="pb-0.5">
            <PiagamSealDecorator
              sealType={sealType}
              theme={themeConfig}
              academicYear={schoolInfo.academicYear}
            />
          </div>

          {/* Tanda Tangan Kepala Sekolah (Kanan) */}
          <div className="w-52 sm:w-56">
            <p className="text-slate-800 font-semibold leading-tight">{tanggalPiagam}</p>
            <p className="font-bold text-slate-900 leading-tight">Kepala Sekolah,</p>

            {/* Ruang TTD & Stempel */}
            <div className="h-10 sm:h-12 print:h-8 flex items-center justify-center">
              <span className="text-[9px] text-slate-300 italic select-none">Tanda Tangan & Cap</span>
            </div>

            <p className="font-black text-slate-900 uppercase underline tracking-wide leading-tight">
              {schoolInfo.headmasterName || 'Kepala Sekolah'}
            </p>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-0.5">
              NIP. <span className="font-mono">{schoolInfo.headmasterNip || '-'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===============================================================================
// MODAL CETAK MASSAL PIAGAM PENGHARGAAN
// ===============================================================================

interface ModalCetakMassalPiagamProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  rankingsMap: Map<string, number>;
  scoresMap: Map<string, { total: number; avg: number }>;
  paperSize: PiagamPaperSize;
  borderStyle: PiagamBorderStyle;
  colorTheme: PiagamColorTheme;
  config: PiagamNumberingConfig;
  customDataMap: Record<string, PiagamCustomData>;
  schoolInfo: SchoolInfo;
  defaultTanggalPiagam: string;
  onSelectBorderStyle?: (style: PiagamBorderStyle) => void;
  onOpenNumberingSettings?: () => void;
  onConfirmBatchPrint: (selectedStudents: Student[]) => void;
}

const ModalCetakMassalPiagam: React.FC<ModalCetakMassalPiagamProps> = ({
  isOpen,
  onClose,
  students,
  rankingsMap,
  scoresMap,
  paperSize,
  borderStyle,
  colorTheme,
  config,
  customDataMap,
  schoolInfo,
  defaultTanggalPiagam,
  onSelectBorderStyle,
  onOpenNumberingSettings,
  onConfirmBatchPrint
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    students.slice(0, 3).map(s => s.id) // Default juara 1-3
  );

  if (!isOpen) return null;

  const handleSelectTop = (count: number) => {
    setSelectedIds(students.slice(0, count).map(s => s.id));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s.id));
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedStudentsToPrint = students.filter(s => selectedIds.includes(s.id));

  // Preview format penomoran untuk modal cetak
  const sampleNumberFirst = students[0]
    ? generatePiagamNumber({
        student: students[0],
        rank: rankingsMap.get(students[0].id) ?? 1,
        sequenceIndex: 0,
        config,
        schoolInfo,
        tanggalPiagam: defaultTanggalPiagam
      })
    : '001/SDN006/PP/XI/2024';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Cetak Massal Piagam Penghargaan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kertas: <strong>{paperSize} Landscape</strong> • Bingkai: <strong>{getFrameStyleOption(borderStyle).name.split('(')[0].trim()}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Pilihan Gaya Bingkai Sebelum Cetak Massal */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-slate-800 dark:to-amber-950/40 border border-amber-300 dark:border-amber-700/70 shadow-2xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Pilih Gaya Bingkai (Border Style):</span>
              </label>
              {onSelectBorderStyle && (
                <select
                  value={borderStyle}
                  onChange={e => onSelectBorderStyle(e.target.value as PiagamBorderStyle)}
                  className="rounded-lg border-2 border-amber-400 dark:border-amber-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-black text-amber-950 dark:text-amber-200 shadow-2xs outline-none cursor-pointer"
                >
                  {FRAME_STYLE_OPTIONS.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-amber-900 dark:text-amber-300">
                {getFrameStyleOption(borderStyle).tagline}
              </span>
            </div>
          </div>
          {/* Format Penomoran Piagam Info Banner */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Penomoran Standar:
                </span>
                <span className="ml-2 font-mono text-xs font-black text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                  {sampleNumberFirst}
                </span>
              </div>
            </div>
            {onOpenNumberingSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNumberingSettings();
                }}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Settings className="h-3 w-3" />
                <span>Atur Format</span>
              </button>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Cepat:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleSelectTop(3)}
                className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-200 transition-colors"
              >
                Juara 1 - 3 (Top 3)
              </button>
              <button
                type="button"
                onClick={() => handleSelectTop(5)}
                className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-200 transition-colors"
              >
                Top 5
              </button>
              <button
                type="button"
                onClick={() => handleSelectTop(10)}
                className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-200 transition-colors"
              >
                Top 10
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition-colors"
              >
                {selectedIds.length === students.length ? 'Batal Semua' : 'Semua Siswa'}
              </button>
            </div>
          </div>

          {/* Student Checkboxes List */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
            {students.map((st, idx) => {
              const isChecked = selectedIds.includes(st.id);
              const r = rankingsMap.get(st.id) ?? '-';
              const numericRank = typeof r === 'number' ? r : idx + 1;
              const sc = scoresMap.get(st.id) ?? { total: 0, avg: 0 };
              const cust = customDataMap[st.id] || {};
              const autoNom = generatePiagamNumber({
                student: st,
                rank: numericRank,
                sequenceIndex: idx,
                config,
                schoolInfo,
                tanggalPiagam: defaultTanggalPiagam
              });
              const nom = cust.nomorPiagam || autoNom;

              return (
                <label
                  key={st.id}
                  className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                    isChecked
                      ? 'bg-amber-50/70 dark:bg-amber-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(st.id)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {cust.namaSiswa || st.nama}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                        NISN: {cust.nisn || st.nisn || '-'}
                      </span>
                      <div className="text-[10.5px] font-mono font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                        No. Piagam: {nom}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Rata-rata: {sc.avg}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                      r === 1 ? 'bg-amber-200 text-amber-950 ring-1 ring-amber-400' :
                      r === 2 ? 'bg-slate-200 text-slate-900 ring-1 ring-slate-300' :
                      r === 3 ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' :
                      typeof r === 'number' && r <= 6 ? 'bg-amber-50 text-amber-800' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-600'
                    }`}>
                      {r === 1 ? '🥇 Juara 1' : r === 2 ? '🥈 Juara 2' : r === 3 ? '🥉 Juara 3' : typeof r === 'number' && r <= 6 ? `🎖️ Harapan ${r - 3}` : `Peringkat #${r}`}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">
            Terpilih: <strong className="text-amber-600">{selectedStudentsToPrint.length} dari {students.length}</strong> siswa. Setiap siswa akan dicetak pada 1 lembar piagam terpisah secara rapi.
          </p>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={selectedStudentsToPrint.length === 0}
            onClick={() => onConfirmBatchPrint(selectedStudentsToPrint)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Mulai Cetak ({selectedStudentsToPrint.length} Piagam)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ===============================================================================
// MODAL PEMILIH & KATALOG GAYA BINGKAI PIAGAM (FULL BROWSE & LIVE PREVIEW)
// ===============================================================================

interface ModalPemilihGayaBingkaiProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: PiagamBorderStyle;
  currentColorTheme: PiagamColorTheme;
  onSelectStyle: (style: PiagamBorderStyle, recommendedColor?: PiagamColorTheme) => void;
}

const ModalPemilihGayaBingkai: React.FC<ModalPemilihGayaBingkaiProps> = ({
  isOpen,
  onClose,
  currentStyle,
  currentColorTheme,
  onSelectStyle
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filteredOptions = activeCategory === 'all'
    ? FRAME_STYLE_OPTIONS
    : FRAME_STYLE_OPTIONS.filter(f => f.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Katalog & Pemilih Gaya Bingkai Piagam
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih variasi desain bingkai piagam penghargaan resmi (Semua model otomatis Landscape)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
          {['all', 'Klasik & Kerajaan', 'Tradisi Nusantara', 'Resmi & Kedinasan', 'Modern & Prestisius'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori (9 Desain)' : cat}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOptions.map(frame => {
              const isSelected = currentStyle === frame.id;
              return (
                <div
                  key={frame.id}
                  onClick={() => onSelectStyle(frame.id, frame.recommendedColor)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/90 dark:bg-amber-950/50 shadow-md ring-2 ring-amber-500/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-amber-400 hover:shadow-xs'
                  }`}
                >
                  {/* Thumbnail Miniatur Preview */}
                  <div className="mb-3 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900 group-hover:scale-[1.02] transition-transform">
                    <FrameStyleThumbnail
                      style={frame.id}
                      colorTheme={currentColorTheme}
                      isSelected={isSelected}
                      className="w-full h-28"
                    />
                  </div>

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-md">
                      {frame.category}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-md">
                        <Check className="h-3.5 w-3.5 text-amber-600" />
                        Terpilih
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Klik untuk Memilih
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight group-hover:text-amber-700 dark:group-hover:text-amber-400">
                      {frame.name}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {frame.tagline}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-400">Format: Landscape</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStyle(frame.id, frame.recommendedColor);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-100 hover:text-amber-900'
                      }`}
                    >
                      {isSelected ? 'Gaya Aktif' : 'Terapkan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500">
            Gaya Aktif: <strong className="text-amber-600">{getFrameStyleOption(currentStyle).name}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs transition-colors cursor-pointer"
          >
            Selesai Memilih
          </button>
        </div>
      </div>
    </div>
  );
};
