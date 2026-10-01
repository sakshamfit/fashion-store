"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/store/cards";
import { products, categories, type Product } from "@/lib/catalog";

const types = [
  "All",
  "Bomber",
  "Jacket",
  "Hoodie",
  "Trousers",
  "Knitwear",
  "Tops",
];
const sorts = ["featured", "low", "high", "name"];

export default function CollectionPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell" id="main">
          <h1 className="page-title">The collection.</h1>
        </main>
      }
    >
      <Catalog />
    </Suspense>
  );
}

function Catalog() {
  const params = useSearchParams();
  const router = useRouter();
  const tabs = useRef<HTMLDivElement>(null);
  // The URL is the source of truth: filters survive reloads and shared links.
  const categoryParam = params.get("category") || "All";
  const typeParam = params.get("type") || "All";
  const sortParam = params.get("sort") || "featured";
  const category = categories.includes(categoryParam) ? categoryParam : "All";
  const type = types.includes(typeParam) ? typeParam : "All";
  const sort = sorts.includes(sortParam) ? sortParam : "featured";
  const filtered = products
    .filter(
      (product) =>
        (category === "All" || product.category === category) &&
        (type === "All" || product.type === type),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : 0,
    );

  function updateFilters(next: {
    category?: string;
    type?: string;
    sort?: string;
  }) {
    const values = { category, type, sort, ...next };
    const query = new URLSearchParams();
    if (values.category !== "All") query.set("category", values.category);
    if (values.type !== "All") query.set("type", values.type);
    if (values.sort !== "featured") query.set("sort", values.sort);
    const search = query.toString();
    router.replace(`/collection${search ? `?${search}` : ""}`, {
      scroll: false,
    });
  }

  useEffect(() => {
    const row = tabs.current;
    const active = row?.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]',
    );
    if (!row || !active) return;
    // Only scroll the filter row, not the whole page when a filter changes.
    const edge = row.getBoundingClientRect();
    const selected = active.getBoundingClientRect();
    if (selected.left < edge.left) row.scrollLeft += selected.left - edge.left;
    else if (selected.right > edge.right)
      row.scrollLeft += selected.right - edge.right;
  }, [category]);

  return (
    <main id="main" className="page-shell">
      <div className="page-intro">
        <div>
          <p className="eyebrow">VYRN / THE EDIT</p>
          <h1 className="page-title">
            {category === "All" ? "The collection." : `${category}.`}
          </h1>
        </div>
        <p>
          Considered forms. Everyday freedom.
          <br />
          Find the pieces that feel like you.
        </p>
      </div>
      <div className="catalog-controls">
        <div
          ref={tabs}
          className="category-tabs"
          role="group"
          aria-label="Filter category"
        >
          {["All", ...categories].map((value) => (
            <button
              key={value}
              aria-pressed={category === value}
              onClick={() => updateFilters({ category: value, type: "All" })}
            >
              {value === "All" ? "All pieces" : value}
            </button>
          ))}
        </div>
        <Select
          value={type}
          onValueChange={(value) => updateFilters({ type: value })}
        >
          <SelectTrigger className="catalog-select" aria-label="Product type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((value) => (
              <SelectItem value={value} key={value}>
                {value === "All" ? "All types" : value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => updateFilters({ sort: value })}
        >
          <SelectTrigger className="catalog-select" aria-label="Sort products">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="low">Price: low to high</SelectItem>
            <SelectItem value="high">Price: high to low</SelectItem>
            <SelectItem value="name">Name: A–Z</SelectItem>
          </SelectContent>
        </Select>
        <span className="catalog-count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        </span>
      </div>
      <CatalogResults
        key={`${category}/${type}/${sort}`}
        filtered={filtered}
        reset={() =>
          updateFilters({ category: "All", type: "All", sort: "featured" })
        }
      />
      <p className="preview-note">
        Private collection preview. Products, prices and availability are
        illustrative until launch.
      </p>
    </main>
  );
}

function CatalogResults({
  filtered,
  reset,
}: {
  filtered: Product[];
  reset: () => void;
}) {
  const [limit, setLimit] = useState(8);
  return (
    <>
      <div className="catalog-grid">
        {filtered.slice(0, limit).map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-results">
          <p>No pieces in this combination.</p>
          <button className="underlink" onClick={reset}>
            Reset filters
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <button
          className="button secondary load-more"
          onClick={() => setLimit((value) => value + 8)}
        >
          Show more pieces ({filtered.length - limit})
        </button>
      )}
    </>
  );
}
