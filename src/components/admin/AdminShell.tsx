'use client';

import { AdminSidebar } from './AdminSidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-netflix-black">
      <AdminSidebar />
      <main className="ml-64 min-h-screen py-8 px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}
