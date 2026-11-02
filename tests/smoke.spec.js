// @ts-check
// Behavior scenarios for the silverboom.dev project-directory page,
// exercised through the rendered DOM the way a visitor drives it.
const { test, expect } = require("@playwright/test");

const rows = "[data-project-row]";
const group = (layer) => `[data-project-group="${layer}"]`;
// The map and the data-flow diagram each carry a select button per project;
// drive the map node — it is the one wired to lane highlighting.
const selectButton = (id) => `.map-node[data-select-project="${id}"]`;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("directory lists all thirteen matrix projects across three layers", async ({ page }) => {
  // given the site, when it loads, then all thirteen rows and 3 groups render
  await expect(page.locator(rows)).toHaveCount(13);
  for (const layer of ["agent", "runtime", "shared"]) {
    await expect(page.locator(group(layer))).toBeVisible();
  }
  await expect(
    page.locator('[data-project-group="agent"] [data-group-count]'),
  ).toHaveText("5 projects");
  await expect(
    page.locator('[data-project-group="runtime"] [data-group-count]'),
  ).toHaveText("4 projects");
  await expect(
    page.locator('[data-project-group="shared"] [data-group-count]'),
  ).toHaveText("4 projects");
  await expect(page.locator("#results-count")).toHaveText("13 projects");
});

test("filter badges derive from the rendered rows", async ({ page }) => {
  // each layer badge equals its group's row count, the all badge equals the
  // total rows, and the layer badges sum to it
  const total = await page.locator(rows).count();
  let sum = 0;
  for (const layer of ["agent", "runtime", "shared"]) {
    const expected = await page.locator(`${group(layer)} ${rows}`).count();
    await expect(
      page.locator(`[data-filter="${layer}"] .filter-count`),
    ).toHaveText(String(expected));
    sum += expected;
  }
  expect(sum).toBe(total);
  await expect(page.locator('[data-filter="all"] .filter-count')).toHaveText(
    String(total),
  );
});

test("directory rows, data, symbols and controls stay in parity", async ({ page }) => {
  // every row id is a project-data id, every id has a capability symbol and
  // at least one select control
  const rowIds = (
    await page
      .locator(rows)
      .evaluateAll((elements) => elements.map((element) => element.dataset.projectRow))
  ).sort();
  const dataIds = (
    await page
      .locator("#project-data")
      .evaluate((element) => JSON.parse(element.textContent).map((project) => project.id))
  ).sort();
  expect(rowIds).toEqual(dataIds);
  for (const id of dataIds) {
    await expect(page.locator(`#cap-${id}`)).toHaveCount(1);
    expect(await page.locator(`[data-select-project="${id}"]`).count()).toBeGreaterThanOrEqual(1);
  }
});

test("default selection shows A4AA in the architecture panel", async ({ page }) => {
  // given a fresh load, a4aa is the selected project
  await expect(page.locator("#architecture-name")).toHaveText("Adapter For All Agents");
  await expect(page.locator("#architecture-layer")).toHaveText("Agent layer");
  await expect(page.locator("#architecture-repo")).toHaveAttribute(
    "href",
    "https://github.com/Unka-Malloc/Adapters-for-All-Agents",
  );
  await expect(page.locator(selectButton("a4aa"))).toHaveClass(/is-selected/);
});

test("selecting a project updates panel, lane highlight and expanded row", async ({ page }) => {
  // when the visitor picks Acativa on the runtime lane
  await page.locator(selectButton("aca")).click();
  // then the panel, the lane highlight and the directory row all follow
  await expect(page.locator("#architecture-name")).toHaveText("Acativa");
  await expect(page.locator("#architecture-layer")).toHaveText("Runtime layer");
  await expect(page.locator('.map-lane[data-map-layer="runtime"]')).toHaveClass(/is-current/);
  await expect(page.locator(`${rows}[data-project-row="aca"]`)).toHaveAttribute("open", "");
  await expect(page.locator(`${rows}[data-project-row="a4aa"]`)).not.toHaveAttribute("open", "");
});

test("layer filter narrows the directory and rewrites the count", async ({ page }) => {
  // when the visitor filters to the runtime layer
  await page.locator('[data-filter="runtime"]').click();
  // then only runtime rows stay and other groups hide
  await expect(page.locator(`${rows}:visible`)).toHaveCount(4);
  await expect(page.locator(group("agent"))).toBeHidden();
  await expect(page.locator(group("shared"))).toBeHidden();
  await expect(page.locator("#results-count")).toHaveText("4 projects in runtime layer");
  await expect(page.locator('[data-filter="runtime"]')).toHaveAttribute("aria-pressed", "true");
});

test("search narrows by code, name, role or layer text", async ({ page }) => {
  // when the visitor searches a lease-related term
  await page.locator("#project-search").fill("process-bound");
  // then only Credential-Lease remains
  await expect(page.locator(`${rows}:visible`)).toHaveCount(1);
  await expect(page.locator(`${rows}[data-project-row="cl"]`)).toBeVisible();
  await expect(page.locator("#results-count")).toHaveText("1 project matching your search");
});

test("a query with no match reveals the empty state and clear resets", async ({ page }) => {
  // given a query that matches nothing
  await page.locator("#project-search").fill("zzzz");
  await expect(page.locator(`${rows}:visible`)).toHaveCount(0);
  await expect(page.locator("#empty-state")).toBeVisible();
  // when the visitor clears filters
  await page.locator("#clear-filters").click();
  // then the full directory returns and focus moves back to search
  await expect(page.locator(`${rows}:visible`)).toHaveCount(13);
  await expect(page.locator("#empty-state")).toBeHidden();
  await expect(page.locator("#project-search")).toBeFocused();
});

test("Escape clears the search query", async ({ page }) => {
  await page.locator("#project-search").fill("a4aa");
  await expect(page.locator(`${rows}:visible`)).toHaveCount(1);
  await page.locator("#project-search").press("Escape");
  await expect(page.locator(`${rows}:visible`)).toHaveCount(13);
  await expect(page.locator("#project-search")).toHaveValue("");
});

test("the map draws bus connections between lanes and the foundation", async ({ page }) => {
  // given the rendered map, when layout settles, then the bridge path is drawn
  await expect(page.locator(".map-connections")).not.toHaveAttribute("d", "");
});

test("Metera is selectable, searchable and shared", async ({ page }) => {
  await expect(page.locator(rows)).toHaveCount(13);
  await page.locator(selectButton("mt")).click();
  await expect(page.locator("#architecture-name")).toHaveText("Metera");
  await expect(page.locator("#architecture-layer")).toHaveText("Shared infrastructure");
  await expect(page.locator("#architecture-repo")).toHaveAttribute(
    "href",
    "https://github.com/Unka-Malloc/Metera",
  );
  await expect(page.locator("#project-mt")).toHaveAttribute("open", "");
  await page.locator('[data-filter="shared"]').click();
  await expect(page.locator(`${rows}:visible`)).toHaveCount(4);
  await expect(page.locator("#results-count")).toHaveText("4 projects in shared infrastructure");
  await page.locator("#project-search").fill("quota");
  await expect(page.locator(`${rows}:visible`)).toHaveCount(1);
  await expect(page.locator("#project-mt")).toBeVisible();
  await expect(page.locator("#results-count")).toHaveText(
    "1 project in shared infrastructure matching your search",
  );
  const projectIds = await page.locator("#project-data").evaluate((element) =>
    JSON.parse(element.textContent).map((project) => project.id),
  );
  expect(projectIds).toContain("mt");
  expect(projectIds).toContain("fl");
  expect(projectIds).toContain("a4mc");
  expect(projectIds).toContain("flr");
  expect(projectIds).toContain("acop");
  expect(projectIds).not.toContain("as");
  expect(projectIds).not.toContain("probator");
  expect(projectIds).not.toContain("gitvault");
});

test("Fairliny-Gateway is selectable and searchable on the runtime layer", async ({ page }) => {
  const flowNode = page.locator('button.flow-node[data-select-project="fl"]').first();
  await expect(flowNode.locator(".flow-copy span")).toHaveText("Fairliny-Gateway");
  await page.locator(selectButton("fl")).click();
  await expect(page.locator("#architecture-name")).toHaveText("Fairliny-Gateway");
  await expect(page.locator("#architecture-layer")).toHaveText("Runtime layer");
  await expect(page.locator("#architecture-repo")).toHaveAttribute(
    "href",
    "https://github.com/Unka-Malloc/Fairliny-Gateway",
  );
  await expect(page.locator("#project-fl")).toHaveAttribute("open", "");
  await page.locator('[data-filter="runtime"]').click();
  await expect(page.locator("#project-fl")).toBeVisible();
  await page.locator("#project-search").fill("forwarding");
  await expect(page.locator(`${rows}:visible`)).toHaveCount(1);
  await expect(page.locator("#project-fl")).toBeVisible();
});

test("A4MC is selectable and searchable on the agent layer", async ({ page }) => {
  await page.locator(selectButton("a4mc")).click();
  await expect(page.locator("#architecture-name")).toHaveText(
    "Adapters For Messenger Channels",
  );
  await expect(page.locator("#architecture-layer")).toHaveText("Agent layer");
  await expect(page.locator("#architecture-repo")).toHaveAttribute(
    "href",
    "https://github.com/Unka-Malloc/A4MC",
  );
  await expect(page.locator("#project-a4mc")).toHaveAttribute("open", "");
  await page.locator('[data-filter="agent"]').click();
  await expect(page.locator(`${rows}:visible`)).toHaveCount(5);
  await expect(page.locator("#project-a4mc")).toBeVisible();
  await page.locator("#project-search").fill("messenger");
  await expect(page.locator(`${rows}:visible`)).toHaveCount(1);
  await expect(page.locator("#project-a4mc")).toBeVisible();
});

test("Metera foundation fits desktop and narrow layouts", async ({ page }) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const selector of [
      selectButton("mt"),
      '.foundation-project[data-select-project="mt"]',
    ]) {
      const button = page.locator(selector);
      await expect(button).toBeVisible();
      const box = await button.evaluate((element) => {
        const { left, right } = element.getBoundingClientRect();
        return { left, right };
      });
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
