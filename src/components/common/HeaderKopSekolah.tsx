import React from 'react';
import { useApp } from '../../context/AppContext';
import { SchoolLogoRenderer } from './SchoolLogoRenderer';

interface HeaderKopSekolahProps {
  documentTitle?: string;
  subTitle?: string;
  hideBorder?: boolean;
  className?: string;
  equalizeLogos?: boolean;
  logoSize?: number;
  schoolNameColor?: string;
  borderColor?: string;
  variant?: 'default' | 'piagam';
}

export const HeaderKopSekolah: React.FC<HeaderKopSekolahProps> = ({
  documentTitle,
  subTitle,
  hideBorder = false,
  className,
  equalizeLogos = true,
  logoSize,
  schoolNameColor,
  borderColor,
  variant = 'default'
}) => {
  const { schoolInfo } = useApp();
  const isPiagam = variant === 'piagam';

  const showLeft = schoolInfo.showLogoLeft !== false;
  const showRight = schoolInfo.showLogoRight !== false;
  
  // Ukuran dasar logo kiri dan kanan dari data sekolah
  const rawLeftWidth = schoolInfo.logoLeftWidth || 72;
  const rawRightWidth = schoolInfo.logoRightWidth || 72;

  // Samakan ukuran logo kiri dan kanan agar kop surat resmi berimbang, presisi, dan simetris
  const uniformSize = logoSize
    ? logoSize
    : (showLeft && showRight)
      ? Math.max(rawLeftWidth, rawRightWidth)
      : (rawLeftWidth || rawRightWidth || 72);

  // Batasi dalam rentang proporsional kop:
  // Untuk piagam (landscape format megah): rentang ukuran logo 64px - 96px
  // Untuk kop standar (portrait): rentang ukuran logo 56px - 88px
  const minLogoLimit = isPiagam ? 64 : 56;
  const maxLogoLimit = isPiagam ? 96 : 88;
  const finalSize = Math.max(minLogoLimit, Math.min(uniformSize, maxLogoLimit));

  const leftWidth = equalizeLogos ? finalSize : rawLeftWidth;
  const rightWidth = equalizeLogos ? finalSize : rawRightWidth;

  const headerLine1 = schoolInfo.kopLine1 || 'PEMERINTAH KABUPATEN KUANTAN SINGINGI';
  const headerLine2 = schoolInfo.kopLine2 || 'DINAS PENDIDIKAN DAN KEBUDAYAAN';

  const getBorderClass = () => {
    if (hideBorder) return '';
    if (isPiagam) {
      return `border-b-4 border-double ${!borderColor ? 'border-slate-900 dark:border-slate-300' : ''} pb-2 sm:pb-3 print:pb-2`;
    }
    const style = schoolInfo.kopBorderStyle || 'double';
    switch (style) {
      case 'double':
        return `border-b-4 border-double ${!borderColor ? 'border-slate-900 dark:border-slate-300' : ''} pb-3.5`;
      case 'solid':
        return `border-b-2 ${!borderColor ? 'border-slate-900 dark:border-slate-300' : ''} pb-3.5`;
      case 'dashed':
        return `border-b-2 border-dashed ${!borderColor ? 'border-slate-700 dark:border-slate-400' : ''} pb-3.5`;
      case 'none':
        return 'pb-2';
      default:
        return `border-b-4 border-double ${!borderColor ? 'border-slate-900 dark:border-slate-300' : ''} pb-3.5`;
    }
  };

  return (
    <div
      className={`text-center text-black print:text-black ${getBorderClass()} ${className !== undefined ? className : 'mb-6 print:mb-2 pb-2 print:pb-1'}`}
      style={borderColor && !hideBorder ? { borderColor } : undefined}
    >
      <div className={`flex items-center justify-between ${isPiagam ? 'gap-6 sm:gap-10 print:gap-8 px-2 sm:px-4' : 'gap-3 sm:gap-6'}`}>
        {/* Logo Kiri */}
        <div 
          className="flex shrink-0 items-center justify-center print:flex"
          style={{ 
            width: `${leftWidth}px`, 
            height: `${leftWidth}px`, 
            minWidth: `${leftWidth}px`,
            maxWidth: `${leftWidth}px`
          }}
        >
          {showLeft ? (
            <SchoolLogoRenderer
              preset={schoolInfo.logoLeftPreset || 'tutwuri'}
              customUrl={schoolInfo.logoLeft}
              width={leftWidth}
              alt="Logo Kiri Kop"
            />
          ) : (
            <div style={{ width: `${leftWidth}px`, height: `${leftWidth}px` }} className="print:block" />
          )}
        </div>

        {/* Text Header Kop Sekolah: aman dengan jarak padding dan max-w agar tidak pernah menyentuh logo */}
        <div className={`flex-1 text-center min-w-0 ${isPiagam ? 'px-4 sm:px-8 max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto' : 'px-1 sm:px-2'}`}>
          {headerLine1 && (
            <h3 className={`${isPiagam ? 'text-xs sm:text-sm md:text-base font-extrabold tracking-wider' : 'text-xs sm:text-base md:text-lg font-bold tracking-wider'} uppercase text-black print:text-black leading-snug`}>
              {headerLine1}
            </h3>
          )}
          {headerLine2 && (
            <h3 className={`${isPiagam ? 'text-xs sm:text-sm md:text-base font-extrabold tracking-wider' : 'text-xs sm:text-base md:text-lg font-bold tracking-wider'} uppercase text-black print:text-black leading-snug`}>
              {headerLine2}
            </h3>
          )}
          <h1
            className={`${
              isPiagam
                ? 'text-lg sm:text-2xl md:text-[28px] font-black tracking-tight leading-tight my-1'
                : 'text-base sm:text-xl md:text-2xl font-black tracking-tight leading-tight my-0.5'
            } uppercase ${
              !schoolNameColor ? 'text-blue-900 print:text-black' : 'print:text-black'
            }`}
            style={schoolNameColor ? { color: schoolNameColor } : undefined}
          >
            {schoolInfo.schoolName}
          </h1>
          <p className={`${isPiagam ? 'text-[11px] sm:text-xs md:text-sm text-slate-800' : 'text-[9.5px] sm:text-xs text-slate-700'} print:text-black leading-snug`}>
            {schoolInfo.address}
            {schoolInfo.village ? `, Desa/Kel. ${schoolInfo.village}` : ''}
            {schoolInfo.subdistrict ? `, Kec. ${schoolInfo.subdistrict}` : ''}
            {schoolInfo.city ? `, ${schoolInfo.city}` : ''}
            {schoolInfo.postalCode ? `, Kode Pos ${schoolInfo.postalCode}` : ''}
          </p>
          <p className={`${isPiagam ? 'text-[10px] sm:text-[11.5px] md:text-xs text-slate-800 mt-1' : 'text-[9px] sm:text-xs text-slate-700 mt-0.5'} print:text-black leading-snug`}>
            NPSN: <span className="font-semibold text-black print:text-black">{schoolInfo.npsn}</span> | Telp: {schoolInfo.phoneNumber} | Email: {schoolInfo.email}
          </p>
        </div>

        {/* Logo Kanan */}
        <div 
          className="flex shrink-0 items-center justify-center print:flex"
          style={{ 
            width: `${rightWidth}px`, 
            height: `${rightWidth}px`, 
            minWidth: `${rightWidth}px`,
            maxWidth: `${rightWidth}px`
          }}
        >
          {showRight ? (
            <SchoolLogoRenderer
              preset={schoolInfo.logoRightPreset || 'merdeka'}
              customUrl={schoolInfo.logoRight}
              width={rightWidth}
              alt="Logo Kanan Kop"
            />
          ) : (
            <div style={{ width: `${rightWidth}px`, height: `${rightWidth}px` }} className="print:block" />
          )}
        </div>
      </div>

      {documentTitle && (
        <div className="mt-4 print:mt-2 border-t border-slate-300 print:border-black pt-3 print:pt-1.5">
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900 print:text-black underline underline-offset-4">
            {documentTitle}
          </h2>
          {subTitle && (
            <p className="mt-0.5 text-xs font-medium text-slate-600 print:text-black">
              {subTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
