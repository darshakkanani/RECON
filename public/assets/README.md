# ADIYOGI Frontend Assets

This directory contains the separated CSS and JavaScript files for the ADIYOGI platform frontend.

## Directory Structure

```
assets/
├── css/
│   ├── base.css        # Common styles shared across all pages
│   ├── dashboard.css   # Dashboard-specific styles
│   ├── home.css        # Home page-specific styles
│   └── recon.css       # Recon hub-specific styles
└── js/
    ├── common.js       # Shared JavaScript functionality
    ├── dashboard.js    # Dashboard-specific JavaScript
    └── recon.js        # Recon hub-specific JavaScript
```

## CSS Files

### base.css
- **Purpose**: Common styles shared across all pages
- **Contains**: 
  - Reset styles and base typography
  - Common button styles (.btn, .btn-primary, etc.)
  - Card components (.card, .card-header, etc.)
  - Layout utilities (.grid, .flex, etc.)
  - Text utilities (.text-primary, .text-center, etc.)
  - Spacing utilities (.mb-4, .p-6, etc.)
  - Scrollbar styling
  - Status indicators

### dashboard.css
- **Purpose**: Dashboard-specific styles
- **Contains**:
  - Top navigation styles
  - Sidebar styles
  - Dashboard grid layouts
  - Performance charts
  - System monitoring components

### home.css
- **Purpose**: Home page-specific styles
- **Contains**:
  - Animated background effects
  - Hero section styling
  - Feature cards
  - Action buttons with hover effects
  - Responsive design for mobile

### recon.css
- **Purpose**: Recon hub-specific styles
- **Contains**:
  - Recon grid layouts
  - Tool category cards
  - Enhanced hover effects
  - Category-specific color coding
  - Search and filtering styles

## JavaScript Files

### common.js
- **Purpose**: Shared functionality across all pages
- **Contains**:
  - Utility functions (formatBytes, formatUptime, etc.)
  - API functions (getStats, getHealth, getTools)
  - Navigation helpers
  - Common event handlers
  - Auto-initialization

### dashboard.js
- **Purpose**: Dashboard-specific functionality
- **Contains**:
  - Tab navigation
  - Real-time system monitoring
  - Performance chart updates
  - Card hover effects
  - API data integration

### recon.js
- **Purpose**: Recon hub-specific functionality
- **Contains**:
  - Enhanced navigation and routing
  - Category filtering and search
  - Smooth scrolling to sections
  - Card animations and effects
  - Tool statistics integration
  - Dynamic search functionality

## Usage in HTML Files

### Including CSS Files
```html
<head>
    <!-- Always include base.css first -->
    <link rel="stylesheet" href="../assets/css/base.css">
    <!-- Then include page-specific CSS -->
    <link rel="stylesheet" href="../assets/css/dashboard.css">
</head>
```

### Including JavaScript Files
```html
<body>
    <!-- Include common.js first -->
    <script src="../assets/js/common.js"></script>
    <!-- Then include page-specific JavaScript -->
    <script src="../assets/js/dashboard.js"></script>
</body>
```

## Benefits of This Structure

1. **Maintainability**: Easier to maintain and update styles/scripts
2. **Reusability**: Common components can be reused across pages
3. **Performance**: Better caching and smaller file sizes
4. **Organization**: Clear separation of concerns
5. **Scalability**: Easy to add new pages and components

## Adding New Pages

When creating new pages:

1. Create a new CSS file in `assets/css/` for page-specific styles
2. Create a new JS file in `assets/js/` for page-specific functionality
3. Always include `base.css` and `common.js` first
4. Follow the existing naming conventions and structure

## Original Files

Original files with inline styles/scripts have been preserved with `-original.html` suffix for reference.
