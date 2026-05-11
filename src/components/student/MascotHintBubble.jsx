import mascotImg from '../../assets/illustrations/scilens_mascot.png';

/* 吉祥物提示泡泡（spec-07 §12.4，禁用 owl GIF）
 * 放在對話欄容器內（父層需 position: relative），absolute 釘在 input bar 上方右側。
 * Issue #4：以前用 fixed 跨整個 viewport 會在兩欄佈局時跑版到情境側欄；
 * 改為 absolute 後跟著對話欄寬度走，永遠在送出按鈕上方。
 */
export default function MascotHintBubble({ feedback }) {
  return (
    <div className="hidden md:block absolute bottom-[88px] right-3 sm:right-5 z-20 pointer-events-none animate-fade-up">
      <div className="relative">
        <div className="absolute bottom-full right-0 mb-2 min-w-[160px] max-w-[240px]
                        rounded-[20px] bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                        border-2 border-[#C19A6B] px-4 py-3
                        shadow-[0_4px_0_-1px_#5A3E22,0_6px_10px_-3px_rgba(91,66,38,0.4)]">
          <div className="absolute bottom-[-7px] right-6 h-3 w-3 rotate-45
                          bg-[#FBE9C7] border-b-2 border-r-2 border-[#C19A6B]" />
          <p className="text-base font-bold leading-6 text-[#5A3E22]">{feedback}</p>
        </div>
        <img
          src={mascotImg}
          alt="吉祥物"
          className="h-14 w-14 sm:h-16 sm:w-16 object-contain animate-breath
                     drop-shadow-[0_4px_4px_rgba(91,66,38,0.3)]"
        />
      </div>
    </div>
  );
}
