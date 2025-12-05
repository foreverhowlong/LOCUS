Engineering Directive: Critical Bug Fixes for Locus MVP (v0.1)

To: Engineering Team
From: Product Management
Subject: High-Priority Fixes for UI Glitches & Missing Features
Status: Immediate Action Required

We have identified 4 critical issues in the current Electron/React build that are blocking usability testing. Please implement the following logical fixes immediately.

1. Fix: Selection Menu "Flickering" & Unclickable

The Issue:
When users drag to select text, the "Lens Ribbon" menu appears and disappears rapidly (flickers). When they try to click a button (e.g., "Philology"), the text selection clears immediately, causing the menu to vanish before the action triggers.

Technical Root Cause:

Flickering: The menu rendering is likely bound to selectionchange or mousemove events, which trigger too frequently during the drag operation.

Unclickable: Clicking the menu button triggers a browser blur event on the text selection, causing the browser to deselect the text.

Required Implementation Logic:

Event Change: Stop listening to selectionchange for rendering the menu. Instead, attach a listener to the onMouseUp event on the Reader container. Only calculate the selection position when the user releases the mouse button.

Prevent Focus Theft: You must add a handler to the Menu Container itself (the div wrapping the buttons) to intercept the mousedown event. inside this handler, call e.preventDefault(). This tells the browser: "Do not move focus away from the text when I click this button."

2. Fix: Broken "Follow-up" Chat Logic

The Issue:
Users cannot continue the conversation after the first AI response. Typing in the input box and hitting Enter does nothing, or the AI responds without knowing what was discussed previously.

Technical Root Cause:

Input state management is likely disconnected from the submission handler.

Critical: The API call is likely sending only the new message, dropping the previous conversation context.

Required Implementation Logic:

Context Persistence: When the user sends a follow-up message, you must construct the API payload to include the entire chatHistory array plus the new message. Do not send the new message in isolation.

UI Optimism: Immediately append the user's message to the local chat state (setChatHistory) so the UI updates instantly, then trigger the loading state while waiting for the API.

3. Fix: Page Navigation Focus (Keyboard Arrows)

The Issue:
Left/Right arrow keys do not turn the page unless the user explicitly clicks the text area first.

Technical Root Cause:
The keydown event listener is attached to a specific <div> (e.g., the Reader component), which requires focus to capture events.

Required Implementation Logic:

Global Listener: Move the event listener from the div to the global window object using a useEffect hook.

Input Guard: Inside the event handler, check document.activeElement.tagName. If the user is currently typing in an <INPUT> or <TEXTAREA> (e.g., writing a note), return early and do not trigger the page turn. This prevents the book from flipping pages while the user is typing.

4. Feature Implementation: The "Lantern" (Discovery)

The Issue:
The "Discovery" feature (scanning the page for hidden context) is missing from the build.

Required Implementation Logic:

UI Component: Add a Floating Action Button (FAB) in the bottom-right corner (z-index: 50). Use the Sparkles icon.

Interaction:

On click, access the current page's content. If using react-reader or epub.js, use the rendition.currentLocation() to find the visible text range, or simply grab the innerText of the visible container for the MVP.

Send this block of text to the AI with a specific prompt: "Scan this page text for hidden historical context, intertextuality, or philosophical nuances that a modern reader might miss."

Trigger the Sidebar to open and stream the AI's response.