import Link from 'next/link';

export default function EmailsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="flex gap-4 mb-6">
        <Link
          href="/admin/emails/settings"
          className="text-netflix-light hover:text-white text-sm"
        >
          Config. E-mail
        </Link>
        <Link
          href="/admin/emails/templates"
          className="text-netflix-light hover:text-white text-sm"
        >
          Templates
        </Link>
      </div>
      {children}
    </div>
  );
}
