import { Link } from '@/lib/navigation';

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-6 text-sm text-muted-foreground md:px-8">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-4 gap-y-2">
        <p>Runs entirely in your browser. No accounts, no tracking.</p>
        <nav aria-label="Footer" className="ml-auto flex gap-4">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/about" className="hover:text-foreground">
            Acknowledgements
          </Link>
        </nav>
      </div>
    </footer>
  );
}
