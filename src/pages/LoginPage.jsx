import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { setRole } = useApp();
  const navigate = useNavigate();

  const handleSelect = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'teacher') navigate('/teacher');
    else navigate('/student');
  };

  return (
    <div className="min-h-screen bg-[#EEF5E6] flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#8FC87A] border border-[#BDC3C7] rounded-[32px] mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <svg className="w-10 h-10 text-[#2D3436]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.35A3.001 3.001 0 0112 20.4a3.001 3.001 0 01-2.121-.872l-.347-.347z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[#2D3436] mb-2">迷思概念診斷系統</h1>
        <p className="text-lg text-[#636E72]">以「溫度與熱」單元為例</p>
        <div className="mt-3 inline-block bg-[#C8EAAE] border border-[#BDC3C7] text-[#3D5A3E] text-sm px-4 py-1 rounded-full font-medium">
          國小自然科學 · 因材網對應
        </div>
      </div>

      {/* Role Cards */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* Teacher Card */}
        <button
          onClick={() => handleSelect('teacher')}
          className="flex-1 bg-white border border-[#BDC3C7] rounded-[32px] p-8 text-left hover:bg-[#EEF5E6] transition-all duration-200 group shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          <div className="w-14 h-14 bg-[#C8EAAE] border border-[#BDC3C7] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#8FC87A] transition-colors">
            <svg className="w-8 h-8 text-[#3D5A3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#2D3436] mb-2">我是老師</h2>
          <p className="text-[#636E72] text-sm leading-relaxed mb-5">
            出題診斷卷、查看班級迷思分佈、獲得教學建議
          </p>
          <div className="space-y-2">
            {['引導式 2 步出題精靈', '一鍵使用推薦題組', '班級迷思熱點矩陣', '教學行動建議'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#636E72]">
                <span className="w-1.5 h-1.5 bg-[#8FC87A] rounded-full flex-shrink-0"></span>
                {f}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center text-[#3D5A3E] font-semibold text-sm">
            進入教師端
            <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Student Card */}
        <button
          onClick={() => handleSelect('student')}
          className="flex-1 bg-white border border-[#BDC3C7] rounded-[32px] p-8 text-left hover:bg-[#EEF5E6] transition-all duration-200 group shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          <div className="w-14 h-14 bg-[#BADDF4] border border-[#BDC3C7] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#5DADE2] transition-colors">
            <svg className="w-8 h-8 text-[#2E86C1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#2D3436] mb-2">我是學生</h2>
          <p className="text-[#636E72] text-sm leading-relaxed mb-5">
            與虛擬導師對話，探索自己的科學思維
          </p>
          <div className="space-y-2">
            {['對話式情境作答', '不顯示 ABCD 選項', '循序探索科學概念', '個人學習體檢表'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#636E72]">
                <span className="w-1.5 h-1.5 bg-[#5DADE2] rounded-full flex-shrink-0"></span>
                {f}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center text-[#2E86C1] font-semibold text-sm">
            開始診斷
            <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      <p className="mt-10 text-[#95A5A6] text-sm">溫度與熱單元 · INa-Ⅲ-8-01 至 INa-Ⅲ-8-08</p>
    </div>
  );
}
