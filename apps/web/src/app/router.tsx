import { getTool, type Tool } from '@omnitool/tools-registry';
import { createRootRoute, createRoute, createRouter, notFound } from '@tanstack/react-router';
import type { ComponentType } from 'react';
import { useDocumentMeta } from '@/lib/document-meta';
import { validateSharedSearch } from '@/lib/search-params';
import { loadTool } from '@/lib/tool-modules';
import { AboutPage } from '@/pages/about';
import { HomePage } from '@/pages/home';
import { NotFoundPage } from '@/pages/not-found';
import { PlannedToolPage } from '@/pages/planned-tool';
import { PrivacyPage } from '@/pages/privacy';
import { ToolErrorPage, ToolPendingPage } from '@/pages/tool-error';
import { AppShell } from '@/shell/app-shell';

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
  validateSearch: validateSharedSearch,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});

const toolRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tools/$toolId',
  loader: async ({ params }) => {
    const tool = getTool(params.toolId);
    if (!tool) throw notFound();
    const loader = loadTool(tool.id);
    if (!loader) return { tool, ToolComponent: null };
    const module = await loader();
    return { tool, ToolComponent: module.default };
  },
  component: ToolRoute,
  errorComponent: ({ error }) => <ToolErrorPage error={error} />,
  pendingComponent: ToolPendingPage,
});

function ToolRoute() {
  const { tool, ToolComponent } = toolRoute.useLoaderData();
  if (!ToolComponent) return <PlannedToolPage tool={tool} />;

  return <BuiltToolRoute tool={tool} ToolComponent={ToolComponent} />;
}

function BuiltToolRoute({
  tool,
  ToolComponent,
}: {
  readonly tool: Tool;
  readonly ToolComponent: ComponentType;
}) {
  useDocumentMeta(
    `${tool.name} — Omnitool`,
    tool.description || `${tool.name} is a local-only browser tool from Omnitool.`,
  );

  return <ToolComponent />;
}

const routeTree = rootRoute.addChildren([homeRoute, privacyRoute, aboutRoute, toolRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  defaultPendingMs: 150,
  defaultPendingMinMs: 300,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
