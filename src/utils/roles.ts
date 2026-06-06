import type { AuthUser } from '../types';

export type CRMRole = 'super_admin' | 'admin' | 'staff' | 'technician' | 'blog_user';

export const BLOG_USER_ROLE: CRMRole = 'blog_user';

export const BLOG_CMS_ROUTES = [
  '/blog',
  '/blog/list',
  '/blog/create',
  '/blog/categories',
] as const;

export function getUserRole(user: AuthUser | null | undefined): CRMRole | null {
  if (!user) return null;
  if (user.role) return user.role;
  if (user.is_superuser) return 'super_admin';
  if (user.is_staff) return 'staff';
  return null;
}

export function isBlogUser(user: AuthUser | null | undefined): boolean {
  return getUserRole(user) === BLOG_USER_ROLE;
}

export function isPricingAdmin(user: AuthUser | null | undefined): boolean {
  const role = getUserRole(user);
  return role === 'super_admin' || role === 'admin';
}

export function isCRMOperationalUser(user: AuthUser | null | undefined): boolean {
  const role = getUserRole(user);
  return (
    role === 'super_admin' ||
    role === 'admin' ||
    role === 'staff' ||
    role === 'technician'
  );
}

export function isBlogCMSRoute(pathname: string): boolean {
  return (
    pathname === '/blog' ||
    pathname.startsWith('/blog/list') ||
    pathname.startsWith('/blog/create') ||
    pathname.startsWith('/blog/edit/') ||
    pathname.startsWith('/blog/categories')
  );
}

export function blogUserDefaultPath(): string {
  return '/blog';
}
