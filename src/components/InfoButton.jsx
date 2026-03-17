export default function InfoButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-full bg-white border border-[#BDC3C7] text-[#95A5A6] hover:text-[#3D5A3E] hover:border-[#8FC87A] hover:bg-[#EEF5E6] transition-colors flex items-center justify-center flex-shrink-0 shadow-sm ${className}`}
      title="查看數據說明"
      aria-label="查看數據說明"
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
