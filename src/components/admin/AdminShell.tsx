'use client';

import { AdminSidebar } from './AdminSidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B1120]">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen py-8 px-4 sm:px-6 lg:px-10 pt-20 lg:pt-10 transition-[margin] duration-200 ease-out">
        {children}
      </main>
    </div>
  );
}
