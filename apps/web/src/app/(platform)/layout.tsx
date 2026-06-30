import { Topbar }  from '@/components/ui/Topbar';
import { Sidebar } from '@/components/ui/Sidebar';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <div className="platform-main" style={{ display: 'flex', height: 'calc(100vh - 44px)' }}>
        <div className="platform-sidebar"><Sidebar /></div>
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </>
  );
}
