import { LayoutDashboard, ShieldAlert, Terminal, Palette, Sliders, Activity, Timer } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  deviceName: string;
  onConnect: () => void;
  userMode: 'guest' | 'dev';
  onOpenModeModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  deviceName,
  onConnect,
  userMode,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, mobileLabel: 'Home' },
    { id: 'typing-test', label: 'Typing Test', icon: Timer, mobileLabel: 'Typing' },
    { id: 'rgb', label: 'RGB Lighting', icon: Palette, mobileLabel: 'RGB' },
    { id: 'settings', label: 'Hardware Settings', icon: Sliders, mobileLabel: 'Settings' },
    { id: 'switch-tester', label: 'Switch & PRate Test', icon: Activity, mobileLabel: 'Tester' },
    ...(userMode === 'dev'
      ? [{ id: 'backup', label: 'Backup & Recovery', icon: ShieldAlert, mobileLabel: 'Backup' }]
      : []),
    { id: 'logs', label: 'Diagnostics', icon: Terminal, mobileLabel: 'Logs' },
  ];

  const displayDeviceName =
    !deviceName || deviceName.toLowerCase() === 'gaming keyboard'
      ? 'LEOBOG Hi75c Pro'
      : deviceName;

  return (
    <>
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex w-60 bg-[#070707] border-r border-[#181818] flex-col justify-between p-6 shrink-0 min-h-screen">
        <div className="space-y-8">
          {/* Top Logo */}
          <div className="px-1 pt-1">
            <h1 className="font-bold text-lg text-white tracking-tight">
              Open <span className="text-[10px] text-zinc-500 font-mono font-normal ml-1">/ LEOBOG</span>
            </h1>
          </div>

          {/* CONNECTED DEVICE Card */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-medium">
              CONNECTED DEVICE
            </div>

            <div
              onClick={onConnect}
              className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-xl p-3.5 cursor-pointer transition-all space-y-1 group"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
                      : 'bg-zinc-600'
                  }`}
                />
                <span className="text-xs font-semibold text-white group-hover:text-white truncate">
                  {isConnected ? displayDeviceName : 'LEOBOG Hi75c Pro'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 pl-4 font-normal">
                {isConnected ? `${displayDeviceName} - Connected` : 'Click to Connect'}
              </p>
            </div>
          </div>

          {/* Navigation List */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2.5 group cursor-pointer ${
                    isActive
                      ? 'bg-[#1a1a1a] text-white font-semibold border border-[#2a2a2a] shadow-sm'
                      : 'text-zinc-400 hover:text-white font-medium hover:bg-[#121212]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Visible only on portrait / mobile screens < md) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0c]/95 backdrop-blur-xl border-t border-[#222222] px-1 py-1.5 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-zinc-500 hover:text-zinc-300 font-medium'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-zinc-500'
                }`}
              />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.mobileLabel}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
