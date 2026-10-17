# Risks: workspace row accessory + row takeover

Branch `upstream/workspace-row-extension-on-main` (2 commits on `main` at `d3efddb0b`:
`43a6a046f`, `56f13c16c`). Design rule by rule: `DESIGN-AUDIT.md`; command output: `QA.md`. Each risk lists what the code already does
(**mitigated**) and what is left (**open**).

## Performance

- **Many rows.** Every row calls two cheap selectors: the accessory for its host
  (`useInstalledPlugins` snapshot, recomputed only when plugins install/reload) and the row's
  takeover (`useSyncExternalStore` over one module `Map`, emitted only when a takeover starts or
  ends), plus one selector on the small persisted list of hosts with a `large` accessory. The title/meta fade is a CSS transition on web and a plain style switch on native: no
  per-row animation hooks, no work when no plugin is installed. **Mitigated.**
- **Plugin cost per row.** An accessory is a React component mounted once per visible row. A
  plugin that runs a `requestAnimationFrame` loop or a canvas per row multiplies its own cost by
  the row count. The examples use plain views and short `Animated` timings; the real-world mascot
  shares one RAF across all rows. **Open:** guidance in the plugin docs ("one shared clock,
  nothing per frame when idle") rather than enforcement.
- **Virtualization.** The sidebar list is not virtualized today; accessories mount for every row,
  like the native status indicator. If the list becomes virtualized, accessories unmount offscreen
  for free, but a takeover requested for an offscreen row plays unseen and ends on its timer.
  **Mitigated** (the host owns the end), visibility-aware takeovers **open**.

## Layout and density

- **Row height.** `status` sits in the native status box (no layout change, any density). `large`
  reserves a 40 px box centered on title + meta on every row (rows go from 36 to 56 px); the box
  is fixed for the life of the accessory (no jumps on status, hover or selection). **Mitigated;
  accepted:** fewer rows per screen while a `large` accessory is installed.
- **Mixed hosts.** One rail for the list: if any host has a `large` accessory, every row reserves
  the box and centers its own leading visual in it, so titles align across hosts, project groups
  and the status view. **Mitigated.**
- **First load, offline, errors.** Rows render before their host's plugins evaluate. Hosts with a
  `large` accessory are remembered across launches and hold the rail until their catalog
  evaluates; fallbacks render in the same box. Measured: no movement from the first frame
  (QA.md). **Mitigated; open:** uninstalling the last `large` accessory shrinks the rows once, on
  the next launch after the catalog evaluates (the expected end state).
- **Remembered host that never comes back.** A remembered host holds the rail only while its
  catalog may still arrive: at most 30 s in a row, counted from launch or from its disconnect.
  After that it is forgotten, so a host that stays offline, or is removed from the app, or loses
  its plugin while offline cannot keep every row wide. A host whose catalog arrives without a
  `large` accessory is forgotten at once. Cost: if that host's plugin comes back later, its
  rows widen once when the catalog evaluates. **Mitigated** (tests: "forgets a host whose
  evaluated catalog has no large accessory", "keeps a remembered host while its catalog may
  still arrive, and only that long").
- **No plugins.** Rows render exactly as on `main`: unit test (no accessory, no rail, the native
  leading visual unwrapped, normal and hoisted), and a pixel and HTML comparison with `main` in
  dark, light, hoisted and compact layouts (`no-plugin-regression/`). **Verified.**
- **Hoisted rows** (project icon as leading visual): the accessory replaces the icon; the project
  name stays in the meta line. **Decision documented in the PR.**
- **Takeover clipping.** The Overlay is clipped to the row's main line; it cannot draw over
  neighbouring rows. **Mitigated** (no overlap with other rows, menus or hover cards); drawing past
  the row is a possible follow-up (needs a portal because every react-native-web view is a
  `zIndex: 0` stacking context and sortable rows sit at `zIndex: 1`).

## Accessibility

- **Status never disappears.** The native status stays as the corner badge with its existing
  accessibility label (`role="status"`), and the row's own accessibility role, label and selected
  state are unchanged. **Mitigated.**
- **Focus and hit area.** Accessories and Overlays render inside the row's pressable; the takeover
  layer has `pointerEvents: none`, so clicks, context menu, drag and keyboard focus keep going to
  the row. Accessories are not focusable unless a plugin makes them so. **Mitigated; open:** a
  lint/review rule against interactive controls inside an accessory.
- **Screen readers.** Accessory content is read inside the row unless the plugin hides it. The
  examples set `accessibilityLabel`s. **Open:** docs should ask plugins for a short label or
  `accessibilityElementsHidden`.
- **Reduced motion.** The Overlay receives `reducedMotion`; the examples draw a static frame. The
  host fade is 280 ms of opacity, not motion. **Mitigated.**
- **Title hidden during a takeover.** Title and meta fade to `theme.opacity[0]` for at most 10 s;
  the status badge stays, and the row's accessibility label is unchanged. **Accepted.**
- **Distraction.** One takeover per row, at most 10 s, host-owned end, opt-in per plugin; the
  native status keeps showing what needs attention. **Mitigated;** cross-row rate limits are left
  to plugins (the real-world plugin uses cooldowns and an hourly budget).

## Security

- Row accessories and Overlays run in the same plugin runtime, with the same privileges and the
  same `PluginEnvironmentProvider` (plugin RPC, Paseo API, toast) as screens, panels and sidebar
  items. Nothing new is exposed: no DOM access beyond what plugin components already have, no new
  daemon RPC, no new permission. **No new surface.**

## API stability

- **Optional methods.** `addWorkspaceRowAccessory?` and `requestRowTakeover?` are optional on
  `PluginClientContext`; plugins feature-detect and keep loading on older hosts. **Mitigated.**
- **Requirements.** Plugins that need the feature can require the release that ships it in
  `paseo-plugin.json`; feature detection is the softer path. **Open:** pick the version at merge.
- **Names.** `WorkspaceRowAccessory`, `RowTakeover`, sizes `status | large`, props
  `statusBucket`, `takeover`, `slotSize`. `statusBucket` reuses the sidebar's bucket names, which
  are already public through `PluginWorkspaceSnapshot.status`. **Open:** naming review.
- **Additive evolution.** Overflow, more sizes or a trailing slot can be added as optional fields
  without breaking plugins. **Mitigated by shape.**

## Conflicts with existing UI

- **Hover card / context menu / drag and drop.** Accessories render inside the existing row
  frame; hover card, context menu and dnd-kit listeners stay on the row. The takeover layer takes
  no pointer events. **Mitigated** (exercised in the browser regression).
- **Selection and hover backgrounds.** The badge knocks out of the row's current backdrop, like the
  project icon badge. **Mitigated.**

## Mobile and native

- The code is plain React Native: accessories and Overlays render on iOS/Android too. Web-only
  pieces: the CSS fade (native switches instantly). The remembered rail uses AsyncStorage like the
  other persisted sidebar stores; it hydrates long before rows arrive from a host. **Open:**
  native was not exercised; captures are Chromium desktop and phone widths.

## Several plugins

- One leading slot per row: the most recently registered accessory on the host wins
  (deterministic registration counter; reloading a plugin moves it to the front). A plugin's
  takeover always uses its own Overlay. **Mitigated; open:** a user-facing choice when two plugins
  compete.

## Compatibility with existing plugins

- No existing contract changes; new types are additive; `EvaluatedPlugin` gains one array and
  the registry one read-only method (`hasCatalog`). Plugins
  that never call the new methods behave exactly as before. **Mitigated.**

## Failure handling

- An accessory or Overlay that throws is caught by the same error boundary used for plugin
  surfaces; the row shows its native slot until the plugin reloads. Takeovers end on plugin
  dispose/reload (`finished` → `"cancelled"`). **Mitigated** (unit tests + browser regression).
