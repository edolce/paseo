import { expect } from "@playwright/test";
import { test } from "../support/fixtures";
import { gotoAppShell } from "../support/helpers/app";
import {
  installRowFixture,
  runRowFixtureCommand,
  workspaceRow,
} from "../support/helpers/plugin-workspace-row";
import { seedWorkspace } from "../support/helpers/seed-client";

test.describe("Plugin workspace row accessory", () => {
  test.describe.configure({ timeout: 180_000 });

  test("replaces the native slot only while a healthy accessory is registered", async ({
    page,
  }) => {
    const workspace = await seedWorkspace({ repoPrefix: "row-accessory-" });
    try {
      await workspace.client.createAgent({
        provider: "mock",
        cwd: workspace.repoPath,
        workspaceId: workspace.workspaceId,
        title: "Fix flaky login test",
        model: "e2e-fast-stream",
        modeId: "load-test",
        initialPrompt: "emit synthetic turn failure",
      });
      const row = workspaceRow(page, workspace.workspaceId);
      const nativeStatus = row.getByTestId("workspace-status-indicator-failed");
      const accessory = row.getByTestId("row-fixture-accessory");
      const badge = row.getByTestId("project-status-badge");

      await gotoAppShell(page);
      // Without a plugin the row keeps its native status and nothing else in the slot.
      await expect(nativeStatus).toBeVisible({ timeout: 60_000 });
      await expect(accessory).toHaveCount(0);
      await expect(badge).toHaveCount(0);

      const fixture = await installRowFixture();
      try {
        // The accessory takes the slot and the native status stays as its corner badge.
        await expect(accessory).toBeVisible({ timeout: 60_000 });
        await expect(badge).toHaveAttribute("aria-label", "Failed");
        await expect(nativeStatus).toHaveCount(0);

        // A throwing accessory gives the row its native status back.
        await row.click();
        await runRowFixtureCommand(page, "Row fixture: break accessory");
        await expect(nativeStatus).toBeVisible();
        await expect(accessory).toHaveCount(0);

        // Removing it selects the healthy accessory again, without a plugin reload.
        await runRowFixtureCommand(page, "Row fixture: fix accessory");
        await expect(accessory).toBeVisible();
        await expect(nativeStatus).toHaveCount(0);
      } finally {
        await fixture.cleanup();
      }
    } finally {
      await workspace.cleanup();
    }
  });
});
