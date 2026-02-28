import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── SVG Illustrations ────────────────────────────────────────────────────────

const CraneLeft = () => (
  <svg viewBox="0 0 120 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Mast */}
    <rect x="52" y="60" width="12" height="155" fill="#F5A623" rx="2"/>
    {/* Horizontal jib */}
    <rect x="10" y="55" width="100" height="10" fill="#F5A623" rx="2"/>
    {/* Counter jib */}
    <rect x="52" y="55" width="58" height="8" fill="#E8951A" rx="2"/>
    {/* Trolley wire */}
    <line x1="20" y1="60" x2="58" y2="65" stroke="#999" strokeWidth="1.5"/>
    {/* Hook cable */}
    <line x1="28" y1="60" x2="28" y2="115" stroke="#999" strokeWidth="1.5"/>
    {/* Hook */}
    <path d="M24 115 Q28 122 32 115" stroke="#777" strokeWidth="2" fill="none"/>
    {/* Cabin */}
    <rect x="56" y="68" width="20" height="18" fill="#FFD166" rx="2"/>
    <rect x="58" y="70" width="8" height="8" fill="#AEE4FF" rx="1"/>
    {/* Base */}
    <rect x="44" y="210" width="28" height="10" fill="#C8851A" rx="2"/>
    <rect x="36" y="205" width="44" height="8" fill="#E8951A" rx="2"/>
    {/* Support cables */}
    <line x1="58" y1="60" x2="18" y2="60" stroke="#C8851A" strokeWidth="1.5" strokeDasharray="3,2"/>
    <line x1="58" y1="60" x2="105" y2="60" stroke="#C8851A" strokeWidth="1.5" strokeDasharray="3,2"/>
  </svg>
);

const CraneRight = () => (
  <svg viewBox="0 0 120 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="54" y="50" width="12" height="145" fill="#F5A623" rx="2"/>
    <rect x="10" y="45" width="100" height="10" fill="#F5A623" rx="2"/>
    <line x1="90" y1="50" x2="62" y2="55" stroke="#999" strokeWidth="1.5"/>
    <line x1="88" y1="50" x2="88" y2="100" stroke="#999" strokeWidth="1.5"/>
    <path d="M84 100 Q88 107 92 100" stroke="#777" strokeWidth="2" fill="none"/>
    <rect x="44" y="58" width="20" height="18" fill="#FFD166" rx="2"/>
    <rect x="46" y="60" width="8" height="8" fill="#AEE4FF" rx="1"/>
    <rect x="46" y="190" width="28" height="8" fill="#C8851A" rx="2"/>
    <rect x="38" y="185" width="44" height="8" fill="#E8951A" rx="2"/>
  </svg>
);

const WorkerWithLock = () => (
  <svg viewBox="0 0 280 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
    {/* Vault door */}
    <rect x="130" y="60" width="130" height="170" fill="#8B8B8B" rx="6"/>
    <rect x="135" y="65" width="120" height="160" fill="#9E9E9E" rx="4"/>
    {/* Door stripes */}
    <rect x="130" y="100" width="130" height="18" fill="#FFD166" opacity="0.7"/>
    <rect x="130" y="136" width="130" height="18" fill="#1a1a1a" opacity="0.5"/>
    <rect x="130" y="154" width="130" height="18" fill="#FFD166" opacity="0.7"/>
    {/* 401 text on door */}
    <text x="195" y="108" textAnchor="middle" fill="#1a1a1a" fontSize="28" fontWeight="900" fontFamily="Arial Black, sans-serif">401</text>
    {/* LOCKED badge */}
    <rect x="155" y="118" width="80" height="28" fill="#EF4444" rx="14"/>
    <text x="195" y="137" textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="Arial, sans-serif">🔒 LOCKED</text>
    {/* Door handle */}
    <circle cx="142" cy="148" r="8" fill="#FFCA28"/>
    <circle cx="142" cy="148" r="5" fill="#FF9800"/>
    {/* Hinge bolts */}
    <circle cx="250" cy="90" r="5" fill="#757575"/>
    <circle cx="250" cy="200" r="5" fill="#757575"/>

    {/* Worker body */}
    {/* Legs */}
    <rect x="86" y="240" width="22" height="60" fill="#546E7A" rx="4"/>
    <rect x="114" y="240" width="22" height="60" fill="#546E7A" rx="4"/>
    {/* Shoes */}
    <rect x="82" y="292" width="28" height="12" fill="#37474F" rx="4"/>
    <rect x="110" y="292" width="28" height="12" fill="#37474F" rx="4"/>
    {/* Vest body */}
    <rect x="78" y="170" width="66" height="75" fill="#5C6BC0" rx="6"/>
    {/* Vest stripes */}
    <rect x="78" y="195" width="66" height="8" fill="#FFD54F" opacity="0.8"/>
    <rect x="78" y="220" width="66" height="8" fill="#FFD54F" opacity="0.8"/>
    {/* Arms */}
    {/* Left arm (holding padlock) */}
    <rect x="48" y="172" width="32" height="18" fill="#5C6BC0" rx="6"/>
    {/* Right arm */}
    <rect x="142" y="172" width="30" height="18" fill="#5C6BC0" rx="6"/>
    {/* Hands */}
    <ellipse cx="44" cy="181" rx="10" ry="10" fill="#FFCC80"/>
    <ellipse cx="172" cy="181" rx="10" ry="10" fill="#FFCC80"/>
    {/* Head */}
    <circle cx="111" cy="148" r="32" fill="#FFCC80"/>
    {/* Eyes */}
    <circle cx="102" cy="145" r="5" fill="white"/>
    <circle cx="120" cy="145" r="5" fill="white"/>
    <circle cx="103" cy="146" r="3" fill="#333"/>
    <circle cx="121" cy="146" r="3" fill="#333"/>
    {/* Smile */}
    <path d="M102 157 Q111 164 120 157" stroke="#E65100" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    {/* Cheeks */}
    <circle cx="97" cy="155" r="5" fill="#FFAB91" opacity="0.6"/>
    <circle cx="125" cy="155" r="5" fill="#FFAB91" opacity="0.6"/>
    {/* Hard hat */}
    <ellipse cx="111" cy="122" rx="36" ry="10" fill="#F5A623"/>
    <ellipse cx="111" cy="118" rx="28" ry="20" fill="#FFB300"/>
    <rect x="80" y="117" width="62" height="10" fill="#F5A623" rx="2"/>
    {/* Hat brim */}
    <ellipse cx="111" cy="127" rx="38" ry="7" fill="#E8951A"/>

    {/* Padlock (cute) */}
    <rect x="20" y="190" width="52" height="42" fill="#FFD54F" rx="10"/>
    <rect x="26" y="196" width="40" height="30" fill="#FFCA28" rx="7"/>
    {/* Lock shackle */}
    <path d="M32 190 Q32 170 46 170 Q60 170 60 190" stroke="#FFA000" strokeWidth="7" fill="none" strokeLinecap="round"/>
    {/* Keyhole */}
    <circle cx="46" cy="210" r="6" fill="#FF8F00"/>
    <rect x="43" y="213" width="6" height="8" fill="#FF8F00" rx="2"/>
    {/* Lock face */}
    <circle cx="33" cy="208" r="3" fill="#FFA000" opacity="0.5"/>
    <circle cx="59" cy="208" r="3" fill="#FFA000" opacity="0.5"/>
  </svg>
);

const ConcreteItems = () => (
  <svg viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Brick pile */}
    <rect x="0" y="40" width="38" height="14" fill="#C84B31" rx="2"/>
    <rect x="4" y="28" width="34" height="14" fill="#D4533A" rx="2"/>
    <rect x="2" y="16" width="36" height="14" fill="#C84B31" rx="2"/>
    <rect x="6" y="54" width="30" height="14" fill="#B84030" rx="2"/>
    {/* Lines on bricks */}
    <line x1="16" y1="40" x2="16" y2="54" stroke="#A03020" strokeWidth="1"/>
    <line x1="26" y1="40" x2="26" y2="54" stroke="#A03020" strokeWidth="1"/>
    {/* Steel beams */}
    <rect x="60" y="50" width="80" height="10" fill="#78909C" rx="2"/>
    <rect x="65" y="42" width="70" height="10" fill="#90A4AE" rx="2"/>
    <rect x="58" y="58" width="84" height="10" fill="#607D8B" rx="2"/>
    {/* Mixer */}
    <rect x="155" y="30" width="40" height="40" fill="#F5A623" rx="4"/>
    <ellipse cx="175" cy="50" rx="18" ry="18" fill="#FF9800"/>
    <ellipse cx="175" cy="50" rx="13" ry="13" fill="#BF7200"/>
    <rect x="168" y="28" width="14" height="8" fill="#E8951A" rx="2"/>
    {/* Mixer handle */}
    <circle cx="175" cy="50" r="4" fill="#FFC107"/>
    <rect x="172" y="65" width="6" height="15" fill="#E8951A" rx="2"/>
    <rect x="162" y="78" width="26" height="5" fill="#BF7200" rx="2"/>
  </svg>
);

// ── Main Page ────────────────────────────────────────────────────────────────

export default function UnauthorizedPage({ isAr: propIsAr }) {
  const navigate = useNavigate();
  const [isAr, setIsAr] = useState(true);

  useEffect(() => {
    // قراءة اللغة من localStorage أو من الـ prop
    if (propIsAr !== undefined) {
      setIsAr(propIsAr);
    } else {
      const stored = localStorage.getItem('lang');
      setIsAr(stored !== 'en');
    }
  }, [propIsAr]);

  const t = {
    title:    isAr ? '٤٠١ – عفواً! انتظر لحظة!'     : '401 – Oops! Wait a Sec!',
    subtitle: isAr ? 'وصول غير مصرح به'               : 'UNAUTHORIZED ACCESS',
    heading:  isAr ? 'عذراً! يبدو أنك لا تملك الإذن للوصول إلى هذه الصفحة.' : "Sorry! It seems you don't have permission to access this page.",
    body:     isAr
      ? 'لا يمكننا منحك الوصول الآن. يرجى تسجيل الدخول أو التواصل مع المسؤول للتحقق من صلاحياتك.'
      : "We couldn't grant you access just yet! Please log in or check your permissions to view this content.",
    btn:      isAr ? 'الذهاب إلى لوحة التحكم'         : 'GO TO DASHBOARD',
    hint:     isAr ? 'تواصل مع الأدمن لفتح الصلاحيات' : 'Contact your admin to unlock permissions',
    home:     isAr ? 'الرئيسية' : 'Home',
    help:     isAr ? 'مركز المساعدة' : 'Help Center',
    privacy:  isAr ? 'سياسة الخصوصية' : 'Privacy Policy',
    copy:     isAr ? '© 2024 MyAwesomeApp Inc.' : '© 2024 MyAwesomeApp Inc.',
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #D4EFFF 0%, #B8E4FA 40%, #E8D8C0 100%)' }}
    >
      {/* ── Sky Clouds ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-8 left-16 w-24 h-10 bg-white rounded-full opacity-80 blur-sm" />
        <div className="absolute top-6 left-24 w-16 h-8 bg-white rounded-full opacity-70 blur-sm" />
        <div className="absolute top-12 right-20 w-28 h-10 bg-white rounded-full opacity-75 blur-sm" />
        <div className="absolute top-10 right-32 w-18 h-7 bg-white rounded-full opacity-60 blur-sm" />
        <div className="absolute top-4 left-1/2 w-20 h-8 bg-white rounded-full opacity-65 blur-sm" />
        {/* City silhouette */}
        <svg viewBox="0 0 1400 200" className="absolute bottom-32 w-full opacity-20" preserveAspectRatio="none">
          <rect x="950" y="80"  width="40" height="120" fill="#90CAF9"/>
          <rect x="1000" y="50" width="30" height="150" fill="#90CAF9"/>
          <rect x="1040" y="90" width="50" height="110" fill="#90CAF9"/>
          <rect x="1100" y="40" width="35" height="160" fill="#90CAF9"/>
          <rect x="1145" y="70" width="45" height="130" fill="#90CAF9"/>
          <rect x="1200" y="55" width="30" height="145" fill="#90CAF9"/>
          <rect x="1240" y="85" width="55" height="115" fill="#90CAF9"/>
          <rect x="1305" y="60" width="40" height="140" fill="#90CAF9"/>
          <rect x="1355" y="90" width="45" height="110" fill="#90CAF9"/>
        </svg>
      </div>

      {/* ── Main Content ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4">

        {/* Title */}
        <div className="text-center mb-2 z-10">
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 tracking-tight leading-tight"
            style={{ fontFamily: "'Arial Black', Impact, sans-serif" }}>
            {t.title}
          </h1>
          <p className="text-sm font-bold tracking-[0.25em] text-gray-500 mt-1 uppercase">{t.subtitle}</p>
        </div>

        {/* Cranes + Worker layout */}
        <div className="relative w-full max-w-4xl flex items-end justify-center z-10" style={{ height: '340px' }}>

          {/* Left crane */}
          <div className="absolute left-0 bottom-0 w-32 md:w-44" style={{ height: '280px' }}>
            <CraneLeft />
          </div>

          {/* Right crane */}
          <div className="absolute right-0 bottom-0 w-28 md:w-36" style={{ height: '240px' }}>
            <CraneRight />
          </div>

          {/* Left text */}
          <div
            className="absolute z-20 text-center bg-white/60 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-sm max-w-xs"
            style={isAr ? { right: '38%', bottom: '120px' } : { left: '5%', bottom: '120px' }}
          >
            <p className="text-xl md:text-2xl font-black text-gray-800 leading-snug" style={{ fontFamily: "'Arial Black', sans-serif" }}>
              {t.heading}
            </p>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{t.body}</p>
          </div>

          {/* Worker + Door illustration */}
          <div className="absolute z-10" style={{ width: '280px', height: '320px', bottom: 0,
            [isAr ? 'left' : 'right']: '12%' }}>
            <WorkerWithLock />
          </div>
        </div>

        {/* Ground items */}
        <div className="relative w-full max-w-3xl z-10 -mt-2" style={{ height: '80px' }}>
          <ConcreteItems />
        </div>

        {/* CTA Button */}
        <div className="z-10 flex flex-col items-center gap-3 mt-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 px-8 py-4 rounded-full text-white font-bold text-base tracking-wide shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #42A5F5, #1565C0)', boxShadow: '0 6px 24px rgba(21,101,192,0.35)' }}
          >
            {isAr
              ? <><span>الذهاب إلى لوحة التحكم</span><span className="text-xl">→</span></>
              : <><span>GO TO DASHBOARD</span><span className="text-xl">→</span></>
            }
          </button>

          {/* Hint label */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
            <span className="text-amber-500 text-sm">🔑</span>
            <span className="text-amber-700 text-xs font-semibold">{t.hint}</span>
          </div>
        </div>
      </div>

      {/* ── Ground / Footer area ── */}
      <div className="relative z-10 w-full" style={{ background: '#D4B896', height: '8px' }} />

      {/* ── Footer ── */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-sm py-4 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-1">
          <button onClick={() => navigate('/')} className="hover:text-gray-800 transition">{t.home}</button>
          <button onClick={() => navigate('/help')} className="hover:text-gray-800 transition">{t.help}</button>
          <button onClick={() => navigate('/privacy')} className="hover:text-gray-800 transition">{t.privacy}</button>
        </div>
        <p className="text-xs text-gray-400">{t.copy}</p>
      </footer>
    </div>
  );
}