// Common styles for admin components

// Card styles
export const cardStyles = {
  default: "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-md overflow-hidden transition-colors duration-200",
  header: "px-6 py-4 bg-primary/5 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200",
  headerTitle: "text-lg font-semibold text-primary dark:text-white transition-colors duration-200",
  body: "p-6 text-gray-900 dark:text-white transition-colors duration-200",
  footer: "px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200",
};

// Table styles
export const tableStyles = {
  wrapper: "overflow-x-auto rounded-lg shadow",
  table: "min-w-full divide-y divide-gray-200 dark:divide-gray-700",
  tableHeader: "bg-gray-50 dark:bg-gray-700 transition-colors duration-200",
  tableHeaderCell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 transition-colors duration-200",
  tableBody: "bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700 transition-colors duration-200",
  tableRow: "hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors duration-200",
  tableRowStriped: "even:bg-gray-50 even:dark:bg-gray-700/30",
  tableCell: "px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200",
  pagination: "mt-4 flex justify-between items-center",
};

// Button styles
export const buttonStyles = {
  base: "inline-flex items-center justify-center rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors",
  primary: "bg-primary hover:bg-primaryLight text-white focus:ring-primary",
  secondary: "bg-secondary hover:bg-secondaryLight text-gray-800 focus:ring-secondary",
  accent: "bg-accent hover:bg-accent/90 text-white focus:ring-accent",
  danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
  success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
  info: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400",
  warning: "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400",
  outline: "border border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
  link: "text-primary dark:text-secondary hover:underline",
  icon: "p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300",
  disabled: "opacity-50 cursor-not-allowed",
  sizes: {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-4 py-2 text-base",
    xl: "px-6 py-3 text-base",
  }
};

// Stat card styles
export const statCardStyles = {
  wrapper: "p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-colors duration-200",
  title: "text-sm font-medium text-gray-500 dark:text-gray-400 uppercase transition-colors duration-200",
  value: "mt-2 text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200",
  description: "mt-1 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200",
  iconWrapper: "absolute top-4 right-4 p-3 rounded-full transition-colors duration-200",
  footer: "mt-4 pt-4 flex items-center text-sm border-t border-gray-200 dark:border-gray-700 transition-colors duration-200",
  trend: {
    up: "flex items-center text-green-600 dark:text-green-400 transition-colors duration-200",
    down: "flex items-center text-red-600 dark:text-red-400 transition-colors duration-200",
    neutral: "flex items-center text-gray-600 dark:text-gray-400 transition-colors duration-200",
  }
};

// Form control styles
export const formStyles = {
  group: "mb-4",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
  input: "block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary dark:focus:border-secondary focus:ring focus:ring-primary/20 dark:focus:ring-secondary/20 dark:bg-gray-700 dark:text-white",
  select: "block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary dark:focus:border-secondary focus:ring focus:ring-primary/20 dark:focus:ring-secondary/20 dark:bg-gray-700 dark:text-white",
  checkbox: "h-4 w-4 text-primary dark:text-secondary focus:ring-primary/20 dark:focus:ring-secondary/20 border-gray-300 dark:border-gray-600 rounded",
  radio: "h-4 w-4 text-primary dark:text-secondary focus:ring-primary/20 dark:focus:ring-secondary/20 border-gray-300 dark:border-gray-600",
  error: "mt-1 text-sm text-red-600 dark:text-red-400",
  helpText: "mt-1 text-sm text-gray-500 dark:text-gray-400",
};

// Alert/notification styles
export const alertStyles = {
  base: "p-4 rounded-md border",
  info: "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
  success: "bg-green-50 border-green-400 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300",
  warning: "bg-yellow-50 border-yellow-400 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300",
  danger: "bg-red-50 border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
};

// Badge/tag styles
export const badgeStyles = {
  base: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  primary: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300",
  secondary: "bg-secondary/10 text-yellow-800 dark:bg-secondary/20 dark:text-yellow-300",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  outline: "bg-transparent border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300",
};

// Common layout styles
export const layoutStyles = {
  section: "mb-8",
  sectionHeader: "mb-6",
  sectionTitle: "text-2xl font-bold text-gray-900 dark:text-white",
  sectionDescription: "mt-1 text-gray-600 dark:text-gray-400",
  grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
};

// Status indicator styles
export const statusStyles = {
  indicator: "h-2.5 w-2.5 rounded-full",
  active: "bg-green-500",
  inactive: "bg-gray-400 dark:bg-gray-600",
  pending: "bg-yellow-500",
  rejected: "bg-red-500",
  approved: "bg-green-500",
};
