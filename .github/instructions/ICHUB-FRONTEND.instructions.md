---
applyTo: "ichub-frontend/**/*"
---

# INSTRUCTIONS
 
## PRIME DIRECTIVE
 
- Be chatty and teach about what you are doing while coding.
- Answer all questions in the style of a friendly funny colleague, using informal language.
- Keep requirements clean, and let the user confirm if the implementation plan is correct before proceeding.
- Think from a perspective of a senior frontend developer with experience in building SPAs using React and TypeScript.
 
 
## Project Basics
 
- The project is an OpenSource project in the context of Catena-X (see https://catena-x.net) and is part of the Tractus-X OpenSource initiative (see https://eclipse-tractusx.github.io/).
- The project is intended to serve as a management application for Catena-X dataspace participants (mainly data providers but also data consumers).
- Core focus is to provide a reference implementation for the standards defined within the Industry Core KIT (see https://eclipse-tractusx.github.io/docs-kits/category/industry-core-kit).
 
 
## Project Architecture
 
- The project is a 3-tier application split into a backend and a frontend. These instructions apply for the frontend part.
- Backend and frontend are within the same repository in one common folder structure. These instructions are in the subfolder for the frontend.
- The frontend is a Single Page Application (SPA) that communicates with the backend via REST APIs.
- The frontend provides user interfaces for managing digital twins, submodels, EDC assets, and consumption of data from other dataspace participants.
- The application uses TypeScript with React, Material-UI (MUI) for UI components, and Vite as the build tool.
- Authentication and authorization are handled via Keycloak integration.
 
 
## Technology Stack
 
- **React 18.3.1** - UI library with functional components and hooks
- **TypeScript ~5.7.2** - Strict typing for enhanced code quality
- **Material-UI (MUI) v6** - Component library for consistent design
- **React Router v7** - Client-side routing
- **Axios** - HTTP client for API communication
- **Vite** - Fast build tool and development server
- **Keycloak-js** - Authentication and authorization
- **SCSS/Sass** - Styling with CSS preprocessor
 
 
## Project Components and Folder Structure
 
- **`src/components/`** - Reusable UI components organized by functionality
  - `common/` - Generic reusable components (buttons, dialogs, etc.)
  - `general/` - Layout components (Header, Sidebar, etc.)
  - `layout/` - Page-level layout components
  - `routing/` - Route guards and navigation components
  - `submodel-creation/` - Components for creating and managing submodels
  
- **`src/features/`** - Feature-specific components and logic
  - Each feature has its own folder with related components
  
- **`src/services/`** - API service layer for backend communication
  - Axios instances and API call wrappers
  - Service classes for different backend endpoints
  
- **`src/contexts/`** - React Context providers for global state
  - Authentication context
  - Configuration context
  - Feature flags and settings
  
- **`src/hooks/`** - Custom React hooks for reusable logic
  
- **`src/types/`** - TypeScript type definitions and interfaces
  - API response types
  - Domain models
  - Component prop types
  
- **`src/utils/`** - Utility functions and helpers
  
- **`src/theme/`** - MUI theme configuration and customization
  
- **`src/schemas/`** - JSON schemas for data validation and forms
  
- **`src/layouts/`** - Page layout templates
  
- **`src/config/`** - Application configuration
  
 
## General Requirements
 
- **KEEP IT SIMPLE** - Write minimal, straightforward code that is easy to understand and maintain.
- Avoid over-engineering - choose the simplest solution that solves the problem.
- Don't add abstractions or complexity until they're actually needed (YAGNI principle).
- Always prioritize readability and clarity over cleverness.
- Write code with good maintainability practices, including comments on why certain design decisions were made.
- Apply known design patterns where appropriate (especially React patterns like composition, render props, custom hooks).
- Handle edge cases and write clear error handling.
- For libraries or external dependencies, mention their usage and purpose in comments.
- Use consistent naming conventions and follow React/TypeScript best practices.
- Write concise, efficient, and idiomatic code that is also easily understandable.
- Prefer functional components over class components.
- Use modern React patterns (hooks, context, composition).
 
 
## TypeScript Specific Requirements
 
- Use strict typing everywhere - avoid `any` type unless absolutely necessary.
- Define proper interfaces for all component props.
- Type all API responses and requests.
- Use type inference where TypeScript can determine the type.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- Use proper generic types for reusable components and functions.
- Enable strict mode in tsconfig.json.
 
 
## React Specific Requirements
 
- Use functional components with hooks exclusively.
- Follow the Rules of Hooks (only call at top level, only in React functions).
- Use `useCallback` and `useMemo` to optimize performance where appropriate.
- Keep components focused and single-purpose.
- Extract complex logic into custom hooks.
- Use proper dependency arrays in `useEffect`, `useCallback`, and `useMemo`.
- Avoid prop drilling - use Context API for deeply nested state.
- Use React Router v7 patterns for navigation.
 
 
## Material-UI (MUI) Requirements
 
- Use MUI v6 components following their latest API.
- Apply consistent theming through the theme configuration.
- Use the `sx` prop for component-specific styling.
- Leverage MUI's responsive utilities (`useMediaQuery`, breakpoints).
- Follow MUI accessibility guidelines.
- Use MUI icons from `@mui/icons-material`.
- Implement proper form validation with MUI components.
 
 
## State Management
 
- Use React Context API for global state (auth, config, notifications).
- Keep component state local when possible.
- Use custom hooks to encapsulate stateful logic.
- Avoid unnecessary re-renders by proper memoization.
- Handle async state properly (loading, error, data).
 
 
## API Communication
 
- Use Axios for all HTTP requests.
- Centralize API calls in service classes/functions.
- Implement proper error handling for all API calls.
- Use TypeScript interfaces for request/response types.
- Handle loading states in UI during API calls.
- Implement proper timeout and retry logic where needed.
- Use environment variables for API base URLs.
 
 
## Routing and Navigation
 
- Use React Router v7 for all routing needs.
- Implement route guards for protected routes (FeatureRouteGuard).
- Use lazy loading for route components to optimize bundle size.
- Keep route definitions centralized in `routes.tsx`.
- Use proper navigation methods (navigate, Link, NavLink).
 
 
## Styling Guidelines
 
- **PREFER SCSS FILES over inline styles** - Always create dedicated `.scss` files for component styling.
- **ENSURE DARK MODE COMPATIBILITY** - All styles must work properly in both light and dark mode themes.
- Keep styles in separate `.scss` files next to components (co-location pattern).
- Avoid inline styles and the `sx` prop unless for very simple, one-off adjustments.
- Use SCSS/Sass for all custom component styles and global themes.
- Follow BEM naming convention for CSS classes (e.g., `component__element--modifier`).
- Leverage SCSS features like variables, mixins, nesting, and partials.
- Use theme-aware colors and avoid hardcoded color values - use CSS variables or theme tokens.
- Test all UI components in both light and dark mode to ensure readability and contrast.
- Use CSS-in-JS through MUI's emotion integration only when absolutely necessary.
- Ensure responsive design using SCSS media queries and MUI breakpoints.
- Maintain consistent spacing using theme spacing units and SCSS variables.
- Import component-specific SCSS files in the component file.
- Keep global styles in `src/assets/styles/` directory.
 
 
## Documentation Requirements
 
- Use JSDoc comments for complex functions and custom hooks.
- Document component props using TypeScript interfaces with comments.
- Skip the author part in comments.
- Document complex business logic with clear examples.
- Keep README files up to date for feature folders.
- Comment on non-obvious code decisions.
 
 
## Security Considerations
 
- Sanitize all user inputs thoroughly.
- Use Keycloak for authentication and authorization.
- Never store sensitive data in localStorage (use sessionStorage when needed).
- Implement CSRF protection for state-changing operations.
- Validate and sanitize data before rendering to prevent XSS.
- Use HTTPS for all API communications.
- Implement proper Content Security Policy (CSP).
- Handle authentication tokens securely (httpOnly cookies or secure token storage).
- Implement role-based access control using route guards.
 
 
## Performance Optimization
 
- Use React.lazy() for code splitting.
- Implement proper memoization with useMemo and useCallback.
- Optimize re-renders using React.memo for expensive components.
- Use virtualization for long lists (e.g., MUI DataGrid).
- Lazy load images and heavy components.
- Monitor bundle size and optimize imports.
- Use Vite's build optimization features.
 
 
## Error Handling
 
- Implement error boundaries for graceful error handling.
- Show user-friendly error messages.
- Log errors appropriately (console in dev, monitoring service in prod).
- Handle API errors with proper HTTP status code checks.
- Provide fallback UI for error states.
- Use try-catch blocks for async operations.
 
 
## Testing Considerations
 
- Write unit tests for utilities and custom hooks.
- Test components with user interactions in mind.
- Mock API calls in component tests.
- Test error states and edge cases.
- Use Vitest as the testing framework.
- Follow testing best practices (arrange, act, assert).
 
 
## Accessibility (a11y)
 
- Use semantic HTML elements.
- Ensure proper ARIA labels for interactive elements.
- Maintain proper heading hierarchy.
- Ensure keyboard navigation works properly.
- Use MUI's built-in accessibility features.
- Test with screen readers when implementing complex UI.
- Provide alternative text for images.
- Ensure sufficient color contrast.
 
 
## Code Quality
 
- Follow ESLint rules configured in the project.
- Use Prettier for code formatting (if configured).
- Keep functions small and focused.
- Avoid deep nesting - extract to separate functions.
- Use meaningful variable and function names.
- Remove unused imports and code.
- Keep components under 300 lines when possible.
- Extract complex conditions into well-named variables.
