# BA Design System v0.2.0

Shared CSS and React component adoption runtime load from the BA repository through pinned CDN URLs in index.html. No design-system implementation or folder belongs in this project.

Page uses background/neutral/page; Sidebar, Topbar and Surface use background/neutral/default. Buttons declare explicit variants, tones and sizes; ghost borders follow currentColor. Main product headings use Display (The Seasons).

Existing tool behavior and DOM listeners are retained by the central React adapter. New React views can use createReactComponents(React) from BA dist/browser-components.mjs; both paths use the same component attributes and CSS. The tools themselves remain HTML/JavaScript applications during this transition.

Canonical source: https://github.com/shubhamarya-uxnai/BA-Design-Sytem/tree/v0.2.0
