# Project Overview

## Tech Stack

- **Framework**: Angular (v22+) using the application builder.
- **State**: Signals for component state; RxJS for asynchronous operations (HTTP requests).
- **Testing**: Vitest for unit testing.
- **Internationalization (i18n)**: `ngx-translate` for multi-language support.
- **Security**: FingerprintJS for device identification.


## Project architecture

### `core/`

Global singleton services and infrastructure logic.

- **`directives/`**: Core directives (e.g., loader handling).
- **`initializers/`**: App initialization (Config, I18n).
- **`interceptors/`**: Standardized HTTP communication (API URL, Device ID, Loader, etc.).
- **`services/`**: Infrastructure services (Theme, Storage, I18n, etc.).
- **`navigation-configs/`**: Definitions for navigation menus.

### `entities/`

Domain-specific components and "smart" UI elements (e.g., Header, SideNav, UserWidget).

### `pages/`

Route-level components (Screens) and page-specific logic:

- **`private/`**: Authenticated area (Dashboard, Strategies, Activity, Billing, Credentials).
- **`public/`**: Publicly accessible pages, including Auth logic (Sign In/Up), Privacy, Terms, and Page Not Found.

### `shared/`

Reusable, "dumb" UI elements and common utilities.

- **`ui/`**: Pure UI Kit components (Buttons, Inputs, Callouts, Avatar, Badge, Strategy Card, Theme Toggle, Top Bar, etc.).
- **`theme/`**: Design system tokens and CSS variables.
