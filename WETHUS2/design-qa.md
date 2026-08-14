# Network Home Integration Design QA

## Evidence

- Source visual truth: `C:\Users\anseo\.codex\generated_images\019ef776-f913-7e73-b429-b22610284dd1\exec-2d1c083f-ff22-400e-8ff2-b89443fceab1.png`
- Desktop implementation screenshot: `C:\Users\anseo\.codex\visualizations\2026\06\24\019ef776-f913-7e73-b429-b22610284dd1\wethus-network-home-integrated-desktop.png`
- Full responsive capture: `C:\Users\anseo\.codex\visualizations\2026\06\24\019ef776-f913-7e73-b429-b22610284dd1\wethus-network-home-integrated-full.png`
- Desktop combined comparison: `C:\Users\anseo\.codex\visualizations\2026\06\24\019ef776-f913-7e73-b429-b22610284dd1\wethus-network-home-design-qa-desktop.png`
- Source pixels: 1672 x 941 at desktop density.
- Desktop browser CSS viewport: 1280 x 720 at device pixel ratio 1.5.
- Desktop implementation capture pixels: 1265 x 712; the in-app browser capture excludes its scrollbar/chrome edge.
- Normalization: the source and implementation are both 16:9 desktop states. The source was resized to the implementation capture dimensions and placed beside it in one comparison image for direct structural review.
- State: authenticated local preview, first project selected, default hero slide, no pending connection requests, five-message AI starter conversation.

## Full-View Comparison

- The selected dark three-region composition, bold typography, orange focus color, photographic project hero, people cards, work rows, and full-height AI conversation remain visually consistent with the source concept.
- Per the latest product direction, the concept's standalone `WETHUS.` header is intentionally replaced by the existing WETHUS global header. The original wordmark size, navigation links, profile chip, notification badge, and quick-menu control are preserved.
- At 1280 CSS pixels all three regions remain visible with measured tracks of 243 px, 694 px, and 264 px. The proportions closely follow the source while the original WETHUS header remains intact.
- At 949 CSS pixels the left profile/calendar rail moves below the center workspace while the center and AI regions remain side by side. This responsive state has no horizontal page overflow.

## Focused Comparison

- Header/content seam: the existing sticky header ends at 63 px and the dashboard grid begins at 63 px, with its first card at 79 px. The duplicate rounded app frame, duplicate logo, and duplicate navigation are absent.
- Center/AI relationship: both primary regions begin on the same baseline, retain a 14 px gap, and keep the AI composer visible within the panel.
- No additional crop was needed because the combined comparison keeps the header seam, hero, recommendation cards, work list, and AI panel legible at once.

## Fidelity Surfaces

- Typography: Pretendard remains the product font; headings and controls use semibold/bold weights matching the selected direction, with no visible clipping or unintended wrapping.
- Spacing/layout: panel gaps, radii, card rhythm, and the center-to-AI proportion remain consistent. The outer dashboard shell no longer introduces a second border or radius around the old service.
- Colors/tokens: black surfaces, subtle glass borders, orange actions, green connected-state indicator, and muted secondary text remain coherent with the source and existing WETHUS palette.
- Image quality: the generated project hero and four portrait assets are sharp WebP assets with appropriate crops; no placeholder graphics or CSS-drawn image substitutes are visible.
- Copy/content: project, connection, work, and AI copy are realistic Korean product data and remain tied to the selected project.

## Interaction Verification

- Existing profile dropdown and quick-menu drawer opened successfully from the preserved global header on both local and deployed previews.
- Hero carousel, connection request toggle, work completion, calendar navigation, AI conversation, and AI action application were exercised during implementation.
- Test-created connection and chat state were returned to the default preview state.
- Browser console error log: empty.

## Comparison History

- Earlier P1: the new dashboard rendered a second standalone topbar and hid the existing WETHUS header, duplicating the logo/navigation and dropping established account/menu behavior.
- Fix: stopped hiding `body > .nav`, removed the generated topbar from dashboard rendering, removed the outer app-frame border/radius, reused the existing wordmark target, and synchronized dashboard height to the existing header.
- Post-fix evidence: zero `.nh-topbar` nodes, original header controls visible and interactive, header bottom and dashboard grid top both at 63 px, and no horizontal overflow.
- Current P0/P1/P2 findings: none.

## Follow-Up Polish

- No blocking or required visual follow-up remains for this integration pass.

final result: passed
