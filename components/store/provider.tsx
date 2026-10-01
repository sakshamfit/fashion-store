"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  MouseEvent,
  ComponentProps,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ShoppingBag,
  Menu,
  Minus,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Line,
  lineKey,
  categories,
  products,
  getProduct,
  subtotal,
  money,
} from "@/lib/catalog";
import { SourceImage, Model } from "./image";
import { OpeningSequence } from "./opening";
import { useMediaQuery } from "@/hooks/use-media-query";
type Shop = {
  lines: Line[];
  busy: boolean;
  ready: boolean;
  paymentReady: boolean;
  cartError: string;
  retryCart: () => void;
  add: (l: Line) => Promise<boolean>;
  change: (l: Line, q: number) => Promise<void>;
  openCart: () => void;
  quick: (id: string) => void;
  go: (url: string) => void;
};
const Context = createContext<Shop>(null!);
export const useShop = () => useContext(Context);
type GoProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  transition?: boolean;
};
export function Go({
  href,
  children,
  className = "",
  transition = false,
  onClick,
  ...rest
}: GoProps) {
  const shop = useShop();
  return (
    <Link
      href={href}
      className={className}
      {...rest}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          (rest.target && rest.target !== "_self")
        )
          return;
        if (href.includes("#")) {
          const [path, hash] = href.split("#");
          if (!path || path === window.location.pathname) {
            const target = document.getElementById(hash);
            if (target) {
              event.preventDefault();
              history.replaceState(history.state, "", href);
              target.scrollIntoView({
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              });
              return;
            }
          }
        }
        if (transition) {
          event.preventDefault();
          shop.go(href);
        }
      }}
    >
      {children}
    </Link>
  );
}
/** Alternate image masks by their layout column, not an animated rectangle. */
function revealFrom(element: HTMLElement) {
  const siblings = Array.from(element.parentElement?.children || []).filter(
    (sibling): sibling is HTMLElement =>
      sibling instanceof HTMLElement &&
      sibling !== element &&
      Math.abs(sibling.offsetTop - element.offsetTop) < 8,
  );
  if (siblings.length)
    return siblings.filter((sibling) => sibling.offsetLeft < element.offsetLeft)
      .length % 2
      ? "bottom"
      : "top";
  const bounds = element.getBoundingClientRect();
  return bounds.left + bounds.width / 2 < window.innerWidth / 2
    ? "top"
    : "bottom";
}
function restoreFocus(event: Event, target: HTMLElement | null) {
  if (!target?.isConnected) return;
  event.preventDefault();
  target.focus({ preventScroll: true });
}
function focusPageHeading() {
  const heading = document.querySelector<HTMLElement>("main h1");
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}
async function requestCart(signal?: AbortSignal) {
  const response = await fetch("/api/cart", { signal, cache: "no-store" });
  if (!response.ok) throw Error("Bag storage unavailable");
  return response.json() as Promise<{ lines: Line[] }>;
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [lines, setLines] = useState<Line[]>([]),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [cartError, setCartError] = useState(""),
    [paymentReady, setPaymentReady] = useState(false),
    [cart, setCart] = useState(false),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [quickId, setQuickId] = useState<string | null>(null),
    [size, setSize] = useState(""),
    [tiles, setTiles] = useState(false),
    [dark, setDark] = useState(false),
    [compact, setCompact] = useState(false),
    [categoryCover, setCategoryCover] = useState<number | null>(null);
  const pathname = usePathname(),
    router = useRouter(),
    lock = useRef(false),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const quickProduct = getProduct(quickId || "");
  const [overlayPath, setOverlayPath] = useState(pathname);
  const menuTrigger = useRef<HTMLButtonElement | null>(null),
    searchTrigger = useRef<HTMLButtonElement>(null),
    cartTrigger = useRef<HTMLButtonElement>(null),
    quickTrigger = useRef<HTMLElement | null>(null);
  // These are route-local UI states, not effects synchronizing an external system.
  if (overlayPath !== pathname) {
    setOverlayPath(pathname);
    setMenu(false);
    setSearch(false);
    setCart(false);
    setQuickId(null);
  }
  const retryCart = () => {
    setCartError("");
    requestCart()
      .then((data) => {
        setLines(data.lines);
        setReady(true);
      })
      .catch(() => {
        setReady(false);
        setCartError("Your bag is temporarily unavailable. Please try again.");
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    requestCart(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setLines(data.lines);
        setReady(true);
        setCartError("");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setReady(false);
        setCartError("Your bag is temporarily unavailable. Please try again.");
      });
    fetch("/api/store", { signal: controller.signal })
      .then((response) => response.json() as Promise<{ paymentReady: boolean }>)
      .then((data) => {
        if (!controller.signal.aborted) setPaymentReady(data.paymentReady);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const jobs = timers.current;
    return () => jobs.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (window.location.hash) {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      timers.current.push(
        setTimeout(
          () =>
            document
              .getElementById(hash)
              ?.scrollIntoView({ behavior: "instant" }),
          120,
        ),
      );
    }
  }, [pathname]);
  useEffect(() => {
    let pending = false;
    const update = () => {
      pending = false;
      setCompact(window.scrollY > 50);
      const sections = Array.from(
        document.querySelectorAll('[data-theme="dark"]'),
      );
      setDark(
        sections.some((el) => {
          const r = el.getBoundingClientRect();
          return r.top < 65 && r.bottom > 65;
        }),
      );
    };
    const scroll = () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", scroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", scroll);
  }, [pathname]);
  useEffect(() => {
    const observed = new WeakSet<Element>();
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          if (reducedMotion) return;
          const image =
            el.matches(".source-image,img,.featured,.product-card") ||
            el.dataset.reveal === "mask" ||
            el.dataset.reveal === "tile";
          const mode =
            el.dataset.reveal === "line" ? "line" : image ? "image" : "rise";
          const delay = Number(el.dataset.delay || 0),
            easing = "cubic-bezier(.22,.7,.15,1)";
          if (mode === "image") {
            const top = (el.dataset.from || revealFrom(el)) === "top";
            animations.push(
              el.animate(
                [
                  {
                    clipPath: top ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)",
                    transform: `translateY(${top ? -44 : 44}px)`,
                  },
                  { clipPath: "inset(0)", transform: "translateY(0)" },
                ],
                { duration: 1050, delay, easing, fill: "backwards" },
              ),
            );
            const media = el.matches("img") ? null : el.querySelector("img");
            if (media)
              animations.push(
                media.animate(
                  [
                    { transform: `translateY(${top ? -6 : 6}%) scale(1.14)` },
                    { transform: "none" },
                  ],
                  {
                    duration: 1500,
                    delay,
                    easing: "cubic-bezier(.16,1,.3,1)",
                    fill: "backwards",
                  },
                ),
              );
            return;
          }
          const frames =
            mode === "line"
              ? [
                  { clipPath: "inset(0 100% 0 0)", opacity: 0.2 },
                  { clipPath: "inset(0)", opacity: 1 },
                ]
              : [
                  { opacity: 0, transform: "translateY(28px)" },
                  { opacity: 1, transform: "translateY(0)" },
                ];
          animations.push(
            el.animate(frames, {
              duration: mode === "line" ? 800 : 650,
              delay,
              easing,
              fill: "backwards",
            }),
          );
        }),
      { threshold: 0, rootMargin: "0px 0px -24px 0px" },
    );
    const attach = () =>
      document.querySelectorAll(".reveal").forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          observer.observe(el);
        }
      });
    attach();
    const mo = new MutationObserver(attach);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mo.disconnect();
      animations.forEach((a) => a.cancel());
    };
  }, [pathname, reducedMotion]);
  const mutate = async (action: string, line: Line) => {
    if (lock.current || !ready) return false;
    lock.current = true;
    setBusy(true);
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, line }),
      });
      const d = (await r.json()) as { error?: string; lines: Line[] };
      if (!r.ok) throw Error(d.error);
      setLines(d.lines);
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Your bag could not be saved. Please try again.",
      );
      return false;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const add = async (l: Line) => {
    const ok = await mutate("add", l);
    if (ok) {
      setQuickId(null);
      setCart(true);
      toast.success("Added to your bag");
    }
    return ok;
  };
  const change = async (l: Line, q: number) => {
    await mutate("set", { ...l, quantity: q });
  };
  const go = (url: string) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(url);
      return;
    }
    if (tiles) return;
    const selected = new URL(url, window.location.origin).searchParams.get(
      "category",
    );
    setCategoryCover(selected ? categories.indexOf(selected) : null);
    setTiles(true);
    timers.current.push(
      setTimeout(() => {
        router.push(url);
        window.scrollTo({ top: 0, behavior: "instant" });
      }, 370),
    );
    timers.current.push(
      setTimeout(() => {
        setTiles(false);
        setCategoryCover(null);
        focusPageHeading();
      }, 1050),
    );
  };
  const quick = (id: string) => {
    quickTrigger.current = document.activeElement as HTMLElement;
    setSize("");
    setQuickId(id);
  };
  useEffect(() => {
    const mc = (
      document as Document & {
        modelContext?: {
          registerTool: (t: unknown, o: unknown) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!mc) return;
    const ctrl = new AbortController();
    Promise.resolve(
      mc.registerTool(
        {
          name: "search_vyrn_products",
          description: "Read matching products in the VYRN preview catalog.",
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
            additionalProperties: false,
          },
          execute: ({ query }: { query: string }) => {
            if (typeof query !== "string" || query.length > 100)
              throw Error("Query must be a string of up to 100 characters");
            return products
              .filter((p) =>
                `${p.name} ${p.category}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map(({ id, name, price, color }) => ({
                id,
                name,
                price,
                currency: "EUR",
                color,
              }));
          },
        },
        { signal: ctrl.signal },
      ),
    ).catch(() => {});
    return () => ctrl.abort();
  }, []);
  const value = {
    lines,
    busy,
    ready,
    paymentReady,
    cartError,
    retryCart,
    add,
    change,
    openCart: () => setCart(true),
    quick,
    go,
  };
  return (
    <Context.Provider value={value}>
      {pathname === "/" && <OpeningSequence />}
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header
        className={`header ${dark ? "dark" : ""} ${compact ? "compact" : ""}`}
      >
        <button
          className="mobile-menu"
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={menu}
          onClick={(event) => {
            menuTrigger.current = event.currentTarget;
            setMenu(true);
          }}
        >
          <Menu size={20} />
        </button>
        <nav className="nav-left" aria-label="Main navigation">
          <Go href="/collection">Shop</Go>
          <Go href="/#collection">Collections</Go>
          <Go href="/journal">Journal</Go>
        </nav>
        <Go href="/" className="wordmark" aria-label="VYRN home">
          VYRN<span>®</span>
        </Go>
        <div className="nav-right">
          <Go className="about-link" href="/info/about">
            About
          </Go>
          <button
            ref={searchTrigger}
            className="search-trigger"
            aria-label="Search products"
            aria-haspopup="dialog"
            aria-expanded={search}
            onClick={() => setSearch(true)}
          >
            <Search size={18} />
          </button>
          <button
            className="account-link"
            aria-label="Your account"
            onClick={() => router.push("/info/account")}
          >
            <UserRound size={17} />
          </button>
          <button
            ref={cartTrigger}
            aria-label={`Open shopping bag, ${lines.reduce((a, l) => a + l.quantity, 0)} items`}
            aria-haspopup="dialog"
            aria-expanded={cart}
            onClick={() => setCart(true)}
          >
            <ShoppingBag size={18} />
            <span className="bag-count">
              {lines.reduce((a, l) => a + l.quantity, 0)}
            </span>
          </button>
          <button
            className="desktop-menu"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menu}
            onClick={(event) => {
              menuTrigger.current = event.currentTarget;
              setMenu(true);
            }}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      {children}
      <Footer />
      <Sheet open={cart} onOpenChange={setCart}>
        <SheetContent
          className="cart-sheet"
          onCloseAutoFocus={(event) => {
            if (!menu && !search && !quickId)
              restoreFocus(event, cartTrigger.current);
          }}
        >
          <SheetHeader>
            <SheetTitle>
              Your bag{" "}
              <span className="muted">
                ({lines.reduce((a, l) => a + l.quantity, 0)})
              </span>
            </SheetTitle>
            <SheetDescription>
              Considered pieces. Collected by you.
            </SheetDescription>
          </SheetHeader>
          <div className="bag-lines">
            {!ready ? (
              cartError ? (
                <div className="bag-error">
                  <p role="alert">{cartError}</p>
                  <button className="button secondary" onClick={retryCart}>
                    Try again
                  </button>
                  <Go href="/collection" className="underlink">
                    Keep exploring
                  </Go>
                </div>
              ) : (
                <p role="status">Loading your bag…</p>
              )
            ) : !lines.length ? (
              <div className="empty-bag">
                <ShoppingBag size={42} strokeWidth={1} />
                <h3>A little room for something new.</h3>
                <button
                  className="button"
                  onClick={() => {
                    setCart(false);
                    router.push("/collection");
                  }}
                >
                  Explore the collection
                </button>
              </div>
            ) : (
              lines.map((l) => {
                const p = getProduct(l.id)!;
                return (
                  <article className="bag-line" key={lineKey(l)}>
                    <Go href={`/product/${p.id}`}>
                      <SourceImage crop={p.image} alt={p.name} />
                    </Go>
                    <div>
                      <Go href={`/product/${p.id}`}>{p.name}</Go>
                      <p className="muted">
                        {l.color} / {l.size}
                      </p>
                      <b>{money(p.price)}</b>
                      <div className="quantity">
                        <button
                          aria-label={`Decrease ${p.name} quantity`}
                          disabled={busy}
                          onClick={() => change(l, l.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{l.quantity}</span>
                        <button
                          aria-label={`Increase ${p.name} quantity`}
                          disabled={busy || l.quantity >= p.stock}
                          onClick={() => change(l, l.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          aria-label={`Remove ${p.name}`}
                          disabled={busy}
                          onClick={() => change(l, 0)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          {lines.length > 0 && (
            <div className="bag-total">
              <p>
                <span>Subtotal</span>
                <b>{money(subtotal(lines))}</b>
              </p>
              <p className="muted">Shipping calculated at checkout.</p>
              <button
                className="button"
                disabled={busy}
                onClick={() => {
                  setCart(false);
                  router.push("/checkout");
                }}
              >
                Continue to checkout
              </button>
              <small>Private collection preview · illustrative prices</small>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent
          className="menu-sheet"
          onCloseAutoFocus={(event) => {
            if (!cart && !search && !quickId)
              restoreFocus(event, menuTrigger.current);
          }}
        >
          <SheetHeader>
            <SheetTitle>VYRN</SheetTitle>
            <SheetDescription>A wardrobe, on your terms.</SheetDescription>
          </SheetHeader>
          <nav>
            <button
              onClick={() => {
                setMenu(false);
                setSearch(true);
              }}
            >
              Search
            </button>
            {[
              ["Shop all", "/collection"],
              ["Collections", "/#collection"],
              ["VYRN Studio", "/#studio"],
              ["Journal", "/journal"],
              ["About", "/info/about"],
              ["Contact", "/info/contact"],
              ["Your VYRN", "/info/account"],
            ].map(([n, h]) => (
              <Go key={h} href={h} onClick={() => setMenu(false)}>
                {n}
              </Go>
            ))}
          </nav>
          <p className="mono">INDEPENDENT EXPRESSION. EVERY DAY.</p>
        </SheetContent>
      </Sheet>
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent
          className="search-dialog"
          onCloseAutoFocus={(event) => {
            if (!cart && !menu && !quickId)
              restoreFocus(event, searchTrigger.current);
          }}
        >
          <DialogTitle>Find your next essential.</DialogTitle>
          <DialogDescription>
            Search by product, style or category.
          </DialogDescription>
          <label className="search-field">
            <Search size={20} />
            <input
              autoFocus
              aria-label="Search the collection"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jackets, knitwear, hoodies…"
              inputMode="search"
              type="search"
              autoComplete="off"
            />
          </label>
          <div className="search-results">
            {products
              .filter((p) =>
                `${p.name} ${p.category} ${p.type}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => (
                <Go key={p.id} href={`/product/${p.id}`}>
                  <SourceImage crop={p.image} alt={p.name} />
                  <span>
                    {p.name}
                    <small>{p.color}</small>
                  </span>
                  <b>{money(p.price)}</b>
                </Go>
              ))}
            {!products.some((p) =>
              `${p.name} ${p.category} ${p.type}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && <p>No pieces match “{query}”. Try a different word.</p>}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!quickProduct}
        onOpenChange={(v) => !v && setQuickId(null)}
      >
        <DialogContent
          className="quick-dialog"
          onCloseAutoFocus={(event) => {
            if (!cart && !menu && !search)
              restoreFocus(event, quickTrigger.current);
          }}
        >
          <DialogTitle>{quickProduct?.name}</DialogTitle>
          <DialogDescription>
            Select your size to add this piece to your bag.
          </DialogDescription>
          <CartAvailability />
          {quickProduct && (
            <>
              <SourceImage crop={quickProduct.image} alt={quickProduct.name} />
              <div className="between">
                <span>{quickProduct.color}</span>
                <b>{money(quickProduct.price)}</b>
              </div>
              <div className="sizes" aria-label="Size">
                {quickProduct.sizes.map((s) => (
                  <button
                    key={s}
                    aria-pressed={size === s}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                className="button"
                disabled={!size || busy || !ready}
                onClick={() =>
                  add({
                    id: quickProduct.id,
                    size,
                    color: quickProduct.color,
                    quantity: 1,
                  })
                }
              >
                {busy ? "Adding…" : size ? "Add to bag" : "Select a size"}
              </button>
              <Go className="underlink" href={`/product/${quickProduct.id}`}>
                View full details
              </Go>
            </>
          )}
        </DialogContent>
      </Dialog>
      <div
        className={`tile-transition ${tiles ? "active" : ""}`}
        aria-hidden="true"
      >
        {Array.from({ length: 60 }, (_, i) => (
          <i
            key={i}
            style={{
              animationDelay: `${((i % 10) + Math.floor(i / 10)) * 17}ms`,
            }}
          />
        ))}
      </div>
      {categoryCover !== null && categoryCover >= 0 && (
        <div className="look-navigation" aria-hidden="true">
          <Model index={categoryCover} />
          <span className="mono">{categories[categoryCover]}</span>
        </div>
      )}
      <Toaster position="bottom-center" theme="light" />
    </Context.Provider>
  );
}
export function CartAvailability() {
  const { cartError, retryCart } = useShop();
  if (!cartError) return null;
  return (
    <p className="cart-unavailable" role="status">
      Bag storage is temporarily unavailable.
      <button type="button" onClick={retryCart}>
        Retry
      </button>
    </p>
  );
}
function Footer() {
  const [email, setEmail] = useState(""),
    [state, setState] = useState("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) throw Error();
      setState("done");
    } catch {
      setState("error");
    }
  };
  return (
    <footer data-theme="dark">
      <div className="footer-top">
        <div>
          <p className="eyebrow">STAY IN THE LOOP</p>
          <h2>
            First to know.
            <br />
            Always yourself.
          </h2>
        </div>
        <form onSubmit={submit}>
          {state === "done" ? (
            <p role="status">You’re on the list. Thank you for being here.</p>
          ) : (
            <>
              <label htmlFor="newsletter">
                Collection notes, new drops and studio stories.
              </label>
              <div className="newsletter">
                <input
                  id="newsletter"
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  required
                  maxLength={254}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                />
                <button disabled={state === "saving"}>
                  {state === "saving" ? "Joining…" : "Join the list"}
                </button>
              </div>
              <small>
                By subscribing, you agree to our{" "}
                <Go href="/info/privacy">privacy notice</Go>. Unsubscribe via
                our contact form.
              </small>
              {state === "error" && (
                <p role="alert">
                  We couldn’t save your email. Please try again.
                </p>
              )}
            </>
          )}
        </form>
      </div>
      <div className="footer-links">
        <span className="mono">
          INDEPENDENT EXPRESSION.
          <br />
          NO UNIFORM REQUIRED.
        </span>
        <div>
          {["Shop", "Journal", "About"].map((n, i) => (
            <Go key={n} href={["/collection", "/journal", "/info/about"][i]}>
              {n}
            </Go>
          ))}
        </div>
        <div>
          {["Contact", "FAQs", "Shipping", "Returns"].map((n) => (
            <Go key={n} href={`/info/${n.toLowerCase()}`}>
              {n}
            </Go>
          ))}
        </div>
        <div>
          <Go href="/info/privacy">Privacy</Go>
          <Go href="/info/terms">Terms</Go>
          <span>EUR / EN</span>
        </div>
      </div>
      <div className="footer-logo">
        VYRN<span>®</span>
      </div>
      <div className="footer-bottom">
        <span>© 2026 VYRN</span>
        <span>Designed for who you are.</span>
        <span className="footer-credit">
          Made by{" "}
          <a
            href="https://github.com/sakshamfit"
            target="_blank"
            rel="noopener noreferrer"
          >
            sakshamfit
          </a>
        </span>
        <Go href="#top">Back to top</Go>
      </div>
    </footer>
  );
}
