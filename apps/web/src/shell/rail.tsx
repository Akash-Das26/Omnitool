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
        <ul className="space-y-0.5">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.id];
            return (
              <li key={category.id}>
                <Link
                  to="/"
                  search={{ category: category.id }}
                  title={category.name}
                  aria-current={active === category.id ? 'page' : undefined}
                  className={cn(
                    'flex min-h-10 items-center gap-2 rounded-control px-2 text-sm hover:bg-muted',
                    active === category.id && 'bg-muted font-medium',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  {collapsed ? (
                    <span className="sr-only">{category.name}</span>
                  ) : (
                    <>
                      <span className="truncate">{category.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {category.tools.length}
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
            <Link to="/privacy" className="block rounded-control px-2 py-2 hover:bg-muted">
              Privacy
            </Link>
            <Link to="/about" className="block rounded-control px-2 py-2 hover:bg-muted">
              Acknowledgements
            </Link>
          </nav>
        ) : null}
        <button
          type="button"
          onClick={toggleRail}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand category rail' : 'Collapse category rail'}
          className="flex min-h-10 w-full items-center justify-center rounded-control text-muted-foreground hover:bg-muted"
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
