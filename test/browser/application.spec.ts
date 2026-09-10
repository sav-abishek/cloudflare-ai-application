import { test, expect, type Page, type Locator, type WebSocketRoute } from "@playwright/test";

const workspace = () => `test-${crypto.randomUUID().slice(0, 12)}`;
async function open(page: Page, id = workspace()) {
  await page.goto(`${process.env.E2E_BASE_URL || "http://127.0.0.1:5173"}/?workspace=${id}`);
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  return id;
}
async function view(page: Page, name: string) {
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function wheel(page: Page, target: Locator, delta: number) {
  const rect = await target.boundingBox();
  if (!rect) throw new Error("Scroll target is hidden");
  await page.mouse.move(rect.x + rect.width - 12, rect.y + Math.min(rect.height / 2, 120));
  await page.mouse.wheel(0, delta);
}
async function bottom(target: Locator) {
  await expect
    .poll(() => target.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight))
    .toBeLessThan(3);
}
async function inViewport(page: Page, target: Locator) {
  const rect = await target.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
}

// Synthetic long history exercises scrolling without spending inference on filler text.
async function history(page: Page) {
  await page.route("**/get-messages", (route) =>
    route.fulfill({
      json: Array.from({ length: 12 }, (_, i) => ({
        id: `fixture-${i}`,
        role: i % 2 ? "assistant" : "user",
        parts: [
          {
            type: "text",
            text:
              i % 2
                ? `## Review ${i}\n${"- Blocking: attach test evidence and verify rollback.\n".repeat(12)}`
                : `Change ${i}: review the API update.`,
          },
        ],
      })),
    }),
  );
}

for (const size of [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 390, height: 600 },
  { width: 320, height: 568 },
]) {
  test(`wheel and keyboard scrolling reaches every view at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await history(page);
    await open(page);
    const main = page.locator(".main-column");
    const chat = page.getByRole("log");
    await expect
      .poll(() =>
        page.locator(".workspace-shell").evaluate((el) => el.getBoundingClientRect().bottom),
      )
      .toBeLessThanOrEqual(size.height + 1);
    await page.getByRole("button", { name: "Latest message" }).click();
    await bottom(chat);
    await wheel(page, chat, -100000);
    await expect.poll(() => chat.evaluate((el) => el.scrollTop)).toBe(0);
    await chat.focus();
    await page.keyboard.press("PageDown");
    await expect.poll(() => chat.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Latest message" }).click();
    await bottom(chat);
    await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBe(0);
    await inViewport(page, page.getByRole("button", { name: "Review change", exact: true }));
    await view(page, "Project context");
    await expect(page.getByLabel("Project name", { exact: true })).toBeVisible();
    await wheel(page, main, 100000);
    await bottom(main);
    await inViewport(page, page.getByRole("button", { name: "Clear workspace", exact: true }));
    await main.focus();
    await page.keyboard.press("Control+Home");
    await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBe(0);
    await view(page, "Evidence board");
    await wheel(page, main, 100000);
    await bottom(main);
    await view(page, "Change review");
    await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("mobile touch scrolling and laptop sidebar scrolling", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await history(page);
  await open(page);
  await view(page, "Project context");
  await expect(page.getByLabel("Project name", { exact: true })).toBeVisible();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 375, y: 700 }],
  });
  for (let y = 675; y >= 175; y -= 25) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 375, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect
    .poll(() => page.locator(".main-column").evaluate((el) => el.scrollTop))
    .toBeGreaterThan(200);
  await context.close();
  const laptop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await open(laptop);
  for (const selector of [".app-nav", ".context-rail"]) {
    await wheel(laptop, laptop.locator(selector), 100000);
    await bottom(laptop.locator(selector));
  }
  await inViewport(laptop, laptop.locator(".platform-credit"));
  await inViewport(laptop, laptop.locator(".privacy-note"));
  await laptop.close();
});

test("onboarding, templates, validation, navigation, dialogs and workspace controls", async ({
  page,
}) => {
  const id = await open(page);
  const draft = page.getByLabel("Message", { exact: true });
  for (const title of ["Review a change", "Unblock a build", "Plan a release"]) {
    await page.getByRole("button", { name: new RegExp(`^${title} `) }).click();
    await expect(draft).not.toBeEmpty();
  }
  await draft.fill("Line one");
  await draft.press("Shift+Enter");
  await draft.press("A");
  await expect(draft).toHaveValue("Line one\nA");
  await page.getByRole("button", { name: "Add project context" }).click();
  for (const [name, project] of [
    ["Worker", "Edge service"],
    ["API", "Payments API"],
    ["Web app", "Customer portal"],
  ] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(project);
  }
  await page.getByLabel("Project name", { exact: true }).fill("x");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  expect(
    await page
      .getByLabel("Project name", { exact: true })
      .evaluate((el: HTMLInputElement) => el.validity.valid),
  ).toBe(false);
  await page.getByLabel("Project name", { exact: true }).fill("UI regression project");
  await page.getByLabel("Required CI checks").fill("x".repeat(121));
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator(".form-feedback")).not.toHaveText("Project profile saved.");
  await expect(page.locator(".form-feedback")).toContainText(/120|long|characters/i);
  await page.getByLabel("Required CI checks").fill("Unit tests\nType check\nUnit tests");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Project profile saved.", { exact: true })).toBeVisible();
  await view(page, "Change review");
  await expect(draft).toHaveValue("Line one\nA");
  await draft.fill("");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Project context", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Change review", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open quick guide" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".workspace-switch").click();
  await page.getByRole("button", { name: "Close workspace switcher" }).click();
  await page.locator(".workspace-switch").click();
  await page.getByRole("button", { name: "New workspace", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(id));
  await page.locator(".workspace-switch").click();
  await page.getByLabel("Workspace ID", { exact: true }).fill(id);
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await view(page, "Project context");
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "UI regression project",
  );
  await expect(page.getByLabel("Required CI checks")).toHaveValue("Unit tests\nType check");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Clear workspace" }).click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "UI regression project",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear workspace" }).click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("New project");
  await page.reload();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("New project");
});

test("live AI, evidence lifecycle, exports, feedback, stale review and reset", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await view(page, "Project context");
  await page.getByRole("button", { name: "API", exact: true }).click();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Project profile saved.", { exact: true })).toBeVisible();
  await view(page, "Change review");
  await page
    .getByLabel("Message", { exact: true })
    .fill(
      "Assess a refund API change with no supplied test results or rollback evidence. Use concise required headings.",
    );
  await page.getByLabel("Message", { exact: true }).press("Enter");
  await expect(page.locator(".result-strip")).toBeVisible({ timeout: 120_000 });
  for (const heading of [
    "Assessment",
    "Required checks",
    "Suggested remediation",
    "Assumptions and questions",
  ])
    await expect(
      page.getByRole("log").getByRole("heading", { name: heading, exact: true }),
    ).toHaveCount(1);
  await page.locator(".result-strip").click();
  await page.screenshot({ path: "test-results/laptop-evidence.png" });
  await expect(page.getByRole("heading", { name: "Not ready", exact: true })).toBeVisible();
  await page.locator(".review-source summary").click();
  await expect(page.locator(".review-source p")).toContainText("refund API");
  await page.locator(".evidence-details summary").click();
  await expect(page.locator(".evidence-item").first()).toBeHidden();
  await page.locator(".evidence-details summary").click();
  const rows = page.locator(".evidence-item");
  const total = await rows.count();
  await rows.first().locator("input").fill("Unsaved evidence draft");
  await page.getByRole("button", { name: /Needs evidence/ }).click();
  await page.getByRole("button", { name: /All checks/ }).click();
  await expect(rows.first().locator("input")).toHaveValue("Unsaved evidence draft");
  for (let i = 0; i < total; i++) {
    await rows.nth(i).locator("input").fill(`Demo evidence ${i}`);
    await rows.nth(i).getByRole("button", { name: "Save", exact: true }).click();
    await expect(rows.nth(i).locator("input")).toBeEnabled();
  }
  await expect(page.getByRole("heading", { name: "Ready for review", exact: true })).toBeVisible();
  await rows.first().locator("input").fill("Revised unsaved evidence");
  await page.getByRole("button", { name: /Needs evidence/ }).click();
  await expect(rows).toHaveCount(0);
  await page.getByRole("button", { name: /All checks/ }).click();
  await expect(rows.first().locator("input")).toHaveValue("Revised unsaved evidence");
  await view(page, "Change review");
  await page.getByLabel("Message", { exact: true }).fill("Do not replace my unsaved evidence.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Review change", exact: true }).click();
  await expect(page.getByLabel("Message", { exact: true })).not.toBeEmpty();
  await page.getByLabel("Message", { exact: true }).fill("");
  await view(page, "Evidence board");
  await expect(rows.first().locator("input")).toHaveValue("Revised unsaved evidence");
  await page.locator(".workspace-switch").click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "New workspace", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close workspace switcher" }).click();
  await rows.first().locator("input").fill("");
  await rows.first().getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Not ready", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy checklist" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Demo evidence 1");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe("readiness-review.md");
  for (const name of ["Helpful", "Not helpful"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("button", { name, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await page.reload();
  await expect(page.getByRole("button", { name: "Not helpful", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(rows.nth(1).locator("input")).toHaveValue("Demo evidence 1");
  await page.setViewportSize({ width: 390, height: 844 });
  await wheel(page, page.locator(".main-column"), 100000);
  await bottom(page.locator(".main-column"));
  await inViewport(page, page.getByRole("button", { name: "Download", exact: true }));
  await page.screenshot({ path: "test-results/mobile-evidence-bottom.png" });
  await view(page, "Change review");
  await page.getByRole("button", { name: "Latest message" }).click();
  await bottom(page.getByRole("log"));
  await page.screenshot({ path: "test-results/mobile-chat.png" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await bottom(page.getByRole("log"));
  await page.screenshot({ path: "test-results/laptop-chat.png" });
  await page.setViewportSize({ width: 390, height: 600 });
  await bottom(page.getByRole("log"));
  await inViewport(page, page.getByRole("button", { name: "Review change", exact: true }));
  await view(page, "Project context");
  await page.getByLabel("Project name", { exact: true }).fill("Changed project");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Project profile saved.", { exact: true })).toBeVisible();
  await view(page, "Evidence board");
  await expect(page.getByRole("heading", { name: "Review outdated", exact: true })).toBeVisible();
  await expect(rows.first().locator("input")).toBeDisabled();
  await view(page, "Project context");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Clear workspace" }).click();
  await expect(page.getByText("Workspace cleared.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await view(page, "Evidence board");
  await expect(page.locator(".board-empty")).toBeVisible();
  await view(page, "Change review");
  await expect(page.locator(".welcome")).toBeVisible();
});

test("chat failure, retry, streaming scroll position and server cancellation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  let requestCount = 0;
  let cancelCount = 0;
  let emit: (chunk: object) => void = () => {
    throw new Error("No active stream");
  };
  // Keep real profile/state RPCs; substitute only model response frames.
  await page.routeWebSocket("**/agents/**", (ws) => {
    const server = ws.connectToServer();
    ws.onMessage((raw) => {
      const frame = JSON.parse(String(raw));
      if (frame.type === "cf_agent_chat_request_cancel") {
        cancelCount++;
        return;
      }
      if (frame.type !== "cf_agent_use_chat_request") {
        server.send(raw);
        return;
      }
      requestCount++;
      emit = (chunk) =>
        ws.send(
          JSON.stringify({
            type: "cf_agent_use_chat_response",
            id: frame.id,
            body: JSON.stringify(chunk),
            done: false,
          }),
        );
      if (requestCount === 1) {
        ws.send(
          JSON.stringify({
            type: "cf_agent_use_chat_response",
            id: frame.id,
            body: "Test model unavailable",
            error: true,
            done: true,
          }),
        );
        return;
      }
      emit({ type: "start", messageId: "controlled-response" });
      emit({ type: "text-start", id: "text-1" });
      emit({
        type: "text-delta",
        id: "text-1",
        delta: `## Assessment\n${"- Check test results and rollback evidence.\n".repeat(35)}`,
      });
    });
  });
  await open(page);
  await page.getByLabel("Message", { exact: true }).fill("Exercise retry and cancellation.");
  await page.getByRole("button", { name: "Review change", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Test model unavailable");
  await inViewport(page, page.getByRole("button", { name: "Retry review" }));
  await page.getByRole("button", { name: "Retry review" }).click();
  await expect(
    page.getByRole("log").getByRole("heading", { name: "Assessment", exact: true }),
  ).toBeVisible();
  const chat = page.getByRole("log");
  await bottom(chat);
  await wheel(page, chat, -100000);
  await expect.poll(() => chat.evaluate((el) => el.scrollTop)).toBe(0);
  emit({ type: "text-delta", id: "text-1", delta: "\n## Additional checks\nMore streamed text." });
  await expect(chat.getByRole("heading", { name: "Additional checks", exact: true })).toHaveCount(
    1,
  );
  await expect.poll(() => chat.evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Latest message" }).click();
  await bottom(chat);
  emit({ type: "text-delta", id: "text-1", delta: "\n- Final streamed check." });
  await expect(chat).toContainText("Final streamed check.");
  await bottom(chat);
  await inViewport(page, page.getByRole("button", { name: "Stop", exact: true }));
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect.poll(() => cancelCount).toBe(1);
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".result-strip")).toHaveCount(0);
  expect(requestCount).toBe(2);
});

test("connection loss preserves drafts and reconnects", async ({ page, context }) => {
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket("**/agents/**", (ws) => {
    socket = ws;
    ws.connectToServer();
  });
  await open(page);
  const draft = page.getByLabel("Message", { exact: true });
  await draft.fill("Keep this draft during a connection interruption.");
  await context.setOffline(true);
  socket!.close({ code: 1012, reason: "Regression test connection interruption" });
  await expect(page.getByText("Reconnecting…", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review change", exact: true })).toBeDisabled();
  await expect(draft).toHaveValue("Keep this draft during a connection interruption.");
  await context.setOffline(false);
  await expect(page.getByText("Connected", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Review change", exact: true })).toBeEnabled();
  await expect(draft).toHaveValue("Keep this draft during a connection interruption.");
  await draft.fill("");
});
