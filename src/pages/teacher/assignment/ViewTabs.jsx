import { Icon } from '../../../components/ui/woodKit';

/**
 * 派題管理雙視角 Tab 切換器（spec-02 §2.6）
 * - 題組視角：每題一張卡，內含班級進度
 * - 班級視角：每班一張卡，內含題組進度
 */
export default function ViewTabs({ value, onChange }) {
  const tabs = [
    {
      id: 'quiz',
      label: '題組視角',
      sub: '看每份題組派給了誰',
      icon: 'edit_note',
      activeColor: '#5C8A2E',
      activeBg: '#E4F1CE',
    },
    {
      id: 'class',
      label: '班級視角',
      sub: '看每個班被派了什麼',
      icon: 'group',
      activeColor: '#1F7A8C',
      activeBg: '#D4ECF1',
    },
  ];

  return (
    <div
      className="inline-flex p-1 bg-white border border-[#BDC3C7] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] gap-1"
      role="tablist"
      aria-label="派題管理視角切換"
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors"
            style={
              active
                ? { backgroundColor: tab.activeBg, color: tab.activeColor }
                : { color: '#636E72' }
            }
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.backgroundColor = '#F4F5F5';
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.backgroundColor = '';
            }}
          >
            <Icon name={tab.icon} className="text-lg flex-shrink-0" />
            <span className="text-sm font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
