import {
  test as base,
  expect,
  type Page,
  type Locator,
} from "@playwright/test";
import { getProduct, lineKey, type Line } from "../../lib/catalog";

// Never contact a merchant database or payment provider from UI regression tests.
const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          /hydration|hydrated/i.test(message.text())
        )
          errors.push(message.text());
      });
      await use(errors);
      expect(errors, "No client runtime or hydration errors").toEqual([]);
    },
    { auto: true },
  ],
});

async function mockStore(page: Page, initialLines: Line[] = []) {
  const lines = structuredClone(initialLines);
  await page.route("**/api/store", (route) =>
    route.fulfill({ json: { paymentReady: false } }),
  );
  await page.route("**/api/cart", async (route) => {
    if (route.request().method() === "POST") {
      const { action, line } = route.request().postDataJSON() as {
        action: string;
        line: Line;
      };
      const existing = lines.findIndex(
        (value) => lineKey(value) === lineKey(line),
      );
      if (action === "add") {
        if (existing < 0) lines.push(line);
        else lines[existing].quantity += line.quantity;
      } else if (existing >= 0) {
        if (line.quantity === 0) lines.splice(existing, 1);
        else lines[existing] = line;
      }
    }
    await route.fulfill({ json: { lines } });
  });
}

async function noHorizontalOverflow(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      { message: "The page must not scroll sideways" },
    )
    .toBeLessThanOrEqual(1);
}

async function withinViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

test.beforeEach(async ({ page }) => {
  await mockStore(page);
});

test("core routes fit the viewport and preserve the site credit", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/collection",
    "/product/hoodie-in-the-night",
    "/info/contact",
    "/journal",
    "/journal/form-and-function",
    "/checkout",
    "/order",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await noHorizontalOverflow(page);
    await expect(page.locator(".footer-credit")).toHaveText(
      "Made by sakshamfit",
    );
  }
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute(
    "content",
    /user-scalable=no|maximum-scale=1/,
  );
});

test("navigation has 44px targets and closes on route changes", async ({
  page,
}) => {
  await page.goto("/collection");
  for (const button of await page.locator("header button").all()) {
    if (!(await button.isVisible())) continue;
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const menu = page.getByRole("dialog");
  await withinViewport(page, menu);
  await expect(menu).toHaveCSS("overflow-y", "auto");
  await menu.getByRole("link", { name: "Your VYRN" }).scrollIntoViewIfNeeded();
  await menu.getByRole("link", { name: "Your VYRN" }).click();
  await expect(page).toHaveURL(/\/info\/account$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open menu", exact: true }),
  ).toBeFocused();
});

test("search is directly available on phones and results navigate", async ({
  page,
}) => {
  await page.goto("/collection");
  const trigger = page.getByRole("button", { name: "Search products" });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await withinViewport(page, dialog);
  const input = page.getByRole("searchbox", { name: "Search the collection" });
  await expect(input).toHaveCSS("font-size", "16px");
  await input.fill("oversized");
  const result = dialog.getByRole("link", { name: /Oversized hoodie/ });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/product\/oversized-hoodie$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await trigger.click();
  await input.fill("not-a-real-product");
  await expect(dialog.getByText(/No pieces match/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("filters and sorting survive reloads and invalid filters recover", async ({
  page,
}) => {
  await page.goto("/collection");
  await page.getByRole("button", { name: "Streetwear", exact: true }).click();
  await expect(page.locator(".catalog-grid .product-card")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Sort products" }).click();
  await page.getByRole("option", { name: "Price: low to high" }).click();
  await expect(page).toHaveURL(/sort=low/);
  await expect(
    page.locator(".catalog-grid .product-caption a").first(),
  ).toHaveText("Oversized hoodie");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Streetwear", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("combobox", { name: "Sort products" }),
  ).toContainText("Price: low to high");
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "Formal", exact: true }).click();
  await page.getByRole("combobox", { name: "Product type" }).click();
  await page.getByRole("option", { name: "Hoodie", exact: true }).click();
  await expect(page.getByText("No pieces in this combination.")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.locator(".catalog-grid .product-card")).toHaveCount(8);
  await page.getByRole("button", { name: /Show more pieces/ }).click();
  await expect(page.locator(".catalog-grid .product-card")).toHaveCount(11);
  await page.goto("/collection?category=invalid&type=invalid&sort=invalid");
  await expect(page.locator("main h1")).toHaveText("The collection.");
  await expect(page.locator(".catalog-grid .product-card")).toHaveCount(8);
});

test("category links are ready immediately for touch and reduced motion", async ({
  page,
}) => {
  await page.goto("/#categories");
  const section = page.locator("#categories");
  await expect(section).toHaveClass(/assembled/);
  await expect(page.locator(".brand-opening")).toHaveCount(0);
  const last = section.getByRole("link", { name: /Layered collection model/ });
  await last.scrollIntoViewIfNeeded();
  await last.click();
  await expect(page).toHaveURL(/\/collection\?category=Layered$/);
  await expect(page.locator("main h1")).toHaveText("Layered.");
  await expect(page.locator(".catalog-grid .product-card")).toHaveCount(1);
});

test("quick add, quantities and saved bag work in bounded dialogs", async ({
  page,
}) => {
  await page.goto("/collection");
  const quick = page.getByRole("button", {
    name: "Quick add Hooded down jacket",
    exact: true,
  });
  const box = await quick.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await quick.click();
  let dialog = page.getByRole("dialog");
  await withinViewport(page, dialog);
  await expect(
    dialog.getByRole("button", { name: "Select a size" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "M", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Add to bag", exact: true }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Add to bag", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Your bag");
  await withinViewport(page, dialog);
  await expect(dialog.locator(".bag-total")).toContainText("€320");
  await dialog
    .getByRole("button", { name: "Increase Hooded down jacket quantity" })
    .click();
  await expect(dialog.locator(".bag-total")).toContainText("€640");
  await page.reload();
  await page
    .getByRole("button", { name: "Open shopping bag, 2 items" })
    .click();
  await expect(page.getByRole("dialog").locator(".quantity span")).toHaveText(
    "2",
  );
  await page.getByRole("button", { name: "Remove Hooded down jacket" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "A little room for something new.",
  );
});

test("gallery, sizes and size guide work without narrow-screen overflow", async ({
  page,
}) => {
  await page.goto("/product/hoodie-in-the-night");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator(".main-product-image img")).toHaveAttribute(
    "src",
    /shell-back.webp/,
  );
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "Size guide", exact: true }).click();
  await withinViewport(page, page.getByRole("dialog"));
  await expect(page.getByRole("dialog")).toContainText(
    "Final garment measurements are not yet available.",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .locator(".product-info")
    .getByRole("button", { name: "L", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Increase quantity", exact: true })
    .click();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Black / L");
  await expect(page.getByRole("dialog").locator(".quantity span")).toHaveText(
    "2",
  );
});

test("checkout form is readable, scrollable and cannot take preview payments", async ({
  page,
}) => {
  const product = getProduct("hooded-down-jacket")!;
  await mockStore(page, [
    { id: product.id, size: "M", color: product.color, quantity: 1 },
  ]);
  let paymentRequests = 0;
  await page.route("**/api/checkout", async (route) => {
    paymentRequests++;
    await route.fulfill({ status: 503, json: { error: "Preview only" } });
  });
  await page.goto("/checkout");
  await expect(page.locator(".checkout-form")).toBeVisible();
  await noHorizontalOverflow(page);
  await page
    .getByLabel("Email address", { exact: true })
    .fill("mobile-check@example.test");
  await page.getByLabel("First name", { exact: true }).fill("Mobile");
  await page.getByLabel("Last name", { exact: true }).fill("Preview");
  await page.getByLabel("Address", { exact: true }).fill("123 Preview Street");
  await page.getByLabel("City", { exact: true }).fill("Paris");
  await page.getByLabel("Postal code", { exact: true }).fill("75001");
  await expect(page.getByLabel("Postal code", { exact: true })).toHaveAttribute(
    "inputmode",
    "numeric",
  );
  for (const input of await page.locator(".checkout-form .field input").all()) {
    await expect(input).toHaveCSS("font-size", "16px");
  }
  await page.getByRole("radio", { name: /Express delivery/ }).click();
  await expect(page.locator(".total-row")).toContainText("€335");
  await expect(
    page.getByRole("button", { name: "Checkout opens at launch" }),
  ).toBeDisabled();
  expect(paymentRequests).toBe(0);
});

test("unavailable storage is recoverable instead of loading forever", async ({
  page,
}) => {
  let available = false;
  await page.route("**/api/cart", (route) => {
    return !available
      ? route.fulfill({ status: 503, json: { error: "Storage unavailable" } })
      : route.fulfill({ json: { lines: [] } });
  });
  await page.goto("/collection");
  await page
    .getByRole("button", { name: "Open shopping bag, 0 items" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Your bag is temporarily unavailable.",
  );
  available = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "A little room for something new.",
  );
  await page.goto("/checkout");
  await expect(page.getByText("Your bag is currently empty.")).toBeVisible();
});

test("collection controls support keyboard, pointer swipes and local filters", async ({
  page,
}) => {
  await page.goto("/#collection");
  const section = page.locator("section#collection");
  const selected = section.locator(".collection-card.selected h3");
  await expect(selected).toHaveText("Hoodie");
  await section.getByRole("button", { name: "Next collection" }).click();
  await expect(selected).toHaveText("Trousers");
  await section.getByRole("button", { name: "Previous collection" }).focus();
  await page.keyboard.press("Enter");
  await expect(selected).toHaveText("Hoodie");
  const stage = section.locator(".collection-stage");
  // Synthetic PointerEvents exercise the same handler on every viewport.
  await stage.dispatchEvent("pointerdown", {
    clientX: 220,
    pointerType: "touch",
  });
  await stage.dispatchEvent("pointermove", {
    clientX: 130,
    pointerType: "touch",
  });
  await stage.dispatchEvent("pointerup", {
    clientX: 130,
    pointerType: "touch",
  });
  await expect(selected).toHaveText("Trousers");
  await section
    .getByRole("combobox", { name: "Filter collection pieces" })
    .click();
  await page.getByRole("option", { name: "Hoodie", exact: true }).click();
  await expect(
    section.locator(".collection-filter-results .product-card"),
  ).toHaveCount(2);
  await noHorizontalOverflow(page);
});

test("contact and newsletter forms show confirmations without real submissions", async ({
  page,
}) => {
  await page.route("**/api/contact", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/newsletter", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.goto("/info/contact");
  await page.getByLabel("Your name", { exact: true }).fill("Mobile Preview");
  await page
    .locator(".contact-form")
    .getByLabel("Email address", { exact: true })
    .fill("mobile-preview@example.test");
  await page
    .getByLabel("Your message", { exact: true })
    .fill("This is a local mobile regression test, not a real enquiry.");
  await page.getByRole("button", { name: "Submit enquiry" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your enquiry has been saved for the studio.",
  );
  await page.locator("#newsletter").fill("mobile-preview@example.test");
  await page.getByRole("button", { name: "Join the list" }).click();
  await expect(page.locator('footer [role="status"]')).toContainText(
    "You’re on the list.",
  );
});

test("product cards select smaller responsive images and hero uses optimization", async ({
  page,
}) => {
  await page.goto("/collection");
  const image = page.locator(".catalog-grid .product-picture img").first();
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(
    await image.evaluate((element) => (element as HTMLImageElement).currentSrc),
  ).toContain("-512.webp");
  await page.goto("/");
  await expect(page.locator(".hero-model img")).toHaveAttribute(
    "src",
    /\/_next\/image\?/,
  );
});

test("intro can be skipped and motion preferences remove it immediately", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.locator(".brand-opening")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .not.toBe("hidden");
  await page.reload();
  await expect(page.locator(".brand-opening")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".brand-opening")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .not.toBe("hidden");
});

test("latest Manrope typography and glass carousel stay responsive through loops and drags", async ({
  page,
}) => {
  await page.goto("/#collection");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).toHaveCSS("font-family", /Manrope/);
  expect(
    await page.evaluate(() =>
      Array.from(document.fonts).some(
        (face) => face.family === "Manrope" && face.status === "loaded",
      ),
    ),
  ).toBe(true);
  const section = page.locator("section#collection");
  const stage = section.locator(".collection-stage");
  const glass = section.locator(".collection-glass");
  const label = glass.locator("b");
  const stageBox = (await stage.boundingBox())!;
  const frameBox = (await glass.boundingBox())!;
  expect(frameBox.x).toBeGreaterThanOrEqual(stageBox.x - 1);
  expect(frameBox.y).toBeGreaterThanOrEqual(stageBox.y - 1);
  expect(frameBox.x + frameBox.width).toBeLessThanOrEqual(
    stageBox.x + stageBox.width + 1,
  );
  expect(frameBox.y + frameBox.height).toBeLessThanOrEqual(
    stageBox.y + stageBox.height + 1,
  );
  await expect(label).toHaveText("Hoodie");
  for (const type of ["Trousers", "Knitwear", "Bomber", "Jacket", "Hoodie"]) {
    await section.getByRole("button", { name: "Next collection" }).click();
    await expect(label).toHaveText(type);
    await expect(
      section.locator(".collection-card.selected"),
    ).not.toHaveAttribute("aria-hidden", "true");
  }
  // A genuine captured pointer drag, in addition to the synthetic handler test.
  await stage.scrollIntoViewIfNeeded();
  const bounds = (await stage.boundingBox())!;
  const distance = await stage.evaluate((element) => {
    const cards = element.querySelectorAll<HTMLElement>(".collection-card");
    return (cards[1].offsetLeft - cards[0].offsetLeft) * 0.65;
  });
  const center = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(center + distance / 2, y);
  await page.mouse.down();
  await page.mouse.move(center - distance / 2, y, { steps: 8 });
  await page.mouse.up();
  await expect(label).toHaveText("Trousers");
  await noHorizontalOverflow(page);

  // Touch does not always focus a card: autoplay must not move beneath a held
  // gesture, but it must resume once a cancelled gesture releases the stage.
  await page.mouse.move(1, 1);
  await page.locator(".header .wordmark").focus();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await stage.dispatchEvent("pointerdown", {
    button: 0,
    pointerId: 42,
    pointerType: "touch",
    clientX: center,
  });
  // The production autoplay interval is 3600ms; this is a timed negative check.
  await page.waitForTimeout(3900);
  await expect(label).toHaveText("Trousers");
  await stage.dispatchEvent("pointercancel", { pointerId: 42 });
  await expect(label).toHaveText("Knitwear");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await noHorizontalOverflow(page);
});
