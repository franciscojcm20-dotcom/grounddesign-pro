import { Topbar }          from '@/components/ui/Topbar';
import { Sidebar }         from '@/components/ui/Sidebar';
import { Breadcrumb }      from '@/components/ui/Breadcrumb';
import { ModulesSidebar }  from '@/components/ui/ModulesSidebar';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <div className="platform-main" style={{ display: 'flex', height: 'calc(100vh - 44px)' }}>
        <div className="platform-sidebar"><Sidebar /></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Breadcrumb />
          <main style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
      <ModulesSidebar />
    </>
  );
}
