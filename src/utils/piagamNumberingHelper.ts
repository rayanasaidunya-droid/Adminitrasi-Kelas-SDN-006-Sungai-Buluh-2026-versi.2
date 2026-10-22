import { SchoolInfo, Student } from '../types';

export interface PiagamNumberingConfig {
  formatPreset: 'standard_school' | 'dinas_classification' | 'doc_prefix' | 'with_class' | 'custom';
  customTemplate?: string;
  startNumber: number;
  digitCount: 1 | 2 | 3 | 4;
  schoolCode: string;
  docCode: string;
  numberingOrder: 'rank' | 'absen' | 'alpha';
  romanMonth: string; // 'auto' or 'I'..'XII'
  year: string; // 'auto' or '2024', etc.
}

export const PRESET_FORMATS = [
  {
    id: 'standard_school',
    label: 'Standar Sekolah (Rekomendasi)',
    pattern: '{no}/{sekolah}/{kode}/{bulan}/{tahun}',
    example: '001/SDN006/PP/XI/2024',
    description: 'Format baku sekolah dasar: Nomor Urut 3 digit / Kode Sekolah / Kode Surat / Bulan Romawi / Tahun Kalender.'
  },
  {
    id: 'dinas_classification',
    label: 'Format Klasifikasi Dinas (421.2)',
    pattern: '421.2/{no}/{sekolah}/{kode}/{smt}/{tahun}',
    example: '421.2/001/SDN006/PP/II/2024',
    description: 'Format persuratan dinas pendidikan dengan nomor klasifikasi 421.2 dan angka semester romawi.'
  },
  {
    id: 'doc_prefix',
    label: 'Format Prefiks Berkas Piagam',
    pattern: '{kode}.{no}/{sekolah}/{bulan}/{tahun}',
    example: 'PP.001/SDN006/XI/2024',
    description: 'Format dengan kode berkas piagam di awal nomor surat.'
  },
  {
    id: 'with_class',
    label: 'Format Rinci Mencakup Kelas',
    pattern: '{no}/{kode}/{sekolah}/{kelas}/{bulan}/{tahun}',
    example: '001/PP/SDN006/IV-A/XI/2024',
    description: 'Format rinci yang mencantumkan identitas tingkat kelas siswa secara eksplisit.'
  },
  {
    id: 'custom',
    label: 'Kustom Template Mandiri',
    pattern: '{no}/{sekolah}/{kode}/{bulan}/{tahun}',
    example: '001/SDN006/PP/XI/2024',
    description: 'Tentukan format bebas menggunakan tag placeholder {no}, {sekolah}, {kode}, {bulan}, {tahun}, {smt}, {kelas}.'
  }
];

export const ROMAN_MONTHS = [
  { value: 'auto', label: 'Otomatis (Sesuai Tanggal Piagam)' },
  { value: 'I', label: 'I (Januari)' },
  { value: 'II', label: 'II (Februari)' },
  { value: 'III', label: 'III (Maret)' },
  { value: 'IV', label: 'IV (April)' },
  { value: 'V', label: 'V (Mei)' },
  { value: 'VI', label: 'VI (Juni)' },
  { value: 'VII', label: 'VII (Juli)' },
  { value: 'VIII', label: 'VIII (Agustus)' },
  { value: 'IX', label: 'IX (September)' },
  { value: 'X', label: 'X (Oktober)' },
  { value: 'XI', label: 'XI (November)' },
  { value: 'XII', label: 'XII (Desember)' }
];

/**
 * Ekstrak singkatan kode sekolah dari nama sekolah.
 * Contoh: "SDN 006 SUNGAI BULUH" -> "SDN006"
 * Contoh: "SD NEGERI 006 ..." -> "SDN006"
 * Contoh: "SD NEGERI NUSANTARA 01" -> "SDN01"
 */
export const extractSchoolCode = (schoolName?: string): string => {
  if (!schoolName) return 'SDN006';
  const clean = schoolName.trim().toUpperCase();

  // Pola SDN + spasi? + angka (e.g. "SDN 006" -> "SDN006")
  const sdnMatch = clean.match(/SDN\s*(\d+)/i);
  if (sdnMatch) {
    return `SDN${sdnMatch[1]}`;
  }

  // Pola SD NEGERI + spasi? + angka (e.g. "SD NEGERI 006" -> "SDN006")
  const sdNegeriMatch = clean.match(/SD\s*NEGERI\s*(\d+)/i);
  if (sdNegeriMatch) {
    return `SDN${sdNegeriMatch[1]}`;
  }

  // Pola SD Negeri + kata (e.g. "SD NEGERI NUSANTARA 01" -> "SDN01" atau "SDNNUS")
  const numMatch = clean.match(/(\d+)/);
  if (clean.includes('SD') && numMatch) {
    return `SDN${numMatch[1]}`;
  }

  // Fallback: hapus karakter selain alfanumerik, ambil hingga 8 huruf
  const compact = clean.replace(/[^A-Z0-9]/g, '');
  return compact.slice(0, 8) || 'SDN006';
};

/**
 * Ekstrak angka Romawi bulan dari tanggal teks atau angka
 */
export const extractRomanMonth = (dateString?: string, defaultRoman: string = 'XI'): string => {
  const map: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
  };

  if (!dateString) {
    const cur = new Date().getMonth() + 1;
    return map[cur] || defaultRoman;
  }

  const str = dateString.toLowerCase();
  if (str.includes('januari') || str.includes('january')) return 'I';
  if (str.includes('februari') || str.includes('february')) return 'II';
  if (str.includes('maret') || str.includes('march')) return 'III';
  if (str.includes('april')) return 'IV';
  if (str.includes('mei') || str.includes('may')) return 'V';
  if (str.includes('juni') || str.includes('june')) return 'VI';
  if (str.includes('juli') || str.includes('july')) return 'VII';
  if (str.includes('agustus') || str.includes('august')) return 'VIII';
  if (str.includes('september')) return 'IX';
  if (str.includes('oktober') || str.includes('october')) return 'X';
  if (str.includes('november')) return 'XI';
  if (str.includes('desember') || str.includes('december')) return 'XII';

  // Format angka YYYY-MM-DD atau DD/MM/YYYY
  const parts = dateString.match(/\b(0?[1-9]|1[0-2])\b/g);
  if (parts && parts.length > 1) {
    const m = parseInt(parts[1], 10);
    if (m >= 1 && m <= 12) return map[m];
  }

  const cur = new Date().getMonth() + 1;
  return map[cur] || defaultRoman;
};

/**
 * Ekstrak tahun 4 digit dari tanggal atau tahun pelajaran
 */
export const extractYearFromContext = (dateString?: string, academicYear?: string): string => {
  if (dateString) {
    const match = dateString.match(/\b(20\d\d)\b/);
    if (match) return match[1];
  }
  if (academicYear) {
    const match = academicYear.match(/\b(20\d\d)\b/);
    if (match) return match[1];
  }
  return new Date().getFullYear().toString();
};

/**
 * Konfigurasi bawaan penomoran piagam otomatis standar sekolah
 */
export const getDefaultPiagamNumberingConfig = (schoolName?: string): PiagamNumberingConfig => {
  return {
    formatPreset: 'standard_school',
    customTemplate: '{no}/{sekolah}/{kode}/{bulan}/{tahun}',
    startNumber: 1,
    digitCount: 3,
    schoolCode: extractSchoolCode(schoolName) || 'SDN006',
    docCode: 'PP',
    numberingOrder: 'rank',
    romanMonth: 'auto',
    year: 'auto'
  };
};

export const LOCAL_STORAGE_NUMBERING_KEY = 'adm_sd_piagam_numbering_config';

export const loadPiagamNumberingConfig = (schoolName?: string): PiagamNumberingConfig => {
  if (typeof window === 'undefined') {
    return getDefaultPiagamNumberingConfig(schoolName);
  }
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_NUMBERING_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...getDefaultPiagamNumberingConfig(schoolName),
        ...parsed,
        schoolCode: parsed.schoolCode || extractSchoolCode(schoolName) || 'SDN006'
      };
    }
  } catch (e) {
    console.error('Error loading piagam numbering config:', e);
  }
  return getDefaultPiagamNumberingConfig(schoolName);
};

export const savePiagamNumberingConfig = (config: PiagamNumberingConfig) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_NUMBERING_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving piagam numbering config:', e);
  }
};

interface GenerateNumberParams {
  student: Student;
  rank: number;
  sequenceIndex: number;
  config: PiagamNumberingConfig;
  schoolInfo: SchoolInfo;
  tanggalPiagam?: string;
}

/**
 * Hasilkan nomor surat piagam secara otomatis sesuai konfigurasi dan format standar sekolah
 */
export const generatePiagamNumber = ({
  student,
  rank,
  sequenceIndex,
  config,
  schoolInfo,
  tanggalPiagam
}: GenerateNumberParams): string => {
  // 1. Tentukan nomor urut numerik
  let numericOrder = sequenceIndex + 1;
  if (config.numberingOrder === 'rank') {
    numericOrder = rank > 0 ? rank : sequenceIndex + 1;
  } else if (config.numberingOrder === 'absen') {
    numericOrder = student.nomorAbsen || sequenceIndex + 1;
  }

  const effectiveStart = config.startNumber || 1;
  const calculatedNum = effectiveStart + (numericOrder - 1);
  const formattedNo = String(calculatedNum).padStart(config.digitCount || 3, '0');

  // 2. Kode Sekolah
  const schoolCode = config.schoolCode || extractSchoolCode(schoolInfo.schoolName) || 'SDN006';

  // 3. Kode Surat
  const docCode = config.docCode || 'PP';

  // 4. Bulan Romawi
  let romanMonth = config.romanMonth;
  if (!romanMonth || romanMonth === 'auto') {
    romanMonth = extractRomanMonth(tanggalPiagam || schoolInfo.tanggalRapor);
  }

  // 5. Tahun
  let year = config.year;
  if (!year || year === 'auto') {
    year = extractYearFromContext(tanggalPiagam || schoolInfo.tanggalRapor, schoolInfo.academicYear);
  }

  // 6. Semester Romawi
  const smtRomawi = schoolInfo.semester?.includes('1') ? 'I' : 'II';

  // 7. Format Kelas Singkat
  const rawClass = schoolInfo.className || student.kelas || 'IV';
  const cleanClass = rawClass.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // 8. Terapkan pola sesuai preset
  let pattern = '{no}/{sekolah}/{kode}/{bulan}/{tahun}';
  if (config.formatPreset === 'dinas_classification') {
    pattern = '421.2/{no}/{sekolah}/{kode}/{smt}/{tahun}';
  } else if (config.formatPreset === 'doc_prefix') {
    pattern = '{kode}.{no}/{sekolah}/{bulan}/{tahun}';
  } else if (config.formatPreset === 'with_class') {
    pattern = '{no}/{kode}/{sekolah}/{kelas}/{bulan}/{tahun}';
  } else if (config.formatPreset === 'custom' && config.customTemplate) {
    pattern = config.customTemplate;
  }

  return pattern
    .replace(/\{no\}/gi, formattedNo)
    .replace(/\{sekolah\}/gi, schoolCode)
    .replace(/\{kode\}/gi, docCode)
    .replace(/\{bulan\}/gi, romanMonth)
    .replace(/\{tahun\}/gi, year)
    .replace(/\{smt\}/gi, smtRomawi)
    .replace(/\{kelas\}/gi, cleanClass);
};
