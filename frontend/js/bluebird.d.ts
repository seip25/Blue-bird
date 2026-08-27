/**
 * Blue Bird CSS & JS Frontend Type Definitions
 * Complete IDE IntelliSense and autocompletion for components and UI helpers.
 * @module bluebird
 */

/**
 * Valid UI component names supported by the Blue Bird JS runtime.
 */
export type BlueBirdComponent =
  | "snackbar"
  | "toast"
  | "tab"
  | "command"
  | "popover"
  | "drawer"
  | "modal"
  | "carousel"
  | "theme"
  | "copy"
  | "datatable"
  | "table";

/**
 * Configuration options for the Snackbar component.
 */
export interface BlueBirdSnackbarOptions {
  /** Text message to display inside the snackbar. */
  message?: string;
  /** Visual theme variant. Defaults to 'info'. */
  type?: "info" | "success" | "error" | "warning";
  /** Duration in milliseconds before auto-dismissing. Defaults to 3000ms. */
  duration?: number;
}

/**
 * Configuration options for the Multi-Toast Notification System.
 */
export interface BlueBirdToastOptions {
  /** Optional bold header title for the toast. */
  title?: string;
  /** Optional detailed subtitle or description. */
  description?: string;
  /** Main body message content. */
  message?: string;
  /** Visual type styling. Defaults to 'info'. */
  type?: "info" | "success" | "error" | "warning";
  /** Screen position anchor. Defaults to 'bottom-right'. */
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
  /** Auto-dismiss duration in milliseconds (set to 0 for persistent toast). Defaults to 4000ms. */
  duration?: number;
}

/**
 * Options for switching tab panels.
 */
export interface BlueBirdTabOptions {
  /** The element ID of the target .tab-content panel to activate. */
  id: string;
}

/**
 * Options for the Command Palette (`Ctrl+K` / `Cmd+K`).
 */
export interface BlueBirdCommandOptions {
  /** Action to perform on the command palette modal. Defaults to 'toggle'. */
  action?: "open" | "close" | "toggle";
}

/**
 * Options for Popover elements.
 */
export interface BlueBirdPopoverOptions {
  /** ID or data-popover-id of the target popover element. */
  id: string;
  /** Action to perform. Defaults to 'toggle'. */
  action?: "open" | "close" | "toggle";
}

/**
 * Options for Side Drawers and off-canvas menus.
 */
export interface BlueBirdDrawerOptions {
  /** Element ID of the .drawer container. */
  id: string;
  /** Action to perform. Defaults to 'toggle'. */
  action?: "open" | "close" | "toggle";
}

/**
 * Options for Dialog Modals.
 */
export interface BlueBirdModalOptions {
  /** Element ID of the .modal container. */
  id: string;
  /** Action to perform. Defaults to 'toggle'. */
  action?: "open" | "close" | "toggle";
}

/**
 * Options for Image / Content Carousels.
 */
export interface BlueBirdCarouselOptions {
  /** Optional element ID of the target .carousel. */
  id?: string;
  /** Carousel slide navigation action. */
  action?: "next" | "prev" | "goto";
  /** Target 0-based slide index when using action: 'goto'. */
  index?: number;
}

/**
 * Options for Color Theme switcher.
 */
export interface BlueBirdThemeOptions {
  /** Action to perform on application theme. */
  action?: "toggle" | "set";
  /** Target theme when using action: 'set'. */
  theme?: "light" | "dark";
}

/**
 * Options for Clipboard copying helper.
 */
export interface BlueBirdCopyOptions {
  /** Text string to copy to clipboard. */
  text: string;
  /** Whether to show automatic snackbar/toast feedback on copy. Defaults to true. */
  feedback?: boolean;
}

/**
 * Column definition for ResponsiveDataTable.
 */
export interface ResponsiveDataTableColumn<T = any> {
  /** The data key property name. */
  key: keyof T | string;
  /** Custom header title text. If omitted, key is used. */
  title?: string;
}

/**
 * Configuration options for ResponsiveDataTable.
 */
export interface ResponsiveDataTableOptions<T = any> {
  /** Array of data objects to display. */
  data?: T[];
  /** Column definitions. */
  columns?: ResponsiveDataTableColumn<T>[];
  /** Rows per page. Defaults to 10. */
  rowsPerPage?: number;
  /** Enable search input. Defaults to true. */
  search?: boolean;
  /** Enable pagination controls. Defaults to true. */
  pagination?: boolean;
  /** Custom header titles mapping ({ key: 'Custom Title' }). */
  headerTitles?: Record<string, string>;
  /** Key names to display in the card header on mobile view. Defaults to ['id']. */
  summaryFields?: string[];
  /** Enable edit button or provide click callback `(event, item) => void`. */
  edit?: boolean | ((event: MouseEvent, item: T) => void) | string;
  /** Enable delete button or provide click callback `(event, item) => void`. */
  delete?: boolean | ((event: MouseEvent, item: T) => void) | string;
  /** Responsive mobile breakpoint in pixels. Defaults to 768. */
  breakpoint?: number;
  /** Container element or ID. */
  container?: string | HTMLElement;
  /** Container ID alias. */
  id?: string;
}

/**
 * Responsive Data Table class with mobile card layout, live search, and pagination.
 */
export class ResponsiveDataTable<T = any> {
  container: HTMLElement;
  options: ResponsiveDataTableOptions<T>;
  currentPage: number;
  filteredData: T[];
  isMobile: boolean;

  /**
   * Initializes a new ResponsiveDataTable instance.
   * @param containerId - ID of the container element or HTMLElement.
   * @param options - Table configuration options.
   * @example
   * const table = new ResponsiveDataTable('users-table', {
   *   data: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
   *   columns: [
   *     { key: 'id', title: 'ID' },
   *     { key: 'name', title: 'Name' },
   *     { key: 'email', title: 'Email' }
   *   ],
   *   rowsPerPage: 10,
   *   search: true,
   *   pagination: true,
   *   edit: (e, user) => console.log('Edit', user),
   *   delete: (e, user) => console.log('Delete', user)
   * });
   */
  constructor(containerId: string | HTMLElement, options?: ResponsiveDataTableOptions<T>);

  /** Updates the table with new data and resets to page 1. */
  updateData(newData: T[]): void;

  /** Updates the column schema and re-renders table. */
  updateColumns(newColumns: ResponsiveDataTableColumn<T>[]): void;

  /** Navigates to the specified page number. */
  changePage(page: number): void;
}

/**
 * Universal Blue Bird JavaScript helper function.
 */
export interface BlueBirdHelper {
  /**
   * Displays a single notification snackbar at the bottom of the screen.
   * @param component - Component identifier ('snackbar').
   * @param options - Configuration options.
   * @example
   * bluebird('snackbar', {
   *   message: 'Changes saved successfully!',
   *   type: 'success',
   *   duration: 3000
   * });
   */
  (component: "snackbar", options?: BlueBirdSnackbarOptions): void;

  /**
   * Spawns a floating toast notification in the specified screen position.
   * @param component - Component identifier ('toast').
   * @param options - Toast configuration options.
   * @example
   * bluebird('toast', {
   *   title: 'New Message',
   *   message: 'You received a notification from Alice',
   *   type: 'info',
   *   position: 'top-right',
   *   duration: 4000
   * });
   */
  (component: "toast", options?: BlueBirdToastOptions): void;

  /**
   * Activates a tab content panel and highlights its corresponding tab trigger.
   * @param component - Component identifier ('tab').
   * @param options - Target tab ID.
   * @example
   * bluebird('tab', { id: 'tab-security' });
   */
  (component: "tab", options?: BlueBirdTabOptions): void;

  /**
   * Controls the global command palette modal (`Ctrl+K` / `Cmd+K`).
   * @param component - Component identifier ('command').
   * @param options - Action to perform.
   * @example
   * bluebird('command', { action: 'open' });
   */
  (component: "command", options?: BlueBirdCommandOptions): void;

  /**
   * Shows, hides, or toggles a popover dropdown by element ID.
   * @param component - Component identifier ('popover').
   * @param options - Popover target ID and action.
   * @example
   * bluebird('popover', { id: 'user-profile-menu', action: 'toggle' });
   */
  (component: "popover", options?: BlueBirdPopoverOptions): void;

  /**
   * Opens or closes a slide-out drawer menu with background backdrop.
   * @param component - Component identifier ('drawer').
   * @param options - Drawer element ID and action.
   * @example
   * bluebird('drawer', { id: 'mobile-nav', action: 'open' });
   */
  (component: "drawer", options?: BlueBirdDrawerOptions): void;

  /**
   * Shows or hides an accessible dialog modal.
   * @param component - Component identifier ('modal').
   * @param options - Modal element ID and action.
   * @example
   * bluebird('modal', { id: 'delete-confirm-modal', action: 'open' });
   */
  (component: "modal", options?: BlueBirdModalOptions): void;

  /**
   * Controls carousel slides navigation (next, previous, or jump to index).
   * @param component - Component identifier ('carousel').
   * @param options - Carousel ID and slide action.
   * @example
   * bluebird('carousel', { id: 'hero-slider', action: 'next' });
   */
  (component: "carousel", options?: BlueBirdCarouselOptions): void;

  /**
   * Toggles or sets the color theme mode (light / dark) and persists preference to localStorage.
   * @param component - Component identifier ('theme').
   * @param options - Theme action and target mode.
   * @example
   * bluebird('theme', { action: 'toggle' });
   */
  (component: "theme", options?: BlueBirdThemeOptions): void;

  /**
   * Copies text string to clipboard with optional user feedback.
   * @param component - Component identifier ('copy').
   * @param options - Text to copy.
   * @example
   * bluebird('copy', { text: 'https://myapp.com', feedback: true });
   */
  (component: "copy", options?: BlueBirdCopyOptions): void;

  /**
   * Initializes and renders a ResponsiveDataTable.
   * @param component - Component identifier ('datatable' | 'table').
   * @param options - Data table options and container ID.
   * @example
   * bluebird('datatable', {
   *   container: 'users-table',
   *   data: [{ id: 1, name: 'Alice' }],
   *   columns: [{ key: 'id', title: 'ID' }, { key: 'name', title: 'Name' }]
   * });
   */
  <T = any>(
    component: "datatable" | "table",
    options: ResponsiveDataTableOptions<T>
  ): ResponsiveDataTable<T>;

  /**
   * Shorthand snackbar invocation.
   * @param options - Snackbar options object.
   * @example
   * bluebird({ message: 'Quick alert message', type: 'warning' });
   */
  (options: BlueBirdSnackbarOptions): void;

  /**
   * Generic component dispatcher.
   */
  (component: string, options?: any): any;
}

/**
 * Modern fetch wrapper with automatic CSRF token support, credentials inclusion, and JSON error handling.
 * @param url - Target endpoint URL. Defaults to '/'.
 * @param method - HTTP method. Defaults to 'GET'.
 * @param body - JSON body object. Defaults to false.
 * @param bodyForm - FormData payload. Defaults to false.
 * @param headers - Custom HTTP headers.
 * @returns Parsed JSON response.
 * @example
 * const data = await Http('/api/users', 'POST', { name: 'Alice' });
 */
export function Http<T = any>(
  url?: string,
  method?: string,
  body?: any,
  bodyForm?: FormData | boolean,
  headers?: Record<string, string>
): Promise<T>;

/**
 * Extracts a query parameter from the current URL search string.
 * @param name - Query parameter key name.
 * @returns Parameter value string or null.
 * @example
 * const userId = getUrlParameter('id');
 */
export function getUrlParameter(name: string): string | null;

/**
 * Displays a single notification snackbar at the bottom of the screen.
 * @param options - Snackbar configuration options.
 */
export function snackbar(options: BlueBirdSnackbarOptions): void;

/**
 * Spawns a floating toast notification.
 * @param options - Toast configuration options.
 */
export function toast(options: BlueBirdToastOptions): void;

declare global {
  /** Global Blue Bird Frontend Helper */
  const bluebird: BlueBirdHelper;
  /** Responsive Data Table class */
  const ResponsiveDataTable: typeof import("./bluebird.js").ResponsiveDataTable;
  /** Modern fetch wrapper with automatic CSRF token support */
  const Http: typeof import("./bluebird.js").Http;
  /** Extracts a query parameter from the current URL search string */
  const getUrlParameter: typeof import("./bluebird.js").getUrlParameter;
  /** Displays a single notification snackbar */
  const snackbar: typeof import("./bluebird.js").snackbar;
  /** Spawns a floating toast notification */
  const toast: typeof import("./bluebird.js").toast;

  interface Window {
    /** Global Blue Bird Frontend Helper */
    bluebird: BlueBirdHelper;
    /** Responsive Data Table class */
    ResponsiveDataTable: typeof ResponsiveDataTable;
    /** Modern fetch wrapper with automatic CSRF token support */
    Http: typeof Http;
    /** Extracts a query parameter from the current URL search string */
    getUrlParameter: typeof getUrlParameter;
    /** Displays a single notification snackbar */
    snackbar: typeof snackbar;
    /** Spawns a floating toast notification */
    toast: typeof toast;
  }
}

export default bluebird;
