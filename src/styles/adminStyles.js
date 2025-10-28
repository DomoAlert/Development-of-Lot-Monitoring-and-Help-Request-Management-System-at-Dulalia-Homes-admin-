// Common styles for admin components

// Card styles
export const cardStyles = {
  default: "bg-white !text-black rounded-lg shadow-md overflow-hidden transition-colors duration-200",
  header: "px-6 py-4 bg-gray-50 border-b border-gray-200 transition-colors duration-200",
  headerTitle: "!text-black text-lg font-semibold transition-colors duration-200",
  body: "p-6 !text-black transition-colors duration-200",
  footer: "px-6 py-4 bg-gray-50 border-t border-gray-200 transition-colors duration-200",
};

// Table styles
export const tableStyles = {
  wrapper: "overflow-x-auto rounded-lg shadow",
  table: "min-w-full divide-y divide-gray-200",
  tableHeader: "bg-gray-50 transition-colors duration-200",
  tableHeaderCell: "px-6 py-3 text-left text-xs font-medium !text-black uppercase tracking-wider transition-colors duration-200",
  tableBody: "bg-white divide-y divide-gray-200 transition-colors duration-200",
  tableRow: "hover:bg-gray-50 transition-colors duration-200",
  tableRowStriped: "even:bg-gray-50",
  tableCell: "px-6 py-4 whitespace-nowrap text-sm !text-black transition-colors duration-200",
  pagination: "mt-4 flex justify-between items-center",
};

// Button styles
export const buttonStyles = {
  base: "inline-flex items-center justify-center rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors",
  primary: "bg-primary hover:bg-primaryLight text-white focus:ring-primary",
  secondary: "bg-secondary hover:bg-secondaryLight !text-black focus:ring-secondary",
  accent: "bg-accent hover:bg-accent/90 text-white focus:ring-accent",
  danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
  success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
  info: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400",
  warning: "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400",
  outline: "border border-gray-300 bg-white hover:bg-gray-50 !text-black",
  link: "!text-black hover:underline",
  icon: "p-2 hover:bg-gray-100 rounded-full !text-black",
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
  wrapper: "p-6 bg-white !text-black rounded-lg shadow-md border border-gray-200 transition-colors duration-200",
  title: "text-sm font-medium !text-black uppercase transition-colors duration-200",
  value: "mt-2 text-3xl font-bold !text-black transition-colors duration-200",
  description: "mt-1 text-sm !text-black transition-colors duration-200",
  iconWrapper: "absolute top-4 right-4 p-3 rounded-full transition-colors duration-200",
  footer: "mt-4 pt-4 flex items-center text-sm border-t border-gray-200 transition-colors duration-200",
  trend: {
    up: "flex items-center !text-green-600 transition-colors duration-200",
    down: "flex items-center !text-red-600 transition-colors duration-200",
    neutral: "flex items-center !text-black transition-colors duration-200",
  }
};

// Form control styles
export const formStyles = {
  group: "mb-4",
  label: "block text-sm font-medium !text-black mb-1",
  input: "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 bg-gray-50 !text-black",
  select: "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 bg-gray-50 !text-black",
  checkbox: "h-4 w-4 !text-black focus:ring-primary/20 border-gray-300 rounded",
  radio: "h-4 w-4 !text-black focus:ring-primary/20 border-gray-300",
  error: "mt-1 text-sm !text-red-600",
  helpText: "mt-1 text-sm !text-black",
};

// Alert/notification styles
export const alertStyles = {
  base: "p-4 rounded-md border",
  info: "bg-blue-50 border-blue-400 !text-blue-700",
  success: "bg-green-50 border-green-400 !text-green-700",
  warning: "bg-yellow-50 border-yellow-400 !text-yellow-700",
  danger: "bg-red-50 border-red-400 !text-red-700",
};

// Badge/tag styles
export const badgeStyles = {
  base: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  primary: "bg-primary/10 !text-black",
  secondary: "bg-secondary/10 !text-black",
  success: "!text-green-700",
  danger: "!text-red-700",
  warning: "!text-yellow-700",
  info: "!text-blue-700",
  outline: "bg-transparent border border-gray-300 !text-black",
};

// Common layout styles
export const layoutStyles = {
  section: "mb-8",
  sectionHeader: "mb-6",
  sectionTitle: "text-2xl font-bold !text-black",
  sectionDescription: "mt-1 !text-black",
  grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
};

// Status indicator styles
export const statusStyles = {
  indicator: "h-2.5 w-2.5 rounded-full",
  active: "bg-green-500",
  inactive: "bg-gray-400",
  pending: "bg-yellow-500",
  rejected: "bg-red-500",
  approved: "bg-green-500",
};
