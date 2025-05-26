# Panel Styling Standardization Guide

This guide outlines how to apply the standardized panel styling across the application while keeping DialogueBox components untouched.

## Overview

We've created a reusable panel system with consistent styling based on the language selection panel's design:

1. `AppPanel` - Main container component with standardized background, border, and effects
2. `PanelElements` - Set of UI components for use within panels (buttons, inputs, etc.)
3. Added CSS utility classes in `index.css` for consistent styling

## Components Available

- **`<AppPanel>`** - The main panel container
- **`<PanelBackdrop>`** - Fullscreen backdrop with centered content
- **`<PanelTitle>`** - Section title with optional animation
- **`<PanelButton>`** - Styled buttons with variants
- **`<PanelInput>`** - Text inputs
- **`<PanelSelect>`** - Dropdown selects
- **`<PanelDot>`** - Animated dots for visual indicators

## Migration Steps

For each panel in the application (except DialogueBox components):

1. Import the necessary components:
   ```tsx
   import AppPanel from './components/AppPanel';
   import { PanelBackdrop } from './components/AppPanel';
   import { PanelTitle, PanelButton, PanelInput, PanelSelect } from './components/PanelElements';
   ```

2. Replace the outer container with `PanelBackdrop` and `AppPanel`:
   ```tsx
   // Before
   <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40">
     <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700">
       {/* Panel content */}
     </div>
   </div>

   // After
   <PanelBackdrop zIndex={10}>
     <AppPanel width={600} height="auto">
       {/* Panel content */}
     </AppPanel>
   </PanelBackdrop>
   ```

3. Replace titles with `PanelTitle`:
   ```tsx
   // Before
   <h2 className="text-xl font-bold text-white">Panel Title</h2>

   // After
   <PanelTitle>Panel Title</PanelTitle>
   ```

4. Update buttons:
   ```tsx
   // Before
   <button 
     onClick={handleAction}
     className="px-4 py-2 bg-blue-600 text-white rounded-lg"
   >
     Action
   </button>

   // After
   <PanelButton 
     onClick={handleAction} 
     variant="primary"
   >
     Action
   </PanelButton>
   ```

5. Update inputs:
   ```tsx
   // Before
   <input
     type="text"
     value={value}
     onChange={handleChange}
     className="bg-slate-700 text-white rounded-lg p-2"
   />

   // After
   <PanelInput
     type="text"
     value={value}
     onChange={handleChange}
   />
   ```

## Example: HelperRobotPanel

The `HelperRobotPanel` component has been migrated as an example. Use it as a reference when updating other panels.

## CSS Classes

You can also use the utility classes directly:

- `.panel-heading` - For headings
- `.panel-input` - For inputs
- `.panel-btn` - For secondary buttons
- `.panel-btn-primary` - For primary buttons
- `.panel-dot`, `.panel-dot-blue`, `.panel-dot-purple` - For animated dots
- `.animate-pulse-subtle` - For subtle animation

## Testing

After migrating each panel:

1. Check that the panel appears with the correct styling
2. Verify all functionality still works
3. Ensure consistent spacing and layout
4. Test on different screen sizes

## Panels to Update

- ✅ HelperRobotPanel (already migrated)
- ☐ DialogueSelectionPanel
- ☐ LanguagePanel (if needed beyond original)
- ☐ Login/Auth panels
- ☐ Any other modals/overlays except DialogueBox

## Support

For questions about implementation, refer to the examples or contact the team lead. 