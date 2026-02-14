'use client';

import { AdminSidebar } from './AdminSidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-netflix-black">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen py-8 px-4 sm:px-6 lg:px-10 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
