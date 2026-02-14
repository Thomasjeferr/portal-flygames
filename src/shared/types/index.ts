// Tipos compartilhados para web e futuro app mobile

export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface GameDto {
  id: string;
  title: string;
  slug: string;
  championship: string;
  gameDate: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  featured: boolean;
}

export interface SubscriptionDto {
  active: boolean;
  endDate: string;
}

export interface AuthResponse {
  user: UserPublic;
  token?: string;
}
