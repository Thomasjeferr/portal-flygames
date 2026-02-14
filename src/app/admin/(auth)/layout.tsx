export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="pt-16 min-h-screen bg-netflix-black">{children}</div>;
}
