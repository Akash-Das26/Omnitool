import { CATEGORIES, type CategoryId } from '@omnitool/tools-registry';
import {
  CalculatorIcon,
  CodeIcon,
  FileTextIcon,
  FlaskConicalIcon,
  ImageIcon,
  type LucideIcon,
  MusicIcon,
  PaletteIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PrinterIcon,
  Share2Icon,
  TerminalIcon,
  TypeIcon,
  WrenchIcon,
} from 'lucide-react';
import { Link, useRouterState } from '@/lib/navigation';
import { useUiStore } from '@/lib/stores';
import { isToolImplemented } from '@/lib/tool-modules';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  colour: PaletteIcon,
  'img-assets': ImageIcon,
  'social-media': Share2Icon,
  'audio-video': MusicIcon,
  pdf: FileTextIcon,
  'print-production': PrinterIcon,
  'typo-text': TypeIcon,
  'dev-tools': CodeIcon,
  'other-tools': WrenchIcon,
  calculators: CalculatorIcon,
  'turbo-nerd': TerminalIcon,
  experiments: FlaskConicalIcon,
};

export function Rail() {
  const collapsed = useUiStore((state) => state.railCollapsed);
  const toggleRail = useUiStore((state) => state.toggleRail);
  const search = useRouterState({ select: (state) => state.location.search }) as Record<
    string,
    unknown
  >;
  const active = typeof search.category === 'string' ? search.category : null;

  return (
    <aside
      aria-label="Tool categories"
      className={cn(
        'sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 flex-col border-r border-border bg-background transition-[width] md:flex',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <nav className="flex-1 overflow-y-auto p-2">
        {!collapsed ? <p className="px-2 pb-1 text-xs text-muted-foreground">Available</p> : null}
        <ul className="space-y-0.5">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.id];
            const available = category.tools.filter((tool) => isToolImplemented(tool.id)).length;
            const planned = category.tools.length - available;
            return (
              <li key={category.id}>
                <Link
                  to="/"
                  search={{ category: category.id }}
                  title={category.name}
                  aria-current={active === category.id ? 'page' : undefined}
                  className={cn(
                    'flex min-h-10 items-center gap-2 rounded-control px-2 text-sm hover:bg-surface-hover',
                    active === category.id && 'bg-surface-hover font-medium',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  {collapsed ? (
                    <span className="sr-only">
                      {category.name} {available} available, {planned} planned
                    </span>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 break-words">{category.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {available}
                        <span className="sr-only"> available, {planned} planned</span>
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-2">
        {!collapsed ? (
          <nav aria-label="About Omnitool" className="mb-2 space-y-0.5 text-sm">
            <Link to="/privacy" className="block rounded-control px-2 py-2 hover:bg-surface-hover">
              Privacy
            </Link>
            <Link to="/about" className="block rounded-control px-2 py-2 hover:bg-surface-hover">
              Acknowledgements
            </Link>
          </nav>
        ) : null}
        <button
          type="button"
          onClick={toggleRail}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand category rail' : 'Collapse category rail'}
          className="flex min-h-10 w-full items-center justify-center rounded-control text-muted-foreground hover:bg-surface-hover"
        >
          {collapsed ? (
            <PanelLeftOpenIcon aria-hidden="true" className="size-4" />
          ) : (
            <>
              <PanelLeftCloseIcon aria-hidden="true" className="size-4" />
              <span className="ml-2 text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
