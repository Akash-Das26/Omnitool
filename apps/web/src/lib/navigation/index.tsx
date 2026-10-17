/**
 * The only module the app imports routing from (ADR 0002). Keeping the router
 * behind this seam means a future swap does not touch pages or tools.
 */
export {
  Link,
  Outlet,
  RouterProvider,
  useNavigate,
  useParams,
  useRouterState,
  useSearch,
} from '@tanstack/react-router';

import { useRouterState } from '@tanstack/react-router';

export function usePathname(): string {
  return useRouterState({ select: (state) => state.location.pathname });
}
