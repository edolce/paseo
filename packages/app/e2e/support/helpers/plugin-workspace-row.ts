import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import { openCommandCenter } from "./command-center";
import { connectNewWorkspaceDaemonClient } from "./new-workspace";
import { pluginRequirements } from "./plugin-fixture";
import { getServerId } from "./server-id";

const PLUGIN_ID = "row-fixture";

/** A large accessory, plus commands that register a throwing one over it and remove it again. */
const SOURCE = `import React from "react";
import { View } from "react-native";

function Accessory({ size, theme }) {
  return <View testID="row-fixture-accessory" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.accent }} />;
}

function BrokenAccessory() {
  throw new Error("Row fixture accessory failed");
}

export default function contribute(client) {
  const removals = [client.addWorkspaceRowAccessory({ id: "fixture", size: "large", Component: Accessory })];
  let removeBroken = null;
  removals.push(client.addCommandCenterItem({
    id: "break-accessory", title: "Row fixture: break accessory", icon: "Bug", context: "workspace",
    onSelect() { removeBroken ??= client.addWorkspaceRowAccessory({ id: "broken", size: "large", Component: BrokenAccessory }); },
  }));
  removals.push(client.addCommandCenterItem({
    id: "fix-accessory", title: "Row fixture: fix accessory", icon: "Wrench", context: "workspace",
    onSelect() { removeBroken?.(); removeBroken = null; },
  }));
  return () => { removeBroken?.(); for (const remove of removals) remove(); };
}
`;

export async function installRowFixture() {
  const client = await connectNewWorkspaceDaemonClient({ ownProjects: false });
  const config = await client.getDaemonConfig();
  const directory = await mkdtemp(path.join(tmpdir(), "paseo-row-fixture-"));
  await writeFile(
    path.join(directory, "paseo-plugin.json"),
    JSON.stringify({ id: PLUGIN_ID, requirements: pluginRequirements }),
  );
  await writeFile(path.join(directory, "index.client.tsx"), SOURCE);
  await client.patchDaemonConfig({ pluginsEnabled: true });
  await client.installDirectoryPlugin(directory);
  return {
    async cleanup() {
      await client.removePlugin(PLUGIN_ID);
      await client.patchDaemonConfig({ pluginsEnabled: config.config.pluginsEnabled });
      await client.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

export function workspaceRow(page: Page, workspaceId: string): Locator {
  return page.getByTestId(`sidebar-workspace-row-${getServerId()}:${workspaceId}`);
}

export async function runRowFixtureCommand(page: Page, title: string) {
  const panel = await openCommandCenter(page);
  await panel.getByTestId("command-center-input").fill(title);
  await panel.getByRole("button", { name: title, exact: true }).click();
  await expect(panel).not.toBeVisible();
}
