# No-plugin regression: sidebar on `main` vs the PR

Same isolated e2e daemon setup, no plugin installed, same data and paths (projects
`checkout-web`, `design-system`, `login-service`, `release-notes`; workspaces done, needs input,
failed, done), browser clock fixed, reduced motion. Captured on `main` (`d3efddb0b`) and on the
PR (`56f13c16c`). `*-before-main.png`, `*-after-pr.png`, `*-diff.png` (changed pixels in red over
a dimmed copy).

| Capture              | Size    | Different pixels | Outside the lightning button | Sidebar list HTML |
| -------------------- | ------- | ---------------- | ---------------------------- | ----------------- |
| project-dark         | 314x900 | 2333             | 0                            | identical         |
| project-light        | 314x900 | 1625             | 0                            | identical         |
| status-hoisted-dark  | 314x900 | 1798             | 0                            | identical         |
| status-hoisted-light | 314x900 | 1695             | 0                            | identical         |
| compact-dark         | 390x844 | 1722             | 0                            | identical         |

Every changed pixel is inside one ~50×50 px box at the bottom-left corner: a floating button with
a lightning icon that fades in and out over the sidebar footer on its own (seen in the e2e dev
server). It is not part of the sidebar list, it appears on both branches (visible on both sides in
three of the five pairs), and the captures caught it at different points of its fade. Everything else is pixel-identical, and the HTML of the sidebar list
(elements, attributes, test ids and the generated style classes, which encode the style values)
is identical in all five captures once the generated workspace ids are replaced by placeholders
(`<workspace-N>`): project view dark and light, status view with hoisted
rows (project icon in the row) dark and light, and the compact layout.

An earlier run with random temp project paths differed only in project identity colors and test
ids, which derive from the path; fixing the paths removed those differences.
